import Phaser from 'phaser';
import { generateAllSprites } from '../sprites/SpriteGenerator';
import {
  TOWER_TYPES_ORDERED, AUGMENT_KINDS_ORDERED,
  TOWER_SPRITE_W, TOWER_SPRITE_H,
  SRC_BOTTOM_W, SRC_BOTTOM_H, SRC_TOP_W, SRC_TOP_H,
  SCALED_TILE_W, SCALED_TILE_FULL_H,
  TREE_W, TREE_H, STONE_W, STONE_H,
} from '@tower/shared';

// Tower type -> color/variant mapping
const TOWER_ASSET_MAP: Record<string, { color: string; bottom: string; top: string }> = {
  cannon:  { color: 'red',    bottom: 'bottom-1', top: 'top-1' },
  flame:   { color: 'red',    bottom: 'bottom-2', top: 'top-2' },
  frost:   { color: 'purple', bottom: 'bottom-1', top: 'top-1' },
  beam:    { color: 'purple', bottom: 'bottom-2', top: 'top-2' },
  sniper:  { color: 'green',  bottom: 'bottom-1', top: 'top-1' },
  poison:  { color: 'green',  bottom: 'bottom-2', top: 'top-2' },
  tesla:   { color: 'yellow', bottom: 'bottom-1', top: 'top-1' },
  missile: { color: 'yellow', bottom: 'bottom-2', top: 'top-2' },
};

