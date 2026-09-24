import type { AugmentItem, AugmentKind } from './types';

const ALL_KINDS: AugmentKind[] = [
  'power_crystal', 'swift_gem', 'far_sight_lens', 'chain_link',
  'frost_shard', 'ember_core', 'void_stone', 'lucky_coin',
];

export function rollRandomKind(): AugmentKind {
  return ALL_KINDS[Math.floor(Math.random() * ALL_KINDS.length)];
}

export function rollLoot(lootTable: AugmentItem[], gameStage: number): AugmentItem | null {
  const eligible = lootTable.filter(item => item.minStage <= gameStage);
  if (eligible.length === 0) return null;

  const totalWeight = eligible.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const item of eligible) {
    roll -= item.weight;
    if (roll <= 0) return { ...item };
  }
  return { ...eligible[eligible.length - 1] };
}

export function shouldDropLoot(enemyType: string): boolean {
  if (enemyType === 'boss') return true;
  return Math.random() < 0.12;
}

export function rollBossLoot(lootTable: AugmentItem[], gameStage: number): AugmentItem | null {
  const minRarities = gameStage >= 2
    ? ['epic', 'legendary']
    : ['rare', 'epic', 'legendary'];
  const eligible = lootTable.filter(
    item => item.minStage <= gameStage && minRarities.includes(item.rarity)
  );
  if (eligible.length === 0) return rollLoot(lootTable, gameStage);

  const totalWeight = eligible.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of eligible) {
    roll -= item.weight;
    if (roll <= 0) return { ...item };
  }
  return { ...eligible[eligible.length - 1] };
}