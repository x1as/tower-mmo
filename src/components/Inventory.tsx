import { useMemo, useState, useEffect } from 'react';
import { AUGMENTS, PALETTE, TOWERS, SELL_REFUND_RATE, MAX_AUGMENT_SLOTS, CHEST_PRICES, CRAFT_RECIPES } from '@tower/shared';
import type { InventoryItem, TowerState, TowerDef, LootRarity, AugmentKind } from '@tower/shared';

interface InventoryProps {
  open: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  gold: number;
  selectedTower: TowerState | null;
  selectedTowerDef: TowerDef | null;
  onApplyAugment: (instanceId: string) => void;
  onRemoveAugment: (towerId: string, augmentIndex: number) => void;
  onSellTower: () => void;
  onBuyChest: (rarity: LootRarity) => { kind: AugmentKind; rarity: LootRarity } | null;
  onCraft: (inputRarity: LootRarity) => { kind: AugmentKind; rarity: LootRarity } | null;
}

const RARITY_COLORS: Record<LootRarity, string> = {
  common: PALETTE.common,
  rare: PALETTE.rare,
  epic: PALETTE.epic,
  legendary: PALETTE.legendary,
};

const RARITY_BG: Record<LootRarity, string> = {
  common: '#18181f',
  rare: '#101a2a',
  epic: '#1a1028',
  legendary: '#261c0c',
};

const RARITY_BORDER: Record<LootRarity, string> = {
  common: '#33333f',
  rare: '#244a78',
  epic: '#5a2e99',
  legendary: '#b07818',
};

const RARITY_LABELS: Record<LootRarity, string> = {
  common: 'COMMON',
  rare: 'RARE',
  epic: 'EPIC',
  legendary: 'LEGENDARY',
};

const RARITY_ORDER: LootRarity[] = ['legendary', 'epic', 'rare', 'common'];

const ITEM_SYMBOLS: Record<AugmentKind, string> = {
  power_crystal: '\u25C6',
  swift_gem: '\u26A1',
  far_sight_lens: '\u25CE',
  chain_link: '\u221E',
  frost_shard: '\u2744',
  ember_core: '\u2668',
  void_stone: '\u25C9',
  lucky_coin: '\u2605',
};

interface GroupedItem {
  kind: AugmentKind;
  rarity: LootRarity;
  count: number;
  firstInstanceId: string;
}

interface ChestResult {
  kind: AugmentKind;
  rarity: LootRarity;
  phase: 'shaking' | 'revealing';
}

