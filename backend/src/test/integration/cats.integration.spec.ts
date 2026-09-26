import { INestApplication } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import * as bcrypt from "bcrypt";
import { generateIntegrationTestConfig } from "@/test-utils/test-configuration";
import { PrismaClient } from "@prisma/client";
import { AppModule } from "@/app.module";
import { setupApp } from "@/app.setup";
import {
  getGarageTestConnection,
  getIntegrationTestDatabaseUrl,
  getIntegrationTestS3Bucket,
} from "@/test-utils/test-db-env";
import { SendDueTaskNotificationsHandler } from "@/cats/tasks/send-due-task-notifications.handler";

describe("Cats endpoints", () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prisma: PrismaClient;
  let authAgent: ReturnType<typeof request.agent>;
  let authUser: { id: string; email: string; isTest: boolean };

  beforeAll(async () => {
    const databaseUrl = getIntegrationTestDatabaseUrl();
    const s3Bucket = getIntegrationTestS3Bucket();
    const s3 = getGarageTestConnection();
    moduleRef = await Test.createTestingModule({
      imports: [
        AppModule,
        ConfigModule.forRoot({
          load: [
            generateIntegrationTestConfig(
              databaseUrl,
              s3.endpoint,
              s3.accessKey,
              s3.secretAccessKey,
              s3Bucket,
            ),
          ],
          isGlobal: true,
        }),
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = await app.resolve(PrismaClient);
    const auth = await createAuthenticatedAgent(app, prisma);
    authAgent = auth.agent;
    authUser = auth.user;
  });

  afterAll(async () => {
    await app?.close();
  });

  it("POST /api/cats creates a cat card", async () => {
    const location = await createLocation(prisma, "post");
    const response = await authAgent
      .post("/api/cats")
      .send({
        name: "Mila",
        sex: "FEMALE",
        sterilizationStatus: "STERILIZED",
        currentLocationId: location.id,
      })
      .expect(201);

    expect(response.body.name).toBe("Mila");
    expect(response.body.currentLocationName).toBe(location.name);
    expect(response.body.primaryPhotoUrl).toBeNull();
    expect(response.body.primaryPhotoKey).toBeUndefined();
    const stored = await (prisma as any).cat.findUnique({ where: { id: response.body.id } });
    expect(stored.createdByUserId).toBe(authUser.id);
    expect(response.body.isTest).toBe(false);
    expect(stored.isTest).toBe(false);
    const history = await authAgent.get(`/api/cats/${response.body.id}/history`).expect(200);
    expect(history.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "cat_created",
          actor: expect.objectContaining({ id: authUser.id }),
          oldValue: null,
          newValue: "Mila",
        }),
      ]),
    );
  });

  it("isolates cats and locations by authenticated user test status", async () => {
    const regularAuth = await createAuthenticatedAgent(app, prisma, false);
    const testAuth = await createAuthenticatedAgent(app, prisma, true);

    const regularLocation = await regularAuth.agent
      .post("/api/locations")
      .send({ name: unique("regular-location"), ownerId: regularAuth.user.id })
      .expect(201);
    const testLocation = await testAuth.agent
      .post("/api/locations")
      .send({ name: unique("test-location"), ownerId: regularAuth.user.id })
      .expect(201);

    expect(regularLocation.body.isTest).toBe(false);
    expect(testLocation.body.isTest).toBe(true);

    const regularCat = await regularAuth.agent
      .post("/api/cats")
      .send({
        name: unique("regular-cat"),
        sex: "UNKNOWN",
        sterilizationStatus: "UNKNOWN",
        currentLocationId: regularLocation.body.id,
      })
      .expect(201);
    const testCat = await testAuth.agent
      .post("/api/cats")
      .send({
        name: unique("test-cat"),
        sex: "UNKNOWN",
        sterilizationStatus: "UNKNOWN",
        currentLocationId: testLocation.body.id,
      })
      .expect(201);

    expect(regularCat.body.isTest).toBe(false);
    expect(testCat.body.isTest).toBe(true);

    const regularLocations = await regularAuth.agent
      .get("/api/locations")
      .query({ ownerId: regularAuth.user.id })
      .expect(200);
    const testLocations = await testAuth.agent
      .get("/api/locations")
      .query({ ownerId: regularAuth.user.id })
      .expect(200);
    expect(regularLocations.body.data.map((location: { id: string }) => location.id)).toContain(
      regularLocation.body.id,
    );
    expect(regularLocations.body.data.map((location: { id: string }) => location.id)).not.toContain(
      testLocation.body.id,
    );
    expect(testLocations.body.data.map((location: { id: string }) => location.id)).toContain(
      testLocation.body.id,
    );
    expect(testLocations.body.data.map((location: { id: string }) => location.id)).not.toContain(
      regularLocation.body.id,
    );

    const regularCats = await regularAuth.agent
      .get("/api/cats")
      .query({ search: regularCat.body.name })
      .expect(200);
    const testCats = await testAuth.agent
      .get("/api/cats")
      .query({ search: testCat.body.name })
      .expect(200);
    expect(regularCats.body.data.map((cat: { id: string }) => cat.id)).toContain(
      regularCat.body.id,
    );
    expect(regularCats.body.data.map((cat: { id: string }) => cat.id)).not.toContain(
      testCat.body.id,
    );
    expect(testCats.body.data.map((cat: { id: string }) => cat.id)).toContain(testCat.body.id);
    expect(testCats.body.data.map((cat: { id: string }) => cat.id)).not.toContain(
      regularCat.body.id,
    );

    await regularAuth.agent.get(`/api/locations/${testLocation.body.id}`).expect(404);
    await testAuth.agent.get(`/api/cats/${regularCat.body.id}/card`).expect(404);
    await regularAuth.agent
      .patch(`/api/cats/${regularCat.body.id}`)
      .send({ currentLocationId: testLocation.body.id })
      .expect(404);
  });

  it("PUT /api/cats/:id/primary-photo uploads photo data and updates the cat card", async () => {
    const cat = await createCat(prisma, { name: unique("photo") });

    const response = await authAgent
      .put(`/api/cats/${cat.id}/primary-photo`)
      .attach("photo", Buffer.from("fake image bytes"), {
        filename: "mila portrait.jpg",
        contentType: "image/jpeg",
      })
      .expect(200);

    expect(response.body.primaryPhotoUrl).toContain(`cats/${cat.id}/photos/`);
    expect(response.body.primaryPhotoUrl).toContain("mila-portrait.jpg");
    expect(response.body.primaryPhotoKey).toBeUndefined();
  });

  it("manages cat gallery photo endpoints", async () => {
    const cat = await createCat(prisma, { name: unique("gallery") });

    const first = await authAgent
      .post(`/api/cats/${cat.id}/photos`)
      .attach("photo", Buffer.from("first image bytes"), {
        filename: "first.jpg",
        contentType: "image/jpeg",
      })
      .expect(201);
    const second = await authAgent
      .post(`/api/cats/${cat.id}/photos`)
      .attach("photo", Buffer.from("second image bytes"), {
        filename: "second.jpg",
        contentType: "image/jpeg",
      })
      .expect(201);

    expect(first.body.isPrimary).toBe(true);
    expect(second.body.isPrimary).toBe(false);

    const list = await authAgent.get(`/api/cats/${cat.id}/photos`).expect(200);
    expect(list.body).toHaveLength(2);

    const primary = await authAgent
      .put(`/api/cats/${cat.id}/photos/${second.body.id}/primary`)
      .expect(200);
    expect(primary.body.primaryPhotoUrl).toContain("second.jpg");

    const afterDelete = await authAgent
      .delete(`/api/cats/${cat.id}/photos/${second.body.id}`)
      .expect(200);
    expect(afterDelete.body.primaryPhotoUrl).toContain("first.jpg");
  });

  it("manages PDF document endpoints and records both audit events", async () => {
    const cat = await createCat(prisma, { name: unique("document") });

    const created = await authAgent
      .post(`/api/cats/${cat.id}/documents`)
      .attach("document", Buffer.from("%PDF-1.7\ncat document"), {
        filename: "medical record.pdf",
        contentType: "application/pdf",
      })
      .expect(201);

    expect(created.body).toMatchObject({ catId: cat.id, fileName: "medical record.pdf" });
    expect(created.body.url).toContain(`cats/${cat.id}/documents/`);

    const documents = await authAgent.get(`/api/cats/${cat.id}/documents`).expect(200);
    expect(documents.body).toHaveLength(1);
    expect(documents.body[0].id).toBe(created.body.id);

    await authAgent.delete(`/api/cats/${cat.id}/documents/${created.body.id}`).expect(204);
    expect((await authAgent.get(`/api/cats/${cat.id}/documents`).expect(200)).body).toEqual([]);

    const history = await authAgent.get(`/api/cats/${cat.id}/history`).expect(200);
    expect(history.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ eventType: "document_created", newValue: "medical record.pdf" }),
      expect.objectContaining({ eventType: "document_deleted", oldValue: "medical record.pdf" }),
    ]));
  });

  it("GET /api/cats lists active cat cards with filters", async () => {
    const location = await createLocation(prisma, "list");
    const prefix = unique("list");
    await createCat(prisma, {
      name: `${prefix} Mila`,
      currentLocationId: location.id,
      microchipNumber: `${prefix}-chip`,
    });

    const response = await authAgent
      .get("/api/cats")
      .query({ locationId: location.id, search: prefix, limit: 50 })
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.data[0].name).toContain("Mila");
  });

  it("GET /api/cats/:id/card returns one cat card", async () => {
    const cat = await createCat(prisma, { name: unique("card") });

    const response = await authAgent.get(`/api/cats/${cat.id}/card`).expect(200);

    expect(response.body.id).toBe(cat.id);
    expect(response.body.primaryPhotoUrl).toBeNull();
  });

  it("PATCH /api/cats/:id updates a cat card", async () => {
    const cat = await createCat(prisma, { name: unique("patch") });

    const response = await authAgent
      .patch(`/api/cats/${cat.id}`)
      .send({ name: "Updated cat" })
      .expect(200);

    expect(response.body.name).toBe("Updated cat");

    const history = await authAgent.get(`/api/cats/${cat.id}/history`).expect(200);
    expect(history.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "name_changed",
          oldValue: cat.name,
          newValue: "Updated cat",
        }),
      ]),
    );
    expect(history.body.data[0].actor).toMatchObject({ id: authUser.id, email: authUser.email });
  });

  it("preserves creator attribution when another user updates a cat", async () => {
    const location = await createLocation(prisma, "creator");
    const created = await authAgent
      .post("/api/cats")
      .send({
        name: unique("creator-cat"),
        sex: "UNKNOWN",
        sterilizationStatus: "UNKNOWN",
        currentLocationId: location.id,
      })
      .expect(201);
    const otherAuth = await createAuthenticatedAgent(app, prisma);

    await otherAuth.agent
      .patch(`/api/cats/${created.body.id}`)
      .send({ name: "Updated by second user" })
      .expect(200);

    const stored = await (prisma as any).cat.findUnique({ where: { id: created.body.id } });
    expect(stored.createdByUserId).toBe(authUser.id);
  });

  it("returns newest-first multi-user history and suppresses no-op history", async () => {
    const cat = await createCat(prisma, { name: unique("history-order") });
    const otherAuth = await createAuthenticatedAgent(app, prisma);

    await authAgent.patch(`/api/cats/${cat.id}`).send({ name: "First history name" }).expect(200);
    await otherAuth.agent
      .patch(`/api/cats/${cat.id}`)
      .send({ name: "Second history name" })
      .expect(200);
    await otherAuth.agent
      .patch(`/api/cats/${cat.id}`)
      .send({ name: "Second history name" })
      .expect(200);

    const history = await authAgent.get(`/api/cats/${cat.id}/history`).expect(200);
    expect(history.body.total).toBe(2);
    expect(history.body.data.map((event: any) => event.newValue)).toEqual([
      "Second history name",
      "First history name",
    ]);
    expect(history.body.data[0].actor.id).toBe(otherAuth.user.id);
  });

  it("lists all cat audit history and filters by user, cat, and date", async () => {
    const cat = await createCat(prisma, { name: unique("audit-all") });
    const otherAuth = await createAuthenticatedAgent(app, prisma);

    await authAgent.patch(`/api/cats/${cat.id}`).send({ name: "All history name" }).expect(200);
    await otherAuth.agent
      .patch(`/api/cats/${cat.id}`)
      .send({ name: "Updated by other user" })
      .expect(200);

    const all = await authAgent.get("/api/cats/history").query({ limit: 50 }).expect(200);
    expect(all.body.total).toBeGreaterThanOrEqual(2);
    expect(all.body.data[0]).toMatchObject({
      catId: cat.id,
      actor: expect.objectContaining({ id: otherAuth.user.id }),
    });
    expect(all.body.data[0].catName).toBe("Updated by other user");
    expect(all.body.data.some((event: any) => event.eventType === "name_changed")).toBe(true);

    const byCat = await authAgent
      .get("/api/cats/history")
      .query({ catId: cat.id, limit: 50 })
      .expect(200);
    expect(byCat.body.data.length).toBeGreaterThanOrEqual(2);
    expect(byCat.body.data.every((event: any) => event.catId === cat.id)).toBe(true);

    const byUser = await authAgent
      .get("/api/cats/history")
      .query({ user: otherAuth.user.email, limit: 50 })
      .expect(200);
    expect(byUser.body.data.length).toBeGreaterThanOrEqual(1);
    expect(byUser.body.data.every((event: any) => event.actor.id === otherAuth.user.id)).toBe(true);

    const today = new Date().toISOString().slice(0, 10);
    const byDate = await authAgent
      .get("/api/cats/history")
      .query({ from: today, to: today, limit: 50 })
      .expect(200);
    expect(byDate.body.total).toBeGreaterThanOrEqual(2);
  });

  it("returns photo history links while excluding deleted photos from active gallery", async () => {
    const cat = await createCat(prisma, { name: unique("photo-history") });

    const created = await authAgent
      .post(`/api/cats/${cat.id}/photos`)
      .attach("photo", Buffer.from("history image bytes"), {
        filename: "history.jpg",
        contentType: "image/jpeg",
      })
      .expect(201);
    await authAgent.delete(`/api/cats/${cat.id}/photos/${created.body.id}`).expect(200);

    const photos = await authAgent.get(`/api/cats/${cat.id}/photos`).expect(200);
    expect(photos.body).toHaveLength(0);
    const history = await authAgent.get(`/api/cats/${cat.id}/history`).expect(200);
    expect(history.body.data.map((event: any) => event.eventType)).toEqual([
      "photo_deleted",
      "photo_created",
    ]);
    expect(history.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "photo_created",
          photo: expect.objectContaining({
            id: created.body.id,
            status: "DELETED",
            link: expect.stringContaining("history.jpg"),
          }),
        }),
        expect.objectContaining({
          eventType: "photo_deleted",
          photo: expect.objectContaining({
            id: created.body.id,
            status: "DELETED",
            link: expect.stringContaining("history.jpg"),
          }),
        }),
      ]),
    );
  });

  it("manages cat weight history endpoints", async () => {
    const cat = await createCat(prisma, { name: unique("weight") });

    const created = await authAgent
      .post(`/api/cats/${cat.id}/weights`)
      .send({ weightKg: 3.8, measuredAt: "2026-07-30" })
      .expect(201);

    expect(created.body.weightKg).toBe(3.8);
    expect(created.body.measuredAt).toContain("2026-07-30");

    const list = await authAgent.get(`/api/cats/${cat.id}/weights`).expect(200);

    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(created.body.id);

    await authAgent.delete(`/api/cats/${cat.id}/weights/${created.body.id}`).expect(204);

    const history = await authAgent.get(`/api/cats/${cat.id}/history`).expect(200);
    expect(history.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "weight_created",
          actor: expect.objectContaining({ id: authUser.id }),
          oldValue: null,
          newValue: "3.80 kg",
        }),
        expect.objectContaining({
          eventType: "weight_deleted",
          actor: expect.objectContaining({ id: authUser.id }),
          oldValue: "3.80 kg",
          newValue: null,
        }),
      ]),
    );

    await authAgent.delete(`/api/cats/${cat.id}/weights/${created.body.id}`).expect(404);
  });

  it("manages cat tags and filters cat cards by tag", async () => {
    const cat = await createCat(prisma, { name: unique("tagged") });
    await createCat(prisma, { name: unique("untagged") });

    const createdTag = await authAgent
      .post("/api/cats/tags")
      .send({ name: unique("tag"), color: "#8ecaff" })
      .expect(201);

    expect(createdTag.body.color).toBe("#8ecaff");

    const renamedTag = await authAgent
      .patch(`/api/cats/tags/${createdTag.body.id}`)
      .send({ color: "#ffd166" })
      .expect(200);

    expect(renamedTag.body.color).toBe("#ffd166");

    const taggedCat = await authAgent
      .post(`/api/cats/${cat.id}/tags/${createdTag.body.id}`)
      .expect(201);

    expect(taggedCat.body.tags).toEqual([
      { id: createdTag.body.id, name: createdTag.body.name, color: "#ffd166" },
    ]);

    const audit = await authAgent
      .get("/api/cats/history")
      .query({ user: authUser.email, limit: 50 })
      .expect(200);
    expect(audit.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "tag_added_to_cat",
          catId: cat.id,
          actor: expect.objectContaining({ id: authUser.id }),
          newValue: createdTag.body.name,
        }),
        expect.objectContaining({
          eventType: "tag_create",
          catId: null,
          actor: expect.objectContaining({ id: authUser.id }),
        }),
        expect.objectContaining({
          eventType: "tag_update",
          catId: null,
          actor: expect.objectContaining({ id: authUser.id }),
        }),
      ]),
    );
    const tagAuditEvents = await (prisma as any).tagAuditEvent.findMany({
      where: { tagId: createdTag.body.id },
      orderBy: { createdAt: "asc" },
    });
    expect(tagAuditEvents.map((event: any) => event.action)).toContain("create");
    expect(tagAuditEvents.map((event: any) => event.action)).toContain("update");
    expect(tagAuditEvents.every((event: any) => event.actorUserId === authUser.id)).toBe(true);

    const list = await authAgent.get("/api/cats").query({ tagId: createdTag.body.id }).expect(200);

    expect(list.body.data.map((item: { id: string }) => item.id)).toEqual([cat.id]);

    await authAgent.delete(`/api/cats/tags/${createdTag.body.id}`).expect(204);

    const catAfterTagDeletion = await authAgent.get(`/api/cats/${cat.id}/card`).expect(200);
    expect(catAfterTagDeletion.body.tags).toEqual([]);

    const catHistory = await authAgent.get(`/api/cats/${cat.id}/history`).expect(200);
    expect(catHistory.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "tag_removed_from_cat",
          oldValue: createdTag.body.name,
          actor: expect.objectContaining({ id: authUser.id }),
        }),
      ]),
    );

    const auditAfterDeletion = await authAgent
      .get("/api/cats/history")
      .query({ user: authUser.email, limit: 50 })
      .expect(200);
    expect(auditAfterDeletion.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "tag_delete",
          catId: null,
          actor: expect.objectContaining({ id: authUser.id }),
        }),
      ]),
    );
  });

  it("audits location mutations and soft deletes locations", async () => {
    const created = await authAgent
      .post("/api/locations")
      .send({ name: unique("audited-location"), description: "Before" })
      .expect(201);

    await authAgent
      .patch(`/api/locations/${created.body.id}`)
      .send({ description: "After" })
      .expect(200);

    await authAgent.delete(`/api/locations/${created.body.id}`).expect(204);
    await authAgent.get(`/api/locations/${created.body.id}`).expect(404);

    const locations = await authAgent.get("/api/locations").expect(200);
    expect(locations.body.data.map((location: { id: string }) => location.id)).not.toContain(
      created.body.id,
    );

    const audit = await authAgent
      .get("/api/cats/history")
      .query({ user: authUser.email, limit: 100 })
      .expect(200);
    expect(audit.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "location_create",
          catId: null,
          actor: expect.objectContaining({ id: authUser.id }),
        }),
        expect.objectContaining({
          eventType: "location_update",
          catId: null,
          actor: expect.objectContaining({ id: authUser.id }),
        }),
        expect.objectContaining({
          eventType: "location_delete",
          catId: null,
          actor: expect.objectContaining({ id: authUser.id }),
        }),
      ]),
    );
  });

  it("does not delete locations assigned to cats", async () => {
    const location = await authAgent
      .post("/api/locations")
      .send({ name: unique("occupied-location") })
      .expect(201);
    await createCat(prisma, { name: unique("occupied-cat"), currentLocationId: location.body.id });

    await authAgent.delete(`/api/locations/${location.body.id}`).expect(409);
    await authAgent.get(`/api/locations/${location.body.id}`).expect(200);
  });

  it("archives cats with audited archivation reasons and filters archived cats", async () => {
    const cat = await createCat(prisma, { name: unique("archived-cat") });
    const reasonName = unique("adopted-cy");
    const createdReason = await authAgent
      .post("/api/cats/archivation-reasons")
      .send({ name: reasonName })
      .expect(201);
    expect(createdReason.body).toEqual({ id: expect.any(String) });
    const updatedReasonName = `${reasonName} updated`;
    const updatedReason = await authAgent
      .patch(`/api/cats/archivation-reasons/${createdReason.body.id}`)
      .send({ name: updatedReasonName })
      .expect(200);
    expect(updatedReason.body).toEqual({ id: createdReason.body.id });

    const archived = await authAgent
      .post(`/api/cats/${cat.id}/archive`)
      .send({ reasonId: updatedReason.body.id })
      .expect(201);
    expect(archived.body).toEqual({ id: cat.id });

    const archivedCard = await authAgent.get(`/api/cats/${cat.id}/card`).expect(200);
    expect(archivedCard.body).toMatchObject({
      archivationReasonId: updatedReason.body.id,
      archivationReasonName: updatedReasonName,
      archivedAt: expect.any(String),
    });

    const archivedSearch = await authAgent.get("/api/cats").query({ archived: true }).expect(200);
    expect(archivedSearch.body.data.map((item: { id: string }) => item.id)).toContain(cat.id);

    const reasonEvents = await prisma.catAuditEvent.findMany({
      where: { archivationReasonId: updatedReason.body.id },
      orderBy: { occurredAt: "asc" },
    });
    expect(reasonEvents.map((event) => event.eventType)).toEqual([
      "archivation_reason_create",
      "archivation_reason_update",
    ]);
    const dearchived = await authAgent.post(`/api/cats/${cat.id}/dearchive`).expect(201);
    expect(dearchived.body).toEqual({ id: cat.id });
    const restoredCard = await authAgent.get(`/api/cats/${cat.id}/card`).expect(200);
    expect(restoredCard.body).toMatchObject({
      archivedAt: null,
      archivationReasonId: null,
      archivationReasonName: null,
    });
    const history = await authAgent.get(`/api/cats/${cat.id}/history`).expect(200);
    expect(history.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "cat_archived",
          actor: expect.objectContaining({ id: authUser.id }),
          newValue: updatedReasonName,
        }),
        expect.objectContaining({
          eventType: "cat_dearchived",
          actor: expect.objectContaining({ id: authUser.id }),
          oldValue: "ARCHIVED",
          newValue: "ACTIVE",
        }),
      ]),
    );
    await authAgent.delete(`/api/cats/archivation-reasons/${updatedReason.body.id}`).expect(204);

    const unusedReason = await authAgent
      .post("/api/cats/archivation-reasons")
      .send({ name: unique("unused-reason") })
      .expect(201);
    await authAgent.delete(`/api/cats/archivation-reasons/${unusedReason.body.id}`).expect(204);
    const reasons = await authAgent.get("/api/cats/archivation-reasons").expect(200);
    expect(reasons.body.map((reason: { id: string }) => reason.id)).not.toContain(
      unusedReason.body.id,
    );

    const globalAudit = await authAgent
      .get("/api/cats/history")
      .query({ user: authUser.email, limit: 100 })
      .expect(200);
    expect(globalAudit.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "archivation_reason_create",
          actor: expect.objectContaining({ id: authUser.id }),
        }),
        expect.objectContaining({
          eventType: "archivation_reason_update",
          actor: expect.objectContaining({ id: authUser.id }),
        }),
        expect.objectContaining({
          eventType: "archivation_reason_delete",
          actor: expect.objectContaining({ id: authUser.id }),
        }),
      ]),
    );
  });

  it("reassigns cats when deleting an assigned archivation reason", async () => {
    const source = await authAgent
      .post("/api/cats/archivation-reasons")
      .send({ name: unique("replace-source") })
      .expect(201);
    const replacement = await authAgent
      .post("/api/cats/archivation-reasons")
      .send({ name: unique("replace-target") })
      .expect(201);
    const cat = await createCat(prisma, { name: unique("replace-cat") });
    await prisma.cat.update({
      where: { id: cat.id },
      data: { archivationReasonId: source.body.id },
    });

    await authAgent
      .delete(`/api/cats/archivation-reasons/${source.body.id}`)
      .send({ replacementReasonId: replacement.body.id })
      .expect(204);

    const updatedCat = await authAgent.get(`/api/cats/${cat.id}/card`).expect(200);
    expect(updatedCat.body.archivationReasonId).toBe(replacement.body.id);
    const reasons = await authAgent.get("/api/cats/archivation-reasons").expect(200);
    expect(reasons.body.map((reason: { id: string }) => reason.id)).not.toContain(source.body.id);
  });

  it("returns validation and not found errors", async () => {
    await authAgent.get("/api/cats").query({ limit: 101 }).expect(400);
    await authAgent.get("/api/cats/missing/card").expect(404);
    await authAgent.put("/api/cats/missing/primary-photo").expect(404);
    await authAgent
      .post("/api/cats")
      .send({
        name: "Invalid Photo Field Cat",
        sex: "UNKNOWN",
        sterilizationStatus: "UNKNOWN",
        primaryPhotoKey: "cats/not-allowed.jpg",
      })
      .expect(400);
  });

  it("manages cat tasks and records completion by a receiver", async () => {
    const cat = await createCat(prisma, { name: unique("task-cat") });
    const receiver = await createAuthenticatedAgent(app, prisma);
    const dueDate = new Date(Date.now() + 86_400_000).toISOString();
    const created = await authAgent
      .post(`/api/cats/${cat.id}/tasks`)
      .send({
        comment: "  Give medicine  ",
        dueDate,
        receiverIds: [receiver.user.id],
      })
      .expect(201);
    expect(created.body).toEqual({ id: expect.any(String) });

    const updated = await receiver.agent
      .patch(`/api/cats/tasks/${created.body.id}`)
      .send({ comment: "Give evening medicine" })
      .expect(200);
    expect(updated.body).toEqual({ id: created.body.id });
    const tasks = await authAgent.get(`/api/cats/${cat.id}/tasks`).expect(200);
    expect(tasks.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.body.id,
          comment: "Give evening medicine",
          receiverIds: [receiver.user.id],
          completedAt: null,
          completedBy: null,
        }),
      ]),
    );

    const completed = await receiver.agent
      .post(`/api/cats/tasks/${created.body.id}/complete`)
      .expect(201);
    expect(completed.body).toEqual({ id: created.body.id });
    const completedTasks = await authAgent.get(`/api/cats/${cat.id}/tasks`).expect(200);
    expect(completedTasks.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.body.id,
          completedBy: expect.objectContaining({ id: receiver.user.id }),
          completedAt: expect.any(String),
        }),
      ]),
    );
    const beforeDelete = await prisma.catTask.findUniqueOrThrow({ where: { id: created.body.id } });
    await authAgent.delete(`/api/cats/tasks/${created.body.id}`).expect(204);
    const deleted = await prisma.catTask.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(deleted.deletedAt).toEqual(expect.any(Date));
    expect(deleted.concurrencyToken).not.toBe(beforeDelete.concurrencyToken);
    const tasksAfterDeletion = await authAgent.get(`/api/cats/${cat.id}/tasks`).expect(200);
    expect(tasksAfterDeletion.body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.body.id })]),
    );
    const history = await authAgent.get(`/api/cats/${cat.id}/history`).expect(200);
    expect(history.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "task_created",
          actor: expect.objectContaining({ id: authUser.id }),
        }),
        expect.objectContaining({
          eventType: "task_comment_changed",
          actor: expect.objectContaining({ id: receiver.user.id }),
        }),
        expect.objectContaining({
          eventType: "task_completed",
          actor: expect.objectContaining({ id: receiver.user.id }),
        }),
        expect.objectContaining({
          eventType: "task_deleted",
          actor: expect.objectContaining({ id: authUser.id }),
        }),
      ]),
    );
  });

  it("creates receiver notifications only after the due date", async () => {
    const cat = await createCat(prisma, { name: unique("overdue-task-cat") });
    const dueDate = new Date(Date.now() - 60_000);
    const created = await authAgent
      .post(`/api/cats/${cat.id}/tasks`)
      .send({
        comment: "Check wound",
        dueDate: dueDate.toISOString(),
        receiverIds: [authUser.id],
      })
      .expect(201);
    const notifications = moduleRef.get(SendDueTaskNotificationsHandler);
    await notifications.handle(new Date(dueDate.getTime() - 1));
    expect(await prisma.taskNotification.count({ where: { taskId: created.body.id } })).toBe(0);
    await notifications.handle(dueDate);
    expect(
      await prisma.taskNotification.count({
        where: { taskId: created.body.id, userId: authUser.id },
      }),
    ).toBe(1);
    const response = await authAgent
      .get("/api/notifications")
      .query({ skip: 0, limit: 10 })
      .expect(200);
    expect(response.body).toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({ taskId: created.body.id, catId: cat.id, comment: "Check wound" }),
      ]),
      skip: 0,
      limit: 10,
    });
  });
});

function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function createAuthenticatedAgent(
  app: INestApplication,
  prisma: PrismaClient,
  isTest = false,
) {
  const email = `${unique("cats-auth")}@example.com`;
  const password = "cats-integration-password";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      fullName: "Cats Integration User",
      role: "STAFF",
      status: "ACTIVE",
      passwordHash,
      isTest,
    },
  });

  const agent = request.agent(app.getHttpServer());
  await agent.post("/auth/login").send({ email, password }).expect(201);

  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { agent, user: { id: user.id, email, isTest: user.isTest } };
}

async function createLocation(prisma: PrismaClient, prefix: string) {
  return (prisma as any).location.create({
    data: { name: unique(`endpoint-${prefix}`), status: "ACTIVE" },
  });
}

async function createCat(
  prisma: PrismaClient,
  data: { name: string; currentLocationId?: string; microchipNumber?: string },
) {
  return (prisma as any).cat.create({
    data: {
      name: data.name,
      sex: "UNKNOWN",
      sterilizationStatus: "UNKNOWN",
      currentLocationId: data.currentLocationId ?? null,
      microchipNumber: data.microchipNumber ?? null,
    },
  });
}
