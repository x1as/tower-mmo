import Phaser from 'phaser';
import { MAP_HEIGHT, TOWERS, PALETTE, TOWER_TYPES_ORDERED, TOWER_DUPLICATE_COST_MULT } from '@tower/shared';
import type { GameUIState } from '@tower/shared';

function formatGold(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 10000) return `${Math.floor(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

const H = MAP_HEIGHT; // 1152
const FONT = '"Minecraft", monospace';
const CARD_R = 36; // card circle radius
const TOP_H = 72;
const BOT_H = 84;

function hex(color: string): number {
  return parseInt(color.replace('#', ''), 16);
}

interface TowerCard {
  type: string;
  bg: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Sprite;
  costText: Phaser.GameObjects.Text;
  cx: number;
  cy: number;
  isHovered: boolean;
}

export class UIScene extends Phaser.Scene {
  waveText!: Phaser.GameObjects.Text;
  goldText!: Phaser.GameObjects.Text;
  goldIcon!: Phaser.GameObjects.Text;
  baseHpText!: Phaser.GameObjects.Text;
  phaseText!: Phaser.GameObjects.Text;
  stageText!: Phaser.GameObjects.Text;
  baseHpBar!: Phaser.GameObjects.Graphics;

  startWaveBg!: Phaser.GameObjects.Graphics;
  startWaveText!: Phaser.GameObjects.Text;
  startWaveHit!: Phaser.GameObjects.Zone;
  autoRunBg!: Phaser.GameObjects.Graphics;
  autoRunText!: Phaser.GameObjects.Text;

  bagBg!: Phaser.GameObjects.Graphics;
  bagText!: Phaser.GameObjects.Text;
  bagCountBg!: Phaser.GameObjects.Graphics;
  bagCountText!: Phaser.GameObjects.Text;

  towerCards: TowerCard[] = [];

  state: Partial<GameUIState> = {};
  W = 0;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    const W = Number(this.game.config.width);
    this.W = W;

    // ─── Top bar (green-tinted) ───
    const topBg = this.add.graphics().setDepth(0);
    topBg.fillStyle(hex(PALETTE.grassDark), 0.65);
    topBg.fillRect(0, 0, W, TOP_H);
    // Lighter overlay at top for gradient feel
    topBg.fillStyle(hex(PALETTE.grassMid), 0.12);
    topBg.fillRect(0, 0, W, 6);
    // Gold bottom border
    topBg.lineStyle(2, hex(PALETTE.uiBorder), 0.6);
    topBg.lineBetween(0, TOP_H - 1, W, TOP_H - 1);

    // Wave + Stage (left)
    this.waveText = this.makeText(20, 12, 'WAVE 0', '#fff', '28px');
    this.stageText = this.makeText(20, 44, 'STAGE 0', '#8aaa8a', '16px');

    // Phase + HP (center)
    this.phaseText = this.makeText(W / 2, 10, 'BUILD', '#00ff88', '26px').setOrigin(0.5, 0);
    this.baseHpText = this.makeText(W / 2, 38, 'BASE 20/20', PALETTE.hpGreen, '16px').setOrigin(0.5, 0);
    this.baseHpBar = this.add.graphics().setDepth(1);

    // Gold (center-right)
    this.goldIcon = this.makeText(W / 2 + 200, 14, '\u2666', PALETTE.gold, '24px');
    this.goldText = this.makeText(W / 2 + 224, 15, '200', '#fff', '24px');

    // Controls (right)
    this.createBagButton();
    this.createWaveControls();

    // ─── Bottom tower bar (green-tinted) ───
    const botBg = this.add.graphics().setDepth(0);
    botBg.fillStyle(hex(PALETTE.grassDark), 0.65);
    botBg.fillRect(0, H - BOT_H, W, BOT_H);
    // Gold top border
    botBg.lineStyle(2, hex(PALETTE.uiBorder), 0.6);
    botBg.lineBetween(0, H - BOT_H, W, H - BOT_H);

    this.createTowerBar();

    // Listen for state
    const gameScene = this.scene.get('GameScene');
    gameScene.events.on('state_update', (s: GameUIState) => {
      this.state = s;
      this.updateUI();
    });
  }

  makeText(x: number, y: number, text: string, color: string, size: string): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      fontFamily: FONT, fontSize: size, color,
      stroke: '#000', strokeThickness: 3,
    }).setDepth(1);
  }

  // ─── BAG BUTTON ───

  createBagButton(): void {
    const W = this.W;
    const bx = W - 480, by = 8, bw = 100, bh = 38;

    this.bagBg = this.add.graphics().setDepth(1);
    this.drawModernButton(this.bagBg, bx, by, bw, bh, hex(PALETTE.beam), false);

    this.bagText = this.makeText(bx + 14, by + 10, 'BAG', '#ddd', '15px');

    this.bagCountBg = this.add.graphics().setDepth(2);
    this.bagCountText = this.makeText(bx + bw - 18, by + bh / 2, '0', '#fff', '12px')
      .setOrigin(0.5, 0.5).setDepth(3);

    const hit = this.add.zone(bx + bw / 2, by + bh / 2, bw, bh).setDepth(4).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this.game.events.emit('toggle_inventory'));
    hit.on('pointerover', () => this.drawModernButton(this.bagBg, bx, by, bw, bh, hex(PALETTE.beam), true));
    hit.on('pointerout', () => this.drawModernButton(this.bagBg, bx, by, bw, bh, hex(PALETTE.beam), false));
  }

  drawModernButton(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, hover: boolean): void {
    g.clear();
    g.fillStyle(0x1a3a1a, hover ? 1 : 0.9);
    g.fillRoundedRect(x, y, w, h, 6);
    g.fillStyle(color, hover ? 0.6 : 0.3);
    g.fillRoundedRect(x, y + h - 4, w, 4, { tl: 0, tr: 0, bl: 6, br: 6 });
    g.lineStyle(1, color, hover ? 0.6 : 0.2);
    g.strokeRoundedRect(x, y, w, h, 6);
  }

  // ─── WAVE CONTROLS ───

  createWaveControls(): void {
    const W = this.W;
    const gs = this.scene.get('GameScene');

    this.startWaveBg = this.add.graphics().setDepth(1);
    const swX = W - 370, swY = 8, swW = 130, swH = 38;
    this.drawModernButton(this.startWaveBg, swX, swY, swW, swH, hex(PALETTE.hpGreen), false);
    this.startWaveText = this.makeText(swX + swW / 2, swY + 10, 'START', '#fff', '16px').setOrigin(0.5, 0);

    this.startWaveHit = this.add.zone(swX + swW / 2, swY + swH / 2, swW, swH).setDepth(2).setInteractive({ useHandCursor: true });
    this.startWaveHit.on('pointerdown', () => gs.events.emit('start_wave_click'));
    this.startWaveHit.on('pointerover', () => this.drawModernButton(this.startWaveBg, swX, swY, swW, swH, hex(PALETTE.hpGreen), true));
    this.startWaveHit.on('pointerout', () => this.drawModernButton(this.startWaveBg, swX, swY, swW, swH, hex(PALETTE.hpGreen), false));

    this.autoRunBg = this.add.graphics().setDepth(1);
    const arX = W - 230, arY = 8, arW = 220, arH = 38;
    this.drawModernButton(this.autoRunBg, arX, arY, arW, arH, 0x555566, false);
    this.autoRunText = this.makeText(arX + arW / 2, arY + 10, 'AUTO OFF', '#666', '15px').setOrigin(0.5, 0);

    const arHit = this.add.zone(arX + arW / 2, arY + arH / 2, arW, arH).setDepth(2).setInteractive({ useHandCursor: true });
    arHit.on('pointerdown', () => gs.events.emit('toggle_autorun'));
    arHit.on('pointerover', () => {
      const isAuto = (this.state as GameUIState).autoRun;
      const col = isAuto ? hex(PALETTE.gold) : 0x555566;
      this.drawModernButton(this.autoRunBg, arX, arY, arW, arH, col, true);
    });
    arHit.on('pointerout', () => {
      const isAuto = (this.state as GameUIState).autoRun;
      const col = isAuto ? hex(PALETTE.gold) : 0x555566;
      this.drawModernButton(this.autoRunBg, arX, arY, arW, arH, col, false);
    });
  }

  // ─── TOWER BAR ───

  createTowerBar(): void {
    const W = this.W;
    const barCY = H - BOT_H / 2;
    const gap = 16;
    const cardSize = CARD_R * 2;
    const totalW = TOWER_TYPES_ORDERED.length * (cardSize + gap) - gap;
    const startX = W / 2 - totalW / 2;

    for (let i = 0; i < TOWER_TYPES_ORDERED.length; i++) {
      const type = TOWER_TYPES_ORDERED[i];
      const def = TOWERS[type];
      const cx = startX + i * (cardSize + gap) + CARD_R;
      const towerColor = hex(def.color);

      const bg = this.add.graphics().setDepth(0);
      this.drawCircleCard(bg, cx, barCY, towerColor, false);

      const icon = this.add.sprite(cx, barCY - 4, `tower_${type}`).setScale(0.40).setDepth(1);
      icon.setInteractive({ useHandCursor: true });
      icon.on('pointerdown', () => {
        const gs = this.scene.get('GameScene') as any;
        gs.selectTowerType(type);
      });

      // Cost text below circle
      const costText = this.makeText(cx, barCY + CARD_R + 2, `${def.cost}`, PALETTE.gold, '12px')
        .setOrigin(0.5, 0);

      const card: TowerCard = {
        type, bg, icon, costText, cx, cy: barCY, isHovered: false,
      };

      icon.on('pointerover', () => { card.isHovered = true; this.refreshTowerCard(card); });
      icon.on('pointerout', () => { card.isHovered = false; this.refreshTowerCard(card); });

      this.towerCards.push(card);
    }
  }

  drawCircleCard(g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number, active: boolean): void {
    g.clear();

    if (active) {
      // Outer glow ring
      g.fillStyle(color, 0.12);
      g.fillCircle(cx, cy, CARD_R + 4);
      // Main circle (dark green)
      g.fillStyle(0x2a4a2a, 0.95);
      g.fillCircle(cx, cy, CARD_R);
      // Inner color wash
      g.fillStyle(color, 0.08);
      g.fillCircle(cx, cy, CARD_R - 2);
      // Colored ring border
      g.lineStyle(2.5, color, 0.8);
      g.strokeCircle(cx, cy, CARD_R);
      // Top highlight arc
      g.lineStyle(1.5, 0xffffff, 0.15);
      g.beginPath();
      g.arc(cx, cy, CARD_R - 4, -2.3, -0.8);
      g.strokePath();
    } else {
      // Main circle (dark green)
      g.fillStyle(0x1a3a1a, 0.9);
      g.fillCircle(cx, cy, CARD_R);
      // Subtle color ring
      g.lineStyle(1.5, color, 0.3);
      g.strokeCircle(cx, cy, CARD_R);
      // Top highlight arc
      g.lineStyle(1, 0xffffff, 0.06);
      g.beginPath();
      g.arc(cx, cy, CARD_R - 4, -2.3, -0.8);
      g.strokePath();
    }
  }

  refreshTowerCard(card: TowerCard): void {
    const isSelected = (this.state as GameUIState).selectedTowerType === card.type;
    const active = card.isHovered || isSelected;
    const towerColor = hex(TOWERS[card.type].color);

    this.drawCircleCard(card.bg, card.cx, card.cy, towerColor, active);
    card.icon.setScale(active ? 0.48 : 0.40);
  }

  // ─── UPDATE ───

  updateUI(): void {
    const W = this.W;
    const s = this.state as GameUIState;
    if (!s.wave && s.wave !== 0) return;

    this.waveText.setText(`WAVE ${s.wave}`);
    this.goldText.setText(`${s.gold}`);
    this.stageText.setText(`STAGE ${s.gameStage}`);

    const phases: Record<string, { text: string; color: string }> = {
      build: { text: 'BUILD PHASE', color: '#00ff88' },
      combat: { text: `COMBAT  x${s.enemyCount}`, color: '#ff6644' },
      wave_end: { text: 'WAVE CLEAR', color: PALETTE.gold },
      game_over: { text: 'GAME OVER', color: PALETTE.hpRed },
    };
    const p = phases[s.phase] || { text: s.phase, color: '#fff' };
    this.phaseText.setText(p.text);
    this.phaseText.setColor(p.color);

    // HP bar
    this.baseHpText.setText(`BASE ${s.baseHp}/${s.maxBaseHp}`);
    const hpPct = s.baseHp / s.maxBaseHp;
    this.baseHpBar.clear();
    const barW = 280, barH = 12;
    const barX = W / 2 - barW / 2;
    const barY = 56;
    this.baseHpBar.fillStyle(0x1a0000, 0.5);
    this.baseHpBar.fillRoundedRect(barX, barY, barW, barH, 4);
    const hpColor = hpPct > 0.5 ? hex(PALETTE.hpGreen)
      : hpPct > 0.25 ? 0xff9800 : hex(PALETTE.hpRed);
    this.baseHpBar.fillStyle(hpColor);
    this.baseHpBar.fillRoundedRect(barX, barY, barW * hpPct, barH, 4);
    this.baseHpBar.lineStyle(1, 0xffffff, 0.08);
    this.baseHpBar.strokeRoundedRect(barX, barY, barW, barH, 4);

    // BAG count badge
    const count = s.inventory.length;
    this.bagCountText.setText(`${count}`);
    this.bagCountBg.clear();
    if (count > 0) {
      const bx = this.W - 480 + 100 - 18;
      const by = 8 + 38 / 2;
      this.bagCountBg.fillStyle(hex(PALETTE.beam), 0.9);
      this.bagCountBg.fillCircle(bx, by, 10);
    }

    // Tower card selection + dynamic costs
    for (const card of this.towerCards) {
      const tCount = (s.towerTypeCounts || {})[card.type] || 0;
      const def = TOWERS[card.type];
      const cost = Math.floor(def.cost * Math.pow(TOWER_DUPLICATE_COST_MULT, tCount));
      card.costText.setText(formatGold(cost));
      this.refreshTowerCard(card);
    }

    // Wave button
    const showStart = (s.phase === 'build' || s.phase === 'wave_end') && !s.autoRun;
    this.startWaveBg.setVisible(showStart);
    this.startWaveText.setVisible(showStart);
    this.startWaveHit.setVisible(showStart);
    if (showStart) this.startWaveHit.setInteractive({ useHandCursor: true });
    else this.startWaveHit.disableInteractive();

    // Auto-run toggle
    const arX = this.W - 230, arY = 8, arW = 220, arH = 38;
    if (s.autoRun) {
      this.autoRunText.setText('AUTO ON');
      this.autoRunText.setColor(PALETTE.gold);
      this.drawModernButton(this.autoRunBg, arX, arY, arW, arH, hex(PALETTE.gold), false);
    } else {
      this.autoRunText.setText('AUTO OFF');
      this.autoRunText.setColor('#666');
      this.drawModernButton(this.autoRunBg, arX, arY, arW, arH, 0x555566, false);
    }
  }
}
