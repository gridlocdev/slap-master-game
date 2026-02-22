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
import {
  createSelectionUI, updateSelection, destroySelectionUI,
  enterSelectionCamera, restoreGameplayCamera,
  setArenaMeshesVisible, updateSelectionMeshes,
  getHoveredAbilities,
} from './ui/selection.ts';
import { createCountdownUI, updateCountdown, destroyCountdown } from './ui/countdown.ts';
import type { CountdownUI } from './ui/countdown.ts';
import { P1_KEYS, P2_KEYS, RESTART_DELAY } from './constants.ts';
import { initDefaultAssignment, getP1GamepadIndex, getP2GamepadIndex } from './ui/inputAssign.ts';
import type { AbilityType } from './types.ts';
import type { Vector3 } from '@babylonjs/core';

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
const { engine, scene, camera } = createScene(canvas);

createArenaMeshes(scene);

const playerMeshes = [
  createPlayerMeshes(scene, 0),
  createPlayerMeshes(scene, 1),
] as const;

const hud = createHud(scene);
const effectsPool = createEffectsPool(scene);

initDefaultAssignment();
let state = createSelectionState();
let selectionUI = createSelectionUI(scene);
let gamePhase: 'selecting' | 'countdown' | 'playing' = 'selecting';
let savedCamera: { pos: Vector3; target: Vector3 } | null = null;
let scoreApplied = false; // track whether we've already credited the round win
let countdownUI: CountdownUI | null = null;

// Enter selection mode
setHudVisible(hud, false);
setArenaMeshesVisible(scene, false);
savedCamera = enterSelectionCamera(camera);
setPlayerMeshesVisible(playerMeshes[0], true);
setPlayerMeshesVisible(playerMeshes[1], true);

function startGame(p1Ability: AbilityType, p2Ability: AbilityType, scores: [number, number] = [0, 0]): void {
  state = createInitialState(p1Ability, p2Ability, scores);
  scoreApplied = false;
  gamePhase = 'countdown';
  countdownUI = createCountdownUI(scene);
  destroySelectionUI(selectionUI);
  setHudVisible(hud, false);
  setArenaMeshesVisible(scene, true);
  if (savedCamera) {
    restoreGameplayCamera(camera, savedCamera);
    savedCamera = null;
  }
}

function startNextRound(): void {
  const p1Ability = state.players[0].ability;
  const p2Ability = state.players[1].ability;
  const scores = state.scores;
  state = createInitialState(p1Ability, p2Ability, scores);
  scoreApplied = false;
  gamePhase = 'countdown';
  countdownUI = createCountdownUI(scene);
  setHudVisible(hud, false);
}

function goToSelection(): void {
  state = createSelectionState();
  gamePhase = 'selecting';
  selectionUI = createSelectionUI(scene);
  setHudVisible(hud, false);
  setArenaMeshesVisible(scene, false);
  savedCamera = enterSelectionCamera(camera);
  setPlayerMeshesVisible(playerMeshes[0], true);
  setPlayerMeshesVisible(playerMeshes[1], true);
}

engine.runRenderLoop(() => {
  const dt = engine.getDeltaTime() / 1000;
  pollGamepads();

  if (gamePhase === 'selecting') {
    const bothReady = updateSelection(selectionUI, state);
    updateSelectionMeshes(playerMeshes, dt, getHoveredAbilities(selectionUI));
    if (bothReady) {
      const p1Ability = state.selections[0]!;
      const p2Ability = state.selections[1]!;
      startGame(p1Ability, p2Ability);
    }

  } else if (gamePhase === 'countdown') {
    if (countdownUI && updateCountdown(countdownUI, dt)) {
      destroyCountdown(countdownUI);
      countdownUI = null;
      gamePhase = 'playing';
      setHudVisible(hud, true);
    }
    // Show players in their starting positions during countdown
    updatePlayerMeshes(playerMeshes[0], state.players[0], 0, dt);
    updatePlayerMeshes(playerMeshes[1], state.players[1], 1, dt);

  } else {
    // Keyboard input
    let p1Input = readInput(P1_KEYS);
    let p2Input = readInput(P2_KEYS);

    // Merge gamepad input (use assigned pad indices)
    const p1Pad = getP1GamepadIndex();
    const p2Pad = getP2GamepadIndex();
    const gp1 = p1Pad !== null ? readGamepadInput(p1Pad) : null;
    const gp2 = p2Pad !== null ? readGamepadInput(p2Pad) : null;
    if (gp1) p1Input = mergeInput(p1Input, gp1);
    if (gp2) p2Input = mergeInput(p2Input, gp2);

    if (state.winner !== null) {
      // Credit round win once
      if (!scoreApplied) {
        state.scores[state.winner]++;
        scoreApplied = true;
      }

      state.restartTimer += dt;
      const canRestart = state.restartTimer > RESTART_DELAY;
      const restartPressed = isKeyJustPressed('Space')
        || (p1Pad !== null && isGamepadRestart(p1Pad))
        || (p2Pad !== null && isGamepadRestart(p2Pad));

      if (canRestart && restartPressed) {
        const setWon = state.scores[state.winner] >= state.roundsToWin;
        if (setWon) {
          goToSelection();
        } else {
          startNextRound();
        }
      }
    } else {
      updateGame(state, p1Input, p2Input, dt);
    }

    updatePlayerMeshes(playerMeshes[0], state.players[0], 0, dt);
    updatePlayerMeshes(playerMeshes[1], state.players[1], 1, dt);
    updateHud(hud, state, dt);
    updateEffects(effectsPool, state);
  }

  clearJustPressed();
  scene.render();
});

window.addEventListener('resize', () => engine.resize());
