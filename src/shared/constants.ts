import type { TowerDef, EnemyDef, AugmentDef, AugmentItem, WaveConfig } from './types';

// ─── Map ───

export const MAP_COLS = 14;
export const MAP_ROWS = 14;

// ─── Canvas / Layout ───

export const GAME_W = 2048;
export const GAME_H = 1152;
export const MAP_WIDTH = GAME_W;
export const MAP_HEIGHT = GAME_H;
export const HUD_TOP_H = 64;
export const HUD_BOT_H = 120;
export const MAP_ORIGIN_X = GAME_W / 2;
export const MAP_ORIGIN_Y = 120;

// ─── Isometric Tile ───

export const ISO_TILE_W = 128;
export const ISO_TILE_H = 64;
export const ISO_W_HALF = ISO_TILE_W / 2;
export const ISO_H_HALF = 29;
export const ISO_TILE_DEPTH = 55;
export const ISO_TILE_SCREEN_DIST = 72;
export const TILE_SIZE = ISO_TILE_W;

export const TILE_HEIGHT_STEP = 16;

// ─── Sprite Dimensions ───

export const TOWER_SPRITE_W = 96;
export const TOWER_SPRITE_H = 150;
export const SRC_BOTTOM_W = 749;
export const SRC_BOTTOM_H = 711;
export const SRC_TOP_W = 752;
export const SRC_TOP_H = 700;
export const SCALED_TILE_W = 130;
export const SCALED_TILE_H = 66;
export const SCALED_TILE_FULL_H = 99;
export const FULL_TILE_H = 96;
export const TREE_W = 40;
export const TREE_H = 80;
export const STONE_W = 30;
export const STONE_H = 30;
export const ENEMY_SPRITE_SIZE = 48;

// ─── Depth Layers ───

export const DEPTH_PER_TILE    = 10;
export const DEPTH_GROUND      = 0;
export const DEPTH_STONE       = 2;
export const DEPTH_ENEMY_BAND  = 400;
export const DEPTH_STRUCT_BAND = 800;
export const DEPTH_TREE        = 0;
export const DEPTH_TOWER       = 4;
export const DEPTH_SELECT      = 6;
export const DEPTH_HOVER       = 1200;
export const DEPTH_RANGE       = 1250;
export const DEPTH_PLACEMENT   = 1300;
export const DEPTH_HP_BAR      = 1400;
export const DEPTH_COMBO       = 1499;
export const DEPTH_PARTICLE    = 1500;
export const DEPTH_LOOT        = 1501;
export const DEPTH_PROJECTILE  = 1502;
export const DEPTH_TEXT        = 1503;
export const DEPTH_EXPLOSION   = 1505;
export const DEPTH_WAVE_TEXT   = 1510;
export const DEPTH_OVERLAY     = 1520;
export const DEPTH_OVERLAY_TEXT = 1521;

export const BASE_HP = 20;
export const STARTING_GOLD = 200;
export const MAX_AUGMENT_SLOTS = 10;
export const SELL_REFUND_RATE = 0.35;
export const MIN_SPEED_MULT = 0.15;
export const TOWER_DUPLICATE_COST_MULT = 1.25;

export const CHEST_PRICES: Record<string, number> = {
  common: 100,
  rare: 500,
  epic: 2000,
  legendary: 10000,
};

export const CRAFT_RECIPES: Array<{ inputRarity: string; inputCount: number; outputRarity: string }> = [
  { inputRarity: 'common', inputCount: 5, outputRarity: 'rare' },
  { inputRarity: 'rare', inputCount: 4, outputRarity: 'epic' },
  { inputRarity: 'epic', inputCount: 3, outputRarity: 'legendary' },
];

// ─── 24-Color Palette ───

