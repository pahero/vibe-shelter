import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class AppController {
  @Get()
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
