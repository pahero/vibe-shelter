import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client } from "@aws-sdk/client-s3";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { ListCatsHandler } from "./list-cats.handler";

describe("ListCatsHandler", () => {
  const s3 = new S3Client({
    region: "us-east-1",
    credentials: { accessKeyId: "unit-test", secretAccessKey: "unit-test" },
  });
  const photoUrls = new CatPhotoUrlService(new ConfigService(), s3);
  afterAll(() => s3.destroy());

  it("filters by location, tag and search and returns pagination metadata", async () => {
    await runInTestTransaction(async (tx) => {
      const location = await tx.location.create({
        data: {
          name: `Location ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      const tag = await tx.catTag.create({
        data: {
          name: `Tag ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      const cat = await tx.cat.create({
        data: {
          currentLocation: { connect: { id: location.id } },
          name: `Unique ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      await tx.catTagOnCat.create({ data: { catId: cat.id, tagId: tag.id } });
      const result = await new ListCatsHandler(
        tx as PrismaService,
        photoUrls,
      ).handle(
        {
          locationId: location.id,
          tagId: tag.id,
          search: cat.name,
          skip: 0,
          limit: 5,
        },
        false,
      );
      expect(result).toMatchObject({ total: 1, skip: 0, limit: 5 });
      expect(result.data[0]).toMatchObject({
        id: cat.id,
        tags: [{ id: tag.id }],
      });
    });
  });

  it("includes cats in sublocations when filtering by a top-level location", async () => {
    await runInTestTransaction(async (tx) => {
      const suffix = crypto.randomUUID();
      const parent = await tx.location.create({
        data: { name: `Parent ${suffix}` },
      });
      const sublocation = await tx.location.create({
        data: { name: `Child ${suffix}`, parentId: parent.id },
      });
      const other = await tx.location.create({
        data: { name: `Other ${suffix}` },
      });
      const parentCat = await tx.cat.create({
        data: { name: `Parent cat ${suffix}`, currentLocationId: parent.id },
      });
      const childCat = await tx.cat.create({
        data: {
          name: `Child cat ${suffix}`,
          currentLocationId: sublocation.id,
        },
      });
      await tx.cat.create({
        data: { name: `Other cat ${suffix}`, currentLocationId: other.id },
      });
      const handler = new ListCatsHandler(tx as PrismaService, photoUrls);
      const parentResult = await handler.handle(
        { locationId: parent.id },
        false,
      );
      expect(parentResult.data.map((cat) => cat.id).sort()).toEqual(
        [parentCat.id, childCat.id].sort(),
      );
      expect(
        parentResult.data.find((cat) => cat.id === childCat.id),
      ).toMatchObject({
        currentLocationName: sublocation.name,
        currentLocationParentName: parent.name,
      });
      const childResult = await handler.handle(
        { locationId: sublocation.id },
        false,
      );
      expect(childResult.data.map((cat) => cat.id)).toEqual([childCat.id]);
    });
  });

  it("filters cats by intake source", async () => {
    await runInTestTransaction(async (tx) => {
      const suffix = crypto.randomUUID();
      const included = await tx.cat.create({
        data: {
          name: `Matching ${suffix}`,
          intakeSource: "ZOI",
          currentLocation: { create: { name: `Location ${suffix}` } },
        },
      });
      await tx.cat.create({
        data: {
          name: `Not matching ${suffix}`,
          intakeSource: "FIRST_CONFISCATION",
          currentLocation: { create: { name: `Other ${suffix}` } },
        },
      });

      const result = await new ListCatsHandler(
        tx as PrismaService,
        photoUrls,
      ).handle({ intakeSource: "ZOI", search: suffix }, false);

      expect(result.data.map(({ id }) => id)).toEqual([included.id]);
      expect(result.total).toBe(1);
    });
  });

  it("rejects invalid pagination", async () => {
    await runInTestTransaction(async (tx) => {
      await expect(
        new ListCatsHandler(tx as PrismaService, photoUrls).handle(
          { limit: 101 },
          false,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it("returns archived cats only when the archived filter is enabled", async () => {
    await runInTestTransaction(async (tx) => {
      const reason = await tx.catArchivingReason.create({
        data: {
          name: `Reason ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      const cat = await tx.cat.create({
        data: {
          currentLocation: { create: { name: "Fixture location" } },
          name: `Archived ${Date.now()}-${Math.random().toString(36).slice(2)}`,
          archivingReason: { connect: { id: reason.id } },
        },
      });
      const result = await new ListCatsHandler(
        tx as PrismaService,
        photoUrls,
      ).handle({ archived: true, search: cat.name }, false);
      expect(result.data.map((item) => item.id)).toEqual([cat.id]);
    });
  });
});
