import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { GoogleStrategy } from "./strategies/google.strategy";
import { DatabaseModule } from "@/database/database.module";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { AdminRoleGuard } from "./admin-role.guard";
import { ValidateGoogleProfileHandler } from "./queries/validate-google-profile.handler";
import { ValidatePasswordCredentialsHandler } from "./queries/validate-password-credentials.handler";
import { ChangePasswordHandler } from "./commands/change-password.handler";
import { ReplaceTemporaryPasswordHandler } from "./commands/replace-temporary-password.handler";
import { CreateRefreshTokenHandler } from "./commands/create-refresh-token.handler";
import { RotateRefreshTokenHandler } from "./commands/rotate-refresh-token.handler";
import { RevokeRefreshTokenHandler } from "./commands/revoke-refresh-token.handler";
import { ForgotPasswordHandler } from "./commands/forgot-password.handler";

@Module({
  imports: [PassportModule, DatabaseModule],
  controllers: [AuthController],
  providers: [
    GoogleStrategy,
    JwtAuthGuard,
    AdminRoleGuard,
    ValidateGoogleProfileHandler,
    ValidatePasswordCredentialsHandler,
    ChangePasswordHandler,
    ReplaceTemporaryPasswordHandler,
    CreateRefreshTokenHandler,
    RotateRefreshTokenHandler,
    RevokeRefreshTokenHandler,
    ForgotPasswordHandler,
  ],
})
export class AuthModule {}
