import { createScene } from './scene.ts';
import { createArenaMeshes } from './objects/arena.ts';
import { createPlayerMeshes, updatePlayerMeshes } from './objects/player.ts';
import { createHud, updateHud } from './objects/hud.ts';
import {
  readInput, clearJustPressed, isKeyJustPressed,
  pollGamepads, readGamepadInput, isGamepadRestart, mergeInput,
} from './input.ts';
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
  pollGamepads();

  // Keyboard input
  let p1Input = readInput(P1_KEYS);
  let p2Input = readInput(P2_KEYS);

  // Merge gamepad input (pad 0 → P1, pad 1 → P2)
  const gp1 = readGamepadInput(0, state.players[0].facingAngle);
  const gp2 = readGamepadInput(1, state.players[1].facingAngle);
  if (gp1) p1Input = mergeInput(p1Input, gp1);
  if (gp2) p2Input = mergeInput(p2Input, gp2);

  if (state.winner !== null) {
    state.restartTimer += dt;
    const canRestart = state.restartTimer > RESTART_DELAY;
    if (canRestart && (isKeyJustPressed('Space') || isGamepadRestart(0) || isGamepadRestart(1))) {
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
