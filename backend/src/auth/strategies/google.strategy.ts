import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback, Profile } from "passport-google-oauth20";
import { ConfigService } from "@nestjs/config";
import { ValidateGoogleProfileHandler } from "../queries/validate-google-profile.handler";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(
    configService: ConfigService,
    private readonly validateGoogleProfileHandler: ValidateGoogleProfileHandler,
  ) {
    super({
      clientID: configService.getOrThrow<string>("googleClientId"),
      clientSecret: configService.getOrThrow<string>("googleClientSecret"),
      callbackURL: configService.getOrThrow<string>("googleCallbackUrl"),
      scope: ["profile", "email"],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const user = await this.validateGoogleProfileHandler.handle(profile);
      done(null, user);
    } catch (error) {
      done(error);
    }
  }
}
