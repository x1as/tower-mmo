import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { GameService } from './game.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/game',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GameGateway.name);

  constructor(private readonly gameService: GameService) {}

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.gameService.removePlayer(client.id);
  }

  @SubscribeMessage('join_game')
  handleJoinGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; heroClass: string },
  ): void {
    const { gameId, heroClass } = data;
    client.join(gameId);
    this.gameService.addPlayer(client.id, gameId, heroClass);
    const state = this.gameService.getGameState(gameId);
    client.emit('game_state', state);
    this.logger.log(`Player ${client.id} joined game ${gameId} as ${heroClass}`);
  }

  @SubscribeMessage('tower_place')
  handleTowerPlace(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { towerType: string; gridX: number; gridY: number },
  ): void {
    const gameId = this.gameService.getPlayerGameId(client.id);
    if (!gameId) return;

    const result = this.gameService.placeTower(gameId, client.id, data.towerType, data.gridX, data.gridY);
    if (result) {
      this.server.to(gameId).emit('tower_placed', result);
    }
  }

  @SubscribeMessage('tower_upgrade')
  handleTowerUpgrade(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { towerId: string },
  ): void {
    const gameId = this.gameService.getPlayerGameId(client.id);
    if (!gameId) return;
    this.gameService.upgradeTower(gameId, data.towerId);
  }

  @SubscribeMessage('tower_sell')
  handleTowerSell(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { towerId: string },
  ): void {
    const gameId = this.gameService.getPlayerGameId(client.id);
    if (!gameId) return;
    this.gameService.sellTower(gameId, data.towerId);
  }

  @SubscribeMessage('hero_move')
  handleHeroMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { x: number; y: number; direction: string },
  ): void {
    const gameId = this.gameService.getPlayerGameId(client.id);
    if (!gameId) return;
    this.gameService.moveHero(gameId, client.id, data.x, data.y, data.direction);
    this.server.to(gameId).emit('hero_sync', {
      players: this.gameService.getHeroes(gameId),
    });
  }

  @SubscribeMessage('hero_ability')
  handleHeroAbility(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetX: number; targetY: number },
  ): void {
    const gameId = this.gameService.getPlayerGameId(client.id);
    if (!gameId) return;
    this.gameService.useAbility(gameId, client.id, data.targetX, data.targetY);
  }

  @SubscribeMessage('start_wave')
  handleStartWave(@ConnectedSocket() client: Socket): void {
    const gameId = this.gameService.getPlayerGameId(client.id);
    if (!gameId) return;
    const waveData = this.gameService.startWave(gameId);
    if (waveData) {
      this.server.to(gameId).emit('wave_start', waveData);
    }
  }

  @SubscribeMessage('loot_pickup')
  handleLootPickup(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { itemId: string },
  ): void {
    const gameId = this.gameService.getPlayerGameId(client.id);
    if (!gameId) return;
    this.gameService.pickupLoot(gameId, client.id, data.itemId);
  }
}
