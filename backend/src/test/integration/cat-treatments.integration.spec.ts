import { INestApplication } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { AppModule } from "@/app.module";
import { setupApp } from "@/app.setup";
import { generateIntegrationTestConfig } from "@/test-utils/test-configuration";
import {
  getGarageTestConnection,
  getIntegrationTestDatabaseUrl,
  getIntegrationTestS3Bucket,
} from "@/test-utils/test-db-env";

describe("Cat treatment endpoints", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let agent: ReturnType<typeof request.agent>;
  let userId: string;

  beforeAll(async () => {
    const databaseUrl = getIntegrationTestDatabaseUrl();
    const s3 = getGarageTestConnection();
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        ConfigModule.forRoot({
          load: [
            generateIntegrationTestConfig(
              databaseUrl,
              s3.endpoint,
              s3.accessKey,
              s3.secretAccessKey,
              getIntegrationTestS3Bucket(),
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
    const authentication = await createAuthenticatedAgent(app, prisma);
    agent = authentication.agent;
    userId = authentication.userId;
  });

  afterAll(async () => {
    await app?.close();
  });

  it("lists the signed-in user's outstanding and completed reminders with cat details", async () => {
    const cat = await prisma.cat.create({
      data: {
        name: unique("reminder-cat"),
        currentLocation: { create: { name: "Fixture location" } },
      },
    });
    const task = await prisma.catTask.create({
      data: {
        catId: cat.id,
        comment: "Integration reminder",
        dueDate: new Date("2026-01-01"),
        receivers: { create: { userId } },
      },
    });
    const completed = await prisma.catTask.create({
      data: {
        catId: cat.id,
        comment: "Completed reminder",
        dueDate: new Date("2026-01-01"),
        completedAt: new Date(),
        receivers: { create: { userId } },
      },
    });
    const response = await agent.get("/api/cats/tasks/mine").expect(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: task.id,
          comment: task.comment,
          catId: cat.id,
          completedAt: null,
          completedBy: null,
          receiverIds: [userId],
          cat: { id: cat.id, name: cat.name, nameNumber: cat.nameNumber },
        }),
        expect.objectContaining({ id: completed.id }),
      ]),
    );
    await request(app.getHttpServer()).get("/api/cats/tasks/mine").expect(401);
    await agent
      .post(`/api/cats/tasks/${completed.id}/reopen`)
      .expect(201)
      .expect({ id: completed.id });
    expect(
      await prisma.catTask.findUniqueOrThrow({ where: { id: completed.id } }),
    ).toMatchObject({ completedAt: null, completedByUserId: null });
    await request(app.getHttpServer())
      .post(`/api/cats/tasks/${completed.id}/reopen`)
      .expect(401);
  });

  it("creates, lists, updates, checks, and unchecks a treatment with audit history", async () => {
    const cat = await prisma.cat.create({
      data: {
        currentLocation: { create: { name: "Fixture location" } },
        name: unique("treatment-cat"),
      },
    });
    const created = await agent
      .post(`/api/cats/${cat.id}/treatments`)
      .send({
        shortName: "Antibiotic",
        instructions: "Give with food",
        startDate: "2026-09-01",
        endDate: "2026-09-03",
        dosesPerDay: 2,
      })
      .expect(201);
    expect(created.body).toEqual({ id: expect.any(String) });
    await expect(
      prisma.catTreatment.findUniqueOrThrow({ where: { id: created.body.id } }),
    ).resolves.toMatchObject({
      createdByUserId: userId,
      updatedByUserId: userId,
    });

    await agent
      .patch(`/api/cats/treatments/${created.body.id}`)
      .send({
        shortName: "Antibiotic updated",
        instructions: "Give after food",
      })
      .expect(200)
      .expect({ id: created.body.id });
    await expect(
      prisma.catTreatment.findUniqueOrThrow({ where: { id: created.body.id } }),
    ).resolves.toMatchObject({
      createdByUserId: userId,
      updatedByUserId: userId,
    });

    await agent
      .put(`/api/cats/treatments/${created.body.id}/administrations`)
      .send({ date: "2026-09-01", doseNumber: 2, checked: true })
      .expect(200)
      .expect({ id: created.body.id });

    const listed = await agent
      .get(`/api/cats/${cat.id}/treatments`)
      .expect(200);
    expect(listed.body).toEqual([
      expect.objectContaining({
        id: created.body.id,
        shortName: "Antibiotic updated",
        instructions: "Give after food",
        startDate: "2026-09-01",
        endDate: "2026-09-03",
        dosesPerDay: 2,
        administrations: [
          {
            date: "2026-09-01",
            doseNumber: 2,
            checkedBy: { id: userId, fullName: "Treatment Integration User" },
          },
        ],
      }),
    ]);

    await agent
      .put(`/api/cats/treatments/${created.body.id}/administrations`)
      .send({ date: "2026-09-01", doseNumber: 2, checked: false })
      .expect(200)
      .expect({ id: created.body.id });

    await expect(
      prisma.catTreatmentAdministration.findFirstOrThrow({
        where: { treatmentId: created.body.id },
      }),
    ).resolves.toMatchObject({ deletedAt: expect.any(Date), version: 1 });
    const afterUncheck = await agent
      .get(`/api/cats/${cat.id}/treatments`)
      .expect(200);
    expect(afterUncheck.body[0].administrations).toEqual([]);

    await agent
      .put(`/api/cats/treatments/${created.body.id}/administrations`)
      .send({ date: "2026-09-01", doseNumber: 2, checked: true })
      .expect(200);
    await expect(
      prisma.catTreatmentAdministration.findFirstOrThrow({
        where: { treatmentId: created.body.id },
      }),
    ).resolves.toMatchObject({ deletedAt: null, version: 2 });
    await agent.delete(`/api/cats/treatments/${created.body.id}`).expect(204);
    await expect(
      prisma.catTreatment.findUniqueOrThrow({ where: { id: created.body.id } }),
    ).resolves.toMatchObject({ deletedAt: expect.any(Date) });
    const history = await agent.get(`/api/cats/${cat.id}/history`).expect(200);
    expect(history.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "treatment_created",
          actorId: userId,
          oldValue: null,
          newValue: null,
        }),
        expect.objectContaining({
          eventType: "treatment_short_name_changed",
          actorId: userId,
        }),
        expect.objectContaining({
          eventType: "treatment_instructions_changed",
          actorId: userId,
        }),
        expect.objectContaining({
          eventType: "treatment_administration_checked",
          actorId: userId,
        }),
        expect.objectContaining({
          eventType: "treatment_administration_unchecked",
          actorId: userId,
        }),
        expect.objectContaining({
          eventType: "treatment_deleted",
          actorId: userId,
          oldValue: null,
          newValue: null,
        }),
      ]),
    );
  });
});

function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function createAuthenticatedAgent(
  app: INestApplication,
  prisma: PrismaClient,
): Promise<{ agent: ReturnType<typeof request.agent>; userId: string }> {
  const email = `${unique("treatment-auth")}@example.com`;
  const password = "treatment-integration-password";
  await prisma.user.create({
    data: {
      email,
      fullName: "Treatment Integration User",
      role: "STAFF",
      status: "ACTIVE",
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  const agent = request.agent(app.getHttpServer());
  const login = await agent
    .post("/auth/login")
    .send({ email, password })
    .expect(200);
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: { id: true },
  });
  return { agent, userId: user.id };
}
