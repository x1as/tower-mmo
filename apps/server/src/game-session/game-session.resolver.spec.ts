import { Test, TestingModule } from '@nestjs/testing';
import { GameSessionResolver } from './game-session.resolver';

describe('GameSessionResolver', () => {
  let resolver: GameSessionResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameSessionResolver],
    }).compile();

    resolver = module.get<GameSessionResolver>(GameSessionResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
