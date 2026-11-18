import Phaser from 'phaser';
import {
  MAP_COLS, MAP_ROWS, DEFAULT_PATH, BASE_POINT, SPAWN_POINT,
  GAME_W, GAME_H, MAP_ORIGIN_X, MAP_ORIGIN_Y,
  ISO_W_HALF, ISO_H_HALF, ISO_TILE_SCREEN_DIST,
  SCALED_TILE_H, SCALED_TILE_FULL_H,
  TOWERS, ENEMIES, STARTING_GOLD, BASE_HP, PALETTE, AUGMENTS,
  MAX_AUGMENT_SLOTS, TOWER_TYPES_ORDERED, LOOT_TABLE,
   MIN_SPEED_MULT, TOWER_DUPLICATE_COST_MULT, CHEST_PRICES, CRAFT_RECIPES, isTowerUnlocked,
   DEPTH_PER_TILE, DEPTH_STONE, DEPTH_TREE,
   DEPTH_ENEMY_BAND, DEPTH_STRUCT_BAND, DEPTH_TOWER, DEPTH_SELECT,
  DEPTH_HOVER, DEPTH_RANGE, DEPTH_PLACEMENT, DEPTH_HP_BAR,
  DEPTH_COMBO, DEPTH_PARTICLE, DEPTH_LOOT, DEPTH_PROJECTILE,
  DEPTH_TEXT, DEPTH_EXPLOSION, DEPTH_WAVE_TEXT, DEPTH_OVERLAY, DEPTH_OVERLAY_TEXT,
  type TowerType, type EnemyType, type AugmentKind, type LootRarity,
  type TowerState, type AugmentEffect, type GameUIState,
  type InventoryItem, type EnemyResistance,
  rollLoot, shouldDropLoot, rollBossLoot, getWaveConfig, rollRandomKind,
} from '@tower/shared';

let _uid = 0;
function uid(): string { return `e${++_uid}`; }

// ─── Isometric Coordinate System ───
// use single projection -> round -> draw
// screenX = (col - row) * (tileWidth / 2) + originX
// screenY = (col + row) * (tileHeight / 2) + originY
// All coordinates rounded to integer pixels to prevent sub-pixel seams.

function tileToWorld(col: number, row: number): { x: number; y: number } {
  return {
    x: Math.round(MAP_ORIGIN_X + (col - row) * ISO_W_HALF),
    y: Math.round(MAP_ORIGIN_Y + (col + row) * ISO_H_HALF),
  };
}