export const PALETTE = {
  grassDark:    '#2d5a2d',
  grassMid:     '#3b7a3b',
  grassLight:   '#56a356',
  pathDark:     '#5b381f',
  pathMid:      '#7a4b2c',
  pathLight:    '#9a6b44',
  stoneDark:    '#3a3a48',
  stoneMid:     '#4a4a5a',
  stoneLight:   '#6a6a7a',
  uiBg:         '#0f1220',
  uiPanel:      '#1b1f2a',
  uiPanelLight: '#2a3040',
  uiBorder:     '#f0b23a',
  cannon:       '#e05555',
  frost:        '#4fb3ff',
  frostHi:      '#9fe7ff',
  beam:         '#aa55dd',
  sniper:       '#55cc55',
  tesla:        '#ffd14d',
  flame:        '#ff8844',
  poison:       '#44aa44',
  missile:      '#8a8a9a',
  gold:         '#f0b23a',
  goldDark:     '#d49520',
  scatterImp:   '#ff8833',
  thermalDrake: '#e05533',
  mirrorWisp:   '#bb66ee',
  blinkFox:     '#44ccaa',
  groundWurm:   '#8d6e43',
  magmaGolem:   '#cc4422',
  pureSpirit:   '#aaeebb',
  ironShell:    '#8a8a9a',
  boss:         '#cc3333',
  common:       '#8a8a9a',
  rare:         '#4fb3ff',
  epic:         '#aa55dd',
  legendary:    '#f0b23a',
  powerCrystal: '#e05555',
  swiftGem:     '#ffd14d',
  farSightLens: '#4fb3ff',
  chainLink:    '#8a8a9a',
  frostShard:   '#66ddee',
  emberCore:    '#ff8844',
  voidStone:    '#aa55dd',
  luckyCoin:    '#f0b23a',
  hpGreen:      '#55cc55',
  hpRed:        '#e05555',
} as const;

// ─── Towers ───

export const TOWERS: Record<string, TowerDef> = {
  cannon:  { type: 'cannon',  name: 'Cannon',  cost: 100, damage: 22, range: 3.0, fireRate: 0.55, splash: 1.0, special: 'Area splash',       color: PALETTE.cannon, grade: 1, unlockWave: 0 },
  frost:   { type: 'frost',   name: 'Frost',   cost: 100, damage: 10, range: 2.5, fireRate: 0.80, splash: 0,   special: 'Slows 40%',         color: PALETTE.frost,  grade: 1, unlockWave: 0 },
  tesla:   { type: 'tesla',   name: 'Tesla',   cost: 200, damage: 20, range: 2.5, fireRate: 0.70, splash: 0,   special: 'Chain lightning',    color: PALETTE.tesla,  grade: 2, unlockWave: 3 },
  beam:    { type: 'beam',    name: 'Beam',    cost: 220, damage: 38, range: 3.5, fireRate: 1.00, splash: 0,   special: 'Continuous DPS',     color: PALETTE.beam,   grade: 2, unlockWave: 3 },
  sniper:  { type: 'sniper',  name: 'Sniper',  cost: 250, damage: 70, range: 4.5, fireRate: 1.20, splash: 0,   special: 'Long range',         color: PALETTE.sniper, grade: 2, unlockWave: 3 },
  flame:   { type: 'flame',   name: 'Flame',   cost: 280, damage: 18, range: 2.0, fireRate: 1.00, splash: 1.5, special: 'Cone DOT burn',      color: PALETTE.flame,  grade: 3, unlockWave: 6 },
  poison:  { type: 'poison',  name: 'Poison',  cost: 300, damage: 14, range: 3.0, fireRate: 0.55, splash: 1.5, special: 'Stacking AOE DOT',   color: PALETTE.poison, grade: 3, unlockWave: 6 },
  missile: { type: 'missile', name: 'Missile', cost: 380, damage: 45, range: 4.0, fireRate: 0.55, splash: 0.8, special: 'Homing + armor',     color: PALETTE.missile, grade: 4, unlockWave: 9 },
};

export const TOWER_TYPES_ORDERED: import('./types').TowerType[] = ['cannon', 'frost', 'tesla', 'beam', 'sniper', 'flame', 'poison', 'missile'];
export const TOWER_GRADE_LABELS: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };

