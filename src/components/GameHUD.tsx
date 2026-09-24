import { useEffect, useRef, useCallback } from 'react';
import Phaser from 'phaser';
import {
  TOWERS, PALETTE, TOWER_TYPES_ORDERED, TOWER_DUPLICATE_COST_MULT,
  GAME_W, GAME_H, HUD_TOP_H, HUD_BOT_H,
} from '@tower/shared';
import type { GameUIState } from '@tower/shared';

function formatGold(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 10000) return `${Math.floor(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

/** Convert hex to r,g,b string */
function hexRgb(hex: string): string {
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`;
}

// ─── Shared dark-panel palette (matching Inventory) ───
const UI = {
  bg: '#0c0e16',
  panel: '#12151e',
  panelLight: '#1a1e2c',
  border: `rgba(240,178,58,0.25)`,
  borderSolid: '#f0b23a',
  textMuted: '#4a4a5a',
  textDim: '#666678',
  textLight: '#c0c0d0',
} as const;

// ─── Component ───

interface GameHUDProps {
  state: GameUIState;
  game: Phaser.Game | null;
}

export function GameHUD({ state, game }: GameHUDProps) {
  const topRef = useRef<HTMLCanvasElement>(null);
  const botRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // ─── Scale the HUD wrapper — full page width, game canvas height ───
  useEffect(() => {
    if (!game || !wrapRef.current) return;
    const update = () => {
      const canvas = game.canvas;
      if (!canvas || !wrapRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const w = wrapRef.current;
      w.style.left = '0px';
      w.style.top = `${rect.top}px`;
      w.style.width = '100vw';
      w.style.height = `${rect.height}px`;
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(document.body);
    window.addEventListener('resize', update);
    const t = setTimeout(update, 200);
    return () => { observer.disconnect(); window.removeEventListener('resize', update); clearTimeout(t); };
  }, [game]);

  // ─── Draw header canvas ───
  useEffect(() => {
    const cv = topRef.current;
    if (!cv) return;
    cv.width = GAME_W;
    cv.height = HUD_TOP_H;
    const c = cv.getContext('2d')!;
    c.clearRect(0, 0, GAME_W, HUD_TOP_H);
    c.textBaseline = 'middle';

    // Dark background
    const bg = c.createLinearGradient(0, 0, 0, HUD_TOP_H);
    bg.addColorStop(0, '#0e1018');
    bg.addColorStop(1, '#0c0e16');
    c.fillStyle = bg;
    c.fillRect(0, 0, GAME_W, HUD_TOP_H);

    // Gold bottom border
    c.fillStyle = PALETTE.gold;
    c.globalAlpha = 0.35;
    c.fillRect(0, HUD_TOP_H - 1, GAME_W, 1);
    c.globalAlpha = 0.08;
    c.fillRect(0, HUD_TOP_H - 3, GAME_W, 3);
    c.globalAlpha = 1;

    const midY = HUD_TOP_H / 2;

    // ─── LEFT: Wave / Stage ───
    c.font = '26px "Minecraft", monospace';
    c.fillStyle = '#fff';
    c.textAlign = 'left';
    c.fillText(`WAVE ${state.wave}`, 28, midY - 6);

    c.font = '13px "Minecraft", monospace';
    c.fillStyle = UI.textDim;
    c.fillText(`STAGE ${state.gameStage}`, 28, midY + 18);

    // ─── CENTER: Single row — Phase  HP bar  Gold — all vertically centered ───
    const fontSize = 20;
    const gap = 32; // gap between sections

    // Phase
    const phases: Record<string, { text: string; color: string }> = {
      build: { text: 'BUILD', color: '#00ff88' },
      combat: { text: `COMBAT x${state.enemyCount}`, color: '#ff6644' },
      wave_end: { text: 'WAVE CLEAR', color: PALETTE.gold },
      game_over: { text: 'GAME OVER', color: PALETTE.hpRed },
    };
    const p = phases[state.phase] || { text: state.phase, color: '#fff' };
    c.font = `${fontSize}px "Minecraft", monospace`;
    const phaseW = c.measureText(p.text).width;

    // HP
    const hpPct = Math.max(0, state.baseHp / state.maxBaseHp);
    const hpColor = hpPct > 0.5 ? PALETTE.hpGreen : hpPct > 0.25 ? '#ff9800' : PALETTE.hpRed;
    const hpText = `HP ${state.baseHp}/${state.maxBaseHp}`;
    const hpTextW = c.measureText(hpText).width;
    const barW = 140, barH = 12;
    const hpBlockW = hpTextW + 10 + barW;

    // Gold
    const goldText = `${state.gold}`;
    c.font = `${fontSize}px "Minecraft", monospace`;
    const diamondW = c.measureText('\u2666').width;
    const goldNumW = c.measureText(goldText).width;
    const goldBlockW = diamondW + 8 + goldNumW;

    // Total width (no dots, just gaps)
    const totalRowW = phaseW + gap + hpBlockW + gap + goldBlockW;
    let curX = GAME_W / 2 - totalRowW / 2;

    // Draw phase text
    c.font = `${fontSize}px "Minecraft", monospace`;
    c.fillStyle = p.color;
    c.textAlign = 'left';
    c.fillText(p.text, curX, midY);
    curX += phaseW + gap;

    // HP text
    c.font = `${fontSize}px "Minecraft", monospace`;
    c.fillStyle = hpColor;
    c.fillText(hpText, curX, midY);
    curX += hpTextW + 10;

    // HP bar
    const barY = midY - barH / 2;
    c.fillStyle = 'rgba(255,255,255,0.05)';
    roundRect(c, curX, barY, barW, barH, 4);
    c.fill();
    c.fillStyle = hpColor;
    if (hpPct > 0) { roundRect(c, curX, barY, barW * hpPct, barH, 4); c.fill(); }
    c.strokeStyle = hpColor;
    c.globalAlpha = 0.2;
    c.lineWidth = 1;
    roundRect(c, curX, barY, barW, barH, 4);
    c.stroke();
    c.globalAlpha = 1;
    curX += barW + gap;

    // Gold diamond + number
    c.font = `${fontSize}px "Minecraft", monospace`;
    c.fillStyle = PALETTE.gold;
    c.fillText('\u2666', curX, midY);
    curX += diamondW + 8;
    c.fillStyle = '#fff';
    c.fillText(goldText, curX, midY);

    c.textAlign = 'left';
  }, [state]);

  // ─── Re-draw header buttons (second pass on same canvas) ───
  useEffect(() => {
    const cv = topRef.current;
    if (!cv) return;
    const c = cv.getContext('2d')!;
    c.textBaseline = 'middle';

    const btnH = 32, midY = HUD_TOP_H / 2;

    // BAG button
    drawBtn(c, GAME_W - 460, midY - btnH / 2, 90, btnH, 'BAG', PALETTE.beam);
    if (state.inventory.length > 0) {
      c.fillStyle = PALETTE.beam;
      c.beginPath();
      c.arc(GAME_W - 460 + 82, midY - btnH / 2 + 2, 10, 0, Math.PI * 2);
      c.fill();
      c.font = '11px "Minecraft", monospace';
      c.fillStyle = '#fff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(`${state.inventory.length}`, GAME_W - 460 + 82, midY - btnH / 2 + 2);
      c.textAlign = 'left';
    }

    // START or PAUSE button (same position)
    const showStart = (state.phase === 'build' || state.phase === 'wave_end') && !state.autoRun;
    const showPause = state.phase === 'combat';
    if (showStart) {
      drawBtn(c, GAME_W - 350, midY - btnH / 2, 120, btnH, 'START', PALETTE.hpGreen);
    } else if (showPause) {
      const pauseText = state.paused ? 'RESUME' : 'PAUSE';
      const pauseColor = state.paused ? PALETTE.gold : '#ff6644';
      drawBtn(c, GAME_W - 350, midY - btnH / 2, 120, btnH, pauseText, pauseColor);
    }

    // AUTO
    const autoColor = state.autoRun ? PALETTE.gold : '#444455';
    const autoText = state.autoRun ? 'AUTO ON' : 'AUTO OFF';
    drawBtn(c, GAME_W - 210, midY - btnH / 2, 190, btnH, autoText, autoColor);
  }, [state]);

  // ─── Extract tower textures from Phaser for footer icons ───
  const towerImagesRef = useRef<Map<string, HTMLCanvasElement | HTMLImageElement>>(new Map());
  useEffect(() => {
    if (!game) return;
    const extract = () => {
      for (const type of TOWER_TYPES_ORDERED) {
        const key = `tower_${type}`;
        try {
          const tex = game.textures.get(key);
          if (tex && tex.key !== '__MISSING') {
            const src = tex.getSourceImage();
            if (src) towerImagesRef.current.set(type, src as HTMLCanvasElement | HTMLImageElement);
          }
        } catch { /* texture not ready yet */ }
      }
    };
    extract();
    const t = setTimeout(extract, 500);
    return () => clearTimeout(t);
  }, [game]);

  // ─── Draw footer canvas ───
  useEffect(() => {
    const cv = botRef.current;
    if (!cv) return;
    cv.width = GAME_W;
    cv.height = HUD_BOT_H;
    const c = cv.getContext('2d')!;
    c.clearRect(0, 0, GAME_W, HUD_BOT_H);

    // Dark background
    const bg = c.createLinearGradient(0, 0, 0, HUD_BOT_H);
    bg.addColorStop(0, '#0c0e16');
    bg.addColorStop(1, '#0e1018');
    c.fillStyle = bg;
    c.fillRect(0, 0, GAME_W, HUD_BOT_H);

    // Gold top border
    c.fillStyle = PALETTE.gold;
    c.globalAlpha = 0.35;
    c.fillRect(0, 0, GAME_W, 1);
    c.globalAlpha = 0.08;
    c.fillRect(0, 0, GAME_W, 3);
    c.globalAlpha = 1;

    // Tower cards
    const cardW = 210;
    const cardH = 94;
    const gap = 10;
    const types = TOWER_TYPES_ORDERED;
    const totalW = types.length * (cardW + gap) - gap;
    const startX = GAME_W / 2 - totalW / 2;
    const cardY = (HUD_BOT_H - cardH) / 2 + 1;
    const iconZoneW = 60;

    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const def = TOWERS[type];
      const tCount = (state.towerTypeCounts || {})[type] || 0;
      const cost = Math.floor(def.cost * Math.pow(TOWER_DUPLICATE_COST_MULT, tCount));
      const cx = startX + i * (cardW + gap);
      const isSelected = state.selectedTowerType === type;
      const canAfford = state.gold >= cost;
      const rgb = hexRgb(def.color);

      // ── Card background: lighter tower-colored tint ──
      // Outer glow layer
      c.fillStyle = `rgba(${rgb},${isSelected ? 0.2 : 0.08})`;
      roundRect(c, cx, cardY, cardW, cardH, 8);
      c.fill();

      // Inner panel — lighter than before
      c.fillStyle = isSelected ? `rgba(${rgb},0.1)` : 'rgba(22,26,38,0.9)';
      roundRect(c, cx + 1, cardY + 1, cardW - 2, cardH - 2, 7);
      c.fill();

      // Subtle top highlight
      const hlGrad = c.createLinearGradient(cx, cardY, cx, cardY + cardH);
      hlGrad.addColorStop(0, `rgba(${rgb},${isSelected ? 0.12 : 0.05})`);
      hlGrad.addColorStop(0.5, 'transparent');
      hlGrad.addColorStop(1, `rgba(${rgb},0.02)`);
      c.fillStyle = hlGrad;
      roundRect(c, cx + 1, cardY + 1, cardW - 2, cardH - 2, 7);
      c.fill();

      // ── Left color strip ──
      c.fillStyle = def.color;
      c.globalAlpha = isSelected ? 0.9 : 0.5;
      roundRect(c, cx, cardY, 3, cardH, { tl: 8, tr: 0, bl: 8, br: 0 });
      c.fill();
      c.globalAlpha = 1;

      // ── Border ──
      c.strokeStyle = def.color;
      c.globalAlpha = isSelected ? 0.6 : 0.12;
      c.lineWidth = isSelected ? 1.5 : 1;
      roundRect(c, cx, cardY, cardW, cardH, 8);
      c.stroke();
      c.globalAlpha = 1;

      // ── Selected glow ──
      if (isSelected) {
        c.shadowColor = def.color;
        c.shadowBlur = 16;
        c.strokeStyle = def.color;
        c.globalAlpha = 0.25;
        c.lineWidth = 1;
        roundRect(c, cx, cardY, cardW, cardH, 8);
        c.stroke();
        c.shadowBlur = 0;
        c.globalAlpha = 1;
      }

      // ── Tower icon — left zone with padding ──
      const towerImg = towerImagesRef.current.get(type);
      if (towerImg) {
        const pad = 12;
        const maxIconH = cardH - pad * 2;
        const maxIconW = iconZoneW - pad - 6;
        const aspect = towerImg.width / towerImg.height;
        let iconH = maxIconH;
        let iconW = iconH * aspect;
        if (iconW > maxIconW) { iconW = maxIconW; iconH = iconW / aspect; }
        const iconX = cx + 8 + (iconZoneW - 8) / 2 - iconW / 2;
        const iconY = cardY + cardH / 2 - iconH / 2;
        c.drawImage(towerImg, iconX, iconY, iconW, iconH);
      }

      // ── Right side text ──
      const textX = cx + iconZoneW + 10;
      c.textBaseline = 'middle';

      // Hotkey badge (top-right)
      c.font = '12px "Minecraft", monospace';
      c.fillStyle = isSelected ? def.color : 'rgba(255,255,255,0.15)';
      c.textAlign = 'right';
      c.fillText(`${i + 1}`, cx + cardW - 12, cardY + 14);

      // Tower name
      c.font = '16px "Minecraft", monospace';
      c.fillStyle = isSelected ? '#fff' : UI.textLight;
      c.textAlign = 'left';
      c.fillText(def.name.toUpperCase(), textX, cardY + 22);

      // Special ability
      c.font = '13px "Minecraft", monospace';
      c.fillStyle = UI.textDim;
      c.fillText(def.special, textX, cardY + 44);

      // Separator
      c.strokeStyle = def.color;
      c.globalAlpha = 0.12;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(textX, cardY + 57);
      c.lineTo(cx + cardW - 14, cardY + 57);
      c.stroke();
      c.globalAlpha = 1;

      // Price
      c.font = '18px "Minecraft", monospace';
      c.fillStyle = canAfford ? PALETTE.gold : PALETTE.hpRed;
      c.fillText('\u2666', textX, cardY + 76);
      const dw = c.measureText('\u2666').width;
      c.font = '16px "Minecraft", monospace';
      c.fillStyle = canAfford ? '#fff' : PALETTE.hpRed;
      c.fillText(formatGold(cost), textX + dw + 6, cardY + 76);

      c.textAlign = 'left';
      c.textBaseline = 'alphabetic';
    }
  }, [state, game]);

  // ─── Helpers to check if mouse is over a clickable region ───
  const isOverCard = useCallback((mx: number): boolean => {
    const cardW = 210, gap = 10;
    const types = TOWER_TYPES_ORDERED;
    const totalW = types.length * (cardW + gap) - gap;
    const startX = GAME_W / 2 - totalW / 2;
    for (let i = 0; i < types.length; i++) {
      const cx = startX + i * (cardW + gap);
      if (mx >= cx && mx <= cx + cardW) return true;
    }
    return false;
  }, []);

  const isOverHeaderBtn = useCallback((mx: number): boolean => {
    // BAG
    if (mx >= GAME_W - 460 && mx <= GAME_W - 360) return true;
    // START
    if (mx >= GAME_W - 350 && mx <= GAME_W - 220) return true;
    // AUTO
    if (mx >= GAME_W - 210 && mx <= GAME_W - 10) return true;
    return false;
  }, []);

  // ─── Click handling for footer cards ───
  const handleBotClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!game) return;
    const cv = botRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const scaleX = GAME_W / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;

    const cardW = 210, gap = 10;
    const types = TOWER_TYPES_ORDERED;
    const totalW = types.length * (cardW + gap) - gap;
    const startX = GAME_W / 2 - totalW / 2;

    for (let i = 0; i < types.length; i++) {
      const cx = startX + i * (cardW + gap);
      if (mx >= cx && mx <= cx + cardW) {
        const gs = game.scene.getScene('GameScene') as any;
        gs?.selectTowerType(types[i]);
        return;
      }
    }
  }, [game]);

  const handleBotMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const cv = botRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (GAME_W / rect.width);
    cv.style.cursor = isOverCard(mx) ? 'pointer' : 'default';
  }, [isOverCard]);

  // ─── Header button clicks ───
  const handleTopClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!game) return;
    const cv = topRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const scaleX = GAME_W / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;

    if (mx >= GAME_W - 460 && mx <= GAME_W - 360) {
      game.events.emit('toggle_inventory');
      return;
    }
    if (mx >= GAME_W - 350 && mx <= GAME_W - 220) {
      const gs = game.scene.getScene('GameScene') as any;
      if (!gs) return;
      if (gs.phase === 'combat') {
        // Toggle pause from React (paused scene can't receive its own events)
        gs.paused = !gs.paused;
        if (gs.paused) {
          game.scene.pause('GameScene');
        } else {
          game.scene.resume('GameScene');
        }
        gs.emitState();
      } else {
        gs.events.emit('start_wave_click');
      }
      return;
    }
    if (mx >= GAME_W - 210 && mx <= GAME_W - 10) {
      const gs = game.scene.getScene('GameScene');
      gs?.events.emit('toggle_autorun');
      return;
    }
  }, [game]);

  const handleTopMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const cv = topRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (GAME_W / rect.width);
    cv.style.cursor = isOverHeaderBtn(mx) ? 'pointer' : 'default';
  }, [isOverHeaderBtn]);

  return (
    <div
      ref={wrapRef}
      style={{ position: 'fixed', left: 0, top: 0, pointerEvents: 'none', zIndex: 10 }}
    >
      <canvas
        ref={topRef}
        style={{
          position: 'absolute', left: 0, top: 0,
          width: '100%', height: `${(HUD_TOP_H / GAME_H) * 100}%`,
          pointerEvents: 'auto', cursor: 'default',
        }}
        onClick={handleTopClick}
        onMouseMove={handleTopMove}
      />
      <canvas
        ref={botRef}
        style={{
          position: 'absolute', left: 0, bottom: 0,
          width: '100%', height: `${(HUD_BOT_H / GAME_H) * 100}%`,
          pointerEvents: 'auto', cursor: 'default',
        }}
        onClick={handleBotClick}
        onMouseMove={handleBotMove}
      />
    </div>
  );
}

