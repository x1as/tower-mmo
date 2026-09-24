import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GAME_CONFIG } from '../game/config';

interface GameCanvasProps {
  onGameReady?: (game: Phaser.Game) => void;
}

export function GameCanvas({ onGameReady }: GameCanvasProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameRef.current || !containerRef.current) return;

    const game = new Phaser.Game({
      ...GAME_CONFIG,
      parent: containerRef.current,
    });

    gameRef.current = game;
    onGameReady?.(game);

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="game-container"
      style={{
        width: '100%',
        height: '100%',
        lineHeight: 0,
      }}
    />
  );
}