export function isTowerUnlocked(def: TowerDef, wave: number): boolean {
  return wave >= def.unlockWave;
}

// ─── Enemies ───

export const ENEMIES: Record<string, EnemyDef> = {
  scatter_imp:   { type: 'scatter_imp',   name: 'Scatter Imp',   hp: 40,   speed: 2.5, armor: 0,  reward: 8,   special: 'Splash resistant',    color: PALETTE.scatterImp,   resistance: { splashReduction: 0.7 } },
  thermal_drake: { type: 'thermal_drake', name: 'Thermal Drake',  hp: 120,  speed: 1.8, armor: 3,  reward: 14,  special: 'Slow immune',         color: PALETTE.thermalDrake, resistance: { slowImmune: true } },
  mirror_wisp:   { type: 'mirror_wisp',   name: 'Mirror Wisp',    hp: 60,   speed: 2.2, armor: 0,  reward: 12,  special: 'Beam resistant',      color: PALETTE.mirrorWisp,   resistance: { beamReduction: 0.5 } },
  blink_fox:     { type: 'blink_fox',     name: 'Blink Fox',      hp: 55,   speed: 3.2, armor: 0,  reward: 10,  special: 'Dodges projectiles',  color: PALETTE.blinkFox,     resistance: { dodgeChance: 0.6 } },
  ground_wurm:   { type: 'ground_wurm',   name: 'Ground Wurm',    hp: 180,  speed: 1.0, armor: 5,  reward: 16,  special: 'Chain immune',        color: PALETTE.groundWurm,   resistance: { chainImmune: true } },
  magma_golem:   { type: 'magma_golem',   name: 'Magma Golem',    hp: 200,  speed: 0.9, armor: 8,  reward: 18,  special: 'Fire immune',         color: PALETTE.magmaGolem,   resistance: { fireImmune: true } },
  pure_spirit:   { type: 'pure_spirit',   name: 'Pure Spirit',    hp: 70,   speed: 2.6, armor: 0,  reward: 11,  special: 'DOT immune, cleanse', color: PALETTE.pureSpirit,   resistance: { dotImmune: true, dotCleanse: true } },
  iron_shell:    { type: 'iron_shell',    name: 'Iron Shell',     hp: 250,  speed: 0.7, armor: 12, reward: 20,  special: 'Armor regen',         color: PALETTE.ironShell,    resistance: { homingImmune: true, armorRegen: 2 } },
  boss:          { type: 'boss',          name: 'Boss',           hp: 1500, speed: 0.7, armor: 15, reward: 60,  special: 'Epic+ loot',          color: PALETTE.boss },
};

// ─── Augments ───

