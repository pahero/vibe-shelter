import { Prisma, PrismaClient } from "@prisma/client";

function uniqueFlightTestValue(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function createFlightTestActor(prisma: Prisma.TransactionClient | PrismaClient) {
  return prisma.user.create({ data: { email: `${uniqueFlightTestValue("flight-actor")}@example.test`, fullName: "Flight Test Actor" } });
}

export async function createFlightFixture(
  prisma: Prisma.TransactionClient | PrismaClient,
  overrides: Partial<Pick<Prisma.FlightCreateInput, "isTest" | "deletedAt" | "date" | "airport" | "flightNumber" | "flightParent">> = {},
) {
  return prisma.flight.create({
    data: {
      date: new Date("2026-10-15"),
      airport: uniqueFlightTestValue("airport"),
      flightNumber: uniqueFlightTestValue("number"),
      flightParent: uniqueFlightTestValue("parent"),
      ...overrides,
    },
  });
}

export async function createFlightTestCat(
  prisma: Prisma.TransactionClient | PrismaClient,
  isTest = false,
) {
  return prisma.cat.create({ data: { name: uniqueFlightTestValue("cat"), isTest } });
}

export async function createFlightAssignment(
  prisma: Prisma.TransactionClient | PrismaClient,
  flightId: string,
  catId: string,
  overrides: Partial<Pick<Prisma.FlightCatAssignmentCreateInput, "f2fDone" | "tracesDone" | "deletedAt">> = {},
) {
  return prisma.flightCatAssignment.create({ data: { flightId, catId, ...overrides } });
}
