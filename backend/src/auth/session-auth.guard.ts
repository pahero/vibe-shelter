import {
  ForbiddenException,
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { ValidateSessionHandler } from "./queries/validate-session.handler";
import { Request } from "express";

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly validateSessionHandler: ValidateSessionHandler,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const sessionId = request.session?.sessionId;

    if (!sessionId) {
      throw new UnauthorizedException("No session found");
    }

    try {
      const session = await this.validateSessionHandler.handle(sessionId);
      const permittedPaths = [
        "/auth/me",
        "/auth/change-password",
        "/auth/replace-temporary-password",
        "/auth/logout",
      ];
      if (
        session.user.passwordChangeRequired &&
        !permittedPaths.includes(request.path)
      ) {
        throw new ForbiddenException(
          "Password change is required before accessing the API",
        );
      }
      request.user = session.user;
      request.session.userId = session.userId;
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "Unauthorized";
      throw new UnauthorizedException(message);
    }
  }
}
