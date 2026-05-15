import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AdminGroupGuard } from './auth/admin-group.guard';
import { EntraAuthGuard } from './auth/cognito-auth.guard';
import { EntraTokenVerifierService } from './auth/cognito-token-verifier.service';
import { ViewerGroupGuard } from './auth/viewer-group.guard';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    EntraTokenVerifierService,
    EntraAuthGuard,
    AdminGroupGuard,
    ViewerGroupGuard,
  ],
})
export class AppModule {}
