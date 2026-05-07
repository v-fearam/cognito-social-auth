import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AdminGroupGuard } from './auth/admin-group.guard';
import { EntraAuthGuard } from './auth/cognito-auth.guard';
import { ViewerGroupGuard } from './auth/viewer-group.guard';

type EntraRequest = Request & {
  user?: {
    oid?: string;
    email?: string;
    preferred_username?: string;
    azp?: string;
    scp?: string;
    tier?: string;
    roles?: string[];
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

  @UseGuards(EntraAuthGuard)
  @Get('profile')
  profile(@Req() request: EntraRequest) {
    const user = request.user;

    return {
      oid: user?.oid,
      email: user?.email,
      username: user?.preferred_username,
      tier: user?.tier,
      roles: user?.roles ?? [],
      azp: user?.azp,
      scope: user?.scp,
      message: 'Valid Entra access token',
      businessResult: 'This is the Business result for the controller ProfileController',
    };
  }

  @UseGuards(EntraAuthGuard, ViewerGroupGuard)
  @Get('viewer')
  viewer(@Req() request: EntraRequest) {
    return {
      message: 'Viewer access granted',
      businessResult: 'This is the Business result for the controller ViewerController',
      tier: request.user?.tier,
      data: 'viewer-dashboard-data',
    };
  }

  @UseGuards(EntraAuthGuard, AdminGroupGuard)
  @Get('admin')
  admin() {
    return {
      message: 'Admin access granted',
      businessResult: 'This is the Business result for the controller AdminController',
      secret: 'admin-dashboard-data',
    };
  }
}
