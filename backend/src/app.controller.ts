import { Controller, Get } from "@nestjs/common";
import { Public } from "./auth";

@Controller("health")
export class AppController {
  @Get()
  @Public()
  healthCheck() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
