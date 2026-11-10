import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { toUserResponse } from "../user-response.mapper";

@Injectable()
export class ListReminderReceiversHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(isTest: boolean) {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null, status: "ACTIVE", isTest },
      orderBy: [{ fullName: "asc" }, { id: "asc" }],
    });
    return users.map(toUserResponse);
  }
}
