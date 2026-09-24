import { Module } from '@nestjs/common';
import { EnemyService } from './enemy.service';

@Module({
  providers: [EnemyService]
})
export class EnemyModule {}
