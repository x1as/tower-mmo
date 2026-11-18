/**
 * SpriteGenerator v4 — Isometric edition.
 * Generates procedural sprites for enemies, projectiles, loot, augments, and UI.
 * Tiles and towers are loaded from PNG assets in BootScene.
 */
import Phaser from 'phaser';
import {
  PALETTE, AUGMENTS, AUGMENT_KINDS_ORDERED,
  ISO_TILE_W, ISO_TILE_H, ENEMY_SPRITE_SIZE,
} from '@tower/shared';
import type { LootRarity, AugmentKind } from '@tower/shared';

const S = ENEMY_SPRITE_SIZE;

// ─── Helpers ───

function tex(scene: Phaser.Scene, key: string, w: number, h: number, fn: (c: CanvasRenderingContext2D) => void) {
  // Skip if a custom PNG was already loaded for this key
  if (scene.textures.exists(key)) return;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d')!; c.imageSmoothingEnabled = false; fn(c);
  scene.textures.addCanvas(key, cv);
}

function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath(); c.moveTo(x + r, y);
  c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
}

function darken(hex: string, amt = 0.3): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.floor(r * (1 - amt))},${Math.floor(g * (1 - amt))},${Math.floor(b * (1 - amt))})`;
}
function lighten(hex: string, amt = 0.3): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, Math.floor(r + (255 - r) * amt))},${Math.min(255, Math.floor(g + (255 - g) * amt))},${Math.min(255, Math.floor(b + (255 - b) * amt))})`;
}

// Shared drawing patterns
function groundShadow(c: CanvasRenderingContext2D, cx: number, cy: number, rx = 18, ry = 6) {
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.fill();
}

// Body with top-left lighting gradient
function bodyGrad(c: CanvasRenderingContext2D, base: string, x: number, y: number, w: number, h: number, radius = 3) {
  const g = c.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, lighten(base, 0.2)); g.addColorStop(0.45, base); g.addColorStop(1, darken(base, 0.35));
  c.fillStyle = g; rr(c, x, y, w, h, radius); c.fill();
  // Outline in dark variant (no black)
  c.strokeStyle = darken(base, 0.5); c.lineWidth = 1; rr(c, x, y, w, h, radius); c.stroke();
  // Rim light top-left
  c.strokeStyle = 'rgba(255,255,255,0.15)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(x + radius, y + 0.5); c.lineTo(x + w - radius, y + 0.5); c.stroke();
  c.beginPath(); c.moveTo(x + 0.5, y + radius); c.lineTo(x + 0.5, y + h - radius); c.stroke();
}

// ─── Master ───

export function generateAllSprites(scene: Phaser.Scene): void {
  // Tiles and towers are loaded as PNGs in BootScene — no longer generated here
  genEnemies(scene);
  genProjectiles(scene);
  genLootOrbs(scene);
  genLootRays(scene);
  genAugmentIcons(scene);
  genBase(scene);
  genCave(scene);
  genUI(scene);
}

// ─── ISOMETRIC UI SPRITES ───

// ─── ENEMIES ───

