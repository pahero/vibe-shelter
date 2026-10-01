import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { GoogleStrategy } from "./strategies/google.strategy";
import { DatabaseModule } from "@/database/database.module";
import { SessionAuthGuard } from "./session-auth.guard";
import { AdminRoleGuard } from "./admin-role.guard";
import { ValidateGoogleProfileHandler } from "./queries/validate-google-profile.handler";
import { ValidatePasswordCredentialsHandler } from "./queries/validate-password-credentials.handler";
import { ValidateSessionHandler } from "./queries/validate-session.handler";
import { ChangePasswordHandler } from "./commands/change-password.handler";
import { ReplaceTemporaryPasswordHandler } from "./commands/replace-temporary-password.handler";
import { CreateSessionHandler } from "./commands/create-session.handler";
import { RevokeSessionHandler } from "./commands/revoke-session.handler";

@Module({
  imports: [PassportModule, DatabaseModule],
  controllers: [AuthController],
  providers: [
    GoogleStrategy,
    SessionAuthGuard,
    AdminRoleGuard,
    ValidateGoogleProfileHandler,
    ValidatePasswordCredentialsHandler,
    ValidateSessionHandler,
    ChangePasswordHandler,
    ReplaceTemporaryPasswordHandler,
    CreateSessionHandler,
    RevokeSessionHandler,
  ],
  exports: [ValidateSessionHandler],
})
export class AuthModule {}
