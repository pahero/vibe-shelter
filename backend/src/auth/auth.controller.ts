import {
  Controller,
  Get,
  Post,
  UseGuards,
  Res,
  Req,
  Body,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '@/users/users.service';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';
import { AuthMeDto, PasswordLoginDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Passport redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const user = req.user as any;

      if (!user) {
        throw new UnauthorizedException('Google authentication failed');
      }

      // Create session
      const session = await this.authService.createSession(
        user.id,
        req.get('user-agent'),
        req.ip,
      );

      // Set session cookie
      req.session.userId = user.id;
      req.session.sessionId = session.id;

      // Redirect to frontend
      const frontendUrl = this.configService.get<string>('frontendUrl');
      res.redirect(`${frontendUrl}/dashboard`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      const frontendUrl = this.configService.get<string>('frontendUrl');
      res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorMessage)}`);
    }
  }

  @Post('login')
  async passwordLogin(@Body() body: PasswordLoginDto, @Req() req: Request): Promise<AuthMeDto> {
    const user = await this.authService.validatePasswordCredentials(body.email, body.password);
    const session = await this.authService.createSession(user.id, req.get('user-agent'), req.ip);

    req.session.userId = user.id;
    req.session.sessionId = session.id;

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role.toLowerCase(),
    };
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  async getCurrentUser(@CurrentUser() user: any): Promise<AuthMeDto> {
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role.toLowerCase(),
    };
  }

  @Post('logout')
  @UseGuards(SessionAuthGuard)
  async logout(@Req() req: Request, @Res() res: Response) {
    try {
      const sessionId = req.session.sessionId;

      if (sessionId) {
        await this.authService.revokeSession(sessionId);
      }

      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: 'Logout failed' });
        }
        res.clearCookie('connect.sid'); // or your session cookie name
        res.json({ message: 'Logged out successfully' });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Logout failed', error: message });
    }
  }

  @Post('session/refresh')
  @UseGuards(SessionAuthGuard)
  async refreshSession(@Req() req: Request) {
    try {
      const userId = req.session.userId;

      if (!userId) {
        throw new UnauthorizedException('Invalid session');
      }

      // Create new session
      const newSession = await this.authService.createSession(
        userId,
        req.get('user-agent'),
        req.ip,
      );

      req.session.sessionId = newSession.id;

      return { message: 'Session refreshed' };
    } catch (error) {
      throw new BadRequestException('Failed to refresh session');
    }
  }
}
