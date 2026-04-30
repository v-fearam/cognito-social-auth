import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AdminGroupGuard } from './auth/admin-group.guard';
import { CognitoAuthGuard } from './auth/cognito-auth.guard';

type CognitoRequest = Request & {
  user?: {
    sub?: string;
    email?: string;
    username?: string;
    client_id?: string;
    scope?: string;
    'cognito:groups'?: string[];
  };
};

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @UseGuards(CognitoAuthGuard)
  @Get('profile')
  profile(@Req() request: CognitoRequest) {
    const user = request.user;

    return {
      sub: user?.sub,
      email: user?.email,
      username: user?.username,
      groups: user?.['cognito:groups'] ?? [],
      client_id: user?.client_id,
      scope: user?.scope,
      message: 'Valid Cognito access token',
    };
  }

  @UseGuards(CognitoAuthGuard, AdminGroupGuard)
  @Get('admin')
  admin() {
    return {
      message: 'Admin access granted',
      secret: 'admin-dashboard-data',
    };
  }
}
