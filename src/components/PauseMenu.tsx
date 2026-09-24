import { PALETTE } from '@tower/shared';

interface PauseMenuProps {
  paused: boolean;
  phase: string;
  onResume: () => void;
  onPause: () => void;
  onRestart: () => void;
  onClose: () => void;
}

export function PauseMenu({ paused, phase, onResume, onPause, onRestart, onClose }: PauseMenuProps) {
  const isCombat = phase === 'combat';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        fontFamily: '"Minecraft", monospace',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0c0e16',
          border: `1px solid ${PALETTE.gold}44`,
          borderRadius: 10,
          padding: '32px 40px',
          minWidth: 280,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          boxShadow: `0 0 40px rgba(0,0,0,0.8), 0 0 12px ${PALETTE.gold}15`,
        }}
      >
        {/* Title */}
        <div style={{
          fontSize: 22,
          color: PALETTE.gold,
          letterSpacing: 3,
          marginBottom: 8,
          textShadow: `0 0 12px ${PALETTE.gold}33`,
        }}>
          MENU
        </div>

        {/* Pause / Resume (only during combat) */}
        {isCombat && (
          <MenuButton
            label={paused ? 'RESUME' : 'PAUSE'}
            color={paused ? PALETTE.hpGreen : '#ff6644'}
            onClick={() => { paused ? onResume() : onPause(); }}
          />
        )}

        {/* Restart */}
        <MenuButton
          label="RESTART"
          color={PALETTE.hpRed}
          onClick={onRestart}
        />

        {/* Close */}
        <MenuButton
          label="CLOSE"
          color="#555566"
          onClick={onClose}
        />
      </div>
    </div>
  );
}

function MenuButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '12px 24px',
        fontSize: 16,
        fontFamily: '"Minecraft", monospace',
        color: '#c0c0d0',
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${color}44`,
        borderRadius: 6,
        cursor: 'pointer',
        letterSpacing: 1,
        transition: 'all 0.15s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.boxShadow = `0 0 12px ${color}25`;
        e.currentTarget.style.color = '#fff';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = `${color}44`;
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.color = '#c0c0d0';
      }}
    >
      {label}
    </button>
  );
}
