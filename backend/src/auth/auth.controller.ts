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
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Response } from "express";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Public } from "./decorators/public.decorator";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import {
  AuthMeDto,
  ChangePasswordDto,
  PasswordLoginDto,
  ReplaceTemporaryPasswordDto,
  ForgotPasswordDto,
} from "./dto";
import { ValidatePasswordCredentialsHandler } from "./queries/validate-password-credentials.handler";
import { ChangePasswordHandler } from "./commands/change-password.handler";
import { ReplaceTemporaryPasswordHandler } from "./commands/replace-temporary-password.handler";
import { ForgotPasswordHandler } from "./commands/forgot-password.handler";
import { signJwt } from "./jwt-token";
import { CreateRefreshTokenHandler } from "./commands/create-refresh-token.handler";
import { RotateRefreshTokenHandler } from "./commands/rotate-refresh-token.handler";
import { RevokeRefreshTokenHandler } from "./commands/revoke-refresh-token.handler";
import { assertSameOrigin, clearAuthCookies, readCookie, refreshCookieName, setAuthCookies } from "./auth-cookie";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly validatePasswordCredentialsHandler: ValidatePasswordCredentialsHandler,
    private readonly changePasswordHandler: ChangePasswordHandler,
    private readonly replaceTemporaryPasswordHandler: ReplaceTemporaryPasswordHandler,
    private readonly createRefreshTokenHandler: CreateRefreshTokenHandler,
    private readonly rotateRefreshTokenHandler: RotateRefreshTokenHandler,
    private readonly revokeRefreshTokenHandler: RevokeRefreshTokenHandler,
    private readonly forgotPasswordHandler: ForgotPasswordHandler,
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

      const refreshToken = await this.createRefreshTokenHandler.handle(user.id);
      setAuthCookies(res, this.issueToken(user), refreshToken, this.nodeEnv);
      const frontendUrl = this.configService.get<string>("frontendUrl");
      res.redirect(frontendUrl!);
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
  @HttpCode(HttpStatus.OK)
  @Public()
  async passwordLogin(
    @Body() body: PasswordLoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthMeDto> {
    const command = body.toCommand();
    const user = await this.validatePasswordCredentialsHandler.handle(
      command.email,
      command.password,
    );
    const refreshToken = await this.createRefreshTokenHandler.handle(user.id);
    setAuthCookies(response, this.issueToken(user), refreshToken, this.nodeEnv);
    return this.toAuthMe(user);
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @Public()
  async forgotPassword(@Body() body: ForgotPasswordDto): Promise<{ message: string }> {
    const command = body.toCommand();
    await this.forgotPasswordHandler.handle(command.email, command.captchaToken);
    return { message: "If an eligible account exists, a temporary password has been emailed." };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: Express.User): Promise<AuthMeDto> {
    if (!user) {
      throw new UnauthorizedException("User not authenticated");
    }

    return this.toAuthMe(user);
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @Public()
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    assertSameOrigin(request, this.configService.get<string>("frontendUrl", "http://localhost:4001"));
    const refreshToken = readCookie(request.headers.cookie, refreshCookieName(this.nodeEnv));
    if (refreshToken) await this.revokeRefreshTokenHandler.handle(refreshToken);
    clearAuthCookies(response, this.nodeEnv);
    return { message: "Logged out successfully" };
  }

  @Post("token")
  @HttpCode(HttpStatus.OK)
  @Public()
  async refreshToken(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    assertSameOrigin(request, this.configService.get<string>("frontendUrl", "http://localhost:4001"));
    const refreshToken = readCookie(request.headers.cookie, refreshCookieName(this.nodeEnv));
    if (!refreshToken) throw new UnauthorizedException("Refresh cookie required");
    const rotated = await this.rotateRefreshTokenHandler.handle(refreshToken);
    setAuthCookies(response, this.issueToken(rotated.user), rotated.refreshToken, this.nodeEnv);
    return { message: "Tokens refreshed" };
  }

  private issueToken(user: Express.User): string {
    return signJwt(user, this.configService.get<string>("jwtSecret") ?? "");
  }

  private get nodeEnv(): string {
    return this.configService.get<string>("nodeEnv", "development");
  }

  private toAuthMe(user: Express.User): AuthMeDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role.toLowerCase() as "owner" | "admin" | "staff",
      isTest: user.isTest,
      passwordChangeRequired: user.passwordChangeRequired,
    };
  }
}