const CUSTOM_SPRITES = import.meta.glob('../sprites/custom/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const customSprite = (key: string): string | undefined => CUSTOM_SPRITES[`../sprites/custom/${key}.png`];

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Ground tiles
    this.load.image('iso_grass_raw', 'iso/tiles/grass.png');
    this.load.image('iso_bald_raw', 'iso/tiles/bald.png');

    // Tower parts (4 colors × 4 parts)
    for (const color of ['red', 'green', 'purple', 'yellow']) {
      for (const part of ['bottom-1', 'bottom-2', 'top-1', 'top-2']) {
        this.load.image(`iso_tower_${color}_${part}`, `iso/towers/${color}-${part}.png`);
      }
    }

    // Cave (enemy base)
    this.load.image('iso_cave_raw', 'iso/towers/cave.png');

    // Decorations
    for (let i = 1; i <= 4; i++) {
      this.load.image(`iso_tree_raw_${i}`, `iso/decor/tree-${i}.png`);
      this.load.image(`iso_stone_raw_${i}`, `iso/decor/stone-${i}.png`);
    }

    // Custom sprites: a PNG in src/game/sprites/custom/<key>.png replaces the procedural one.
    // Only files that exist are requested, so a missing override never hits the network.
    const spriteKeys = [
      'enemy_scatter_imp', 'enemy_thermal_drake', 'enemy_mirror_wisp', 'enemy_blink_fox',
      'enemy_ground_wurm', 'enemy_magma_golem', 'enemy_pure_spirit', 'enemy_iron_shell', 'enemy_boss',
      'projectile_cannonball', 'projectile_ice_shard', 'projectile_beam_pulse',
      'projectile_sniper_round', 'projectile_lightning_ball', 'projectile_fireball',
      'projectile_poison_glob', 'projectile_rocket',
      'base',
    ];
    for (const key of spriteKeys) {
      const url = customSprite(key);
      if (url) this.load.image(key, url);
    }

    // ─── Animated spritesheets (horizontal strip, all same-size frames) ───
    // Loot orbs: 4 rarities, each 6 frames, 48x48 per frame
    const lootRarities = ['common', 'rare', 'epic', 'legendary'];
    for (const r of lootRarities) {
      const orb = customSprite(`loot_${r}`), ray = customSprite(`loot_ray_${r}`);
      if (orb) this.load.spritesheet(`loot_${r}`, orb, { frameWidth: 48, frameHeight: 48 });
      if (ray) this.load.spritesheet(`loot_ray_${r}`, ray, { frameWidth: 12, frameHeight: 48 });
    }

    // Augment particles: 8 types, each 6 frames, 16x16 per frame
    for (const kind of AUGMENT_KINDS_ORDERED) {
      const url = customSprite(`particle_${kind}`);
      if (url) this.load.spritesheet(`particle_${kind}`, url, { frameWidth: 16, frameHeight: 16 });
    }

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`Failed to load: ${file.key}`);
      if (this.textures.exists(file.key)) {
        this.textures.remove(file.key);
      }
    });
  }

  create(): void {
    // Scale ground tiles (flat diamond only, crop out side walls)
    this.scaleTileFlat('iso_grass_raw', 'iso_grass');
    this.scaleTileFlat('iso_bald_raw', 'iso_bald');

    // Scale decorations
    for (let i = 1; i <= 4; i++) {
      this.scaleTexture(`iso_tree_raw_${i}`, `iso_tree_${i}`, TREE_W, TREE_H);
      this.scaleTexture(`iso_stone_raw_${i}`, `iso_stone_${i}`, STONE_W, STONE_H);
    }

    // Composite towers (bottom + top -> single sprite)
    for (const type of TOWER_TYPES_ORDERED) {
      const mapping = TOWER_ASSET_MAP[type];
      this.compositeTower(
        `iso_tower_${mapping.color}_${mapping.bottom}`,
        `iso_tower_${mapping.color}_${mapping.top}`,
        `tower_${type}`,
      );
    }

    // Generate spawn_cave texture from cave.png, cropping transparent
    // bottom rows so the cave sits on the ground instead of floating above it.
    this.scaleCave('iso_cave_raw', 'spawn_cave', 360, 240);

    // ─── Create animations from spritesheets (if loaded) ───
    const lootRarities = ['common', 'rare', 'epic', 'legendary'];
    for (const r of lootRarities) {
      if (this.textures.exists(`loot_${r}`) && this.textures.get(`loot_${r}`).frameTotal > 1) {
        this.anims.create({
          key: `loot_${r}_anim`,
          frames: this.anims.generateFrameNumbers(`loot_${r}`, { start: 0, end: this.textures.get(`loot_${r}`).frameTotal - 2 }),
          frameRate: 8,
          repeat: -1,
        });
      }
      if (this.textures.exists(`loot_ray_${r}`) && this.textures.get(`loot_ray_${r}`).frameTotal > 1) {
        this.anims.create({
          key: `loot_ray_${r}_anim`,
          frames: this.anims.generateFrameNumbers(`loot_ray_${r}`, { start: 0, end: this.textures.get(`loot_ray_${r}`).frameTotal - 2 }),
          frameRate: 10,
          repeat: -1,
        });
      }
    }
    for (const kind of AUGMENT_KINDS_ORDERED) {
      if (this.textures.exists(`particle_${kind}`) && this.textures.get(`particle_${kind}`).frameTotal > 1) {
        this.anims.create({
          key: `particle_${kind}_anim`,
          frames: this.anims.generateFrameNumbers(`particle_${kind}`, { start: 0, end: this.textures.get(`particle_${kind}`).frameTotal - 2 }),
          frameRate: 10,
          repeat: -1,
        });
      }
    }

    // Generate procedural sprites (enemies, projectiles, loot, augments, UI)
    generateAllSprites(this);

    this.time.delayedCall(100, () => {
      this.scene.start('GameScene');
    });
  }

  scaleTexture(srcKey: string, destKey: string, w: number, h: number): void {
    if (!this.textures.exists(srcKey)) return;
    const src = this.textures.get(srcKey).getSourceImage() as HTMLImageElement;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d')!;
    ctx.drawImage(src, 0, 0, w, h);
    this.textures.addCanvas(destKey, cv);
  }

  /** Scale a tile source to full isometric cube (diamond + walls). */
  scaleTileFlat(srcKey: string, destKey: string): void {
    if (!this.textures.exists(srcKey)) return;
    const src = this.textures.get(srcKey).getSourceImage() as HTMLImageElement;
    const cv = document.createElement('canvas');
    cv.width = SCALED_TILE_W;
    cv.height = SCALED_TILE_FULL_H;
    cv.getContext('2d')!.drawImage(src, 0, 0, SCALED_TILE_W, SCALED_TILE_FULL_H);
    this.textures.addCanvas(destKey, cv);
  }

  /**
   * Scale a raw cave image to the spawn_cave texture, automatically trimming
   * fully-transparent bottom rows so the cave content sits flush on the ground.
   */
  scaleCave(srcKey: string, destKey: string, w: number, h: number): void {
    if (!this.textures.exists(srcKey)) return;
    const src = this.textures.get(srcKey).getSourceImage() as HTMLImageElement;

    // Sample alpha to find the first row that contains opaque content.
    const probe = document.createElement('canvas');
    probe.width = src.naturalWidth;
    probe.height = src.naturalHeight;
    const pctx = probe.getContext('2d')!;
    pctx.drawImage(src, 0, 0);
    const px = pctx.getImageData(0, 0, probe.width, probe.height).data;
    const stride = probe.width * 4;
    let top = 0;
    for (let r = 0; r < probe.height; r++) {
      let opaque = false;
      for (let c = 0; c < probe.width; c++) {
        if (px[r * stride + c * 4 + 3] > 0) { opaque = true; break; }
      }
      if (opaque) { top = r; break; }
    }
    let bottom = probe.height - 1;
    for (let r = probe.height - 1; r >= top; r--) {
      let opaque = false;
      for (let c = 0; c < probe.width; c++) {
        if (px[r * stride + c * 4 + 3] > 0) { opaque = true; break; }
      }
      if (opaque) { bottom = r; break; }
    }
    const srcH = Math.max(1, bottom - top + 1);

    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d')!;
    // Draw only the content region, vertically centered so the trimmed cave
    // rests on the ground plane.
    const scale = h / srcH;
    const drawW = src.naturalWidth * scale;
    const offsetX = (w - drawW) / 2;
    const dy = h - srcH * scale;
    ctx.drawImage(src, 0, top, src.naturalWidth, srcH, offsetX, dy, drawW, srcH * scale);
    this.textures.addCanvas(destKey, cv);
  }

  compositeTower(bottomKey: string, topKey: string, destKey: string): void {
    if (!this.textures.exists(bottomKey) || !this.textures.exists(topKey)) return;
    const bottomSrc = this.textures.get(bottomKey).getSourceImage() as HTMLImageElement;
    const topSrc = this.textures.get(topKey).getSourceImage() as HTMLImageElement;

    const cv = document.createElement('canvas');
    cv.width = TOWER_SPRITE_W;
    cv.height = TOWER_SPRITE_H;
    const ctx = cv.getContext('2d')!;

    // Scale factor: bottom part is ~749x711, we want it to fit in ~96px wide
    const bottomScale = TOWER_SPRITE_W / SRC_BOTTOM_W;
    const scaledBottomH = Math.round(SRC_BOTTOM_H * bottomScale);
    const topScale = TOWER_SPRITE_W / SRC_TOP_W;
    const scaledTopH = Math.round(SRC_TOP_H * topScale);

    // Draw bottom at lower portion
    const bottomY = TOWER_SPRITE_H - scaledBottomH;
    ctx.drawImage(bottomSrc, 0, bottomY, TOWER_SPRITE_W, scaledBottomH);

    // Draw top overlapping above bottom
    const topY = bottomY - scaledTopH + Math.round(scaledTopH * 0.45);
    ctx.drawImage(topSrc, 0, topY, TOWER_SPRITE_W, scaledTopH);

    this.textures.addCanvas(destKey, cv);
  }
}
