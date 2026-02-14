import { createScene } from './scene.ts';
import { createArenaMeshes } from './objects/arena.ts';
import { createPlayerMeshes, updatePlayerMeshes, setPlayerMeshesVisible } from './objects/player.ts';
import { createHud, updateHud, setHudVisible } from './objects/hud.ts';
import { createEffectsPool, updateEffects } from './objects/effects.ts';
import {
  readInput, clearJustPressed, isKeyJustPressed,
  pollGamepads, readGamepadInput, isGamepadRestart, mergeInput,
} from './input.ts';
import { createInitialState, createSelectionState } from './state/gameState.ts';
import { updateGame } from './game.ts';
import { createSelectionUI, updateSelection, destroySelectionUI } from './ui/selection.ts';
import { P1_KEYS, P2_KEYS, RESTART_DELAY } from './constants.ts';
import type { AbilityType } from './types.ts';

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
const { engine, scene } = createScene(canvas);

createArenaMeshes(scene);

let playerMeshes = [
  createPlayerMeshes(scene, 0),
  createPlayerMeshes(scene, 1),
] as const;

const hud = createHud(scene);
const effectsPool = createEffectsPool(scene);

let state = createSelectionState();
let selectionUI = createSelectionUI(scene);
let gamePhase: 'selecting' | 'playing' = 'selecting';

// Hide gameplay HUD and player meshes during selection
setHudVisible(hud, false);
setPlayerMeshesVisible(playerMeshes[0], false);
setPlayerMeshesVisible(playerMeshes[1], false);

function startGame(p1Ability: AbilityType, p2Ability: AbilityType): void {
  state = createInitialState(p1Ability, p2Ability);
  gamePhase = 'playing';
  destroySelectionUI(selectionUI);
  setHudVisible(hud, true);
  setPlayerMeshesVisible(playerMeshes[0], true);
  setPlayerMeshesVisible(playerMeshes[1], true);
}

function goToSelection(): void {
  state = createSelectionState();
  gamePhase = 'selecting';
  selectionUI = createSelectionUI(scene);
  setHudVisible(hud, false);
  setPlayerMeshesVisible(playerMeshes[0], false);
  setPlayerMeshesVisible(playerMeshes[1], false);
}

engine.runRenderLoop(() => {
  const dt = engine.getDeltaTime() / 1000;
  pollGamepads();

  if (gamePhase === 'selecting') {
    const bothReady = updateSelection(selectionUI, state, dt);
    if (bothReady) {
      const p1Ability = state.selections[0]!;
      const p2Ability = state.selections[1]!;
      startGame(p1Ability, p2Ability);
    }

  } else {
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
        goToSelection();
      }
    } else {
      updateGame(state, p1Input, p2Input, dt);
    }

    updatePlayerMeshes(playerMeshes[0], state.players[0], 0);
    updatePlayerMeshes(playerMeshes[1], state.players[1], 1);
    updateHud(hud, state);
    updateEffects(effectsPool, state);
  }

  clearJustPressed();
  scene.render();
});

window.addEventListener('resize', () => engine.resize());
