import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AdminGroupGuard } from './auth/admin-group.guard';
import { CognitoAuthGuard } from './auth/cognito-auth.guard';
import { CognitoTokenVerifierService } from './auth/cognito-token-verifier.service';
import { ViewerGroupGuard } from './auth/viewer-group.guard';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    CognitoTokenVerifierService,
    CognitoAuthGuard,
    AdminGroupGuard,
    ViewerGroupGuard,
  ],
})
export class AppModule {}
