import { useState, useCallback, useRef, useEffect } from 'react';
import Phaser from 'phaser';
import { GameCanvas } from './components/GameCanvas';
import { GameHUD } from './components/GameHUD';
import { Inventory } from './components/Inventory';
import { ForgeSidebar } from './components/ForgeSidebar';
import { ShopSidebar } from './components/ShopSidebar';
import { PauseMenu } from './components/PauseMenu';
import type { SidebarPanel } from './components/SidebarUtils';
import { TOWERS, SELL_REFUND_RATE, STARTING_GOLD, CHEST_PRICES, CRAFT_RECIPES, rollRandomKind } from '@tower/shared';
import type { GameUIState, LootRarity, AugmentKind, InventoryItem } from '@tower/shared';
import type { GameScene } from './game/scenes/GameScene';
import './App.css';

const defaultState: GameUIState = {
  wave: 0, phase: 'build', gold: STARTING_GOLD, baseHp: 20, maxBaseHp: 20,
  enemyCount: 0, gameStage: 0, towerCount: 0, inventory: [],
  selectedTowerId: null, selectedTower: null, selectedTowerDef: null,
  selectedTowerType: null, autoRun: false, paused: false, towerTypeCounts: {},
  pendingAugmentInstanceId: null, availableAugmentTowerCount: 0,
};

