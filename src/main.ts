import { createScene } from './scene.ts';
import { createArenaMeshes } from './objects/arena.ts';
import { createPlayerMeshes, updatePlayerMeshes } from './objects/player.ts';
import { createHud, updateHud } from './objects/hud.ts';
import { readInput, clearJustPressed, isKeyJustPressed } from './input.ts';
import { createInitialState } from './state/gameState.ts';
import { updateGame } from './game.ts';
import { P1_KEYS, P2_KEYS, RESTART_DELAY } from './constants.ts';

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
const { engine, scene } = createScene(canvas);

createArenaMeshes(scene);

const playerMeshes = [
  createPlayerMeshes(scene, 0),
  createPlayerMeshes(scene, 1),
] as const;

const hud = createHud(scene);

let state = createInitialState();

engine.runRenderLoop(() => {
  const dt = engine.getDeltaTime() / 1000;
  const p1Input = readInput(P1_KEYS);
  const p2Input = readInput(P2_KEYS);

  if (state.winner !== null) {
    state.restartTimer += dt;
    if (state.restartTimer > RESTART_DELAY && isKeyJustPressed('Space')) {
      state = createInitialState();
    }
  } else {
    updateGame(state, p1Input, p2Input, dt);
  }

  updatePlayerMeshes(playerMeshes[0], state.players[0], 0);
  updatePlayerMeshes(playerMeshes[1], state.players[1], 1);
  updateHud(hud, state);
  clearJustPressed();
  scene.render();
});

window.addEventListener('resize', () => engine.resize());
