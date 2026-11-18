import { PALETTE } from '@tower/shared';
import type { AugmentKind, LootRarity } from '@tower/shared';

export type { AugmentKind, LootRarity };
export type SidebarPanel = 'inventory' | 'shop' | 'forge';

export const RARITY_COLORS: Record<LootRarity, string> = {
  common: PALETTE.common,
  rare: PALETTE.rare,
  epic: PALETTE.epic,
  legendary: PALETTE.legendary,
};

export const RARITY_BG: Record<LootRarity, string> = {
  common: '#18181f',
  rare: '#101a2a',
  epic: '#1a1028',
  legendary: '#261c0c',
};

export const RARITY_BORDER: Record<LootRarity, string> = {
  common: '#33333f',
  rare: '#244a78',
  epic: '#5a2e99',
  legendary: '#b07818',
};

export const RARITY_LABELS: Record<LootRarity, string> = {
  common: 'COMMON',
  rare: 'RARE',
  epic: 'EPIC',
  legendary: 'LEGENDARY',
};

export const ITEM_SYMBOLS: Record<AugmentKind, string> = {
  power_crystal: '\u25C6',
  swift_gem: '\u26A1',
  far_sight_lens: '\u25CE',
  chain_link: '\u221E',
  frost_shard: '\u2744',
  ember_core: '\u2668',
  void_stone: '\u25C9',
  lucky_coin: '\u2605',
};

export function formatGold(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 10000) return `${Math.floor(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

export function hexToRgb(hex: string): string {
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`;
}