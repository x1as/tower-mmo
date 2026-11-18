import { useEffect, useMemo, useState } from 'react';
import { CRAFT_RECIPES, PALETTE } from '@tower/shared';
import type { AugmentKind, InventoryItem, LootRarity } from '@tower/shared';
import { SidebarFrame, LootRevealOverlay } from './SidebarFrame';
import { RARITY_BORDER, RARITY_COLORS, RARITY_LABELS } from './SidebarUtils';

interface ForgeSidebarProps {
  open: boolean;
  inventory: InventoryItem[];
  onClose: () => void;
  onCraft: (inputRarity: LootRarity) => { kind: AugmentKind; rarity: LootRarity } | null;
}

interface CraftResult {
  kind: AugmentKind;
  rarity: LootRarity;
}

export function ForgeSidebar({ open, inventory, onClose, onCraft }: ForgeSidebarProps) {
  const [craftResult, setCraftResult] = useState<CraftResult | null>(null);

  useEffect(() => {
    if (!craftResult) return;
    const timer = setTimeout(() => setCraftResult(null), 2200);
    return () => clearTimeout(timer);
  }, [craftResult]);

  const rarityCounts = useMemo(() => {
    const counts: Record<LootRarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
    for (const item of inventory) counts[item.rarity] += 1;
    return counts;
  }, [inventory]);

  if (!open) return null;

  const handleCraft = (inputRarity: LootRarity) => {
    const result = onCraft(inputRarity);
    if (!result) return;
    setCraftResult(result);
  };

  return (
    <SidebarFrame
      title="FORGE"
      accent={PALETTE.flame}
      count={inventory.length}
      onClose={onClose}
      overlay={craftResult && <LootRevealOverlay result={{ ...craftResult, phase: 'revealing' }} onClose={() => setCraftResult(null)} />}
    >
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: 12, color: '#777', lineHeight: '16px', marginBottom: 12 }}>
          COMBINE LOWER-RARITY AUGMENTS INTO A STRONGER ONE.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {CRAFT_RECIPES.map((recipe) => {
            const inputRarity = recipe.inputRarity as LootRarity;
            const outputRarity = recipe.outputRarity as LootRarity;
            const hasEnough = rarityCounts[inputRarity] >= recipe.inputCount;
            return (
              <div
                key={recipe.inputRarity}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px',
                  background: hasEnough ? 'rgba(255,255,255,0.02)' : 'transparent',
                  borderRadius: 5,
                  border: `1px solid ${hasEnough ? RARITY_BORDER[outputRarity] + '44' : 'rgba(255,255,255,0.03)'}`,
                }}
              >
                <div style={{ flex: 1, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{
                    color: hasEnough ? RARITY_COLORS[inputRarity] : '#333',
                    fontWeight: 'bold',
                    minWidth: 28,
                  }}>
                    {rarityCounts[inputRarity]}/{recipe.inputCount}
                  </span>
                  <span style={{ color: '#444', fontSize: 9 }}>{RARITY_LABELS[inputRarity]}</span>
                  <span style={{ color: '#333' }}>{'\u2192'}</span>
                  <span style={{ color: RARITY_COLORS[outputRarity], fontSize: 9 }}>{RARITY_LABELS[outputRarity]}</span>
                </div>
                <button
                  onClick={() => hasEnough && handleCraft(inputRarity)}
                  style={{
                    fontFamily: '"Minecraft", monospace',
                    fontSize: 10,
                    padding: '4px 10px',
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
                  onMouseEnter={(event) => {
                    if (!hasEnough) return;
                    event.currentTarget.style.borderColor = RARITY_COLORS[outputRarity];
                    event.currentTarget.style.boxShadow = `0 0 8px ${RARITY_COLORS[outputRarity]}30`;
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.borderColor = hasEnough ? RARITY_COLORS[outputRarity] + '66' : '#222';
                    event.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  FORGE
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {inventory.length === 0 ? (
          <div style={{ fontSize: 12, color: '#333', lineHeight: '16px' }}>
            COLLECT AUGMENTS FROM ENEMIES BEFORE USING THE FORGE.
          </div>
        ) : (
          <div style={{ fontSize: 11, color: '#555', lineHeight: '16px' }}>
            THE FORGE CONSUMES INPUTS IMMEDIATELY AND RETURNS ONE RANDOM AUGMENT OF THE OUTPUT RARITY.
          </div>
        )}
      </div>

      <div style={{
        marginTop: 'auto',
        padding: '9px 16px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        fontSize: 10,
        color: '#333',
        textAlign: 'center',
        letterSpacing: 1,
      }}>
        INPUTS ARE CONSUMED {'\u2666'} OUTPUT IS RANDOM
      </div>
    </SidebarFrame>
  );
}
