import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, OwnerRoleGuard, Public } from "./auth";

@Controller()
export class AppController {
  @Get("health")
  @Public()
  healthCheck() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("api/sentry-test-error")
  @UseGuards(JwtAuthGuard, OwnerRoleGuard)
  sentryTestError(): never {
    throw new Error("Better Stack backend Sentry test error");
  }
}