export const AUGMENTS: Record<string, AugmentDef> = {
  power_crystal:  { kind: 'power_crystal',  name: 'Power Crystal',  description: 'Increases damage',         icon: 'aug_power',  particleColor: PALETTE.powerCrystal, effects: { common: { label: '+10% DMG',  damageMul: 0.10 }, rare: { label: '+20% DMG',  damageMul: 0.20 }, epic: { label: '+35% DMG',  damageMul: 0.35 }, legendary: { label: '+50% DMG',  damageMul: 0.50 } } },
  swift_gem:      { kind: 'swift_gem',      name: 'Swift Gem',      description: 'Increases attack speed',   icon: 'aug_swift',  particleColor: PALETTE.swiftGem,     effects: { common: { label: '+10% SPD',  speedMul: 0.10 }, rare: { label: '+20% SPD',  speedMul: 0.20 }, epic: { label: '+35% SPD',  speedMul: 0.35 }, legendary: { label: '+50% SPD',  speedMul: 0.50 } } },
  far_sight_lens: { kind: 'far_sight_lens', name: 'Far Sight Lens', description: 'Increases range',          icon: 'aug_range',  particleColor: PALETTE.farSightLens, effects: { common: { label: '+15% RNG',  rangeMul: 0.15 }, rare: { label: '+25% RNG',  rangeMul: 0.25 }, epic: { label: '+40% RNG',  rangeMul: 0.40 }, legendary: { label: '+60% RNG',  rangeMul: 0.60 } } },
  chain_link:     { kind: 'chain_link',     name: 'Chain Link',     description: 'Chain to extra targets',   icon: 'aug_chain',  particleColor: PALETTE.chainLink,    effects: { common: { label: '+1 Chain',  chainCount: 1 }, rare: { label: '+2 Chain',  chainCount: 2 }, epic: { label: '+3 Chain',  chainCount: 3 }, legendary: { label: '+4 Chain',  chainCount: 4 } } },
  frost_shard:    { kind: 'frost_shard',    name: 'Frost Shard',    description: 'Adds slow effect',         icon: 'aug_frost',  particleColor: PALETTE.frostShard,   effects: { common: { label: '15% Slow', slowPct: 0.15, slowDuration: 1000 }, rare: { label: '30% Slow', slowPct: 0.30, slowDuration: 1500 }, epic: { label: '45% Slow', slowPct: 0.45, slowDuration: 2000 }, legendary: { label: '60% Slow', slowPct: 0.60, slowDuration: 3000 } } },
  ember_core:     { kind: 'ember_core',     name: 'Ember Core',     description: 'Adds burn DOT',            icon: 'aug_ember',  particleColor: PALETTE.emberCore,    effects: { common: { label: '3 DPS',    burnDps: 3, burnDuration: 2000 }, rare: { label: '8 DPS',    burnDps: 8, burnDuration: 3000 }, epic: { label: '15 DPS',   burnDps: 15, burnDuration: 4000 }, legendary: { label: '25 DPS',   burnDps: 25, burnDuration: 5000 } } },
  void_stone:     { kind: 'void_stone',     name: 'Void Stone',     description: 'Armor penetration',        icon: 'aug_void',   particleColor: PALETTE.voidStone,    effects: { common: { label: '+5 PEN',   armorPen: 5 }, rare: { label: '+12 PEN',  armorPen: 12 }, epic: { label: '+20 PEN',  armorPen: 20 }, legendary: { label: '+30 PEN',  armorPen: 30, trueDamagePct: 0.10 } } },
  lucky_coin:     { kind: 'lucky_coin',     name: 'Lucky Coin',     description: 'Crit chance (2x dmg)',     icon: 'aug_luck',   particleColor: PALETTE.luckyCoin,    effects: { common: { label: '8% Crit',  critChance: 0.08 }, rare: { label: '15% Crit', critChance: 0.15 }, epic: { label: '25% Crit', critChance: 0.25 }, legendary: { label: '35% Crit', critChance: 0.35 } } },
};

export const AUGMENT_KINDS_ORDERED = [
  'power_crystal', 'swift_gem', 'far_sight_lens', 'chain_link',
  'frost_shard', 'ember_core', 'void_stone', 'lucky_coin',
] as const;

// ─── Loot Table ───

