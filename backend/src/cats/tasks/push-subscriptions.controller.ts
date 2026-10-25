import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { IsString, IsUrl, MinLength } from "class-validator";
import { CurrentUser, JwtAuthGuard } from "../../auth";
import { PrismaService } from "../../database/prisma.service";
import { PushNotificationService } from "./push-notification.service";

class PushSubscriptionDto {
  @IsUrl({ require_tld: false }) endpoint!: string;
  @IsString() @MinLength(1) p256dh!: string;
  @IsString() @MinLength(1) auth!: string;
}

@Controller("api/push-subscriptions")
@UseGuards(JwtAuthGuard)
export class PushSubscriptionsController {
  constructor(private readonly prisma: PrismaService, private readonly push: PushNotificationService) {}

  @Get("public-key")
  publicKey() {
    return { publicKey: this.push.publicKey };
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsubscribe(@Body() body: Pick<PushSubscriptionDto, "endpoint">, @CurrentUser() user: { id: string }): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint, userId: user.id } });
  }

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async subscribe(@Body() body: PushSubscriptionDto, @CurrentUser() user: { id: string }): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      create: { ...body, userId: user.id },
      update: { ...body, userId: user.id },
    });
  }
}
