import {
  Controller,
  Get,
  Post,
  UseGuards,
  Res,
  Req,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Response, Request } from "express";
import { SessionAuthGuard } from "./session-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Public } from "./decorators/public.decorator";
import { ConfigService } from "@nestjs/config";
import {
  AuthMeDto,
  ChangePasswordDto,
  PasswordLoginDto,
  ReplaceTemporaryPasswordDto,
} from "./dto";
import { CreateSessionHandler } from "./commands/create-session.handler";
import { ValidatePasswordCredentialsHandler } from "./queries/validate-password-credentials.handler";
import { ChangePasswordHandler } from "./commands/change-password.handler";
import { ReplaceTemporaryPasswordHandler } from "./commands/replace-temporary-password.handler";
import { RevokeSessionHandler } from "./commands/revoke-session.handler";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly createSessionHandler: CreateSessionHandler,
    private readonly validatePasswordCredentialsHandler: ValidatePasswordCredentialsHandler,
    private readonly changePasswordHandler: ChangePasswordHandler,
    private readonly replaceTemporaryPasswordHandler: ReplaceTemporaryPasswordHandler,
    private readonly revokeSessionHandler: RevokeSessionHandler,
    private readonly configService: ConfigService,
  ) {}

  @Get("google")
  @UseGuards(AuthGuard("google"))
  async googleAuth() {
    // Passport redirects to Google
    return undefined;
  }

  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const user = req.user;

      if (!user) {
        throw new UnauthorizedException("Google authentication failed");
      }

      // Create session
      const session = await this.createSessionHandler.handle(
        user.id,
        req.get("user-agent"),
        req.ip,
      );

      // Set session cookie
      req.session.userId = user.id;
      req.session.sessionId = session.id;

      // Redirect to frontend
      const frontendUrl = this.configService.get<string>("frontendUrl");
      res.redirect(`${frontendUrl}/dashboard`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Authentication failed";
      const frontendUrl = this.configService.get<string>("frontendUrl");
      res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent(errorMessage)}`,
      );
    }
  }

  @Post("login")
  @Public()
  async passwordLogin(
    @Body() body: PasswordLoginDto,
    @Req() req: Request,
  ): Promise<AuthMeDto> {
    const command = body.toCommand();
    const user = await this.validatePasswordCredentialsHandler.handle(
      command.email,
      command.password,
    );
    const session = await this.createSessionHandler.handle(
      user.id,
      req.get("user-agent"),
      req.ip,
    );

    req.session.userId = user.id;
    req.session.sessionId = session.id;

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role.toLowerCase() as "admin" | "staff",
      isTest: user.isTest,
      passwordChangeRequired: user.passwordChangeRequired,
    };
  }

  @Get("me")
  @UseGuards(SessionAuthGuard)
  async getCurrentUser(@CurrentUser() user: Express.User): Promise<AuthMeDto> {
    if (!user) {
      throw new UnauthorizedException("User not authenticated");
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role.toLowerCase() as "admin" | "staff",
      isTest: user.isTest,
      passwordChangeRequired: user.passwordChangeRequired,
    };
  }

  @Post("change-password")
  @UseGuards(SessionAuthGuard)
  async changePassword(
    @CurrentUser() user: Express.User,
    @Body() body: ChangePasswordDto,
  ): Promise<{ id: string }> {
    const command = body.toCommand(user.id);
    await this.changePasswordHandler.handle(
      command.userId,
      command.currentPassword,
      command.newPassword,
    );
    return { id: user.id };
  }

  @Post("replace-temporary-password")
  @UseGuards(SessionAuthGuard)
  async replaceTemporaryPassword(
    @CurrentUser() user: Express.User,
    @Body() body: ReplaceTemporaryPasswordDto,
  ): Promise<{ id: string }> {
    const command = body.toCommand(user.id);
    await this.replaceTemporaryPasswordHandler.handle(
      command.userId,
      command.newPassword,
    );
    return { id: user.id };
  }
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionAuthGuard)
  async logout(@Req() req: Request, @Res() res: Response) {
    const sessionId = req.session.sessionId;
    await (sessionId
      ? this.revokeSessionHandler.handle(sessionId)
      : Promise.resolve());
    req.session.destroy((error) => {
      res.clearCookie("connect.sid");
      res
        .status(error ? HttpStatus.INTERNAL_SERVER_ERROR : HttpStatus.OK)
        .json(
          error
            ? { message: "Logout failed" }
            : { message: "Logged out successfully" },
        );
    });
  }

  @Post("session/refresh")
  @UseGuards(SessionAuthGuard)
  async refreshSession(@Req() req: Request) {
    try {
      const userId = req.session.userId;

      if (!userId) {
        throw new UnauthorizedException("Invalid session");
      }

      // Create new session
      const newSession = await this.createSessionHandler.handle(
        userId,
        req.get("user-agent"),
        req.ip,
      );

      req.session.sessionId = newSession.id;

      return { message: "Session refreshed" };
    } catch (error) {
      throw new BadRequestException("Failed to refresh session");
    }
  }
}
