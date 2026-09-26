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
          load: [generateIntegrationTestConfig(databaseUrl, s3.endpoint, s3.accessKey, s3.secretAccessKey, getIntegrationTestS3Bucket())],
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

  it("creates, lists, updates, checks, and unchecks a treatment with audit history", async () => {
    const cat = await prisma.cat.create({ data: { name: unique("treatment-cat") } });
    const created = await agent
      .post(`/api/cats/${cat.id}/treatments`)
      .send({ shortName: "Antibiotic", instructions: "Give with food", startDate: "2026-09-01", endDate: "2026-09-03", dosesPerDay: 2 })
      .expect(201);
    expect(created.body).toEqual({ id: expect.any(String) });

    await agent
      .patch(`/api/cats/treatments/${created.body.id}`)
      .send({ shortName: "Antibiotic updated", instructions: "Give after food" })
      .expect(200)
      .expect({ id: created.body.id });

    await agent
      .put(`/api/cats/treatments/${created.body.id}/administrations`)
      .send({ date: "2026-09-01", doseNumber: 2, checked: true })
      .expect(200)
      .expect({ id: created.body.id });

    const listed = await agent.get(`/api/cats/${cat.id}/treatments`).expect(200);
    expect(listed.body).toEqual([
      expect.objectContaining({
        id: created.body.id,
        shortName: "Antibiotic updated",
        instructions: "Give after food",
        startDate: "2026-09-01",
        endDate: "2026-09-03",
        dosesPerDay: 2,
        administrations: [{ date: "2026-09-01", doseNumber: 2, checkedBy: { id: userId, fullName: "Treatment Integration User" } }],
      }),
    ]);

    await agent
      .put(`/api/cats/treatments/${created.body.id}/administrations`)
      .send({ date: "2026-09-01", doseNumber: 2, checked: false })
      .expect(200)
      .expect({ id: created.body.id });

    await expect(prisma.catTreatmentAdministration.count({ where: { treatmentId: created.body.id } })).resolves.toBe(0);
    await agent.delete(`/api/cats/treatments/${created.body.id}`).expect(204);
    await expect(prisma.catTreatment.findUniqueOrThrow({ where: { id: created.body.id } })).resolves.toMatchObject({ deletedAt: expect.any(Date) });
    const history = await agent.get(`/api/cats/${cat.id}/history`).expect(200);
    expect(history.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ eventType: "treatment_created", actor: expect.objectContaining({ id: userId }), oldValue: null, newValue: null }),
      expect.objectContaining({ eventType: "treatment_short_name_changed", actor: expect.objectContaining({ id: userId }) }),
      expect.objectContaining({ eventType: "treatment_instructions_changed", actor: expect.objectContaining({ id: userId }) }),
      expect.objectContaining({ eventType: "treatment_administration_checked", actor: expect.objectContaining({ id: userId }) }),
      expect.objectContaining({ eventType: "treatment_administration_unchecked", actor: expect.objectContaining({ id: userId }) }),
      expect.objectContaining({ eventType: "treatment_deleted", actor: expect.objectContaining({ id: userId }), oldValue: "Antibiotic updated", newValue: null }),
    ]));
  });
});

function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function createAuthenticatedAgent(app: INestApplication, prisma: PrismaClient): Promise<{ agent: ReturnType<typeof request.agent>; userId: string }> {
  const email = `${unique("treatment-auth")}@example.com`;
  const password = "treatment-integration-password";
  await prisma.user.create({
    data: { email, fullName: "Treatment Integration User", role: "STAFF", status: "ACTIVE", passwordHash: await bcrypt.hash(password, 10) },
  });
  const agent = request.agent(app.getHttpServer());
  await agent.post("/auth/login").send({ email, password }).expect(201);
  const user = await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
  return { agent, userId: user.id };
}
