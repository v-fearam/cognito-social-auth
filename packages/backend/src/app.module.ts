import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AdminGroupGuard } from './auth/admin-group.guard';
import { CognitoAuthGuard } from './auth/cognito-auth.guard';
import { CognitoTokenVerifierService } from './auth/cognito-token-verifier.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [CognitoTokenVerifierService, CognitoAuthGuard, AdminGroupGuard],
})
export class AppModule {}