function App() {
  const [state, setState] = useState<GameUIState>(defaultState);
  const [sidebar, setSidebar] = useState<SidebarPanel | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [gameInstance, setGameInstance] = useState<Phaser.Game | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const onGameReady = useCallback((game: Phaser.Game) => {
    gameRef.current = game;
    setGameInstance(game);

    // Global game events for sidebars
    game.events.on('toggle_inventory', () => setSidebar((current) => current === 'inventory' ? null : 'inventory'));
    game.events.on('open_inventory', () => setSidebar('inventory'));
    game.events.on('open_shop', () => setSidebar('shop'));
    game.events.on('open_forge', () => setSidebar('forge'));
    game.events.on('close_sidebar', () => setSidebar(null));
    game.events.on('close_inventory', () => setSidebar(null));
    const tryConnect = () => {
      const gs = game.scene.getScene('GameScene') as GameScene | undefined;
      if (gs) {
        gs.events.on('state_update', (s: GameUIState) => setState({ ...s }));
      }
    };
    game.events.on('ready', tryConnect);
    setTimeout(tryConnect, 400);
  }, []);

  // Global keyboard shortcuts (work even when scene is paused)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(prev => !prev);
      }
      if (e.key === ' ') {
        e.preventDefault();
        const gs = gameRef.current?.scene.getScene('GameScene') as GameScene | undefined;
        if (!gs) return;
        if (gs.phase === 'build' || gs.phase === 'wave_end') {
          gs.startWave();
        } else if (gs.phase === 'combat') {
          gs.paused = !gs.paused;
          if (gs.paused) {
            gameRef.current!.scene.pause('GameScene');
          } else {
            gameRef.current!.scene.resume('GameScene');
          }
          gs.emitState();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handlePause = useCallback(() => {
    const gs = gameRef.current?.scene.getScene('GameScene') as GameScene | undefined;
    if (!gs || gs.phase !== 'combat') return;
    gs.paused = true;
    gameRef.current!.scene.pause('GameScene');
    gs.emitState();
  }, []);

  const handleResume = useCallback(() => {
    const gs = gameRef.current?.scene.getScene('GameScene') as GameScene | undefined;
    if (!gs) return;
    gs.paused = false;
    gameRef.current!.scene.resume('GameScene');
    gs.emitState();
  }, []);

  const handleRestart = useCallback(() => {
    const gs = gameRef.current?.scene.getScene('GameScene') as GameScene | undefined;
    if (!gs) return;
    // Ensure scene is running before restart
    if (gs.paused) {
      gs.paused = false;
      gameRef.current!.scene.resume('GameScene');
    }
    gameRef.current!.scene.stop('GameScene');
    gameRef.current!.scene.start('GameScene');
    setMenuOpen(false);
    setSidebar(null);
  }, []);

  const handleStartAugment = useCallback((instanceId: string) => {
    const gs = gameRef.current?.scene.getScene('GameScene') as GameScene | undefined;
    if (gs) {
      gs.events.emit('start_augment_mode', { instanceId });
    }
  }, []);

  const handleRemoveAugment = useCallback((towerId: string, augmentIndex: number) => {
    const gs = gameRef.current?.scene.getScene('GameScene');
    if (gs) {
      gs.events.emit('remove_augment', { towerId, augmentIndex });
    }
  }, []);

  const handleBuyChest = useCallback((rarity: LootRarity): { kind: AugmentKind; rarity: LootRarity } | null => {
    const gs = gameRef.current?.scene.getScene('GameScene') as GameScene | undefined;
    if (!gs) return null;
    const price = CHEST_PRICES[rarity];
    if (!price || gs.gold < price) return null;
    gs.gold -= price;
    const kind = rollRandomKind();
    const instanceId = `shop_${Date.now()}_${Math.random()}`;
    gs.inventory.push({ instanceId, kind, rarity });
    gs.emitState();
    return { kind, rarity };
  }, []);

  const handleCraft = useCallback((inputRarity: LootRarity): { kind: AugmentKind; rarity: LootRarity } | null => {
    const gs = gameRef.current?.scene.getScene('GameScene') as GameScene | undefined;
    if (!gs) return null;
    const recipe = CRAFT_RECIPES.find(r => r.inputRarity === inputRarity);
    if (!recipe) return null;
    const items = gs.inventory.filter((i: InventoryItem) => i.rarity === recipe.inputRarity);
    if (items.length < recipe.inputCount) return null;
    for (let i = 0; i < recipe.inputCount; i++) {
      const idx = gs.inventory.findIndex((inv: InventoryItem) => inv.rarity === recipe.inputRarity);
      if (idx >= 0) gs.inventory.splice(idx, 1);
    }
    const kind = rollRandomKind();
    const outputRarity = recipe.outputRarity as LootRarity;
    const instanceId = `craft_${Date.now()}_${Math.random()}`;
    gs.inventory.push({ instanceId, kind, rarity: outputRarity });
    gs.emitState();
    return { kind, rarity: outputRarity };
  }, []);

  const handleSellTower = useCallback(() => {
    if (!state.selectedTowerId) return;
    const gs = gameRef.current?.scene.getScene('GameScene') as GameScene | undefined;
    if (!gs) return;
    const tower = gs.towers.find(t => t.id === state.selectedTowerId);
    if (tower) {
      const def = TOWERS[tower.type];
      gs.gold += Math.floor((def?.cost || 50) * SELL_REFUND_RATE);
      tower.sprite.destroy();
      tower.particleEmitters?.forEach(e => e.destroy());
      gs.towers = gs.towers.filter(t => t !== tower);
      gs.selectionIndicator?.destroy();
      gs.selectedTowerId = null;
      gs.rangePreview?.destroy();
      gs.rangePreview = null;
      gs.emitState();
    }
  }, [state.selectedTowerId]);

  return (
    <div className="app-root">
      <GameCanvas onGameReady={onGameReady} />
      <GameHUD state={state} game={gameInstance} activePanel={sidebar} />

      <Inventory
        open={sidebar === 'inventory'}
        onClose={() => setSidebar(null)}
        inventory={state.inventory}
        selectedTower={state.selectedTower}
        selectedTowerDef={state.selectedTowerDef}
        onStartAugment={handleStartAugment}
        onRemoveAugment={handleRemoveAugment}
        onSellTower={handleSellTower}
        pendingAugmentInstanceId={state.pendingAugmentInstanceId}
        availableAugmentTowerCount={state.availableAugmentTowerCount}
      />
      <ShopSidebar
        open={sidebar === 'shop'}
        onClose={() => setSidebar(null)}
        gold={state.gold}
        onBuyChest={handleBuyChest}
      />
      <ForgeSidebar
        open={sidebar === 'forge'}
        onClose={() => setSidebar(null)}
        inventory={state.inventory}
        onCraft={handleCraft}
      />

      {menuOpen && (
        <PauseMenu
          paused={state.paused}
          phase={state.phase}
          onPause={handlePause}
          onResume={handleResume}
          onRestart={handleRestart}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
