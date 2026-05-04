import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AdminGroupGuard } from './auth/admin-group.guard';
import { CognitoAuthGuard } from './auth/cognito-auth.guard';
import { ViewerGroupGuard } from './auth/viewer-group.guard';

type CognitoRequest = Request & {
  user?: {
    sub?: string;
    email?: string;
    username?: string;
    client_id?: string;
    scope?: string;
    'custom:tier'?: string;
    'cognito:groups'?: string[];
  };
};

@Controller()
export class AppController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      message: 'Health controller responded successfully',
      businessResult: 'This is the Business result for the controller HealthController',
    };
  }

  @UseGuards(CognitoAuthGuard)
  @Get('profile')
  profile(@Req() request: CognitoRequest) {
    const user = request.user;

    return {
      sub: user?.sub,
      email: user?.email,
      username: user?.username,
      tier: user?.['custom:tier'],
      groups: user?.['cognito:groups'] ?? [],
      client_id: user?.client_id,
      scope: user?.scope,
      message: 'Valid Cognito access token',
      businessResult: 'This is the Business result for the controller ProfileController',
    };
  }

  @UseGuards(CognitoAuthGuard, ViewerGroupGuard)
  @Get('viewer')
  viewer(@Req() request: CognitoRequest) {
    return {
      message: 'Viewer access granted',
      businessResult: 'This is the Business result for the controller ViewerController',
      tier: request.user?.['custom:tier'],
      data: 'viewer-dashboard-data',
    };
  }

  @UseGuards(CognitoAuthGuard, AdminGroupGuard)
  @Get('admin')
  admin() {
    return {
      message: 'Admin access granted',
      businessResult: 'This is the Business result for the controller AdminController',
      secret: 'admin-dashboard-data',
    };
  }
}
