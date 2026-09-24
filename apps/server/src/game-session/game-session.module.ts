import { Module } from '@nestjs/common';
import { GameSessionService } from './game-session.service';
import { GameSessionResolver } from './game-session.resolver';

@Module({
  providers: [GameSessionService, GameSessionResolver]
})
export class GameSessionModule {}
