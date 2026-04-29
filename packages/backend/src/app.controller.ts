import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('profile')
  profile() {
    return {
      sub: 'mock-sub-123',
      email: 'user@example.com',
      groups: ['viewer'],
      tier: 'free',
      message: 'This is the profile endpoint (no auth yet)',
    };
  }

  @Get('admin')
  admin() {
    return {
      message: 'This is the admin endpoint (no auth yet)',
      secret: 'admin-dashboard-data',
    };
  }
}