function genEnemies(scene: Phaser.Scene) {
  // Scatter Imp — orange triangular imp, crouched, pointy ears
  tex(scene, 'enemy_scatter_imp', S, S, c => {
    groundShadow(c, S / 2, S - 4, 10, 4);
    const col = PALETTE.scatterImp;
    const g = c.createRadialGradient(S / 2, S / 2 + 4, 0, S / 2, S / 2 + 4, 16);
    g.addColorStop(0, lighten(col, 0.25)); g.addColorStop(1, darken(col, 0.2));
    c.fillStyle = g;
    c.beginPath(); c.moveTo(S / 2, 6); c.lineTo(S / 2 + 16, S - 8); c.lineTo(S / 2 - 16, S - 8); c.closePath(); c.fill();
    c.strokeStyle = darken(col, 0.4); c.lineWidth = 1;
    c.beginPath(); c.moveTo(S / 2, 6); c.lineTo(S / 2 + 16, S - 8); c.lineTo(S / 2 - 16, S - 8); c.closePath(); c.stroke();
    // Pointy ears
    c.fillStyle = lighten(col, 0.1);
    c.beginPath(); c.moveTo(12, 16); c.lineTo(4, 4); c.lineTo(16, 14); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(36, 16); c.lineTo(44, 4); c.lineTo(32, 14); c.closePath(); c.fill();
    // Wide grin
    c.fillStyle = '#220000'; c.beginPath(); c.ellipse(S / 2, 30, 8, 3, 0, 0, Math.PI); c.fill();
    c.fillStyle = '#fff'; c.fillRect(17, 29, 3, 2); c.fillRect(28, 29, 3, 2);
    // Eyes
    c.fillStyle = '#fff'; c.fillRect(16, 20, 5, 5); c.fillRect(27, 20, 5, 5);
    c.fillStyle = '#111'; c.fillRect(18, 22, 3, 3); c.fillRect(29, 22, 3, 3);
  });

  // Thermal Drake — red-orange drake with small wings, flame marks
  tex(scene, 'enemy_thermal_drake', S, S, c => {
    groundShadow(c, S / 2, S - 3, 14, 5);
    const col = PALETTE.thermalDrake;
    bodyGrad(c, col, 8, 10, 32, 28, 6);
    // Small wings
    c.fillStyle = lighten(col, 0.15);
    c.beginPath(); c.ellipse(6, 20, 6, 10, -0.3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(42, 20, 6, 10, 0.3, 0, Math.PI * 2); c.fill();
    // Flame crown marks
    c.fillStyle = '#ffcc22';
    c.beginPath(); c.moveTo(18, 10); c.lineTo(20, 4); c.lineTo(22, 10); c.fill();
    c.beginPath(); c.moveTo(22, 10); c.lineTo(24, 2); c.lineTo(26, 10); c.fill();
    c.beginPath(); c.moveTo(26, 10); c.lineTo(28, 4); c.lineTo(30, 10); c.fill();
    // Eyes
    c.fillStyle = '#ffff00'; c.fillRect(14, 18, 5, 4); c.fillRect(29, 18, 5, 4);
    c.fillStyle = '#aa0000'; c.fillRect(16, 19, 2, 2); c.fillRect(31, 19, 2, 2);
    // Tail
    c.strokeStyle = darken(col, 0.2); c.lineWidth = 3;
    c.beginPath(); c.moveTo(S / 2, 38); c.quadraticCurveTo(S / 2 + 12, 42, S / 2 + 6, 46); c.stroke();
  });

  // Mirror Wisp — purple faceted orb, crystalline highlights
  tex(scene, 'enemy_mirror_wisp', S, S, c => {
    const col = PALETTE.mirrorWisp;
    // Glow aura
    const ag = c.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, 22);
    ag.addColorStop(0, col + '40'); ag.addColorStop(1, 'transparent');
    c.fillStyle = ag; c.fillRect(0, 0, S, S);
    // Faceted hexagonal body
    const cx = S / 2, cy = S / 2;
    c.fillStyle = col;
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      c.lineTo(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14);
    }
    c.closePath(); c.fill();
    c.strokeStyle = lighten(col, 0.3); c.lineWidth = 1; c.stroke();
    // Facet highlights
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.beginPath(); c.moveTo(cx, cy - 14); c.lineTo(cx + 12, cy - 7); c.lineTo(cx, cy); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.12)';
    c.beginPath(); c.moveTo(cx, cy - 14); c.lineTo(cx - 12, cy - 7); c.lineTo(cx, cy); c.closePath(); c.fill();
    // Inner sparkle
    c.fillStyle = '#fff'; c.beginPath(); c.arc(cx - 3, cy - 4, 2, 0, Math.PI * 2); c.fill();
  });

  // Blink Fox — teal-green fox, elongated, speed lines
  tex(scene, 'enemy_blink_fox', S, S, c => {
    groundShadow(c, S / 2, S - 4, 12, 4);
    const col = PALETTE.blinkFox;
    // Body — sleek elongated
    const g = c.createLinearGradient(8, 10, 40, 38);
    g.addColorStop(0, lighten(col, 0.2)); g.addColorStop(1, darken(col, 0.15));
    c.fillStyle = g;
    c.beginPath(); c.ellipse(S / 2, S / 2 + 2, 16, 12, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = darken(col, 0.4); c.lineWidth = 1;
    c.beginPath(); c.ellipse(S / 2, S / 2 + 2, 16, 12, 0, 0, Math.PI * 2); c.stroke();
    // Pointy ears
    c.fillStyle = lighten(col, 0.1);
    c.beginPath(); c.moveTo(14, 16); c.lineTo(10, 4); c.lineTo(20, 14); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(34, 16); c.lineTo(38, 4); c.lineTo(28, 14); c.closePath(); c.fill();
    // Eyes — large
    c.fillStyle = '#fff'; c.beginPath(); c.arc(18, 22, 4, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(30, 22, 4, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#115544'; c.beginPath(); c.arc(19, 22, 2, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(31, 22, 2, 0, Math.PI * 2); c.fill();
    // Speed lines (semi-transparent)
    c.strokeStyle = col + '50'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(2, 18); c.lineTo(8, 18); c.stroke();
    c.beginPath(); c.moveTo(0, 24); c.lineTo(6, 24); c.stroke();
    c.beginPath(); c.moveTo(2, 30); c.lineTo(8, 30); c.stroke();
  });

  // Ground Wurm — brown segmented worm, partially burrowed
  tex(scene, 'enemy_ground_wurm', S, S, c => {
    groundShadow(c, S / 2, S - 3, 16, 5);
    const col = PALETTE.groundWurm;
    // Segmented body arcing up from ground
    for (let i = 0; i < 5; i++) {
      const sx = 10 + i * 7;
      const sy = 32 - Math.sin((i / 4) * Math.PI) * 18;
      const seg = c.createRadialGradient(sx, sy, 0, sx, sy, 7);
      seg.addColorStop(0, lighten(col, 0.15)); seg.addColorStop(1, darken(col, 0.2));
      c.fillStyle = seg;
      c.beginPath(); c.arc(sx, sy, 7 - i * 0.3, 0, Math.PI * 2); c.fill();
      c.strokeStyle = darken(col, 0.4); c.lineWidth = 0.8;
      c.beginPath(); c.arc(sx, sy, 7 - i * 0.3, 0, Math.PI * 2); c.stroke();
    }
    // Head segment (largest)
    const hx = 38, hy = 22;
    bodyGrad(c, col, hx - 8, hy - 8, 16, 16, 8);
    // Beady eyes
    c.fillStyle = '#fff'; c.fillRect(hx - 3, hy - 3, 3, 3); c.fillRect(hx + 1, hy - 3, 3, 3);
    c.fillStyle = '#111'; c.fillRect(hx - 2, hy - 2, 2, 2); c.fillRect(hx + 2, hy - 2, 2, 2);
    // Ground dirt line
    c.fillStyle = 'rgba(60,40,20,0.35)'; c.fillRect(4, S - 8, 40, 4);
  });

  // Magma Golem — dark rocky body with orange lava cracks
  tex(scene, 'enemy_magma_golem', S, S, c => {
    groundShadow(c, S / 2, S - 2, 16, 5);
    const col = PALETTE.magmaGolem;
    // Rocky body
    const g = c.createLinearGradient(S / 2, 4, S / 2, 42);
    g.addColorStop(0, '#4a3a2a'); g.addColorStop(0.5, '#3a2a1a'); g.addColorStop(1, '#2a1a0a');
    c.fillStyle = g; rr(c, 6, 4, 36, 38, 8); c.fill();
    c.strokeStyle = darken(col, 0.5); c.lineWidth = 1; rr(c, 6, 4, 36, 38, 8); c.stroke();
    // Lava crack lines (orange glow)
    c.strokeStyle = '#ff6622'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(14, 10); c.lineTo(18, 22); c.lineTo(12, 34); c.stroke();
    c.beginPath(); c.moveTo(34, 8); c.lineTo(30, 20); c.lineTo(36, 32); c.stroke();
    c.beginPath(); c.moveTo(20, 26); c.lineTo(28, 28); c.stroke();
    // Crack glow
    c.strokeStyle = '#ffaa44'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(14, 10); c.lineTo(18, 22); c.lineTo(12, 34); c.stroke();
    // Eyes (lava glow)
    c.fillStyle = '#ff4400'; c.fillRect(14, 16, 6, 4); c.fillRect(28, 16, 6, 4);
    c.fillStyle = '#ffcc00'; c.fillRect(15, 17, 4, 2); c.fillRect(29, 17, 4, 2);
  });

  // Pure Spirit — white-green ghostly figure, radial glow
  tex(scene, 'enemy_pure_spirit', S, S, c => {
    const col = PALETTE.pureSpirit;
    // Radial glow
    const ag = c.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, 22);
    ag.addColorStop(0, col + '50'); ag.addColorStop(1, 'transparent');
    c.fillStyle = ag; c.fillRect(0, 0, S, S);
    // Ghostly body (teardrop shape)
    const g = c.createLinearGradient(S / 2, 6, S / 2, 42);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, lighten(col, 0.3)); g.addColorStop(1, col + '60');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(S / 2, 6);
    c.quadraticCurveTo(S / 2 + 16, 14, S / 2 + 14, 28);
    c.quadraticCurveTo(S / 2 + 10, 42, S / 2 + 4, 44);
    c.lineTo(S / 2 - 4, 44);
    c.quadraticCurveTo(S / 2 - 10, 42, S / 2 - 14, 28);
    c.quadraticCurveTo(S / 2 - 16, 14, S / 2, 6);
    c.fill();
    // Eyes (gentle)
    c.fillStyle = '#66aa88'; c.beginPath(); c.arc(19, 20, 3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(29, 20, 3, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(18, 19, 1.5, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(28, 19, 1.5, 0, Math.PI * 2); c.fill();
    // Sparkles
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.beginPath(); c.arc(12, 12, 1.5, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(38, 16, 1, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(10, 34, 1, 0, Math.PI * 2); c.fill();
  });

  // Iron Shell — grey metallic dome, overlapping armor plates
  tex(scene, 'enemy_iron_shell', S, S, c => {
    groundShadow(c, S / 2, S - 2, 16, 5);
    const col = PALETTE.ironShell;
    // Base dome
    const g = c.createRadialGradient(S / 2 - 4, S / 2 - 4, 0, S / 2, S / 2, 20);
    g.addColorStop(0, lighten(col, 0.3)); g.addColorStop(0.5, col); g.addColorStop(1, darken(col, 0.3));
    c.fillStyle = g;
    c.beginPath(); c.arc(S / 2, S / 2 + 2, 18, 0, Math.PI * 2); c.fill();
    c.strokeStyle = darken(col, 0.4); c.lineWidth = 1;
    c.beginPath(); c.arc(S / 2, S / 2 + 2, 18, 0, Math.PI * 2); c.stroke();
    // Armor plate lines
    c.strokeStyle = darken(col, 0.25); c.lineWidth = 1.5;
    c.beginPath(); c.arc(S / 2, S / 2 + 2, 14, -0.6, 0.6); c.stroke();
    c.beginPath(); c.arc(S / 2, S / 2 + 2, 14, 1.0, 2.2); c.stroke();
    c.beginPath(); c.arc(S / 2, S / 2 + 2, 14, 2.8, 4.0); c.stroke();
    c.beginPath(); c.arc(S / 2, S / 2 + 2, 14, 4.4, 5.6); c.stroke();
    // Metallic sheen
    c.fillStyle = 'rgba(255,255,255,0.15)';
    c.beginPath(); c.arc(S / 2 - 4, S / 2 - 4, 8, 0, Math.PI * 2); c.fill();
    // Tiny eyes peering out
    c.fillStyle = '#ffcc00'; c.fillRect(18, 24, 3, 3); c.fillRect(27, 24, 3, 3);
    c.fillStyle = '#aa6600'; c.fillRect(19, 25, 1, 1); c.fillRect(28, 25, 1, 1);
  });

  // Boss — large menacing (kept from original)
  tex(scene, 'enemy_boss', S, S, c => {
    groundShadow(c, S / 2, S - 2, 20, 6);
    const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, 20);
    g.addColorStop(0, lighten(PALETTE.boss, 0.15)); g.addColorStop(1, darken(PALETTE.boss, 0.2));
    c.fillStyle = g; rr(c, 4, 6, 40, 36, 6); c.fill();
    c.strokeStyle = darken(PALETTE.boss, 0.4); c.lineWidth = 1.5; rr(c, 4, 6, 40, 36, 6); c.stroke();
    // Horns
    c.fillStyle = PALETTE.gold;
    c.beginPath(); c.moveTo(8, 10); c.lineTo(4, 0); c.lineTo(14, 6); c.fill();
    c.beginPath(); c.moveTo(40, 10); c.lineTo(44, 0); c.lineTo(34, 6); c.fill();
    // Eyes
    c.fillStyle = '#ffff00'; c.fillRect(12, 16, 7, 5); c.fillRect(29, 16, 7, 5);
    c.fillStyle = '#ff0000'; c.fillRect(14, 17, 3, 3); c.fillRect(31, 17, 3, 3);
    // Mouth
    c.fillStyle = PALETTE.uiBg; c.fillRect(14, 30, 20, 4);
    c.fillStyle = '#fff';
    c.fillRect(16, 30, 3, 3); c.fillRect(22, 30, 3, 3); c.fillRect(28, 30, 3, 3);
  });
}

// ─── PROJECTILES ───

function genProjectiles(scene: Phaser.Scene) {
  // Cannonball — dark iron sphere, 14×14
  tex(scene, 'projectile_cannonball', 14, 14, c => {
    const g = c.createRadialGradient(5, 5, 0, 7, 7, 7);
    g.addColorStop(0, '#8a8a9a'); g.addColorStop(0.5, '#4a4a5a'); g.addColorStop(1, '#2a2a35');
    c.fillStyle = g; c.beginPath(); c.arc(7, 7, 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.arc(5, 5, 2, 0, Math.PI * 2); c.fill();
  });

  // Ice Shard — faceted crystal, blue-white, 12×12
  tex(scene, 'projectile_ice_shard', 12, 12, c => {
    c.fillStyle = PALETTE.frost;
    c.beginPath(); c.moveTo(6, 0); c.lineTo(12, 6); c.lineTo(6, 12); c.lineTo(0, 6); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.4)';
    c.beginPath(); c.moveTo(6, 1); c.lineTo(11, 6); c.lineTo(6, 6); c.closePath(); c.fill();
    c.strokeStyle = PALETTE.frostHi; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(6, 0); c.lineTo(12, 6); c.lineTo(6, 12); c.lineTo(0, 6); c.closePath(); c.stroke();
  });

  // Beam Pulse — purple orb with ring, 10×10
  tex(scene, 'projectile_beam_pulse', 10, 10, c => {
    const g = c.createRadialGradient(5, 5, 0, 5, 5, 5);
    g.addColorStop(0, '#e0c0ff'); g.addColorStop(0.5, PALETTE.beam); g.addColorStop(1, 'transparent');
    c.fillStyle = g; c.beginPath(); c.arc(5, 5, 5, 0, Math.PI * 2); c.fill();
    c.strokeStyle = PALETTE.beam + '80'; c.lineWidth = 1;
    c.beginPath(); c.arc(5, 5, 4, 0, Math.PI * 2); c.stroke();
  });

  // Sniper Round — elongated green tracer, 8×16
  tex(scene, 'projectile_sniper_round', 8, 16, c => {
    const g = c.createLinearGradient(4, 0, 4, 16);
    g.addColorStop(0, lighten(PALETTE.sniper, 0.4)); g.addColorStop(0.3, PALETTE.sniper); g.addColorStop(1, PALETTE.sniper + '40');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(4, 0); c.lineTo(7, 4); c.lineTo(7, 14); c.lineTo(4, 16); c.lineTo(1, 14); c.lineTo(1, 4); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(3, 1, 2, 4);
  });

  // Lightning Ball — jagged yellow sphere, 12×12
  tex(scene, 'projectile_lightning_ball', 12, 12, c => {
    const g = c.createRadialGradient(6, 6, 0, 6, 6, 6);
    g.addColorStop(0, '#fffde0'); g.addColorStop(0.4, PALETTE.tesla); g.addColorStop(1, 'transparent');
    c.fillStyle = g; c.beginPath(); c.arc(6, 6, 6, 0, Math.PI * 2); c.fill();
    // Jagged sparks
    c.strokeStyle = '#fff'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(2, 4); c.lineTo(4, 6); c.lineTo(2, 8); c.stroke();
    c.beginPath(); c.moveTo(10, 3); c.lineTo(8, 5); c.lineTo(10, 7); c.stroke();
  });

  // Fireball — orange-red flame, 14×14
  tex(scene, 'projectile_fireball', 14, 14, c => {
    const g = c.createRadialGradient(7, 7, 0, 7, 7, 7);
    g.addColorStop(0, '#ffee66'); g.addColorStop(0.4, PALETTE.flame); g.addColorStop(0.8, '#cc3300'); g.addColorStop(1, 'transparent');
    c.fillStyle = g; c.beginPath(); c.arc(7, 7, 7, 0, Math.PI * 2); c.fill();
    // Flame tip
    c.fillStyle = '#ffcc33';
    c.beginPath(); c.moveTo(7, 0); c.quadraticCurveTo(10, 4, 7, 5); c.quadraticCurveTo(4, 4, 7, 0); c.fill();
  });

  // Poison Glob — green bubbling blob, 14×14
  tex(scene, 'projectile_poison_glob', 14, 14, c => {
    const g = c.createRadialGradient(7, 8, 0, 7, 7, 7);
    g.addColorStop(0, lighten(PALETTE.poison, 0.3)); g.addColorStop(0.6, PALETTE.poison); g.addColorStop(1, 'rgba(55,136,55,0.5)');
    c.fillStyle = g; c.beginPath(); c.arc(7, 8, 6, 0, Math.PI * 2); c.fill();
    // Bubbles
    c.fillStyle = lighten(PALETTE.poison, 0.5);
    c.beginPath(); c.arc(5, 5, 2, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(10, 4, 1.5, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(8, 10, 1, 0, Math.PI * 2); c.fill();
  });

  // Rocket — grey with red tip, 10×18
  tex(scene, 'projectile_rocket', 10, 18, c => {
    // Body
    c.fillStyle = PALETTE.missile;
    c.fillRect(3, 4, 4, 12);
    // Nose cone (red tip)
    c.fillStyle = '#cc3333';
    c.beginPath(); c.moveTo(5, 0); c.lineTo(8, 4); c.lineTo(2, 4); c.closePath(); c.fill();
    // Fins
    c.fillStyle = '#6a6a7a';
    c.beginPath(); c.moveTo(3, 14); c.lineTo(0, 18); c.lineTo(3, 16); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(7, 14); c.lineTo(10, 18); c.lineTo(7, 16); c.closePath(); c.fill();
    // Exhaust glow
    c.fillStyle = '#ffaa33'; c.beginPath(); c.arc(5, 17, 2, 0, Math.PI * 2); c.fill();
  });
}

// ─── LOOT ORBS ───

function genLootOrbs(scene: Phaser.Scene) {
  const LS = 36;
  const defs: [string, string, string][] = [
    ['loot_common', PALETTE.common, '#d0d0d0'], ['loot_rare', PALETTE.rare, PALETTE.frostHi],
    ['loot_epic', PALETTE.epic, '#dd99ff'], ['loot_legendary', PALETTE.legendary, '#fff4cc'],
  ];
  for (const [key, color, glow] of defs) {
    tex(scene, key, LS, LS, c => {
      // Outer aura
      const og = c.createRadialGradient(LS / 2, LS / 2, 4, LS / 2, LS / 2, LS / 2);
      og.addColorStop(0, color + '60'); og.addColorStop(1, 'transparent');
      c.fillStyle = og; c.fillRect(0, 0, LS, LS);
      // Core orb
      const cg = c.createRadialGradient(LS / 2 - 2, LS / 2 - 2, 0, LS / 2, LS / 2, 10);
      cg.addColorStop(0, glow); cg.addColorStop(0.5, color); cg.addColorStop(1, color + '60');
      c.fillStyle = cg; c.beginPath(); c.arc(LS / 2, LS / 2, 10, 0, Math.PI * 2); c.fill();
      // Highlight
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(LS / 2 - 3, LS / 2 - 3, 3, 0, Math.PI * 2); c.fill();
    });
  }
}

function genLootRays(scene: Phaser.Scene) {
  const rayW = 8, rayH = 36;
  const defs: [string, string][] = [
    ['loot_ray_common', PALETTE.common], ['loot_ray_rare', PALETTE.rare],
    ['loot_ray_epic', PALETTE.epic], ['loot_ray_legendary', PALETTE.legendary],
  ];
  for (const [key, color] of defs) {
    tex(scene, key, rayW, rayH, c => {
      const g = c.createLinearGradient(rayW / 2, rayH, rayW / 2, 0);
      g.addColorStop(0, color); g.addColorStop(0.4, color + 'cc'); g.addColorStop(0.75, color + '66'); g.addColorStop(1, 'transparent');
      c.fillStyle = g;
      c.fillRect(1, 0, rayW - 2, rayH);
      // Center bright line — wider and brighter
      c.fillStyle = 'rgba(255,255,255,0.7)';
      c.fillRect(Math.floor(rayW / 2) - 1, 0, 2, Math.floor(rayH * 0.8));
    });
  }
}

// ─── AUGMENT ICONS ───

function genAugmentIcons(scene: Phaser.Scene) {
  const IS = 40; // icon size for inventory
  const rarityBg: Record<LootRarity, string> = { common: '#2a2a35', rare: '#1a2a40', epic: '#2a1a3c', legendary: '#3a2a1a' };
  const rarities: LootRarity[] = ['common', 'rare', 'epic', 'legendary'];

  const shapes: Record<AugmentKind, (c: CanvasRenderingContext2D, col: string) => void> = {
    power_crystal: (c, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(IS / 2, 8); c.lineTo(IS / 2 + 9, IS / 2); c.lineTo(IS / 2, IS - 8); c.lineTo(IS / 2 - 9, IS / 2); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.moveTo(IS / 2, 10); c.lineTo(IS / 2 - 4, IS / 2); c.lineTo(IS / 2, IS - 10); c.closePath(); c.fill(); },
    swift_gem: (c, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(IS / 2 + 3, 7); c.lineTo(IS / 2 - 5, IS / 2 + 1); c.lineTo(IS / 2 + 1, IS / 2 + 1); c.lineTo(IS / 2 - 3, IS - 7); c.lineTo(IS / 2 + 5, IS / 2 - 1); c.lineTo(IS / 2 - 1, IS / 2 - 1); c.closePath(); c.fill(); },
    far_sight_lens: (c, col) => { c.fillStyle = col; c.beginPath(); c.arc(IS / 2, IS / 2, 9, 0, Math.PI * 2); c.fill(); c.fillStyle = PALETTE.uiBg; c.beginPath(); c.arc(IS / 2, IS / 2, 5, 0, Math.PI * 2); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(IS / 2, IS / 2, 3, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.arc(IS / 2 - 2, IS / 2 - 2, 2, 0, Math.PI * 2); c.fill(); },
    chain_link: (c, col) => { c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.ellipse(IS / 2 - 4, IS / 2 - 4, 5, 7, -0.3, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.ellipse(IS / 2 + 4, IS / 2 + 4, 5, 7, -0.3, 0, Math.PI * 2); c.stroke(); },
    frost_shard: (c, col) => { c.strokeStyle = col; c.lineWidth = 2.5; c.lineCap = 'round'; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; c.beginPath(); c.moveTo(IS / 2, IS / 2); c.lineTo(IS / 2 + Math.cos(a) * 10, IS / 2 + Math.sin(a) * 10); c.stroke(); } c.fillStyle = '#fff'; c.beginPath(); c.arc(IS / 2, IS / 2, 3, 0, Math.PI * 2); c.fill(); },
    ember_core: (c, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(IS / 2, 6); c.quadraticCurveTo(IS / 2 + 10, IS / 2 - 2, IS / 2 + 7, IS / 2 + 5); c.quadraticCurveTo(IS / 2 + 4, IS - 5, IS / 2, IS - 6); c.quadraticCurveTo(IS / 2 - 4, IS - 5, IS / 2 - 7, IS / 2 + 5); c.quadraticCurveTo(IS / 2 - 10, IS / 2 - 2, IS / 2, 6); c.fill(); c.fillStyle = 'rgba(255,255,200,0.4)'; c.beginPath(); c.moveTo(IS / 2, 12); c.quadraticCurveTo(IS / 2 + 5, IS / 2, IS / 2 + 3, IS / 2 + 4); c.quadraticCurveTo(IS / 2, IS - 8, IS / 2 - 3, IS / 2 + 4); c.quadraticCurveTo(IS / 2 - 5, IS / 2, IS / 2, 12); c.fill(); },
    void_stone: (c, col) => { c.fillStyle = col; c.beginPath(); c.arc(IS / 2, IS / 2, 10, 0, Math.PI * 2); c.fill(); c.fillStyle = PALETTE.uiBg; c.beginPath(); c.arc(IS / 2, IS / 2, 6, 0, Math.PI * 2); c.fill(); c.strokeStyle = col + '80'; c.lineWidth = 2; c.beginPath(); c.arc(IS / 2, IS / 2, 4, 0, Math.PI * 1.5); c.stroke(); c.fillStyle = col + '40'; c.beginPath(); c.arc(IS / 2, IS / 2, 3, 0, Math.PI * 2); c.fill(); },
    lucky_coin: (c, col) => { c.fillStyle = col; c.beginPath(); c.arc(IS / 2, IS / 2, 10, 0, Math.PI * 2); c.fill(); c.strokeStyle = darken(col, 0.2); c.lineWidth = 1; c.beginPath(); c.arc(IS / 2, IS / 2, 8, 0, Math.PI * 2); c.stroke(); c.fillStyle = 'rgba(255,255,255,0.3)'; const cx = IS / 2, cy = IS / 2; c.beginPath(); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; const a2 = a + Math.PI / 5; c.lineTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6); c.lineTo(cx + Math.cos(a2) * 2.5, cy + Math.sin(a2) * 2.5); } c.closePath(); c.fill(); },
  };

  for (const kind of AUGMENT_KINDS_ORDERED) {
    const def = AUGMENTS[kind];
    for (const rar of rarities) {
      const rc = PALETTE[rar as keyof typeof PALETTE] as string;
      tex(scene, `${def.icon}_${rar}`, IS, IS, c => {
        const bg = c.createLinearGradient(0, 0, IS, IS);
        bg.addColorStop(0, rarityBg[rar]); bg.addColorStop(1, PALETTE.uiBg);
        c.fillStyle = bg; rr(c, 1, 1, IS - 2, IS - 2, 5); c.fill();
        c.fillStyle = rc + '18'; c.fillRect(0, 0, IS, IS); // rarity tint
        c.strokeStyle = rc + 'aa'; c.lineWidth = 1.5; rr(c, 1, 1, IS - 2, IS - 2, 5); c.stroke();
        shapes[kind as AugmentKind](c, def.particleColor);
      });
    }
  }
}

// ─── BASE CRYSTAL ───

function genBase(scene: Phaser.Scene) {
  const BW = 140, BH = 140;
  tex(scene, 'base', BW, BH, c => {
    const cx = BW / 2;
    // Shadow on ground plane
    groundShadow(c, cx, BH - 10, 46, 10);

    // Stone platform
    const py = BH - 40;
    const pg = c.createLinearGradient(28, py, 112, py + 36);
    pg.addColorStop(0, PALETTE.stoneLight);
    pg.addColorStop(0.5, PALETTE.stoneMid);
    pg.addColorStop(1, PALETTE.stoneDark);
    c.fillStyle = pg;
    rr(c, 28, py, 84, 36, 8);
    c.fill();
    c.strokeStyle = darken(PALETTE.stoneDark, 0.3);
    c.lineWidth = 1;
    rr(c, 28, py, 84, 36, 8);
    c.stroke();
    // Platform rim highlight
    c.strokeStyle = 'rgba(255,255,255,0.2)';
    c.lineWidth = 1;
    rr(c, 29, py, 82, 36, 8);
    c.stroke();

    // Walls
    const wx = cx - 28, wy = py - 52, ww = 56, wh = 52;
    bodyGrad(c, PALETTE.stoneMid, wx, wy, ww, wh, 4);

    // Gate
    c.fillStyle = '#4a321e';
    rr(c, cx - 10, wy + 28, 20, 22, 3);
    c.fill();
    c.strokeStyle = darken('#4a321e', 0.3);
    c.lineWidth = 1;
    rr(c, cx - 10, wy + 28, 20, 22, 3);
    c.stroke();
    // Door knocker
    c.fillStyle = PALETTE.gold;
    c.beginPath();
    c.arc(cx, wy + 38, 3, 0, Math.PI * 2);
    c.fill();

    // Gilded roof (rounded triangle)
    const rx = cx, ry = wy - 16, rw = 44, rh = 22;
    const rg = c.createLinearGradient(rx, ry, rx, ry + rh);
    rg.addColorStop(0, lighten(PALETTE.gold, 0.3));
    rg.addColorStop(0.5, PALETTE.gold);
    rg.addColorStop(1, darken(PALETTE.gold, 0.35));
    c.fillStyle = rg;
    c.beginPath();
    c.moveTo(rx - rw, ry + rh);
    c.quadraticCurveTo(rx, ry - rh + 6, rx + rw, ry + rh);
    c.quadraticCurveTo(rx + rw, ry + rh, rx - rw, ry + rh);
    c.closePath();
    c.fill();
    c.strokeStyle = darken(PALETTE.gold, 0.5);
    c.lineWidth = 1;
    c.stroke();

    // Banners
    c.fillStyle = 'rgba(255,255,255,0.22)';
    rr(c, wx - 8, wy + 4, 6, 30, 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.22)';
    rr(c, wx + ww + 2, wy + 4, 6, 30, 2);
    c.fill();

    // Crystal spire
    const cg = c.createLinearGradient(rx, wy - 44, rx, ry + rh - 8);
    cg.addColorStop(0, PALETTE.frostHi);
    cg.addColorStop(0.35, PALETTE.frost);
    cg.addColorStop(0.75, darken(PALETTE.frost, 0.3));
    cg.addColorStop(1, darken(PALETTE.frost, 0.55));
    c.fillStyle = cg;
    c.beginPath();
    c.moveTo(rx, wy - 44);
    c.lineTo(rx + 14, ry - 6);
    c.lineTo(rx + 10, py + 8);
    c.lineTo(rx - 10, py + 8);
    c.lineTo(rx - 14, ry - 6);
    c.closePath();
    c.fill();
    c.strokeStyle = darken(PALETTE.frost, 0.4);
    c.lineWidth = 1;
    c.stroke();
    // Spire facet highlight
    c.fillStyle = 'rgba(255,255,255,0.22)';
    c.beginPath();
    c.moveTo(rx - 2, wy - 40);
    c.lineTo(rx - 10, ry - 2);
    c.lineTo(rx - 7, py + 4);
    c.lineTo(rx, py + 4);
    c.closePath();
    c.fill();

    // Glow around crystal
    const gg = c.createRadialGradient(rx, ry - 10, 0, rx, ry - 10, 40);
    gg.addColorStop(0, 'rgba(79,179,255,0.25)');
    gg.addColorStop(1, 'transparent');
    c.fillStyle = gg;
    c.fillRect(0, 0, BW, BH);
  });
}


// ─── SPAWN CAVE ───

function genCave(scene: Phaser.Scene) {
  // If the cave image was loaded and processed in BootScene, keep that texture
  // instead of overwriting it with a procedural fallback.
  if (scene.textures.exists('spawn_cave')) return;
  // 3-tile wide cave mouth (144×96) that sits behind the spawn point
  const CW = S * 3, CH = S * 2;
  tex(scene, 'spawn_cave', CW, CH, c => {
    const cx = CW / 2, cy = CH;

    // Dark cave interior — arch shape
    c.fillStyle = '#0a0a12';
    c.beginPath();
    c.moveTo(cx - 50, cy);
    c.quadraticCurveTo(cx - 52, cy - 50, cx - 30, cy - 68);
    c.quadraticCurveTo(cx, cy - 86, cx + 30, cy - 68);
    c.quadraticCurveTo(cx + 52, cy - 50, cx + 50, cy);
    c.closePath();
    c.fill();

    // Rocky archway — outer stone layer
    const sg = c.createLinearGradient(cx - 56, 0, cx + 56, CH);
    sg.addColorStop(0, PALETTE.stoneLight);
    sg.addColorStop(0.3, PALETTE.stoneMid);
    sg.addColorStop(0.7, PALETTE.stoneDark);
    sg.addColorStop(1, darken(PALETTE.stoneDark, 0.3));
    c.strokeStyle = sg;
    c.lineWidth = 14;
    c.beginPath();
    c.moveTo(cx - 54, cy);
    c.quadraticCurveTo(cx - 56, cy - 52, cx - 32, cy - 72);
    c.quadraticCurveTo(cx, cy - 90, cx + 32, cy - 72);
    c.quadraticCurveTo(cx + 56, cy - 52, cx + 54, cy);
    c.stroke();

    // Inner stone rim (thinner, lighter)
    c.strokeStyle = PALETTE.stoneLight + '60';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(cx - 46, cy);
    c.quadraticCurveTo(cx - 48, cy - 46, cx - 28, cy - 64);
    c.quadraticCurveTo(cx, cy - 80, cx + 28, cy - 64);
    c.quadraticCurveTo(cx + 48, cy - 46, cx + 46, cy);
    c.stroke();

    // Stalactites hanging from top
    c.fillStyle = PALETTE.stoneDark;
    c.beginPath(); c.moveTo(cx - 18, cy - 72); c.lineTo(cx - 14, cy - 52); c.lineTo(cx - 22, cy - 54); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(cx + 8, cy - 76); c.lineTo(cx + 12, cy - 56); c.lineTo(cx + 4, cy - 58); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(cx - 4, cy - 78); c.lineTo(cx - 1, cy - 62); c.lineTo(cx - 7, cy - 64); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(cx + 24, cy - 66); c.lineTo(cx + 27, cy - 50); c.lineTo(cx + 21, cy - 52); c.closePath(); c.fill();

    // Rock detail bumps on archway
    c.fillStyle = PALETTE.stoneLight + '40';
    c.beginPath(); c.arc(cx - 44, cy - 30, 5, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(cx + 42, cy - 26, 4, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(cx - 26, cy - 62, 3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(cx + 28, cy - 60, 3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(cx, cy - 76, 4, 0, Math.PI * 2); c.fill();

    // Dark gradient depth inside cave
    const dg = c.createRadialGradient(cx, cy - 20, 5, cx, cy - 20, 45);
    dg.addColorStop(0, 'rgba(0,0,0,0.7)');
    dg.addColorStop(0.5, 'rgba(0,0,0,0.3)');
    dg.addColorStop(1, 'transparent');
    c.fillStyle = dg;
    c.fillRect(cx - 50, cy - 70, 100, 70);

    // Eerie red glow from deep inside
    const rg = c.createRadialGradient(cx, cy - 10, 0, cx, cy - 10, 35);
    rg.addColorStop(0, 'rgba(224,85,85,0.25)');
    rg.addColorStop(0.5, 'rgba(224,85,85,0.08)');
    rg.addColorStop(1, 'transparent');
    c.fillStyle = rg;
    c.fillRect(cx - 40, cy - 50, 80, 50);

    // Pair of glowing red eyes deep inside
    c.fillStyle = 'rgba(255,50,50,0.6)';
    c.beginPath(); c.arc(cx - 10, cy - 28, 3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(cx + 10, cy - 28, 3, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,100,100,0.8)';
    c.beginPath(); c.arc(cx - 10, cy - 28, 1.5, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(cx + 10, cy - 28, 1.5, 0, Math.PI * 2); c.fill();

    // Ground rubble at entrance
    c.fillStyle = PALETTE.stoneMid;
    c.beginPath(); c.arc(cx - 34, cy - 4, 5, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(cx + 36, cy - 6, 4, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(cx - 42, cy - 2, 3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(cx + 44, cy - 3, 3, 0, Math.PI * 2); c.fill();
  });
}

// ─── UI ───

function genUI(scene: Phaser.Scene) {
  // Isometric diamond selection indicator
  const dw = ISO_TILE_W;
  const dh = ISO_TILE_H;
  tex(scene, 'selection_diamond', dw, dh, c => {
    c.strokeStyle = PALETTE.gold; c.lineWidth = 2; c.setLineDash([6, 5]);
    c.beginPath();
    c.moveTo(dw / 2, 2);
    c.lineTo(dw - 2, dh / 2);
    c.lineTo(dw / 2, dh - 2);
    c.lineTo(2, dh / 2);
    c.closePath();
    c.stroke();
  });

  // Isometric diamond buildable overlay
  tex(scene, 'tile_buildable_iso', dw, dh, c => {
    c.fillStyle = 'rgba(86,163,86,0.12)';
    c.beginPath();
    c.moveTo(dw / 2, 0);
    c.lineTo(dw, dh / 2);
    c.lineTo(dw / 2, dh);
    c.lineTo(0, dh / 2);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(86,163,86,0.4)'; c.lineWidth = 1; c.setLineDash([4, 4]);
    c.beginPath();
    c.moveTo(dw / 2, 1);
    c.lineTo(dw - 1, dh / 2);
    c.lineTo(dw / 2, dh - 1);
    c.lineTo(1, dh / 2);
    c.closePath();
    c.stroke();
  });

  tex(scene, 'particle', 6, 6, c => {
    const g = c.createRadialGradient(3, 3, 0, 3, 3, 3);
    g.addColorStop(0, '#fff'); g.addColorStop(1, 'transparent');
    c.fillStyle = g; c.fillRect(0, 0, 6, 6);
  });

  for (const kind of AUGMENT_KINDS_ORDERED) {
    const color = AUGMENTS[kind].particleColor;
    tex(scene, `particle_${kind}`, 12, 12, c => {
      const g = c.createRadialGradient(6, 6, 0, 6, 6, 6);
      g.addColorStop(0, '#fff'); g.addColorStop(0.25, color); g.addColorStop(0.6, color + 'aa'); g.addColorStop(1, 'transparent');
      c.fillStyle = g; c.beginPath(); c.arc(6, 6, 6, 0, Math.PI * 2); c.fill();
    });
  }
}
