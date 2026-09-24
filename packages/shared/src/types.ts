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
  augments: AppliedAugment[];  // up to 10 slots
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
  icon: string;          // sprite key prefix
  particleColor: string; // hex
  effects: Record<LootRarity, AugmentEffect>;
}

export interface AugmentEffect {
  label: string;         // e.g. "+30% damage"
  damageMul?: number;    // multiplier added (0.15 = +15%)
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

// ─── Augment Drop ───

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
  splashReduction?: number;   // 0-1, reduces splash damage
  slowImmune?: boolean;       // immune to slow
  beamReduction?: number;     // 0-1, reduces beam damage
  dodgeChance?: number;       // 0-1, dodge projectile attacks
  chainImmune?: boolean;      // immune to chain/tesla
  fireImmune?: boolean;       // immune to burn DOT
  dotImmune?: boolean;        // immune to all DOT
  homingImmune?: boolean;     // missiles can't track
  armorRegen?: number;        // armor/sec regen
  dotCleanse?: boolean;       // cleanses nearby ally DOTs
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

// ─── Socket.IO Events ───

export interface ServerToClientEvents {
  game_state: (state: any) => void;
  wave_start: (data: { waveNumber: number; enemies: Array<{ type: EnemyType; count: number }> }) => void;
  wave_end: (data: { waveNumber: number; rewards: { gold: number } }) => void;
  tower_placed: (data: TowerState) => void;
  loot_drop: (data: LootDrop) => void;
  base_damage: (data: { currentHP: number; damage: number }) => void;
  game_over: (data: { result: 'win' | 'lose'; wave: number }) => void;
  build_phase: (data: { duration: number }) => void;
}

export interface ClientToServerEvents {
  join_game: (data: { gameId: string }) => void;
  tower_place: (data: { towerType: TowerType; gridX: number; gridY: number }) => void;
  tower_upgrade: (data: { towerId: string }) => void;
  tower_sell: (data: { towerId: string }) => void;
  loot_pickup: (data: { itemId: string }) => void;
  start_wave: () => void;
  apply_augment: (data: { towerId: string; instanceId: string }) => void;
}
