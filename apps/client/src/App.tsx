import { useState, useCallback, useRef, useEffect } from 'react';
import Phaser from 'phaser';
import { GameCanvas } from './components/GameCanvas';
import { GameHUD } from './components/GameHUD';
import { Inventory } from './components/Inventory';
import { PauseMenu } from './components/PauseMenu';
import { TOWERS, SELL_REFUND_RATE, STARTING_GOLD, CHEST_PRICES, CRAFT_RECIPES, rollRandomKind } from '@tower/shared';
import type { GameUIState, LootRarity, AugmentKind } from '@tower/shared';
import './App.css';

const defaultState: GameUIState = {
  wave: 0, phase: 'build', gold: STARTING_GOLD, baseHp: 20, maxBaseHp: 20,
  enemyCount: 0, gameStage: 0, towerCount: 0, inventory: [],
  selectedTowerId: null, selectedTower: null, selectedTowerDef: null,
  selectedTowerType: null, autoRun: false, paused: false, towerTypeCounts: {},
};

function App() {
  const [state, setState] = useState<GameUIState>(defaultState);
  const [invOpen, setInvOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [gameInstance, setGameInstance] = useState<Phaser.Game | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const onGameReady = useCallback((game: Phaser.Game) => {
    gameRef.current = game;
    setGameInstance(game);

    // Global game events for inventory toggle
    game.events.on('toggle_inventory', () => setInvOpen(prev => !prev));
    // Auto-open inventory when tower is selected
    game.events.on('open_inventory', () => setInvOpen(true));
    // Close inventory when clicking empty ground
    game.events.on('close_inventory', () => setInvOpen(false));
    const tryConnect = () => {
      const gs = game.scene.getScene('GameScene');
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
        const gs = gameRef.current?.scene.getScene('GameScene') as any;
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
    const gs = gameRef.current?.scene.getScene('GameScene') as any;
    if (!gs || gs.phase !== 'combat') return;
    gs.paused = true;
    gameRef.current!.scene.pause('GameScene');
    gs.emitState();
  }, []);

  const handleResume = useCallback(() => {
    const gs = gameRef.current?.scene.getScene('GameScene') as any;
    if (!gs) return;
    gs.paused = false;
    gameRef.current!.scene.resume('GameScene');
    gs.emitState();
  }, []);

  const handleRestart = useCallback(() => {
    const gs = gameRef.current?.scene.getScene('GameScene') as any;
    if (!gs) return;
    // Ensure scene is running before restart
    if (gs.paused) {
      gs.paused = false;
      gameRef.current!.scene.resume('GameScene');
    }
    gameRef.current!.scene.stop('GameScene');
    gameRef.current!.scene.start('GameScene');
    setMenuOpen(false);
    setInvOpen(false);
  }, []);

  const handleApplyAugment = useCallback((instanceId: string) => {
    const gs = gameRef.current?.scene.getScene('GameScene');
    if (gs && state.selectedTowerId) {
      gs.events.emit('apply_augment', { towerId: state.selectedTowerId, instanceId });
    }
  }, [state.selectedTowerId]);

  const handleRemoveAugment = useCallback((towerId: string, augmentIndex: number) => {
    const gs = gameRef.current?.scene.getScene('GameScene');
    if (gs) {
      gs.events.emit('remove_augment', { towerId, augmentIndex });
    }
  }, []);

  const handleBuyChest = useCallback((rarity: LootRarity): { kind: AugmentKind; rarity: LootRarity } | null => {
    const gs = gameRef.current?.scene.getScene('GameScene') as any;
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
    const gs = gameRef.current?.scene.getScene('GameScene') as any;
    if (!gs) return null;
    const recipe = CRAFT_RECIPES.find(r => r.inputRarity === inputRarity);
    if (!recipe) return null;
    const items = gs.inventory.filter((i: any) => i.rarity === recipe.inputRarity);
    if (items.length < recipe.inputCount) return null;
    for (let i = 0; i < recipe.inputCount; i++) {
      const idx = gs.inventory.findIndex((inv: any) => inv.rarity === recipe.inputRarity);
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
    const gs = gameRef.current?.scene.getScene('GameScene') as any;
    if (!gs) return;
    const tower = gs.towers.find((t: any) => t.id === state.selectedTowerId);
    if (tower) {
      const def = TOWERS[tower.type];
      gs.gold += Math.floor((def?.cost || 50) * SELL_REFUND_RATE);
      tower.sprite.destroy();
      tower.hpBar?.destroy();
      tower.particleEmitters?.forEach((e: any) => e.destroy());
      gs.towers = gs.towers.filter((t: any) => t !== tower);
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
      <GameHUD state={state} game={gameInstance} />

      <Inventory
        open={invOpen}
        onClose={() => setInvOpen(false)}
        inventory={state.inventory}
        gold={state.gold}
        selectedTower={state.selectedTower}
        selectedTowerDef={state.selectedTowerDef}
        onApplyAugment={handleApplyAugment}
        onRemoveAugment={handleRemoveAugment}
        onSellTower={handleSellTower}
        onBuyChest={handleBuyChest}
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
