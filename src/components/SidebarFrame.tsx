import type { ReactNode } from 'react';
import { PALETTE } from '@tower/shared';
import { formatGold, RARITY_COLORS, ITEM_SYMBOLS, RARITY_LABELS, type AugmentKind, type LootRarity } from './SidebarUtils';
import { AUGMENTS } from '@tower/shared';

interface SidebarFrameProps {
  title: string;
  accent: string;
  count?: number;
  gold?: number;
  onClose: () => void;
  children: ReactNode;
  overlay?: ReactNode;
}

export function SidebarFrame({
  title,
  accent,
  count,
  gold,
  onClose,
  children,
  overlay,
}: SidebarFrameProps) {
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
      <style>{`
        @keyframes sidebarSlideIn {
          from { transform: translateX(24px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
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
      `}</style>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px 10px',
        borderBottom: `1px solid ${PALETTE.uiBorder}33`,
        background: `linear-gradient(180deg, ${accent}10 0%, transparent 100%)`,
        animation: 'sidebarSlideIn 0.18s ease-out',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{
            fontSize: 18,
            color: accent,
            letterSpacing: 2,
            textShadow: `0 0 10px ${accent}33`,
          }}>
            {title}
          </span>
          {count !== undefined && (
            <span style={{ fontSize: 13, color: '#555' }}>{count}</span>
          )}
          {gold !== undefined && (
            <span style={{ fontSize: 13, color: PALETTE.gold }}>
              {'\u2666'} {formatGold(gold)}
            </span>
          )}
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

      {children}
      {overlay}
    </div>
  );
}

interface LootRevealOverlayProps {
  result: { kind: AugmentKind; rarity: LootRarity; phase?: 'shaking' | 'revealing' };
  onClose: () => void;
}

export function LootRevealOverlay({ result, onClose }: LootRevealOverlayProps) {
  const rarityColor = RARITY_COLORS[result.rarity as LootRarity];
  const aug = AUGMENTS[result.kind as AugmentKind];

  return (
    <div
      onClick={onClose}
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
      {result.phase === 'shaking' ? (
        <div style={{ animation: 'chestShake 0.5s ease-in-out' }}>
          <div style={{
            width: 90,
            height: 65,
            background: `linear-gradient(180deg, ${rarityColor}22 0%, ${rarityColor}0a 100%)`,
            border: `3px solid ${rarityColor}88`,
            borderRadius: 6,
            position: 'relative',
            boxShadow: `0 0 40px ${rarityColor}44, 0 0 80px ${rarityColor}22`,
          }}>
            <div style={{
              position: 'absolute',
              top: -14,
              left: -3,
              right: -3,
              height: 18,
              background: `linear-gradient(180deg, ${rarityColor}44 0%, ${rarityColor}22 100%)`,
              border: `3px solid ${rarityColor}88`,
              borderRadius: '6px 6px 0 0',
            }} />
            <div style={{
              position: 'absolute',
              top: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 12,
              height: 16,
              background: rarityColor,
              borderRadius: 3,
              opacity: 0.7,
              boxShadow: `0 0 8px ${rarityColor}`,
            }} />
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          animation: 'chestBurst 0.5s ease-out',
        }}>
          <div style={{
            position: 'absolute',
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${rarityColor}22 0%, transparent 70%)`,
            animation: 'chestGlow 1.5s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute',
            width: 4,
            height: 120,
            background: `linear-gradient(180deg, transparent 0%, ${rarityColor}44 50%, transparent 100%)`,
            opacity: 0.5,
          }} />
          <div style={{
            position: 'absolute',
            width: 120,
            height: 4,
            background: `linear-gradient(90deg, transparent 0%, ${rarityColor}44 50%, transparent 100%)`,
            opacity: 0.5,
          }} />
          <div style={{
            fontSize: 64,
            color: aug.particleColor,
            textShadow: `0 0 30px ${aug.particleColor}, 0 0 60px ${rarityColor}88`,
            position: 'relative',
          }}>
            {ITEM_SYMBOLS[result.kind as AugmentKind]}
          </div>
          <div style={{
            fontSize: 16,
            color: rarityColor,
            textShadow: `0 0 12px ${rarityColor}66`,
            letterSpacing: 1,
            position: 'relative',
          }}>
            {aug.name}
          </div>
          <div style={{
            fontSize: 12,
            color: rarityColor,
            letterSpacing: 3,
            opacity: 0.6,
            position: 'relative',
          }}>
            {RARITY_LABELS[result.rarity as LootRarity]}
          </div>
          <div style={{
            fontSize: 12,
            color: '#888',
            background: 'rgba(0,0,0,0.4)',
            padding: '4px 12px',
            borderRadius: 4,
            position: 'relative',
          }}>
            {aug.effects[result.rarity as LootRarity].label}
          </div>
          <div style={{ fontSize: 10, color: '#333', marginTop: 12, position: 'relative' }}>
            CLICK TO CLOSE
          </div>
        </div>
      )}
    </div>
  );
}

export type { SidebarPanel } from './SidebarUtils';