// ─── Core Enums ───

export type TowerType = 'cannon' | 'frost' | 'beam' | 'sniper' | 'tesla' | 'flame' | 'poison' | 'missile';
export type EnemyType = 'scatter_imp' | 'thermal_drake' | 'mirror_wisp' | 'blink_fox' | 'ground_wurm' | 'magma_golem' | 'pure_spirit' | 'iron_shell' | 'boss';
export type LootRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type AugmentKind = 'power_crystal' | 'swift_gem' | 'far_sight_lens' | 'chain_link' | 'frost_shard' | 'ember_core' | 'void_stone' | 'lucky_coin';

// ─── Tower ───

export interface TowerDef {
  type: TowerType;
  name: string;
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
  splash: number;
  special: string;
  color: string;
}

export interface TowerState {
  id: string;
  type: TowerType;
  gridX: number;
  gridY: number;
  tier: number;
  augments: AppliedAugment[];
}

export interface AppliedAugment {
  kind: AugmentKind;
  rarity: LootRarity;
}

// ─── Augment Items ───

export interface AugmentDef {
  kind: AugmentKind;
  name: string;
  description: string;
  icon: string;
  particleColor: string;
  effects: Record<LootRarity, AugmentEffect>;
}

export interface AugmentEffect {
  label: string;
  damageMul?: number;
  speedMul?: number;
  rangeMul?: number;
  chainCount?: number;
  slowPct?: number;
  slowDuration?: number;
  burnDps?: number;
  burnDuration?: number;
  armorPen?: number;
  trueDamagePct?: number;
  critChance?: number;
}

export interface AugmentItem {
  kind: AugmentKind;
  rarity: LootRarity;
  weight: number;
  minStage: number;
}

export interface InventoryItem {
  instanceId: string;
  kind: AugmentKind;
  rarity: LootRarity;
}

export interface LootDrop {
  id: string;
  kind: AugmentKind;
  rarity: LootRarity;
  x: number;
  y: number;
}

// ─── Enemy ───

export interface EnemyResistance {
  splashReduction?: number;
  slowImmune?: boolean;
  beamReduction?: number;
  dodgeChance?: number;
  chainImmune?: boolean;
  fireImmune?: boolean;
  dotImmune?: boolean;
  homingImmune?: boolean;
  armorRegen?: number;
  dotCleanse?: boolean;
}

export interface EnemyDef {
  type: EnemyType;
  name: string;
  hp: number;
  speed: number;
  armor: number;
  reward: number;
  special: string;
  color: string;
  resistance?: EnemyResistance;
}

// ─── Wave ───

export interface WaveConfig {
  waveNumber: number;
  stage: number;
  isBoss: boolean;
  baseCount: number;
  hpScale: number;
  speedScale: number;
}

// ─── Game State (emitted to UI) ───

export interface GameUIState {
  wave: number;
  phase: 'build' | 'combat' | 'wave_end' | 'game_over';
  gold: number;
  baseHp: number;
  maxBaseHp: number;
  enemyCount: number;
  gameStage: number;
  towerCount: number;
  inventory: InventoryItem[];
  selectedTowerId: string | null;
  selectedTower: TowerState | null;
  selectedTowerDef: TowerDef | null;
  selectedTowerType: TowerType | null;
  autoRun: boolean;
  paused: boolean;
  towerTypeCounts: Record<string, number>;
}