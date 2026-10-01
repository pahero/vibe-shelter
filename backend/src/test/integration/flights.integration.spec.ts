import { INestApplication } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import * as bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { AppModule } from "@/app.module";
import { setupApp } from "@/app.setup";
import { generateIntegrationTestConfig } from "@/test-utils/test-configuration";
import {
  getGarageTestConnection,
  getIntegrationTestDatabaseUrl,
  getIntegrationTestS3Bucket,
} from "@/test-utils/test-db-env";

describe("Flights endpoints", () => {
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

  it("creates, edits, assigns cats, audits, soft-deletes, and restores flights", async () => {
    const cat = await prisma.cat.create({
      data: { name: unique("flight-cat") },
    });
    const created = await authAgent
      .post("/api/flights")
      .send({
        date: "2026-10-15",
        airport: "Larnaca",
        flightNumber: unique("CY"),
        flightParent: "Morgan Parent",
      })
      .expect(201);
    expect(Object.keys(created.body)).toEqual(["id"]);

    const flightId = created.body.id as string;
    expect(
      await authAgent
        .get("/api/flights")
        .expect(200)
        .then((response) => response.body),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: flightId, catCount: 0, deletedAt: null }),
      ]),
    );
    expect(
      await authAgent
        .get(`/api/flights/${flightId}`)
        .expect(200)
        .then((response) => response.body),
    ).toMatchObject({
      id: flightId,
      date: "2026-10-15",
      airport: "Larnaca",
      flightParent: "Morgan Parent",
      cats: [],
    });

    await authAgent
      .patch(`/api/flights/${flightId}`)
      .send({
        date: "2026-10-16",
        airport: "Paphos",
        flightNumber: "CY456",
        flightParent: "Taylor Parent",
      })
      .expect(200);
    const assignment = await authAgent
      .post(`/api/flights/${flightId}/cats`)
      .send({ catId: cat.id })
      .expect(201);
    await authAgent
      .post(`/api/flights/${flightId}/cats`)
      .send({ catId: cat.id })
      .expect(409);
    await authAgent
      .patch(`/api/flights/assignments/${assignment.body.id}`)
      .send({ f2fDone: true, tracesDone: true })
      .expect(200);

    const details = await authAgent.get(`/api/flights/${flightId}`).expect(200);
    expect(details.body.cats).toEqual([
      expect.objectContaining({
        assignmentId: assignment.body.id,
        cat: expect.objectContaining({ id: cat.id, name: cat.name }),
        f2fDone: true,
        tracesDone: true,
      }),
    ]);

    const flightHistory = await authAgent
      .get(`/api/flights/${flightId}/history`)
      .expect(200);
    expect(flightHistory.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "flight_created",
          oldValue: null,
          newValue: null,
        }),
        expect.objectContaining({
          eventType: "flight_date_changed",
          oldValue: "2026-10-15",
          newValue: "2026-10-16",
        }),
        expect.objectContaining({
          eventType: "flight_airport_changed",
          oldValue: "Larnaca",
          newValue: "Paphos",
        }),
        expect.objectContaining({
          eventType: "flight_number_changed",
          oldValue: expect.any(String),
          newValue: "CY456",
        }),
        expect.objectContaining({
          eventType: "flight_parent_changed",
          oldValue: "Morgan Parent",
          newValue: "Taylor Parent",
        }),
        expect.objectContaining({
          eventType: "flight_cat_assigned",
          cat: expect.objectContaining({ id: cat.id, name: cat.name }),
        }),
        expect.objectContaining({
          eventType: "flight_cat_f2f_changed",
          oldValue: "false",
          newValue: "true",
        }),
        expect.objectContaining({
          eventType: "flight_cat_traces_changed",
          oldValue: "false",
          newValue: "true",
        }),
      ]),
    );
    const catHistory = await authAgent
      .get(`/api/cats/${cat.id}/history`)
      .expect(200);
    expect(catHistory.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "flight_cat_assigned",
          flight: expect.objectContaining({
            id: flightId,
            flightNumber: "CY456",
          }),
        }),
        expect.objectContaining({
          eventType: "flight_cat_f2f_changed",
          oldValue: "false",
          newValue: "true",
        }),
        expect.objectContaining({
          eventType: "flight_cat_traces_changed",
          oldValue: "false",
          newValue: "true",
        }),
      ]),
    );
    const globalHistory = await authAgent
      .get("/api/cats/history")
      .query({ catId: cat.id, limit: 100 })
      .expect(200);
    expect(globalHistory.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "flight_cat_f2f_changed",
          catId: cat.id,
        }),
      ]),
    );
    const allHistory = await authAgent
      .get("/api/cats/history")
      .query({ limit: 100 })
      .expect(200);
    expect(allHistory.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "flight_created",
          flight: expect.objectContaining({ id: flightId }),
        }),
      ]),
    );

    await authAgent
      .delete(`/api/flights/assignments/${assignment.body.id}`)
      .expect(204);
    await authAgent
      .post(`/api/flights/assignments/${assignment.body.id}/restore`)
      .expect(201);
    await authAgent.delete(`/api/flights/${flightId}`).expect(204);
    expect(
      (await authAgent.get("/api/flights").expect(200)).body.map(
        (flight: { id: string }) => flight.id,
      ),
    ).not.toContain(flightId);
    expect(
      await authAgent
        .get("/api/flights/deleted")
        .expect(200)
        .then((response) => response.body),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: flightId,
          deletedAt: expect.any(String),
        }),
      ]),
    );
    expect(
      (await authAgent.get(`/api/flights/${flightId}/history`).expect(200))
        .body,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "flight_deleted",
          flight: expect.objectContaining({ isDeleted: true }),
        }),
      ]),
    );
    await authAgent.post(`/api/flights/${flightId}/restore`).expect(201);
    expect(
      (await authAgent.get(`/api/flights/${flightId}`).expect(200)).body.id,
    ).toBe(flightId);
  });

  it("validates required fields and keeps flights separated by the user test partition", async () => {
    await authAgent
      .post("/api/flights")
      .send({ date: "2026-10-15", airport: "Larnaca" })
      .expect(400);
    const testUser = await createAuthenticatedAgent(app, prisma, true);
    const testFlight = await testUser.agent
      .post("/api/flights")
      .send({
        date: "2026-10-15",
        airport: "Paphos",
        flightNumber: unique("TEST"),
        flightParent: "Test Parent",
      })
      .expect(201);
    await authAgent.get(`/api/flights/${testFlight.body.id}`).expect(404);
    await testUser.agent
      .delete(`/api/flights/${testFlight.body.id}`)
      .expect(204);
    expect(testUser.user.isTest).toBe(true);
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
  const email = `${unique("flight-auth")}@example.com`;
  const password = "flight-integration-password";
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      fullName: "Flights Integration User",
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