// ─── Canvas helpers ───

function roundRect(
  c: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: number | { tl: number; tr: number; bl: number; br: number },
) {
  const radii = typeof r === 'number' ? { tl: r, tr: r, bl: r, br: r } : r;
  c.beginPath();
  c.moveTo(x + radii.tl, y);
  c.lineTo(x + w - radii.tr, y);
  c.quadraticCurveTo(x + w, y, x + w, y + radii.tr);
  c.lineTo(x + w, y + h - radii.br);
  c.quadraticCurveTo(x + w, y + h, x + w - radii.br, y + h);
  c.lineTo(x + radii.bl, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - radii.bl);
  c.lineTo(x, y + radii.tl);
  c.quadraticCurveTo(x, y, x + radii.tl, y);
  c.closePath();
}

function drawBtn(
  c: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  text: string, color: string,
) {
  const rgb = hexRgb(color);

  // Button background
  c.fillStyle = `rgba(${rgb},0.06)`;
  roundRect(c, x, y, w, h, 5);
  c.fill();

  // Inner dark
  c.fillStyle = 'rgba(12,14,22,0.9)';
  roundRect(c, x + 1, y + 1, w - 2, h - 2, 4);
  c.fill();

  // Bottom accent
  c.fillStyle = color;
  c.globalAlpha = 0.35;
  roundRect(c, x + 1, y + h - 3, w - 2, 2, { tl: 0, tr: 0, bl: 4, br: 4 });
  c.fill();
  c.globalAlpha = 1;

  // Border
  c.strokeStyle = color;
  c.globalAlpha = 0.25;
  c.lineWidth = 1;
  roundRect(c, x, y, w, h, 5);
  c.stroke();
  c.globalAlpha = 1;

  // Text — properly centered
  c.font = '14px "Minecraft", monospace';
  c.fillStyle = UI.textLight;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, x + w / 2, y + h / 2);
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
}
