import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../database/prisma.service";
import type { Profile } from "passport-google-oauth20";

@Injectable()
export class ValidateGoogleProfileHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async handle(profile: Profile) {
    const email = profile.emails?.[0]?.value;
    const allowedDomain = this.config.get<string>("allowedGoogleDomain");
    if (!email) throw new BadRequestException("No email from Google profile");
    if (allowedDomain && email.split("@")[1] !== allowedDomain)
      throw new UnauthorizedException("Email domain not allowed");
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
    if (!user)
      throw new UnauthorizedException(
        "User not found. Please contact administrator to create account.",
      );
    if (user.status !== "ACTIVE")
      throw new UnauthorizedException("User account is inactive");
    return user;
  }
}
