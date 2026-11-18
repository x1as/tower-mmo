import { useMemo } from 'react';
import { AUGMENTS, PALETTE, TOWERS, SELL_REFUND_RATE, MAX_AUGMENT_SLOTS } from '@tower/shared';
import type { InventoryItem, TowerState, TowerDef, LootRarity, AugmentKind } from '@tower/shared';

interface InventoryProps {
  open: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  selectedTower: TowerState | null;
  selectedTowerDef: TowerDef | null;
  onStartAugment: (instanceId: string) => void;
  onRemoveAugment: (towerId: string, augmentIndex: number) => void;
  onSellTower: () => void;
  pendingAugmentInstanceId: string | null;
  availableAugmentTowerCount: number;
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

export function Inventory({
  open, onClose, inventory, selectedTower, selectedTowerDef,
  onStartAugment, onRemoveAugment, onSellTower,
  pendingAugmentInstanceId, availableAugmentTowerCount,
}: InventoryProps) {
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

  if (!open) return null;

  const canTarget = availableAugmentTowerCount > 0;
  const targeting = pendingAugmentInstanceId !== null;

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

      {targeting && (
        <div style={{
          padding: '8px 16px',
          fontSize: 12,
          color: PALETTE.gold,
          background: `linear-gradient(90deg, rgba(240,178,58,0.08) 0%, transparent 100%)`,
          borderBottom: `1px solid ${PALETTE.gold}22`,
          letterSpacing: 0.5,
        }}>
          TARGET A TOWER — CLICK IT ON THE MAP
        </div>
      )}
      {!targeting && canTarget && (
        <div style={{
          padding: '8px 16px',
          fontSize: 12,
          color: PALETTE.frost,
          background: `linear-gradient(90deg, rgba(79,179,255,0.06) 0%, transparent 100%)`,
          borderBottom: `1px solid ${PALETTE.frost}12`,
          letterSpacing: 0.5,
        }}>
          CLICK AN UPGRADE, THEN CLICK A TOWER
        </div>
      )}
      {!targeting && !canTarget && (
        <div style={{
          padding: '8px 16px',
          fontSize: 12,
          color: '#777',
          background: 'rgba(255,255,255,0.02)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          letterSpacing: 0.5,
        }}>
          BUILD A TOWER TO APPLY UPGRADES
        </div>
      )}

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
                  onClick={() => canTarget && onStartAugment(group.firstInstanceId)}
                  style={{
                    background: RARITY_BG[group.rarity],
                    border: `1px solid ${RARITY_BORDER[group.rarity]}`,
                    borderRadius: 6,
                    padding: '10px 8px 8px',
                    textAlign: 'center',
                    cursor: canTarget ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    opacity: canTarget ? 1 : 0.45,
                    boxShadow: isLegendary
                      ? `0 0 12px ${PALETTE.legendary}15, inset 0 1px 0 rgba(255,255,255,0.03)`
                      : 'inset 0 1px 0 rgba(255,255,255,0.02)',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => {
                    if (canTarget) {
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

    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
