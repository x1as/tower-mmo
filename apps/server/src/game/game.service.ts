import { Injectable, Logger } from '@nestjs/common';

/**
 * Server-authoritative game state management.
 * Phase 2: will hold full game simulation.
 * Currently provides basic room/player management for Socket.IO multiplayer.
 */

interface PlayerInfo {
  id: string;
  gameId: string;
  heroClass: string;
  x: number;
  y: number;
  direction: string;
}

interface TowerInfo {
  id: string;
  type: string;
  gridX: number;
  gridY: number;
  tier: number;
  ownerId: string;
}

interface GameRoom {
  id: string;
  wave: number;
  phase: 'build' | 'combat' | 'wave_end' | 'game_over';
  baseHp: number;
  gold: number;
  players: Map<string, PlayerInfo>;
  towers: TowerInfo[];
  lootDrops: Array<{ id: string; itemId: string; x: number; y: number }>;
}

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);
  private rooms = new Map<string, GameRoom>();
  private playerGameMap = new Map<string, string>(); // playerId -> gameId

  private getOrCreateRoom(gameId: string): GameRoom {
    if (!this.rooms.has(gameId)) {
      this.rooms.set(gameId, {
        id: gameId,
        wave: 0,
        phase: 'build',
        baseHp: 20,
        gold: 200,
        players: new Map(),
        towers: [],
        lootDrops: [],
      });
    }
    return this.rooms.get(gameId)!;
  }

  addPlayer(playerId: string, gameId: string, heroClass: string): void {
    const room = this.getOrCreateRoom(gameId);
    room.players.set(playerId, {
      id: playerId,
      gameId,
      heroClass,
      x: 384,
      y: 288,
      direction: 'down',
    });
    this.playerGameMap.set(playerId, gameId);
    this.logger.log(`Player ${playerId} added to room ${gameId}`);
  }

  removePlayer(playerId: string): void {
    const gameId = this.playerGameMap.get(playerId);
    if (!gameId) return;
    const room = this.rooms.get(gameId);
    if (room) {
      room.players.delete(playerId);
      if (room.players.size === 0) {
        this.rooms.delete(gameId);
      }
    }
    this.playerGameMap.delete(playerId);
  }

  getPlayerGameId(playerId: string): string | null {
    return this.playerGameMap.get(playerId) || null;
  }

  getGameState(gameId: string) {
    const room = this.getOrCreateRoom(gameId);
    return {
      gameId: room.id,
      wave: room.wave,
      phase: room.phase,
      baseHp: room.baseHp,
      gold: room.gold,
      players: Array.from(room.players.values()),
      towers: room.towers,
    };
  }

  getHeroes(gameId: string) {
    const room = this.rooms.get(gameId);
    if (!room) return [];
    return Array.from(room.players.values());
  }

  placeTower(gameId: string, playerId: string, towerType: string, gridX: number, gridY: number) {
    const room = this.rooms.get(gameId);
    if (!room) return null;

    const tower: TowerInfo = {
      id: `t${Date.now()}`,
      type: towerType,
      gridX,
      gridY,
      tier: 1,
      ownerId: playerId,
    };
    room.towers.push(tower);
    return tower;
  }

  upgradeTower(gameId: string, towerId: string): void {
    const room = this.rooms.get(gameId);
    if (!room) return;
    const tower = room.towers.find(t => t.id === towerId);
    if (tower && tower.tier < 3) {
      tower.tier++;
    }
  }

  sellTower(gameId: string, towerId: string): void {
    const room = this.rooms.get(gameId);
    if (!room) return;
    room.towers = room.towers.filter(t => t.id !== towerId);
  }

  moveHero(gameId: string, playerId: string, x: number, y: number, direction: string): void {
    const room = this.rooms.get(gameId);
    if (!room) return;
    const player = room.players.get(playerId);
    if (player) {
      player.x = x;
      player.y = y;
      player.direction = direction;
    }
  }

  useAbility(gameId: string, playerId: string, _targetX: number, _targetY: number): void {
    // Phase 2: server-authoritative ability execution
    this.logger.log(`Player ${playerId} used ability in game ${gameId}`);
  }

  startWave(gameId: string) {
    const room = this.rooms.get(gameId);
    if (!room) return null;
    if (room.phase !== 'build' && room.phase !== 'wave_end') return null;

    room.wave++;
    room.phase = 'combat';

    return {
      waveNumber: room.wave,
      enemies: [
        { type: 'runner', count: 5 + room.wave * 2 },
      ],
    };
  }

  pickupLoot(gameId: string, _playerId: string, itemId: string): void {
    const room = this.rooms.get(gameId);
    if (!room) return;
    room.lootDrops = room.lootDrops.filter(d => d.id !== itemId);
  }
}
