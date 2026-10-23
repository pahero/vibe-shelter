import {
  ForbiddenException,
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { ConfigService } from "@nestjs/config";
import { verifyJwt } from "./jwt-token";
import { accessCookieName, assertSameOrigin, readCookie } from "./auth-cookie";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const frontendUrl = this.configService.get<string>("frontendUrl", "http://localhost:4001");
    assertSameOrigin(request, frontendUrl);
    const nodeEnv = this.configService.get<string>("nodeEnv", "development");
    const token = readCookie(request.headers.cookie, accessCookieName(nodeEnv));
    if (!token) throw new UnauthorizedException("Authentication cookie required");
    try {
      const user = verifyJwt(token, this.configService.get<string>("jwtSecret") ?? "");
      const permittedPaths = [
        "/auth/me",
        "/auth/change-password",
        "/auth/replace-temporary-password",
        "/auth/logout",
      ];
      if (
        user.passwordChangeRequired &&
        !permittedPaths.includes(request.path)
      ) {
        throw new ForbiddenException(
          "Password change is required before accessing the API",
        );
      }
      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException("Invalid bearer token");
    }
  }
}