function formatGold(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 10000) return `${Math.floor(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

export function Inventory({
  open, onClose, inventory, gold, selectedTower, selectedTowerDef,
  onApplyAugment, onRemoveAugment, onSellTower, onBuyChest, onCraft,
}: InventoryProps) {
  const [chestResult, setChestResult] = useState<ChestResult | null>(null);

  // Auto-dismiss chest animation
  useEffect(() => {
    if (!chestResult) return;
    if (chestResult.phase === 'shaking') {
      const t = setTimeout(() => setChestResult(prev => prev ? { ...prev, phase: 'revealing' } : null), 600);
      return () => clearTimeout(t);
    }
    if (chestResult.phase === 'revealing') {
      const t = setTimeout(() => setChestResult(null), 2200);
      return () => clearTimeout(t);
    }
  }, [chestResult?.phase]);

  const grouped = useMemo(() => {
    const map = new Map<string, GroupedItem>();
    for (const item of inventory) {
      const key = `${item.kind}_${item.rarity}`;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, {
          kind: item.kind,
          rarity: item.rarity,
          count: 1,
          firstInstanceId: item.instanceId,
        });
      }
    }
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      const ra = RARITY_ORDER.indexOf(a.rarity);
      const rb = RARITY_ORDER.indexOf(b.rarity);
      if (ra !== rb) return ra - rb;
      return a.kind.localeCompare(b.kind);
    });
    return arr;
  }, [inventory]);

  // Count items by rarity for crafting
  const rarityCounts = useMemo(() => {
    const counts: Record<string, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
    for (const item of inventory) {
      counts[item.rarity] = (counts[item.rarity] || 0) + 1;
    }
    return counts;
  }, [inventory]);

  if (!open) return null;

  const canApply = !!selectedTower && selectedTower.augments.length < MAX_AUGMENT_SLOTS;

  const handleBuyChest = (rarity: LootRarity) => {
    const result = onBuyChest(rarity);
    if (!result) return;
    setChestResult({ ...result, phase: 'shaking' });
  };

  const handleCraft = (inputRarity: LootRarity) => {
    const result = onCraft(inputRarity);
    if (!result) return;
    setChestResult({ ...result, phase: 'shaking' });
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: 360,
      height: '100%',
      background: '#0c0e16',
      borderLeft: `2px solid ${PALETTE.uiBorder}66`,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 30,
      fontFamily: '"Minecraft", monospace',
      color: '#c0c0d0',
      boxShadow: '-6px 0 32px rgba(0,0,0,0.9)',
    }}>
      {/* CSS Keyframes */}
      <style>{`
        @keyframes chestShake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          10%, 50%, 90% { transform: translateX(-5px) rotate(-3deg); }
          30%, 70% { transform: translateX(5px) rotate(3deg); }
        }
        @keyframes chestBurst {
          0% { transform: scale(0.3); opacity: 0; }
          40% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes chestGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        @keyframes chestFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes craftFlash {
          0% { background: rgba(255,255,255,0.15); }
          100% { background: transparent; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px 10px',
        borderBottom: `1px solid ${PALETTE.uiBorder}33`,
        background: 'linear-gradient(180deg, rgba(240,178,58,0.05) 0%, transparent 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 18, color: PALETTE.gold, letterSpacing: 2, textShadow: `0 0 10px ${PALETTE.gold}33` }}>
            INVENTORY
          </span>
          <span style={{ fontSize: 13, color: '#444' }}>
            {inventory.length}
          </span>
        </div>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#555',
          cursor: 'pointer',
          padding: '4px 12px',
          fontSize: 14,
          fontFamily: '"Minecraft"',
          borderRadius: 3,
        }}>X</button>
      </div>

      {/* Selected Tower Panel */}
      {selectedTower && selectedTowerDef && (
        <div style={{
          padding: '12px 16px',
          borderBottom: `1px solid rgba(255,255,255,0.06)`,
          background: `linear-gradient(135deg, rgba(${hexToRgb(selectedTowerDef.color)},0.06) 0%, transparent 100%)`,
          maxHeight: '40%',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          {/* Tower info row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
            flexShrink: 0,
          }}>
            <div>
              <div style={{
                fontSize: 18,
                color: selectedTowerDef.color,
                textShadow: `0 0 8px ${selectedTowerDef.color}33`,
                letterSpacing: 1,
              }}>
                {selectedTowerDef.name.toUpperCase()}
              </div>
              <div style={{ fontSize: 11, color: '#4a4a5a', marginTop: 2 }}>
                {selectedTowerDef.special}
              </div>
            </div>
            <button onClick={onSellTower} style={{
              fontFamily: '"Minecraft"', fontSize: 12, padding: '5px 12px',
              background: 'rgba(224,85,85,0.08)',
              border: `1px solid ${PALETTE.hpRed}33`,
              color: PALETTE.hpRed,
              cursor: 'pointer', borderRadius: 3,
            }}>SELL {Math.floor((TOWERS[selectedTower.type]?.cost || 100) * SELL_REFUND_RATE)}g</button>
          </div>

          {/* Augment slots label */}
          <div style={{
            fontSize: 12, color: '#4a4a5a', marginBottom: 6, letterSpacing: 1, flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>AUGMENTS {selectedTower.augments.length}/{MAX_AUGMENT_SLOTS}</span>
            {selectedTower.augments.length > 0 && (
              <span style={{ fontSize: 9, color: '#383848' }}>CLICK TO REMOVE</span>
            )}
          </div>

          {/* Applied augments */}
          {selectedTower.augments.length > 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 4,
              flex: 1, overflowY: 'auto', minHeight: 0,
            }}>
              {selectedTower.augments.map((aug, i) => {
                const augDef = AUGMENTS[aug.kind];
                const eff = augDef.effects[aug.rarity];
                return (
                  <div key={i}
                    onClick={() => onRemoveAugment(selectedTower.id, i)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      background: RARITY_BG[aug.rarity],
                      border: `1px solid ${RARITY_BORDER[aug.rarity]}88`,
                      borderRadius: 4,
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = PALETTE.hpRed;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = RARITY_BORDER[aug.rarity] + '88';
                    }}
                  >
                    <div style={{
                      fontSize: 18,
                      color: augDef.particleColor,
                      textShadow: `0 0 6px ${augDef.particleColor}44`,
                      minWidth: 24,
                      textAlign: 'center',
                    }}>
                      {ITEM_SYMBOLS[aug.kind]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: RARITY_COLORS[aug.rarity], lineHeight: '14px' }}>
                        {augDef.name}
                      </div>
                      <div style={{ fontSize: 9, color: RARITY_COLORS[aug.rarity], opacity: 0.4, letterSpacing: 1 }}>
                        {RARITY_LABELS[aug.rarity]}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: '#aaa',
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: 3,
                      padding: '2px 6px',
                      whiteSpace: 'nowrap',
                    }}>
                      {eff.label}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#2a2a34', fontStyle: 'italic' }}>
              No augments — click items below to apply
            </div>
          )}
        </div>
      )}

      {/* Apply instruction banner */}
      {canApply && (
        <div style={{
          padding: '8px 16px',
          fontSize: 12,
          color: PALETTE.frost,
          background: `linear-gradient(90deg, rgba(79,179,255,0.06) 0%, transparent 100%)`,
          borderBottom: `1px solid ${PALETTE.frost}12`,
          letterSpacing: 0.5,
        }}>
          CLICK ITEM TO APPLY TO TOWER
        </div>
      )}

      {/* Slots full warning */}
      {selectedTower && selectedTower.augments.length >= MAX_AUGMENT_SLOTS && (
        <div style={{
          padding: '8px 16px',
          fontSize: 12,
          color: PALETTE.gold,
          background: `linear-gradient(90deg, rgba(240,178,58,0.06) 0%, transparent 100%)`,
          borderBottom: `1px solid ${PALETTE.gold}12`,
          letterSpacing: 0.5,
        }}>
          SLOTS FULL — REMOVE TO ADD MORE
        </div>
      )}

      {/* Scrollable content area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 0,
      }}>

        {/* ─── SHOP ─── */}
        <div style={{
          padding: '10px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{
            fontSize: 12, color: PALETTE.gold, letterSpacing: 2, marginBottom: 8,
            textShadow: `0 0 8px ${PALETTE.gold}22`,
          }}>
            SHOP
            <span style={{ fontSize: 10, color: '#555', marginLeft: 8, letterSpacing: 0 }}>
              {'\u2666'} {formatGold(gold)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['common', 'rare', 'epic', 'legendary'] as LootRarity[]).map(rarity => {
              const price = CHEST_PRICES[rarity];
              const canAfford = gold >= price;
              return (
                <button
                  key={rarity}
                  onClick={() => canAfford && handleBuyChest(rarity)}
                  style={{
                    flex: 1,
                    padding: '8px 4px 6px',
                    background: canAfford
                      ? `linear-gradient(180deg, ${RARITY_BG[rarity]} 0%, rgba(0,0,0,0.4) 100%)`
                      : 'rgba(20,20,28,0.5)',
                    border: `1px solid ${canAfford ? RARITY_BORDER[rarity] : '#222'}`,
                    borderRadius: 6,
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                    opacity: canAfford ? 1 : 0.35,
                    fontFamily: '"Minecraft", monospace',
                    textAlign: 'center',
                    transition: 'all 0.15s',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => {
                    if (canAfford) {
                      (e.currentTarget as HTMLElement).style.borderColor = RARITY_COLORS[rarity];
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 0 12px ${RARITY_COLORS[rarity]}20`;
                    }
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = canAfford ? RARITY_BORDER[rarity] : '#222';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  {/* Chest icon */}
                  <div style={{
                    width: 28, height: 22, margin: '0 auto 4px',
                    background: `linear-gradient(180deg, ${RARITY_COLORS[rarity]}33 0%, ${RARITY_COLORS[rarity]}11 100%)`,
                    border: `2px solid ${RARITY_COLORS[rarity]}66`,
                    borderRadius: 3,
                    position: 'relative',
                  }}>
                    {/* Lid */}
                    <div style={{
                      position: 'absolute', top: -6, left: -2, right: -2, height: 8,
                      background: `linear-gradient(180deg, ${RARITY_COLORS[rarity]}55 0%, ${RARITY_COLORS[rarity]}22 100%)`,
                      border: `2px solid ${RARITY_COLORS[rarity]}66`,
                      borderRadius: '3px 3px 0 0',
                    }} />
                    {/* Lock */}
                    <div style={{
                      position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
                      width: 6, height: 8, background: RARITY_COLORS[rarity],
                      borderRadius: 2, opacity: 0.6,
                    }} />
                  </div>
                  {/* Price */}
                  <div style={{
                    fontSize: 10, color: canAfford ? PALETTE.gold : '#444',
                    lineHeight: '12px',
                  }}>
                    {formatGold(price)}g
                  </div>
                  {/* Rarity label */}
                  <div style={{
                    fontSize: 8, color: RARITY_COLORS[rarity], opacity: 0.5,
                    letterSpacing: 1, marginTop: 2,
                  }}>
                    {RARITY_LABELS[rarity].slice(0, 3)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── FORGE ─── */}
        <div style={{
          padding: '10px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{
            fontSize: 12, color: PALETTE.flame, letterSpacing: 2, marginBottom: 8,
            textShadow: `0 0 8px ${PALETTE.flame}22`,
          }}>
            FORGE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {CRAFT_RECIPES.map(recipe => {
              const inputRarity = recipe.inputRarity as LootRarity;
              const outputRarity = recipe.outputRarity as LootRarity;
              const hasEnough = rarityCounts[inputRarity] >= recipe.inputCount;
              return (
                <div key={recipe.inputRarity} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 8px',
                  background: hasEnough ? 'rgba(255,255,255,0.02)' : 'transparent',
                  borderRadius: 4,
                  border: `1px solid ${hasEnough ? RARITY_BORDER[outputRarity] + '44' : 'rgba(255,255,255,0.03)'}`,
                }}>
                  {/* Input */}
                  <div style={{ flex: 1, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      color: hasEnough ? RARITY_COLORS[inputRarity] : '#333',
                      fontWeight: 'bold',
                    }}>
                      {rarityCounts[inputRarity]}/{recipe.inputCount}
                    </span>
                    <span style={{ color: '#444', fontSize: 10 }}>
                      {RARITY_LABELS[inputRarity]}
                    </span>
                    <span style={{ color: '#333' }}>{'\u2192'}</span>
                    <span style={{ color: RARITY_COLORS[outputRarity], fontSize: 10 }}>
                      {RARITY_LABELS[outputRarity]}
                    </span>
                  </div>
                  {/* Forge button */}
                  <button
                    onClick={() => hasEnough && handleCraft(inputRarity)}
                    style={{
                      fontFamily: '"Minecraft", monospace',
                      fontSize: 10,
                      padding: '3px 10px',
                      background: hasEnough
                        ? `linear-gradient(180deg, ${RARITY_COLORS[outputRarity]}22 0%, transparent 100%)`
                        : 'transparent',
                      border: `1px solid ${hasEnough ? RARITY_COLORS[outputRarity] + '66' : '#222'}`,
                      color: hasEnough ? RARITY_COLORS[outputRarity] : '#333',
                      borderRadius: 3,
                      cursor: hasEnough ? 'pointer' : 'not-allowed',
                      letterSpacing: 1,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (hasEnough) {
                        (e.currentTarget as HTMLElement).style.borderColor = RARITY_COLORS[outputRarity];
                        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 8px ${RARITY_COLORS[outputRarity]}30`;
                      }
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = hasEnough ? RARITY_COLORS[outputRarity] + '66' : '#222';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}
                  >
                    FORGE
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Item Grid ─── */}
        <div style={{ padding: 12 }}>
          {inventory.length === 0 && (
            <div style={{ textAlign: 'center', fontSize: 14, color: '#2a2a34', padding: 36 }}>
              EMPTY
              <br /><br />
              <span style={{ fontSize: 11, color: '#1e1e28' }}>Defeat enemies or buy chests</span>
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}>
            {grouped.map(group => {
              const aug = AUGMENTS[group.kind];
              const eff = aug.effects[group.rarity];
              const isLegendary = group.rarity === 'legendary';

              return (
                <div
                  key={`${group.kind}_${group.rarity}`}
                  onClick={() => canApply && onApplyAugment(group.firstInstanceId)}
                  style={{
                    background: RARITY_BG[group.rarity],
                    border: `1px solid ${RARITY_BORDER[group.rarity]}`,
                    borderRadius: 6,
                    padding: '10px 8px 8px',
                    textAlign: 'center',
                    cursor: canApply ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    opacity: canApply ? 1 : 0.6,
                    boxShadow: isLegendary
                      ? `0 0 12px ${PALETTE.legendary}15, inset 0 1px 0 rgba(255,255,255,0.03)`
                      : 'inset 0 1px 0 rgba(255,255,255,0.02)',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => {
                    if (canApply) {
                      (e.currentTarget as HTMLElement).style.borderColor = RARITY_COLORS[group.rarity];
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 0 14px ${RARITY_COLORS[group.rarity]}20`;
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = RARITY_BORDER[group.rarity];
                    (e.currentTarget as HTMLElement).style.boxShadow = isLegendary
                      ? `0 0 12px ${PALETTE.legendary}15, inset 0 1px 0 rgba(255,255,255,0.03)`
                      : 'inset 0 1px 0 rgba(255,255,255,0.02)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  {/* Top rarity stripe */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg, transparent 15%, ${RARITY_COLORS[group.rarity]}88 50%, transparent 85%)`,
                  }} />

                  {/* Count badge */}
                  {group.count > 1 && (
                    <div style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      background: RARITY_COLORS[group.rarity],
                      color: '#000',
                      fontSize: 12,
                      fontWeight: 'bold',
                      fontFamily: '"Minecraft"',
                      padding: '1px 6px',
                      borderRadius: 6,
                      minWidth: 16,
                      textAlign: 'center',
                      lineHeight: '15px',
                    }}>
                      {group.count}
                    </div>
                  )}

                  {/* Icon */}
                  <div style={{
                    fontSize: 30,
                    lineHeight: '36px',
                    color: aug.particleColor,
                    textShadow: `0 0 8px ${aug.particleColor}44, 0 2px 3px rgba(0,0,0,0.5)`,
                    marginBottom: 4,
                  }}>
                    {ITEM_SYMBOLS[group.kind]}
                  </div>

                  {/* Name */}
                  <div style={{
                    fontSize: 12,
                    color: RARITY_COLORS[group.rarity],
                    lineHeight: '16px',
                    marginBottom: 2,
                  }}>
                    {aug.name}
                  </div>

                  {/* Rarity label */}
                  <div style={{
                    fontSize: 9,
                    color: RARITY_COLORS[group.rarity],
                    opacity: 0.45,
                    letterSpacing: 1,
                    marginBottom: 4,
                  }}>
                    {RARITY_LABELS[group.rarity]}
                  </div>

                  {/* Effect pill */}
                  <div style={{
                    fontSize: 11,
                    color: '#999',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 3,
                    padding: '2px 6px',
                    display: 'inline-block',
                  }}>
                    {eff.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 16px',
        borderTop: `1px solid rgba(255,255,255,0.04)`,
        fontSize: 11,
        color: '#2a2a34',
        textAlign: 'center',
        background: 'rgba(0,0,0,0.2)',
        letterSpacing: 1,
      }}>
        {grouped.length} TYPES {'\u00B7'} {inventory.length} TOTAL
      </div>

      {/* ─── Chest Opening Animation Overlay ─── */}
      {chestResult && (
        <div
          onClick={() => setChestResult(null)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            zIndex: 50,
            cursor: 'pointer',
            animation: 'chestFadeIn 0.2s ease',
          }}
        >
          {chestResult.phase === 'shaking' && (
            <div style={{ animation: 'chestShake 0.5s ease-in-out' }}>
              {/* Chest body */}
              <div style={{
                width: 90, height: 65,
                background: `linear-gradient(180deg, ${RARITY_COLORS[chestResult.rarity]}22 0%, ${RARITY_COLORS[chestResult.rarity]}0a 100%)`,
                border: `3px solid ${RARITY_COLORS[chestResult.rarity]}88`,
                borderRadius: 6,
                position: 'relative',
                boxShadow: `0 0 40px ${RARITY_COLORS[chestResult.rarity]}44, 0 0 80px ${RARITY_COLORS[chestResult.rarity]}22`,
              }}>
                {/* Lid */}
                <div style={{
                  position: 'absolute', top: -14, left: -3, right: -3, height: 18,
                  background: `linear-gradient(180deg, ${RARITY_COLORS[chestResult.rarity]}44 0%, ${RARITY_COLORS[chestResult.rarity]}22 100%)`,
                  border: `3px solid ${RARITY_COLORS[chestResult.rarity]}88`,
                  borderRadius: '6px 6px 0 0',
                }} />
                {/* Lock */}
                <div style={{
                  position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
                  width: 12, height: 16, background: RARITY_COLORS[chestResult.rarity],
                  borderRadius: 3, opacity: 0.7,
                  boxShadow: `0 0 8px ${RARITY_COLORS[chestResult.rarity]}`,
                }} />
              </div>
            </div>
          )}

          {chestResult.phase === 'revealing' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              animation: 'chestBurst 0.5s ease-out',
            }}>
              {/* Glow ring */}
              <div style={{
                position: 'absolute',
                width: 180, height: 180,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${RARITY_COLORS[chestResult.rarity]}22 0%, transparent 70%)`,
                animation: 'chestGlow 1.5s ease-in-out infinite',
              }} />
              {/* Light rays */}
              <div style={{
                position: 'absolute',
                width: 4, height: 120,
                background: `linear-gradient(180deg, transparent 0%, ${RARITY_COLORS[chestResult.rarity]}44 50%, transparent 100%)`,
                opacity: 0.5,
              }} />
              <div style={{
                position: 'absolute',
                width: 120, height: 4,
                background: `linear-gradient(90deg, transparent 0%, ${RARITY_COLORS[chestResult.rarity]}44 50%, transparent 100%)`,
                opacity: 0.5,
              }} />
              {/* Item icon */}
              <div style={{
                fontSize: 64,
                color: AUGMENTS[chestResult.kind].particleColor,
                textShadow: `0 0 30px ${AUGMENTS[chestResult.kind].particleColor}, 0 0 60px ${RARITY_COLORS[chestResult.rarity]}88`,
                position: 'relative',
              }}>
                {ITEM_SYMBOLS[chestResult.kind]}
              </div>
              {/* Item name */}
              <div style={{
                fontSize: 16,
                color: RARITY_COLORS[chestResult.rarity],
                textShadow: `0 0 12px ${RARITY_COLORS[chestResult.rarity]}66`,
                letterSpacing: 1,
                position: 'relative',
              }}>
                {AUGMENTS[chestResult.kind].name}
              </div>
              {/* Rarity */}
              <div style={{
                fontSize: 12,
                color: RARITY_COLORS[chestResult.rarity],
                letterSpacing: 3,
                opacity: 0.6,
                position: 'relative',
              }}>
                {RARITY_LABELS[chestResult.rarity]}
              </div>
              {/* Effect */}
              <div style={{
                fontSize: 12,
                color: '#888',
                background: 'rgba(0,0,0,0.4)',
                padding: '4px 12px',
                borderRadius: 4,
                position: 'relative',
              }}>
                {AUGMENTS[chestResult.kind].effects[chestResult.rarity].label}
              </div>
              {/* Click to close hint */}
              <div style={{
                fontSize: 10, color: '#333', marginTop: 12, position: 'relative',
              }}>
                CLICK TO CLOSE
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
