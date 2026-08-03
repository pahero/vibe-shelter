import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { AuditService } from './audit.service';

@Controller('api/audit')
@UseGuards(SessionAuthGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  async listAudit(
    @Query('user') user?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.list({
      user,
      from,
      to,
      skip: skip === undefined ? undefined : Number(skip),
      limit: limit === undefined ? undefined : Number(limit),
    });
  }
}