export const LOOT_TABLE: AugmentItem[] = [
  { kind: 'power_crystal',  rarity: 'common', weight: 45, minStage: 0 }, { kind: 'swift_gem',      rarity: 'common', weight: 45, minStage: 0 },
  { kind: 'far_sight_lens', rarity: 'common', weight: 45, minStage: 0 }, { kind: 'chain_link',     rarity: 'common', weight: 45, minStage: 0 },
  { kind: 'frost_shard',    rarity: 'common', weight: 45, minStage: 0 }, { kind: 'ember_core',     rarity: 'common', weight: 45, minStage: 0 },
  { kind: 'void_stone',     rarity: 'common', weight: 45, minStage: 0 }, { kind: 'lucky_coin',     rarity: 'common', weight: 45, minStage: 0 },
  { kind: 'power_crystal',  rarity: 'rare', weight: 8, minStage: 1 }, { kind: 'swift_gem',      rarity: 'rare', weight: 8, minStage: 1 },
  { kind: 'far_sight_lens', rarity: 'rare', weight: 8, minStage: 1 }, { kind: 'chain_link',     rarity: 'rare', weight: 8, minStage: 1 },
  { kind: 'frost_shard',    rarity: 'rare', weight: 8, minStage: 1 }, { kind: 'ember_core',     rarity: 'rare', weight: 8, minStage: 1 },
  { kind: 'void_stone',     rarity: 'rare', weight: 8, minStage: 1 }, { kind: 'lucky_coin',     rarity: 'rare', weight: 8, minStage: 1 },
  { kind: 'power_crystal',  rarity: 'epic', weight: 2, minStage: 2 }, { kind: 'swift_gem',      rarity: 'epic', weight: 2, minStage: 2 },
  { kind: 'far_sight_lens', rarity: 'epic', weight: 2, minStage: 2 }, { kind: 'chain_link',     rarity: 'epic', weight: 2, minStage: 2 },
  { kind: 'frost_shard',    rarity: 'epic', weight: 2, minStage: 2 }, { kind: 'ember_core',     rarity: 'epic', weight: 2, minStage: 2 },
  { kind: 'void_stone',     rarity: 'epic', weight: 2, minStage: 2 }, { kind: 'lucky_coin',     rarity: 'epic', weight: 2, minStage: 2 },
  { kind: 'power_crystal',  rarity: 'legendary', weight: 1, minStage: 3 }, { kind: 'swift_gem',      rarity: 'legendary', weight: 1, minStage: 3 },
  { kind: 'far_sight_lens', rarity: 'legendary', weight: 1, minStage: 3 }, { kind: 'chain_link',     rarity: 'legendary', weight: 1, minStage: 3 },
  { kind: 'frost_shard',    rarity: 'legendary', weight: 1, minStage: 3 }, { kind: 'ember_core',     rarity: 'legendary', weight: 1, minStage: 3 },
  { kind: 'void_stone',     rarity: 'legendary', weight: 1, minStage: 3 }, { kind: 'lucky_coin',     rarity: 'legendary', weight: 1, minStage: 3 },
];

// ─── Wave Scaling ───

export function getWaveConfig(waveNumber: number): WaveConfig {
  const stage = Math.floor((waveNumber - 1) / 10);
  const isBoss = waveNumber % 5 === 0;
  const baseCount = 4 + Math.floor(waveNumber * 1.5);
  const hpScale = 1 + stage * 0.6 + (waveNumber - 1) * 0.04;
  const speedScale = 1 + stage * 0.15 + (waveNumber - 1) * 0.008;
  return { waveNumber, stage, isBoss, baseCount, hpScale, speedScale };
}

// ─── Map Path ───

function generateSnakePath(): [number, number][] {
  const path: [number, number][] = [];
  const randInt = (min: number, max: number) =>
    min + Math.floor(Math.random() * (max - min + 1));

  let col = randInt(0, 2);
  let row = randInt(1, 2);
  let goingEast = true;

  path.push([col, row]);

  while (row < MAP_ROWS - 2) {
    const targetCol = goingEast
      ? randInt(MAP_COLS - 3, MAP_COLS - 1)
      : randInt(0, 2);

    const step = goingEast ? 1 : -1;
    while (col !== targetCol) {
      col += step;
      path.push([col, row]);
    }

    const remaining = MAP_ROWS - 1 - row;
    if (remaining <= 0) break;
    const turnLen = Math.min(randInt(2, 3), remaining);
    for (let i = 0; i < turnLen; i++) {
      row++;
      path.push([col, row]);
    }

    goingEast = !goingEast;
  }

  return path;
}

export const DEFAULT_PATH: [number, number][] = generateSnakePath();
export const SPAWN_POINT: [number, number] = DEFAULT_PATH[0];
export const BASE_POINT = DEFAULT_PATH[DEFAULT_PATH.length - 1];