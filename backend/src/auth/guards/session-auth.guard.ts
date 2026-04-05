import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Request } from 'express';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const sessionId = request.session?.sessionId;

    if (!sessionId) {
      throw new UnauthorizedException('No session found');
    }

    try {
      const session = await this.authService.validateSession(sessionId);
      request.user = session.user;
      request.session.userId = session.userId;
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unauthorized';
      throw new UnauthorizedException(message);
    }
  }
}