function worldToTile(wx: number, wy: number): { col: number; row: number } {
  const rx = wx - MAP_ORIGIN_X;
  const ry = wy - MAP_ORIGIN_Y;
  const col = Math.floor((rx / ISO_W_HALF + ry / ISO_H_HALF) / 2);
  const row = Math.floor((ry / ISO_H_HALF - rx / ISO_W_HALF) / 2);
  return { col, row };
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function isoDepth(col: number, row: number, layerOffset: number = 0): number {
  return (col + row) * DEPTH_PER_TILE + layerOffset;
}

/** Depth for structures (trees, towers) — in the structure band, always above enemies */
function structDepth(col: number, row: number, layerOffset: number = 0): number {
  return DEPTH_STRUCT_BAND + (col + row) * DEPTH_PER_TILE + layerOffset;
}

// ─── Path Set ───

const PATH_SET = new Set(DEFAULT_PATH.map(([c, r]) => `${c},${r}`));
function isPathTile(col: number, row: number): boolean {
  return PATH_SET.has(`${col},${row}`);
}

// ─── Island Map Shape ───
// Full 14×14 square + chunky extensions outside to form an island silhouette.

function islandRng(a: number, b: number): number {
  const n = Math.sin(a * 17.1397 + b * 43.7291) * 29173.5137;
  return n - Math.floor(n);
}

// How far the island extends beyond the 14×14 core
const ISLAND_PAD = 5;
const ISLAND_MIN_C = -ISLAND_PAD;
const ISLAND_MAX_C = MAP_COLS - 1 + ISLAND_PAD;
const ISLAND_MIN_R = -ISLAND_PAD;
const ISLAND_MAX_R = MAP_ROWS - 1 + ISLAND_PAD;

function generateIslandShape(): Set<string> {
  const shape = new Set<string>();

  // Step 1: The entire 14×14 core is always present
  for (let col = 0; col < MAP_COLS; col++) {
    for (let row = 0; row < MAP_ROWS; row++) {
      shape.add(`${col},${row}`);
    }
  }

  // Step 2: Chunky rectangular extensions OUTSIDE the 14×14 grid
  // Each chunk: { x, y, w, h } — can go into negative coords or beyond 13
  const chunks: Array<{ x: number; y: number; w: number; h: number }> = [
    // Top side extensions
    { x: 2,   y: -3,  w: 6,  h: 3 },
    { x: 8,   y: -4,  w: 4,  h: 4 },
    { x: 5,   y: -2,  w: 3,  h: 2 },
    // Bottom side extensions
    { x: 1,   y: 14,  w: 5,  h: 3 },
    { x: 7,   y: 14,  w: 6,  h: 4 },
    { x: 4,   y: 14,  w: 4,  h: 2 },
    // Top-right extensions
    { x: 14,  y: -1,  w: 3,  h: 6 },
    { x: 14,  y: 4,   w: 4,  h: 4 },
    // Top-left extensions
    { x: -4,  y: 0,   w: 4,  h: 5 },
    { x: -3,  y: 5,   w: 3,  h: 4 },
    // Bottom-right extensions
    { x: 14,  y: 9,   w: 3,  h: 5 },
    { x: 13,  y: 13,  w: 4,  h: 3 },
    // Bottom-left extensions
    { x: -3,  y: 10,  w: 3,  h: 4 },
    { x: -2,  y: 7,   w: 2,  h: 3 },
    // Extra nubs for organic feel
    { x: 0,   y: -2,  w: 3,  h: 2 },
    { x: 11,  y: -3,  w: 3,  h: 3 },
    { x: -2,  y: 3,   w: 2,  h: 3 },
    { x: 14,  y: 7,   w: 2,  h: 3 },
    { x: 10,  y: 14,  w: 3,  h: 2 },
    { x: -1,  y: 12,  w: 2,  h: 3 },
  ];

  for (const ch of chunks) {
    for (let col = ch.x; col < ch.x + ch.w; col++) {
      for (let row = ch.y; row < ch.y + ch.h; row++) {
        if (col < ISLAND_MIN_C || col > ISLAND_MAX_C) continue;
        if (row < ISLAND_MIN_R || row > ISLAND_MAX_R) continue;
        // Wavy edge: erode outer border tiles randomly
        const edgeDist = Math.min(col - ch.x, ch.x + ch.w - 1 - col, row - ch.y, ch.y + ch.h - 1 - row);
        if (edgeDist > 0 || islandRng(col * 3 + 17, row * 5 + 23) > 0.3) {
          shape.add(`${col},${row}`);
        }
      }
    }
  }

  return shape;
}

const MAP_SHAPE = generateIslandShape();

function isMapTile(col: number, row: number): boolean {
  return MAP_SHAPE.has(`${col},${row}`);
}

function isBuildable(col: number, row: number): boolean {
  if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return false;
  if (!isMapTile(col, row)) return false;
  if (isPathTile(col, row)) return false;
  const [bc, br] = BASE_POINT;
  if (col >= bc - 1 && col <= bc + 1 && row >= br - 1 && row <= br + 1) return false;
  return true;
}

// ─── Runtime Types ───

interface Tower extends TowerState {
  sprite: Phaser.GameObjects.Sprite;
  lastFired: number;
  range: number;
  damage: number;
  fireRate: number;
  splash: number;
  projectileKey: string;
  particleEmitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter>;
  comboGlow?: Phaser.GameObjects.Arc;
}

interface Enemy {
  id: string;
  type: EnemyType;
  hp: number;
  maxHp: number;
  speed: number;
  armor: number;
  pathIndex: number;
  sprite: Phaser.GameObjects.Sprite;
  hpBar: Phaser.GameObjects.Graphics;
  effects: Array<{ type: string; value: number; until: number }>;
  reward: number;
  _lastCleanse?: number;
}

interface DroppedLoot {
  id: string;
  kind: AugmentKind;
  rarity: LootRarity;
  sprite: Phaser.GameObjects.Sprite;
  rayEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  x: number;
  y: number;
}

// Seeded random for deterministic decoration placement
function seededRandom(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

// ─── Scene ───

export class GameScene extends Phaser.Scene {
  wave = 0;
  phase: 'build' | 'combat' | 'wave_end' | 'game_over' = 'build';
  gold = STARTING_GOLD;
  baseHp = BASE_HP;
  gameStage = 0;
  waveDropCount = 0;
  autoRun = false;
  paused = false;

  towers: Tower[] = [];
  enemies: Enemy[] = [];
  droppedLoot: DroppedLoot[] = [];
  inventory: InventoryItem[] = [];

  spawnQueue: Array<{ type: EnemyType; delay: number }> = [];
  lastSpawnTime = 0;

  selectedTowerType: TowerType | null = null;
  selectedTowerId: string | null = null;
  placementPreview: Phaser.GameObjects.Sprite | null = null;
  rangePreview: Phaser.GameObjects.Graphics | null = null;
  selectionIndicator: Phaser.GameObjects.Image | null = null;
  hoverHighlight: Phaser.GameObjects.Graphics | null = null;

  baseSprite!: Phaser.GameObjects.Sprite;
  baseHpBar!: Phaser.GameObjects.Graphics;

  pendingAugmentInstanceId: string | null = null;
  autoRunTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Full state reset (scene instance is reused on restart)
    this.wave = 0;
    this.phase = 'build';
    this.gold = STARTING_GOLD;
    this.baseHp = BASE_HP;
    this.gameStage = 0;
    this.waveDropCount = 0;
    this.autoRun = false;
    this.paused = false;
    this.towers = [];
    this.enemies = [];
    this.droppedLoot = [];
    this.inventory = [];
    this.spawnQueue = [];
    this.lastSpawnTime = 0;
    this.selectedTowerType = null;
    this.selectedTowerId = null;
    this.placementPreview = null;
    this.rangePreview = null;
    this.selectionIndicator = null;
    this.hoverHighlight = null;
    this.pendingAugmentInstanceId = null;
    this.autoRunTimer = null;
    _uid = 0;

    this.drawMap();
    this.createBase();
    this.createSpawnCave();
    this.setupInput();
    this.emitState();
  }

  // ─── MAP ───

  drawMap(): void {
    const TILE_OY = (SCALED_TILE_H / 2) / SCALED_TILE_FULL_H;

    // Render all island tiles (core 14×14 + extensions outside)
    for (let sum = ISLAND_MIN_C + ISLAND_MIN_R; sum <= ISLAND_MAX_C + ISLAND_MAX_R; sum++) {
      for (let col = ISLAND_MIN_C; col <= ISLAND_MAX_C; col++) {
        const row = sum - col;
        if (row < ISLAND_MIN_R || row > ISLAND_MAX_R) continue;
        if (!isMapTile(col, row)) continue;

        const { x, y } = tileToWorld(col, row);
        const depth = isoDepth(col, row, 0);

        if (isPathTile(col, row)) {
          this.add.image(x, y, 'iso_bald').setOrigin(0.5, TILE_OY).setDepth(depth);
        } else {
          this.add.image(x, y, 'iso_grass').setOrigin(0.5, TILE_OY).setDepth(depth);

          // Decorations on island tiles (veins get extra decor)
          const rng = seededRandom(col, row);
          if (rng < 0.10) {
            const treeIdx = Math.floor(seededRandom(col + 100, row) * 4) + 1;
            const treeKey = `iso_tree_${treeIdx}`;
            if (this.textures.exists(treeKey)) {
              this.add.image(x, y - 20, treeKey).setOrigin(0.5, 0.8).setDepth(structDepth(col, row, DEPTH_TREE));
            }
          } else if (rng < 0.15) {
            const stoneIdx = Math.floor(seededRandom(col, row + 100) * 4) + 1;
            const stoneKey = `iso_stone_${stoneIdx}`;
            if (this.textures.exists(stoneKey)) {
              this.add.image(x, y, stoneKey).setOrigin(0.5, 0.5).setDepth(depth + DEPTH_STONE);
            }
          }
        }
      }
    }
  }

  // ─── DEBUG: tile grid verification ───

  assertTilePositions(): void {
    const p00 = tileToWorld(0, 0);
    const p10 = tileToWorld(1, 0);
    const p01 = tileToWorld(0, 1);

    const dx10 = p10.x - p00.x;
    const dy10 = p10.y - p00.y;
    const dx01 = p01.x - p00.x;
    const dy01 = p01.y - p00.y;

    console.assert(dx10 === ISO_W_HALF, `(1,0) dx should be ${ISO_W_HALF}, got ${dx10}`);
    console.assert(dy10 === ISO_H_HALF, `(1,0) dy should be ${ISO_H_HALF}, got ${dy10}`);
    console.assert(dx01 === -ISO_W_HALF, `(0,1) dx should be ${-ISO_W_HALF}, got ${dx01}`);
    console.assert(dy01 === ISO_H_HALF, `(0,1) dy should be ${ISO_H_HALF}, got ${dy01}`);

    // Verify integer coordinates (no sub-pixel)
    console.assert(p00.x === Math.round(p00.x), `(0,0) x not integer: ${p00.x}`);
    console.assert(p00.y === Math.round(p00.y), `(0,0) y not integer: ${p00.y}`);
    console.assert(p10.x === Math.round(p10.x), `(1,0) x not integer: ${p10.x}`);

    console.log('[ISO] Tile assertions passed:', { p00, p10, p01, ISO_W_HALF, ISO_H_HALF });
  }

  /** Draw 4×4 red squares at every tile center for debug overlay. */
  drawDebugGrid(): void {
    const g = this.add.graphics().setDepth(9999);
    g.fillStyle(0xff0000, 1);
    for (let col = 0; col < MAP_COLS; col++) {
      for (let row = 0; row < MAP_ROWS; row++) {
        const { x, y } = tileToWorld(col, row);
        g.fillRect(x - 2, y - 2, 4, 4);
      }
    }
  }

  createBase(): void {
    const { x, y } = tileToWorld(BASE_POINT[0], BASE_POINT[1]);
    this.baseSprite = this.add.sprite(x, y, 'base')
      .setOrigin(0.5, 0.92)
      .setDepth(structDepth(BASE_POINT[0], BASE_POINT[1], DEPTH_TOWER));
    this.baseHpBar = this.add.graphics()
      .setDepth(structDepth(BASE_POINT[0], BASE_POINT[1], DEPTH_TOWER) + 1);
    this.updateBaseHealthBar();
  }

  updateBaseHealthBar(): void {
    if (!this.baseHpBar || !this.baseHpBar.active) return;
    this.baseHpBar.clear();
    if (this.baseHp >= BASE_HP) return;

    const { x, y } = tileToWorld(BASE_POINT[0], BASE_POINT[1]);
    const barW = 96, barH = 8;
    const bx = x - barW / 2;
    const by = y - 118;
    const hpPct = Math.max(0, this.baseHp / BASE_HP);
    const hpColor = hpPct > 0.5 ? parseInt(PALETTE.hpGreen.replace('#', ''), 16)
      : hpPct > 0.25 ? 0xff9800 : parseInt(PALETTE.hpRed.replace('#', ''), 16);

    this.baseHpBar.fillStyle(0x000000, 0.45);
    this.baseHpBar.fillRoundedRect(bx - 1, by - 1, barW + 2, barH + 2, 3);
    this.baseHpBar.lineStyle(1, 0xffffff, 0.12);
    this.baseHpBar.strokeRoundedRect(bx, by, barW, barH, 3);
    this.baseHpBar.lineStyle(0, 0, 0);
    this.baseHpBar.fillStyle(0x1a0000, 0.6);
    this.baseHpBar.fillRoundedRect(bx, by, barW, barH, 3);
    this.baseHpBar.fillStyle(hpColor);
    this.baseHpBar.fillRoundedRect(bx, by, barW * hpPct, barH, 3);
  }

  createSpawnCave(): void {
    const { x, y } = tileToWorld(SPAWN_POINT[0], SPAWN_POINT[1]);
    this.add.sprite(x, y + 60, 'spawn_cave')
      .setOrigin(0.5, 1)
      .setDepth(DEPTH_ENEMY_BAND - 1 + isoDepth(SPAWN_POINT[0], SPAWN_POINT[1], 0));
  }

  // ─── INPUT ───

  setupInput(): void {
    if (!this.input.keyboard) return;

    for (let i = 1; i <= 8; i++) {
      const key = this.input.keyboard.addKey(48 + i);
      const type = TOWER_TYPES_ORDERED[i - 1] as TowerType;
      if (!type) continue;
      const def = TOWERS[type];
      key.on('down', () => {
        if (!isTowerUnlocked(def, this.wave) || this.gold < this.getTowerCost(type)) return;
        this.selectTowerType(type);
      });
    }

    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => {
      this.deselectAll();
    });

    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER).on('down', () => {
      if (this.phase === 'build' || this.phase === 'wave_end') this.startWave();
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.selectedTowerType || !this.placementPreview) return;
      const { col, row } = worldToTile(pointer.worldX, pointer.worldY);
      const { x, y } = tileToWorld(col, row);
      this.placementPreview.setPosition(x, y + 8);
      const ok = isBuildable(col, row) && !this.towers.some(t => t.gridX === col && t.gridY === row)
        && !this.towers.some(t => Math.abs(t.gridX - col) + Math.abs(t.gridY - row) < 2);
      this.placementPreview.setTint(ok ? 0x88ff88 : 0xff4444);
      const def = TOWERS[this.selectedTowerType];
      this.drawTileRange(x, y, def.range * ISO_TILE_SCREEN_DIST);

      // Tile hover highlight
      this.hoverHighlight?.destroy();
      const hg = this.add.graphics().setDepth(DEPTH_HOVER);
      hg.lineStyle(2.5, ok ? 0x88ff88 : 0xff4444, 0.8);
      hg.beginPath();
      hg.moveTo(x, y - ISO_H_HALF);
      hg.lineTo(x + ISO_W_HALF, y);
      hg.lineTo(x, y + ISO_H_HALF);
      hg.lineTo(x - ISO_W_HALF, y);
      hg.closePath();
      hg.strokePath();
      hg.fillStyle(ok ? 0x88ff88 : 0xff4444, 0.12);
      hg.fillPath();
      this.hoverHighlight = hg;
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const wx = pointer.worldX;
      const wy = pointer.worldY;

      if (this.pendingAugmentInstanceId) {
        const clicked = this.towers.find(t =>
          dist(t.sprite.x, t.sprite.y, wx, wy) < ISO_W_HALF * 0.6
        );
        if (clicked) {
if (clicked.augments.length >= MAX_AUGMENT_SLOTS) {
          const dt = this.add.text(clicked.sprite.x, clicked.sprite.y - 24, 'SLOTS FULL',
            { fontFamily: '"Minecraft"', fontSize: '19px', color: '#ff4444', stroke: '#000', strokeThickness: 4 }
          ).setDepth(DEPTH_TEXT);
          this.tweens.add({ targets: dt, y: dt.y - 28, alpha: 0, duration: 700, onComplete: () => dt.destroy() });
          return;
        }
          this.applyAugment(clicked.id, this.pendingAugmentInstanceId);
          this.pendingAugmentInstanceId = null;
          return;
        }
        this.pendingAugmentInstanceId = null;
        this.emitState();
        this.game.events.emit('close_sidebar');
        return;
      }

      if (this.selectedTowerType) {
        const { col, row } = worldToTile(wx, wy);
        this.placeTower(this.selectedTowerType, col, row);
        return;
      }

      for (const drop of [...this.droppedLoot]) {
        if (dist(wx, wy, drop.x, drop.y) < ISO_W_HALF * 0.7) {
          this.collectLoot(drop);
          return;
        }
      }

      const clickedTower = this.towers.find(t =>
        dist(t.sprite.x, t.sprite.y, wx, wy) < ISO_W_HALF * 0.6
      );
      if (clickedTower) {
        this.selectTower(clickedTower.id);
        return;
      }

      this.deselectAll();
      this.game.events.emit('close_inventory');
    });

    this.events.on('apply_augment', (data: { towerId: string; instanceId: string }) => {
      this.applyAugment(data.towerId, data.instanceId);
    });

    this.events.on('remove_augment', (data: { towerId: string; augmentIndex: number }) => {
      this.removeAugment(data.towerId, data.augmentIndex);
    });

    this.events.on('start_augment_mode', (data: { instanceId: string }) => {
      const inInventory = this.inventory.some(i => i.instanceId === data.instanceId);
      const availableCount = this.towers.filter(t => t.augments.length < MAX_AUGMENT_SLOTS).length;
      if (!inInventory || availableCount === 0) {
        this.pendingAugmentInstanceId = null;
        this.emitState();
        return;
      }
      this.pendingAugmentInstanceId = data.instanceId;
      this.deselectTowerType();
      this.emitState();
    });

    this.events.on('start_wave_click', () => {
      if (this.phase === 'build' || this.phase === 'wave_end') this.startWave();
    });

    this.events.on('toggle_autorun', () => {
      this.autoRun = !this.autoRun;
      if (this.autoRun && this.phase === 'wave_end') {
        this.autoRunTimer = this.time.delayedCall(1500, () => this.startWave());
      }
      if (!this.autoRun && this.autoRunTimer) {
        this.autoRunTimer.destroy();
        this.autoRunTimer = null;
      }
      this.emitState();
    });

    // Pause/resume is handled from the React side via game.scene
    // because a paused scene can't receive its own events

    this.events.on('craft_augment', (data: { inputRarity: string }) => {
      const recipe = CRAFT_RECIPES.find(r => r.inputRarity === data.inputRarity);
      if (!recipe) return;
      const items = this.inventory.filter(i => i.rarity === recipe.inputRarity);
      if (items.length < recipe.inputCount) return;
      for (let i = 0; i < recipe.inputCount; i++) {
        const idx = this.inventory.findIndex(inv => inv.rarity === recipe.inputRarity);
        if (idx >= 0) this.inventory.splice(idx, 1);
      }
      const kind = rollRandomKind();
      const instanceId = uid();
      this.inventory.push({ instanceId, kind, rarity: recipe.outputRarity as LootRarity });
      this.emitState();
    });

    this.events.on('buy_chest', (data: { rarity: string }) => {
      const price = CHEST_PRICES[data.rarity];
      if (!price || this.gold < price) return;
      this.gold -= price;
      const kind = rollRandomKind();
      const instanceId = uid();
      this.inventory.push({ instanceId, kind, rarity: data.rarity as LootRarity });
      this.emitState();
    });
  }

  // ─── TILE RANGE DISPLAY (Isometric Diamond) ───

  drawTileRange(centerX: number, centerY: number, range: number): void {
    this.rangePreview?.destroy();
    const g = this.add.graphics().setDepth(DEPTH_RANGE);
    const { col: cc, row: cr } = worldToTile(centerX, centerY);
    const tileRange = Math.ceil(range / ISO_TILE_SCREEN_DIST);

    const inRange = new Set<string>();
    for (let r = cr - tileRange; r <= cr + tileRange; r++) {
      for (let c = cc - tileRange; c <= cc + tileRange; c++) {
        if (c < 0 || c >= MAP_COLS || r < 0 || r >= MAP_ROWS) continue;
        if (!isMapTile(c, r)) continue;
        const { x: tx, y: ty } = tileToWorld(c, r);
        if (dist(centerX, centerY, tx, ty) <= range) {
          inRange.add(`${c},${r}`);
        }
      }
    }

    for (const key of inRange) {
      const [c, r] = key.split(',').map(Number);
      const { x, y } = tileToWorld(c, r);

      // Diamond fill
      g.fillStyle(0x4fb3ff, 0.18);
      g.beginPath();
      g.moveTo(x, y - ISO_H_HALF);
      g.lineTo(x + ISO_W_HALF, y);
      g.lineTo(x, y + ISO_H_HALF);
      g.lineTo(x - ISO_W_HALF, y);
      g.closePath();
      g.fillPath();

      // Border edges only where neighbor is out of range
      g.lineStyle(2.5, 0x4fb3ff, 0.75);
      if (!inRange.has(`${c},${r - 1}`)) {
        // North edge (top-right side of diamond)
        g.lineBetween(x, y - ISO_H_HALF, x + ISO_W_HALF, y);
      }
      if (!inRange.has(`${c + 1},${r}`)) {
        // East edge (bottom-right side of diamond)
        g.lineBetween(x + ISO_W_HALF, y, x, y + ISO_H_HALF);
      }
      if (!inRange.has(`${c},${r + 1}`)) {
        // South edge (bottom-left side of diamond)
        g.lineBetween(x, y + ISO_H_HALF, x - ISO_W_HALF, y);
      }
      if (!inRange.has(`${c - 1},${r}`)) {
        // West edge (top-left side of diamond)
        g.lineBetween(x - ISO_W_HALF, y, x, y - ISO_H_HALF);
      }
    }

    this.rangePreview = g;
  }

  // ─── TOWER COST ───

  getTowerCost(type: TowerType): number {
    const def = TOWERS[type];
    const count = this.towers.filter(t => t.type === type).length;
    return Math.floor(def.cost * Math.pow(TOWER_DUPLICATE_COST_MULT, count));
  }

  // ─── TOWER SELECTION ───

  selectTowerType(type: TowerType): void {
    const def = TOWERS[type];
    if (!isTowerUnlocked(def, this.wave) || this.gold < this.getTowerCost(type)) return;
    this.deselectAll();
    this.selectedTowerType = type;
    this.placementPreview = this.add.sprite(0, 0, `tower_${type}`)
      .setOrigin(0.5, 0.9).setAlpha(0.6).setDepth(DEPTH_PLACEMENT);
    this.emitState();
  }

  deselectTowerType(): void {
    this.selectedTowerType = null;
    this.placementPreview?.destroy();
    this.placementPreview = null;
    this.rangePreview?.destroy();
    this.rangePreview = null;
    this.hoverHighlight?.destroy();
    this.hoverHighlight = null;
  }

  selectTower(towerId: string): void {
    this.deselectAll();
    this.selectedTowerId = towerId;
    const tower = this.towers.find(t => t.id === towerId);
    if (tower) {
      const { x, y } = tileToWorld(tower.gridX, tower.gridY);
      this.selectionIndicator = this.add.image(x, y, 'selection_diamond')
        .setOrigin(0.5, 0.5)
        .setDepth(structDepth(tower.gridX, tower.gridY, DEPTH_SELECT));
      this.drawTileRange(x, y, tower.range);
    }
    this.game.events.emit('open_inventory');
    this.emitState();
  }

  deselectAll(): void {
    this.deselectTowerType();
    this.selectedTowerId = null;
    this.selectionIndicator?.destroy();
    this.selectionIndicator = null;
    this.rangePreview?.destroy();
    this.rangePreview = null;
    this.pendingAugmentInstanceId = null;
    this.emitState();
  }

  // ─── TOWER PLACEMENT ───

  placeTower(type: TowerType, col: number, row: number): void {
    const def = TOWERS[type];
    const cost = this.getTowerCost(type);
    if (this.gold < cost) return;
    if (!isBuildable(col, row)) return;
    if (this.towers.some(t => t.gridX === col && t.gridY === row)) return;
    // Minimum 2-tile distance between towers
    if (this.towers.some(t => Math.abs(t.gridX - col) + Math.abs(t.gridY - row) < 2)) return;

    this.gold -= cost;
    const { x, y } = tileToWorld(col, row);
    const sprite = this.add.sprite(x, y + 8, `tower_${type}`)
      .setOrigin(0.5, 0.9)
      .setDepth(structDepth(col, row, DEPTH_TOWER));

    sprite.setScale(0);
    this.tweens.add({ targets: sprite, scaleX: 1, scaleY: 1, duration: 250, ease: 'Back.easeOut' });

    const pMap: Record<string, string> = {
      cannon: 'projectile_cannonball', frost: 'projectile_ice_shard', beam: 'projectile_beam_pulse',
      sniper: 'projectile_sniper_round', tesla: 'projectile_lightning_ball', flame: 'projectile_fireball',
      poison: 'projectile_poison_glob', missile: 'projectile_rocket',
    };

    const tower: Tower = {
      id: uid(), type, gridX: col, gridY: row, tier: 1, augments: [],
      sprite, lastFired: 0,
      range: def.range * ISO_TILE_SCREEN_DIST, damage: def.damage,
      fireRate: def.fireRate * 1000, splash: def.splash * ISO_TILE_SCREEN_DIST,
      projectileKey: pMap[type] || 'projectile_bullet',
      particleEmitters: new Map(),
    };

    this.towers.push(tower);
    this.deselectTowerType();
    this.emitState();
  }

  // ─── AUGMENT APPLICATION ───

  applyAugment(towerId: string, instanceId: string): void {
    const tower = this.towers.find(t => t.id === towerId);
    if (!tower) return;
    if (tower.augments.length >= MAX_AUGMENT_SLOTS) return;

    const invIdx = this.inventory.findIndex(i => i.instanceId === instanceId);
    if (invIdx < 0) return;

    const invItem = this.inventory[invIdx];
    tower.augments.push({ kind: invItem.kind, rarity: invItem.rarity });
    this.inventory.splice(invIdx, 1);

    this.recalcTower(tower);
    this.updateAugmentParticles(tower);

    tower.sprite.setTint(0xffffff);
    this.time.delayedCall(150, () => tower.sprite.clearTint());
    this.createExplosion(tower.sprite.x, tower.sprite.y, AUGMENTS[invItem.kind].particleColor);

    const aug = AUGMENTS[invItem.kind];
    const eff = aug.effects[invItem.rarity];
    const text = this.add.text(
      tower.sprite.x, tower.sprite.y - 24,
      `${aug.name} ${eff.label}`,
      { fontFamily: '"Minecraft"', fontSize: '17px', color: PALETTE[invItem.rarity as keyof typeof PALETTE] as string,
        stroke: '#000', strokeThickness: 4 }
    ).setOrigin(0.5).setDepth(DEPTH_TEXT);
    this.tweens.add({ targets: text, y: text.y - 32, alpha: 0, duration: 1400, onComplete: () => text.destroy() });

    this.selectedTowerId = towerId;
    this.emitState();
  }

  removeAugment(towerId: string, augmentIndex: number): void {
    const tower = this.towers.find(t => t.id === towerId);
    if (!tower) return;
    if (augmentIndex < 0 || augmentIndex >= tower.augments.length) return;

    const aug = tower.augments[augmentIndex];
    const instanceId = uid();
    this.inventory.push({ instanceId, kind: aug.kind, rarity: aug.rarity });

    tower.augments.splice(augmentIndex, 1);

    this.recalcTower(tower);
    this.updateAugmentParticles(tower);

    if (this.selectedTowerId === towerId) {
      this.rangePreview?.destroy();
      this.rangePreview = null;
      const { x, y } = tileToWorld(tower.gridX, tower.gridY);
      this.drawTileRange(x, y, tower.range);
    }

    this.emitState();
  }

  recalcTower(tower: Tower): void {
    const def = TOWERS[tower.type];
    let damageMul = 1;
    let speedMul = 1;
    let rangeMul = 1;

    for (const aug of tower.augments) {
      const eff = AUGMENTS[aug.kind].effects[aug.rarity];
      if (eff.damageMul) damageMul += eff.damageMul;
      if (eff.speedMul) speedMul += eff.speedMul;
      if (eff.rangeMul) rangeMul += eff.rangeMul;
    }

    tower.damage = Math.floor(def.damage * damageMul);
    tower.fireRate = (def.fireRate * 1000) / speedMul;
    tower.range = def.range * ISO_TILE_SCREEN_DIST * rangeMul;
  }

  getAugmentEffects(tower: Tower): AugmentEffect {
    const combined: AugmentEffect = { label: '' };
    for (const aug of tower.augments) {
      const eff = AUGMENTS[aug.kind].effects[aug.rarity];
      if (eff.chainCount) combined.chainCount = (combined.chainCount || 0) + eff.chainCount;
      if (eff.slowPct) { combined.slowPct = Math.max(combined.slowPct || 0, eff.slowPct); combined.slowDuration = Math.max(combined.slowDuration || 0, eff.slowDuration || 0); }
      if (eff.burnDps) { combined.burnDps = (combined.burnDps || 0) + eff.burnDps; combined.burnDuration = Math.max(combined.burnDuration || 0, eff.burnDuration || 0); }
      if (eff.armorPen) combined.armorPen = (combined.armorPen || 0) + eff.armorPen;
      if (eff.trueDamagePct) combined.trueDamagePct = (combined.trueDamagePct || 0) + eff.trueDamagePct;
      if (eff.critChance) combined.critChance = Math.min(1, (combined.critChance || 0) + eff.critChance);
    }
    return combined;
  }

  // ─── AUGMENT PARTICLES ───

  ensureAugmentParticle(tower: Tower, kind: AugmentKind): void {
    if (tower.particleEmitters.has(kind)) return;
    const pKey = `particle_${kind}`;
    const hasAnim = this.anims.exists(`particle_${kind}_anim`);
    const emitter = this.add.particles(tower.sprite.x, tower.sprite.y, pKey, {
      speed: { min: 14, max: 28 },
      lifespan: 1800,
      scale: { start: 1.6, end: 0.3 },
      alpha: { start: 0.75, end: 0 },
      frequency: 300,
      quantity: 1,
      emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 20), quantity: 1 },
      ...(hasAnim ? { anim: `particle_${kind}_anim` } : {}),
    }).setDepth(DEPTH_PARTICLE);
    tower.particleEmitters.set(kind, emitter);
  }

  updateAugmentParticles(tower: Tower): void {
    const kindCounts = new Map<string, number>();
    for (const aug of tower.augments) {
      kindCounts.set(aug.kind, (kindCounts.get(aug.kind) || 0) + 1);
    }

    for (const [kind, emitter] of tower.particleEmitters) {
      if (!kindCounts.has(kind)) {
        emitter.destroy();
        tower.particleEmitters.delete(kind);
      }
    }

    for (const [kind, count] of kindCounts) {
      this.ensureAugmentParticle(tower, kind as AugmentKind);
      const emitter = tower.particleEmitters.get(kind);
      if (emitter) {
        emitter.setFrequency(Math.max(80, 300 / count), Math.min(3, count));
      }
    }

    const uniqueCount = kindCounts.size;
    if (uniqueCount >= 3 && !tower.comboGlow) {
      const kinds = [...kindCounts.keys()];
      const color = parseInt(AUGMENTS[kinds[0]].particleColor.replace('#', ''), 16);
      tower.comboGlow = this.add.circle(tower.sprite.x, tower.sprite.y, 24, color, 0.12)
        .setDepth(DEPTH_COMBO);
      this.tweens.add({
        targets: tower.comboGlow,
        scaleX: 1.6, scaleY: 1.6, alpha: 0.03,
        duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    } else if (uniqueCount < 3 && tower.comboGlow) {
      tower.comboGlow.destroy();
      tower.comboGlow = undefined;
    }
  }

  // ─── HIT PARTICLES ───

  createHitParticles(x: number, y: number, tower: Tower): void {
    if (tower.augments.length === 0) return;
    const uniqueKinds = [...new Set(tower.augments.map(a => a.kind))];
    const count = Math.min(uniqueKinds.length * 2 + tower.augments.length, 14);
    for (let i = 0; i < count; i++) {
      const kind = uniqueKinds[i % uniqueKinds.length];
      const c = parseInt(AUGMENTS[kind].particleColor.replace('#', ''), 16);
      const p = this.add.circle(x, y, 2, c).setDepth(DEPTH_PARTICLE).setAlpha(0.75);
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const r = Phaser.Math.Between(8, 18);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * r,
        y: y + Math.sin(angle) * r,
        alpha: 0, scaleX: 0.15, scaleY: 0.15,
        duration: 180 + Math.random() * 120,
        onComplete: () => p.destroy(),
      });
    }
  }

  // ─── WAVE SYSTEM ───

  startWave(): void {
    if (this.phase !== 'build' && this.phase !== 'wave_end') return;
    if (this.autoRunTimer) { this.autoRunTimer.destroy(); this.autoRunTimer = null; }

    this.wave++;
    this.gameStage = Math.floor((this.wave - 1) / 10);
    this.phase = 'combat';
    this.waveDropCount = 0;
    this.deselectAll();

    const config = getWaveConfig(this.wave);
    this.spawnQueue = [];
    const types: EnemyType[] = ['scatter_imp'];
    if (this.wave >= 3) types.push('thermal_drake');
    if (this.wave >= 4) types.push('blink_fox');
    if (this.wave >= 5) types.push('mirror_wisp');
    if (this.wave >= 6) types.push('ground_wurm');
    if (this.wave >= 7) types.push('iron_shell');
    if (this.wave >= 8) types.push('magma_golem');
    if (this.wave >= 9) types.push('pure_spirit');

    for (let i = 0; i < config.baseCount; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      this.spawnQueue.push({ type, delay: i * 550 });
    }
    if (config.isBoss) {
      this.spawnQueue.push({ type: 'boss', delay: config.baseCount * 550 + 1500 });
    }

    this.lastSpawnTime = this.time.now;
    this.emitState();
  }

  spawnEnemy(type: EnemyType): void {
    const def = ENEMIES[type];
    const config = getWaveConfig(this.wave);
    const { x, y } = tileToWorld(SPAWN_POINT[0], SPAWN_POINT[1]);
    const spawnSum = (SPAWN_POINT[0] + SPAWN_POINT[1]);
    const sprite = this.add.sprite(x, y, `enemy_${type}`).setDepth(DEPTH_ENEMY_BAND + spawnSum * DEPTH_PER_TILE);
    if (type === 'boss') sprite.setScale(1.3);

    sprite.setAlpha(0);
    this.tweens.add({ targets: sprite, alpha: 1, duration: 200 });

    const enemy: Enemy = {
      id: uid(), type,
      hp: Math.floor(def.hp * config.hpScale),
      maxHp: Math.floor(def.hp * config.hpScale),
      speed: def.speed * config.speedScale * ISO_TILE_SCREEN_DIST,
      armor: def.armor, pathIndex: 0,
      sprite, hpBar: this.add.graphics().setDepth(DEPTH_HP_BAR),
      effects: [], reward: def.reward,
    };
    this.enemies.push(enemy);
  }

  // ─── TOWER COMBAT ───

  updateTowers(time: number): void {
    for (const tower of this.towers) {
      if (time - tower.lastFired < tower.fireRate) continue;

      let target: Enemy | null = null;
      let minDist = Infinity;
      for (const enemy of this.enemies) {
        const d = dist(tower.sprite.x, tower.sprite.y, enemy.sprite.x, enemy.sprite.y);
        if (d <= tower.range && d < minDist) { minDist = d; target = enemy; }
      }
      if (!target) continue;
      tower.lastFired = time;

      const fx = this.getAugmentEffects(tower);

      switch (tower.type) {
        case 'frost': this.frostAttack(tower, target, fx); break;
        case 'beam': this.beamAttack(tower, target, fx); break;
        case 'tesla': this.teslaAttack(tower, target, fx); break;
        case 'flame': this.flameAttack(tower, fx); break;
        case 'cannon': case 'poison': this.splashAttack(tower, target, fx); break;
        default: this.projectileAttack(tower, target, fx); break;
      }
    }
  }

  applyHitEffects(enemy: Enemy, damage: number, fx: AugmentEffect, attackType?: TowerType): void {
    const def = ENEMIES[enemy.type];
    const res: EnemyResistance = def.resistance || {};

    // Dodge check (for projectile-based attacks: sniper, missile, cannon)
    if (res.dodgeChance && Math.random() < res.dodgeChance) {
      const dt = this.add.text(enemy.sprite.x, enemy.sprite.y - 24, 'DODGE',
        { fontFamily: '"Minecraft"', fontSize: '19px', color: '#44ccaa', stroke: '#000', strokeThickness: 4 }
      ).setDepth(DEPTH_TEXT);
      this.tweens.add({ targets: dt, y: dt.y - 28, alpha: 0, duration: 700, onComplete: () => dt.destroy() });
      return;
    }

    let finalDmg = damage;

    // Splash reduction (cannon, poison)
    if (res.splashReduction && (attackType === 'cannon' || attackType === 'poison')) {
      finalDmg *= (1 - res.splashReduction);
    }

    // Beam reduction
    if (res.beamReduction && attackType === 'beam') {
      finalDmg *= (1 - res.beamReduction);
    }

    const pen = fx.armorPen || 0;
    const effectiveArmor = Math.max(0, enemy.armor - pen);
    finalDmg = Math.max(1, finalDmg - effectiveArmor);

    if (fx.trueDamagePct) finalDmg += damage * fx.trueDamagePct;

    let isCrit = false;
    if (fx.critChance && Math.random() < fx.critChance) { finalDmg *= 2; isCrit = true; }

    this.damageEnemy(enemy, finalDmg, isCrit);

    // Slow immunity check
    if (fx.slowPct && !res.slowImmune) {
      enemy.effects.push({ type: 'slow', value: fx.slowPct, until: this.time.now + (fx.slowDuration || 1000) });
      enemy.sprite.setTint(0x88ccff);
    }

    // DOT immunity check
    if (fx.burnDps) {
      const isFireDot = attackType === 'flame';
      if (res.dotImmune || (res.fireImmune && isFireDot)) {
        // Immune — skip DOT
      } else {
        enemy.effects.push({ type: 'burn', value: fx.burnDps, until: this.time.now + (fx.burnDuration || 2000) });
      }
    }
  }

  projectileAttack(tower: Tower, target: Enemy, fx: AugmentEffect): void {
    const proj = this.add.sprite(tower.sprite.x, tower.sprite.y - 80, tower.projectileKey).setDepth(DEPTH_PROJECTILE);
    const targetRef = target;

    // Missile homing immunity: tween to snapshot position instead of tracking
    const def = ENEMIES[target.type];
    const res: EnemyResistance = def.resistance || {};
    const isMissile = tower.type === 'missile';

    if (isMissile && res.homingImmune) {
      // Fire at snapshot position — may miss if enemy moves
      const snapX = target.sprite.x;
      const snapY = target.sprite.y;
      this.tweens.add({
        targets: proj, x: snapX, y: snapY, duration: 300,
        onComplete: () => {
          // Check if target is still near the snapshot position
          if (targetRef.sprite.active && dist(snapX, snapY, targetRef.sprite.x, targetRef.sprite.y) < 20) {
            this.applyHitEffects(targetRef, tower.damage, fx, tower.type);
            this.createHitParticles(snapX, snapY, tower);
          }
          this.createExplosion(snapX, snapY, PALETTE.missile);
          proj.destroy();
        },
      });
    } else {
      this.tweens.add({
        targets: proj, x: target.sprite.x, y: target.sprite.y, duration: 200,
        onComplete: () => {
          this.applyHitEffects(targetRef, tower.damage, fx, tower.type);
          this.createHitParticles(targetRef.sprite.x, targetRef.sprite.y, tower);
          if (fx.chainCount) this.chainHit(targetRef, tower.damage * 0.6, fx.chainCount, [targetRef], tower.projectileKey);
          proj.destroy();
        },
      });
    }
  }

  splashAttack(tower: Tower, target: Enemy, fx: AugmentEffect): void {
    const proj = this.add.sprite(tower.sprite.x, tower.sprite.y - 80, tower.projectileKey).setDepth(DEPTH_PROJECTILE);
    const tx = target.sprite.x, ty = target.sprite.y;
    this.tweens.add({
      targets: proj, x: tx, y: ty, duration: 280,
      onComplete: () => {
        for (const e of this.enemies) {
          const d = dist(tx, ty, e.sprite.x, e.sprite.y);
          if (d <= tower.splash) {
            const dmgMul = e === target ? 1 : 0.5;
            this.applyHitEffects(e, tower.damage * dmgMul, fx, tower.type);
          }
        }
        this.createExplosion(tx, ty, tower.type === 'poison' ? PALETTE.poison : PALETTE.cannon);
        this.createHitParticles(tx, ty, tower);
        proj.destroy();
      },
    });
  }

  frostAttack(tower: Tower, target: Enemy, fx: AugmentEffect): void {
    const proj = this.add.sprite(tower.sprite.x, tower.sprite.y - 80, 'projectile_ice_shard').setDepth(DEPTH_PROJECTILE);
    this.tweens.add({
      targets: proj, x: target.sprite.x, y: target.sprite.y, duration: 200,
      onComplete: () => {
        this.applyHitEffects(target, tower.damage, fx, 'frost');
        this.createHitParticles(target.sprite.x, target.sprite.y, tower);
        const res: EnemyResistance = ENEMIES[target.type].resistance || {};
        if (!res.slowImmune) {
          target.effects.push({ type: 'slow', value: 0.4, until: this.time.now + 2000 });
          target.sprite.setTint(0x88ccff);
        }
        proj.destroy();
      },
    });
  }

  beamAttack(tower: Tower, target: Enemy, fx: AugmentEffect): void {
    const line = this.add.graphics().setDepth(DEPTH_PROJECTILE);
    const c = parseInt(PALETTE.beam.replace('#', ''), 16);
    const tsy = tower.sprite.y - 80;
    line.lineStyle(4, c, 0.6);
    line.lineBetween(tower.sprite.x, tsy, target.sprite.x, target.sprite.y);
    line.lineStyle(2, 0xffffff, 0.35);
    line.lineBetween(tower.sprite.x, tsy, target.sprite.x, target.sprite.y);
    this.applyHitEffects(target, tower.damage, fx, 'beam');
    this.createHitParticles(target.sprite.x, target.sprite.y, tower);
    this.time.delayedCall(120, () => line.destroy());
  }

  teslaAttack(tower: Tower, target: Enemy, fx: AugmentEffect): void {
    const baseChains = 2 + (fx.chainCount || 0);
    const hit: Enemy[] = [target];
    this.applyHitEffects(target, tower.damage, fx, 'tesla');
    this.createHitParticles(target.sprite.x, target.sprite.y, tower);

    // Initial bolt from tower to first target
    const initLine = this.add.graphics().setDepth(DEPTH_PROJECTILE);
    initLine.lineStyle(3, parseInt(PALETTE.tesla.replace('#', ''), 16), 0.7);
    initLine.lineBetween(tower.sprite.x, tower.sprite.y - 80, target.sprite.x, target.sprite.y);
    this.time.delayedCall(140, () => initLine.destroy());

    let current = target;
    for (let i = 0; i < baseChains; i++) {
      let closest: Enemy | null = null;
      let cDist = ISO_TILE_SCREEN_DIST * 3;
      for (const e of this.enemies) {
        if (hit.includes(e)) continue;
        // Skip chain-immune enemies
        const eRes: EnemyResistance = ENEMIES[e.type].resistance || {};
        if (eRes.chainImmune) continue;
        const d = dist(current.sprite.x, current.sprite.y, e.sprite.x, e.sprite.y);
        if (d < cDist) { cDist = d; closest = e; }
      }
      if (!closest) break;
      hit.push(closest);
      this.applyHitEffects(closest, tower.damage * 0.6, fx, 'tesla');
      const line = this.add.graphics().setDepth(DEPTH_PROJECTILE);
      line.lineStyle(3, parseInt(PALETTE.tesla.replace('#', ''), 16), 0.7);
      line.lineBetween(current.sprite.x, current.sprite.y, closest.sprite.x, closest.sprite.y);
      this.time.delayedCall(140, () => line.destroy());
      current = closest;
    }
  }

  flameAttack(tower: Tower, fx: AugmentEffect): void {
    for (const e of this.enemies) {
      const d = dist(tower.sprite.x, tower.sprite.y, e.sprite.x, e.sprite.y);
      if (d <= tower.range) {
        this.applyHitEffects(e, tower.damage, fx, 'flame');
        const res: EnemyResistance = ENEMIES[e.type].resistance || {};
        if (!res.fireImmune && !res.dotImmune) {
          e.effects.push({ type: 'burn', value: 5, until: this.time.now + 3000 });
        }
      }
    }
    this.createExplosion(tower.sprite.x, tower.sprite.y - 40, PALETTE.flame);
    this.createHitParticles(tower.sprite.x, tower.sprite.y - 40, tower);
  }

  chainHit(source: Enemy, dmg: number, remaining: number, hit: Enemy[], projKey: string): void {
    if (remaining <= 0) return;
    let closest: Enemy | null = null;
    let cDist = ISO_TILE_SCREEN_DIST * 3;
    for (const e of this.enemies) {
      if (hit.includes(e)) continue;
      const d = dist(source.sprite.x, source.sprite.y, e.sprite.x, e.sprite.y);
      if (d < cDist) { cDist = d; closest = e; }
    }
    if (!closest) return;
    hit.push(closest);
    const line = this.add.graphics().setDepth(DEPTH_PROJECTILE);
    line.lineStyle(2, 0xffffff, 0.5);
    line.lineBetween(source.sprite.x, source.sprite.y, closest.sprite.x, closest.sprite.y);
    this.time.delayedCall(100, () => line.destroy());
    this.damageEnemy(closest, dmg, false);
    this.chainHit(closest, dmg * 0.7, remaining - 1, hit, projKey);
  }

  // ─── DAMAGE ───

  damageEnemy(enemy: Enemy, rawDamage: number, isCrit: boolean = false): void {
    const dmg = Math.max(1, rawDamage);
    enemy.hp -= dmg;

    enemy.sprite.setTint(0xffffff);
    this.time.delayedCall(60, () => {
      if (enemy.sprite.active && enemy.effects.length === 0) enemy.sprite.clearTint();
    });

    const color = isCrit ? '#ffff00' : '#ff4444';
    const size = isCrit ? '26px' : '19px';
    const txt = this.add.text(
      enemy.sprite.x + Phaser.Math.Between(-8, 8), enemy.sprite.y - 24,
      (isCrit ? 'CRIT ' : '') + Math.floor(dmg).toString(),
      { fontFamily: '"Minecraft"', fontSize: size, color, stroke: '#000', strokeThickness: 4 }
    ).setDepth(DEPTH_TEXT);
    this.tweens.add({ targets: txt, y: txt.y - 28, alpha: 0, duration: 700, onComplete: () => txt.destroy() });

    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  killEnemy(enemy: Enemy): void {
    this.gold += enemy.reward;
    this.createExplosion(enemy.sprite.x, enemy.sprite.y, ENEMIES[enemy.type].color);

    const gt = this.add.text(enemy.sprite.x, enemy.sprite.y - 12,
      `+${enemy.reward}`,
      { fontFamily: '"Minecraft"', fontSize: '19px', color: PALETTE.gold, stroke: '#000', strokeThickness: 4 }
    ).setDepth(DEPTH_TEXT);
    this.tweens.add({ targets: gt, y: gt.y - 30, alpha: 0, duration: 800, onComplete: () => gt.destroy() });

    this.tryDropLoot(enemy);

    enemy.hpBar.destroy();
    enemy.sprite.destroy();
    this.enemies = this.enemies.filter(e => e !== enemy);
    this.emitState();
  }

  // ─── LOOT ───

  tryDropLoot(enemy: Enemy): void {
    if (!shouldDropLoot(enemy.type)) return;

    const item = enemy.type === 'boss'
      ? rollBossLoot(LOOT_TABLE, this.gameStage)
      : rollLoot(LOOT_TABLE, this.gameStage);
    if (!item) return;

    this.waveDropCount++;
    const orbKey = `loot_${item.rarity}`;
    const sprite = this.add.sprite(enemy.sprite.x, enemy.sprite.y, orbKey).setDepth(DEPTH_LOOT).setInteractive({ useHandCursor: true });

    // Play animation if spritesheet was loaded
    const animKey = `loot_${item.rarity}_anim`;
    if (this.anims.exists(animKey)) {
      sprite.play(animKey);
    }

    this.tweens.add({ targets: sprite, y: sprite.y - 6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const rayConfigs: Record<string, { speed: number; alpha: number; freq: number; qty: number }> = {
      common:    { speed: 50,  alpha: 0.35, freq: 350, qty: 2 },
      rare:      { speed: 70,  alpha: 0.5,  freq: 250, qty: 3 },
      epic:      { speed: 100, alpha: 0.65, freq: 180, qty: 4 },
      legendary: { speed: 140, alpha: 0.85, freq: 100, qty: 5 },
    };
    const rc = rayConfigs[item.rarity];
    const rayEmitter = this.add.particles(enemy.sprite.x, enemy.sprite.y, `loot_ray_${item.rarity}`, {
      speed: { min: rc.speed * 0.5, max: rc.speed },
      angle: { min: -100, max: -80 },
      lifespan: { min: 600, max: 1400 },
      scale: { start: 2.0, end: 0.4 },
      alpha: { start: rc.alpha, end: 0 },
      frequency: rc.freq,
      quantity: rc.qty,
      emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 8), quantity: 1 },
    }).setDepth(DEPTH_PARTICLE);

    const drop: DroppedLoot = {
      id: uid(), kind: item.kind, rarity: item.rarity,
      sprite, rayEmitter, x: enemy.sprite.x, y: enemy.sprite.y,
    };
    this.droppedLoot.push(drop);

    this.time.delayedCall(15000, () => {
      if (this.droppedLoot.includes(drop)) {
        drop.rayEmitter?.stop();
        this.tweens.add({ targets: drop.sprite, alpha: 0, duration: 400, onComplete: () => {
          drop.sprite.destroy();
          drop.rayEmitter?.destroy();
          this.droppedLoot = this.droppedLoot.filter(d => d !== drop);
        }});
      }
    });
  }

  collectLoot(drop: DroppedLoot): void {
    const instanceId = uid();
    this.inventory.push({ instanceId, kind: drop.kind, rarity: drop.rarity });

    const aug = AUGMENTS[drop.kind];
    const color = PALETTE[drop.rarity as keyof typeof PALETTE] as string;
    const txt = this.add.text(drop.sprite.x, drop.sprite.y - 16, aug.name,
      { fontFamily: '"Minecraft"', fontSize: '17px', color, stroke: '#000', strokeThickness: 4 }
    ).setOrigin(0.5).setDepth(DEPTH_TEXT);
    this.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });

    drop.rayEmitter?.destroy();
    this.tweens.add({ targets: drop.sprite, scaleX: 0, scaleY: 0, alpha: 0, duration: 200, onComplete: () => drop.sprite.destroy() });
    this.droppedLoot = this.droppedLoot.filter(d => d !== drop);
    this.emitState();
  }

  // ─── ENEMY MOVEMENT ───

  updateEnemies(delta: number): void {
    const now = this.time.now;
    for (const enemy of [...this.enemies]) {
      for (const eff of [...enemy.effects]) {
        if (now > eff.until) {
          enemy.effects = enemy.effects.filter(e => e !== eff);
          if (enemy.effects.length === 0) enemy.sprite.clearTint();
          continue;
        }
        if (eff.type === 'burn' || eff.type === 'poison') {
          enemy.hp -= eff.value * (delta / 1000);
          if (enemy.hp <= 0) { this.killEnemy(enemy); continue; }
        }
      }

      let speedMul = 1;
      for (const eff of enemy.effects) {
        if (eff.type === 'slow') speedMul = Math.max(MIN_SPEED_MULT, speedMul - eff.value);
      }
      const speed = enemy.speed * speedMul * (delta / 1000);

      if (enemy.pathIndex >= DEFAULT_PATH.length) {
        this.baseHp -= enemy.type === 'boss' ? 3 : 1;
        this.updateBaseHealthBar();
        enemy.hpBar.destroy(); enemy.sprite.destroy();
        this.enemies = this.enemies.filter(e => e !== enemy);
        this.emitState();
        if (this.baseHp <= 0) this.gameOver();
        continue;
      }

      const tgt = DEFAULT_PATH[enemy.pathIndex];
      const { x: tx, y: ty } = tileToWorld(tgt[0], tgt[1]);
      const dx = tx - enemy.sprite.x, dy = ty - enemy.sprite.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < speed) { enemy.sprite.x = tx; enemy.sprite.y = ty; enemy.pathIndex++; }
      else { enemy.sprite.x += (dx / d) * speed; enemy.sprite.y += (dy / d) * speed; }

      // Depth sort enemies using continuous screen Y in the enemy band
      // col+row = (y - MAP_ORIGIN_Y) / ISO_H_HALF → smooth fractional value
      const continuousSum = (enemy.sprite.y - MAP_ORIGIN_Y) / ISO_H_HALF;
      enemy.sprite.setDepth(DEPTH_ENEMY_BAND + Math.round(continuousSum * DEPTH_PER_TILE));

      // HP bar
      enemy.hpBar.clear();
      const isBoss = enemy.type === 'boss';
      const bw = isBoss ? ISO_W_HALF * 1.2 : ISO_W_HALF * 0.8;
      const bh = isBoss ? 6 : 4;
      const bx = enemy.sprite.x - bw / 2;
      const by = enemy.sprite.y - (isBoss ? 32 : 26);
      enemy.hpBar.fillStyle(0x000000, 0.5);
      enemy.hpBar.fillRoundedRect(bx - 1, by - 1, bw + 2, bh + 2, 2);
      const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
      const hpColor = hpPct > 0.5 ? parseInt(PALETTE.hpGreen.replace('#', ''), 16)
        : hpPct > 0.25 ? 0xff9800 : parseInt(PALETTE.hpRed.replace('#', ''), 16);
      enemy.hpBar.fillStyle(hpColor);
      enemy.hpBar.fillRoundedRect(bx, by, bw * hpPct, bh, 2);
      enemy.hpBar.setDepth(DEPTH_HP_BAR);
    }
  }

  updateCleansers(time: number): void {
    for (const enemy of this.enemies) {
      const def = ENEMIES[enemy.type];
      const res: EnemyResistance = def.resistance || {};
      if (!res.dotCleanse) continue;
      const last = enemy._lastCleanse || 0;
      if (time - last < 3000) continue;
      enemy._lastCleanse = time;
      for (const other of this.enemies) {
        if (other === enemy) continue;
        if (dist(enemy.sprite.x, enemy.sprite.y, other.sprite.x, other.sprite.y) <= ISO_TILE_SCREEN_DIST * 2.5) {
          // Remove DOT effects (burn, poison)
          const hadDot = other.effects.some(e => e.type === 'burn' || e.type === 'poison');
          other.effects = other.effects.filter(e => e.type !== 'burn' && e.type !== 'poison');
          if (hadDot) {
            const ct = this.add.text(other.sprite.x, other.sprite.y - 22, '\u2726',
              { fontFamily: '"Minecraft"', fontSize: '19px', color: PALETTE.pureSpirit }).setDepth(DEPTH_TEXT);
            this.tweens.add({ targets: ct, y: ct.y - 18, alpha: 0, duration: 400, onComplete: () => ct.destroy() });
          }
        }
      }
    }
  }

  updateArmorRegen(delta: number): void {
    for (const enemy of this.enemies) {
      const def = ENEMIES[enemy.type];
      const res: EnemyResistance = def.resistance || {};
      if (!res.armorRegen) continue;
      if (enemy.armor < def.armor) {
        enemy.armor = Math.min(def.armor, enemy.armor + res.armorRegen * (delta / 1000));
      }
    }
  }

  // ─── SPAWNING ───

  updateSpawning(time: number): void {
    if (this.phase !== 'combat') return;
    if (this.spawnQueue.length === 0) {
      if (this.enemies.length === 0) this.waveEnd();
      return;
    }
    const elapsed = time - this.lastSpawnTime;
    while (this.spawnQueue.length > 0 && elapsed >= this.spawnQueue[0].delay) {
      this.spawnEnemy(this.spawnQueue.shift()!.type);
    }
  }

  waveEnd(): void {
    this.phase = 'wave_end';

    // Map center in isometric coords
    const center = tileToWorld(Math.floor(MAP_COLS / 2), Math.floor(MAP_ROWS / 2));

    if (this.waveDropCount === 0) {
      const item = rollLoot(LOOT_TABLE, this.gameStage);
      if (item) {
        const sprite = this.add.sprite(center.x, center.y, `loot_${item.rarity}`).setDepth(DEPTH_LOOT).setInteractive({ useHandCursor: true });
        this.tweens.add({ targets: sprite, y: sprite.y - 4, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        const drop: DroppedLoot = { id: uid(), kind: item.kind, rarity: item.rarity, sprite, x: center.x, y: center.y };
        this.droppedLoot.push(drop);
      }
    }

    const ct = this.add.text(center.x, center.y - 50,
      `WAVE ${this.wave} CLEAR`,
      { fontFamily: '"Minecraft"', fontSize: '38px', color: PALETTE.gold, stroke: '#000', strokeThickness: 5 }
    ).setOrigin(0.5).setDepth(DEPTH_WAVE_TEXT);
    this.time.delayedCall(2000, () => ct.destroy());
    this.emitState();

    if (this.autoRun) {
      this.autoRunTimer = this.time.delayedCall(1500, () => this.startWave());
    }
  }

  gameOver(): void {
    this.phase = 'game_over';
    if (this.autoRunTimer) { this.autoRunTimer.destroy(); this.autoRunTimer = null; }
    const cx = GAME_W / 2, cy = GAME_H / 2;
    this.add.rectangle(cx, cy, GAME_W, GAME_H, 0x000000, 0.7).setDepth(DEPTH_OVERLAY);
    this.add.text(cx, cy - 24, 'GAME OVER',
      { fontFamily: '"Minecraft"', fontSize: '48px', color: PALETTE.hpRed, stroke: '#000', strokeThickness: 6 }
    ).setOrigin(0.5).setDepth(DEPTH_OVERLAY_TEXT);
    this.add.text(cx, cy + 24, `Survived ${this.wave} waves`,
      { fontFamily: '"Minecraft"', fontSize: '24px', color: '#ccc', stroke: '#000', strokeThickness: 4 }
    ).setOrigin(0.5).setDepth(DEPTH_OVERLAY_TEXT);
    this.emitState();
  }

  // ─── VFX ───

  createExplosion(x: number, y: number, color: string): void {
    const c = parseInt(color.replace('#', ''), 16);
    for (let i = 0; i < 10; i++) {
      const p = this.add.circle(x, y, 3, c).setDepth(DEPTH_EXPLOSION).setAlpha(0.8);
      const angle = (i / 10) * Math.PI * 2;
      const r = Phaser.Math.Between(14, 30);
      this.tweens.add({
        targets: p, x: x + Math.cos(angle) * r, y: y + Math.sin(angle) * r,
        alpha: 0, scaleX: 0.2, scaleY: 0.2, duration: 300 + Math.random() * 180,
        onComplete: () => p.destroy(),
      });
    }
  }

  // ─── STATE ───

  emitState(): void {
    const selectedTower = this.selectedTowerId ? this.towers.find(t => t.id === this.selectedTowerId) : null;
    const towerTypeCounts: Record<string, number> = {};
    for (const t of this.towers) {
      towerTypeCounts[t.type] = (towerTypeCounts[t.type] || 0) + 1;
    }
    const state: GameUIState = {
      wave: this.wave,
      phase: this.phase,
      gold: this.gold,
      baseHp: this.baseHp,
      maxBaseHp: BASE_HP,
      enemyCount: this.enemies.length,
      gameStage: this.gameStage,
      towerCount: this.towers.length,
      inventory: [...this.inventory],
      selectedTowerId: this.selectedTowerId,
      selectedTower: selectedTower ? {
        id: selectedTower.id, type: selectedTower.type,
        gridX: selectedTower.gridX, gridY: selectedTower.gridY,
        tier: selectedTower.tier, augments: selectedTower.augments,
      } : null,
      selectedTowerDef: selectedTower ? TOWERS[selectedTower.type] : null,
      selectedTowerType: this.selectedTowerType,
      autoRun: this.autoRun,
      paused: this.paused,
       towerTypeCounts,
       pendingAugmentInstanceId: this.pendingAugmentInstanceId,
       availableAugmentTowerCount: this.towers.filter(t => t.augments.length < MAX_AUGMENT_SLOTS).length,
     };
    this.events.emit('state_update', state);
  }

  // ─── UPDATE ───

  update(time: number, delta: number): void {
    if (this.phase === 'game_over') return;
    this.updateEnemies(delta);
    this.updateTowers(time);
    this.updateCleansers(time);
    this.updateArmorRegen(delta);
    this.updateSpawning(time);
    if (Math.floor(time / 250) !== Math.floor((time - delta) / 250)) this.emitState();
  }
}
