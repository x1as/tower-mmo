import { useEffect, useState } from 'react';
import { CHEST_PRICES, PALETTE } from '@tower/shared';
import type { AugmentKind, LootRarity } from '@tower/shared';
import { SidebarFrame, LootRevealOverlay } from './SidebarFrame';
import { RARITY_BG, RARITY_BORDER, RARITY_COLORS, RARITY_LABELS, formatGold } from './SidebarUtils';

interface ShopSidebarProps {
  open: boolean;
  gold: number;
  onClose: () => void;
  onBuyChest: (rarity: LootRarity) => { kind: AugmentKind; rarity: LootRarity } | null;
}

interface ChestResult {
  kind: AugmentKind;
  rarity: LootRarity;
  phase: 'shaking' | 'revealing';
}

export function ShopSidebar({ open, gold, onClose, onBuyChest }: ShopSidebarProps) {
  const [chestResult, setChestResult] = useState<ChestResult | null>(null);

  useEffect(() => {
    if (!chestResult) return;
    if (chestResult.phase === 'shaking') {
      const timer = setTimeout(() => setChestResult((current) => current ? { ...current, phase: 'revealing' } : null), 600);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setChestResult(null), 2200);
    return () => clearTimeout(timer);
  }, [chestResult]);

  if (!open) return null;

  const handleBuyChest = (rarity: LootRarity) => {
    const result = onBuyChest(rarity);
    if (!result) return;
    setChestResult({ ...result, phase: 'shaking' });
  };

  return (
    <SidebarFrame
      title="SHOP"
      accent={PALETTE.gold}
      gold={gold}
      onClose={onClose}
      overlay={chestResult && <LootRevealOverlay result={chestResult} onClose={() => setChestResult(null)} />}
    >
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: 12, color: '#777', lineHeight: '16px', marginBottom: 12 }}>
          OPEN A CHEST TO RECEIVE A RANDOM TOWER UPGRADE.
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['common', 'rare', 'epic', 'legendary'] as LootRarity[]).map((rarity) => {
            const price = CHEST_PRICES[rarity];
            const canAfford = gold >= price;
            return (
              <button
                key={rarity}
                onClick={() => canAfford && handleBuyChest(rarity)}
                style={{
                  flex: 1,
                  padding: '9px 4px 7px',
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
                onMouseEnter={(event) => {
                  if (!canAfford) return;
                  event.currentTarget.style.borderColor = RARITY_COLORS[rarity];
                  event.currentTarget.style.boxShadow = `0 0 12px ${RARITY_COLORS[rarity]}20`;
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.borderColor = canAfford ? RARITY_BORDER[rarity] : '#222';
                  event.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: 28,
                  height: 22,
                  margin: '0 auto 5px',
                  background: `linear-gradient(180deg, ${RARITY_COLORS[rarity]}33 0%, ${RARITY_COLORS[rarity]}11 100%)`,
                  border: `2px solid ${RARITY_COLORS[rarity]}66`,
                  borderRadius: 3,
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: -6,
                    left: -2,
                    right: -2,
                    height: 8,
                    background: `linear-gradient(180deg, ${RARITY_COLORS[rarity]}55 0%, ${RARITY_COLORS[rarity]}22 100%)`,
                    border: `2px solid ${RARITY_COLORS[rarity]}66`,
                    borderRadius: '3px 3px 0 0',
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: 4,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 6,
                    height: 8,
                    background: RARITY_COLORS[rarity],
                    borderRadius: 2,
                    opacity: 0.6,
                  }} />
                </div>
                <div style={{ fontSize: 10, color: canAfford ? PALETTE.gold : '#444', lineHeight: '12px' }}>
                  {formatGold(price)}g
                </div>
                <div style={{ fontSize: 8, color: RARITY_COLORS[rarity], opacity: 0.5, letterSpacing: 1, marginTop: 2 }}>
                  {RARITY_LABELS[rarity].slice(0, 3)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 11, color: '#555', lineHeight: '16px' }}>
          CHESTS CONTAIN ONE RANDOM AUGMENT. HIGHER TIER CHESTS HAVE BETTER RARITY ODDS.
        </div>
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
        GOLD IS SPENT IMMEDIATELY {'\u2666'} NO REFUNDS
      </div>
    </SidebarFrame>
  );
}
