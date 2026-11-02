import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Request } from "express";

@Injectable()
export class OwnerRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<Request>().user;
    if (!user) throw new ForbiddenException("User not authenticated");
    if (user.role !== "OWNER")
      throw new ForbiddenException("Owner access required");
    return true;
  }
}
