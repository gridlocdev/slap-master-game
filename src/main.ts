import { createScene } from './scene.ts';
import { createArenaMeshes } from './objects/arena.ts';
import { createPlayerMeshes, updatePlayerMeshes, setPlayerMeshesVisible } from './objects/player.ts';
import { createHud, updateHud, setHudVisible } from './objects/hud.ts';
import { createEffectsPool, updateEffects } from './objects/effects.ts';
import {
  readInput, clearJustPressed, isKeyJustPressed,
  pollGamepads, readGamepadInput, isGamepadRestart, mergeInput,
  isGamepadStartJustPressed,
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
import { createMainMenuUI, updateMainMenu, destroyMainMenu } from './ui/mainMenu.ts';
import type { MainMenuUI } from './ui/mainMenu.ts';
import { createPauseMenuUI, updatePauseMenu, destroyPauseMenu } from './ui/pauseMenu.ts';
import type { PauseMenuUI } from './ui/pauseMenu.ts';
import { createControlsMenu, updateControlsMenu, destroyControlsMenu } from './ui/controlsMenu.ts';
import type { ControlsMenuUI } from './ui/controlsMenu.ts';
import { createDifficultyMenu, updateDifficultyMenu, destroyDifficultyMenu } from './ui/difficultyMenu.ts';
import type { DifficultyMenuUI } from './ui/difficultyMenu.ts';
import { P1_KEYS, P2_KEYS, RESTART_DELAY } from './constants.ts';
import { initDefaultAssignment, getP1GamepadIndex, getP2GamepadIndex } from './ui/inputAssign.ts';
import type { AbilityType, AIDifficulty, GameMode } from './types.ts';
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
let selectionUI: ReturnType<typeof createSelectionUI> | null = null;
let mainMenuUI: MainMenuUI | null = createMainMenuUI(scene);
let gamePhase: 'menu' | 'selecting' | 'countdown' | 'playing' = 'menu';
let savedCamera: { pos: Vector3; target: Vector3 } | null = null;
let scoreApplied = false; // track whether we've already credited the round win
let countdownUI: CountdownUI | null = null;
let isPaused = false;
let pauseMenuUI: PauseMenuUI | null = null;
let controlsUI: ControlsMenuUI | null = null;
let difficultyUI: DifficultyMenuUI | null = null;
let gameMode: GameMode = 'local';
// Stored for future AI gameplay logic
// @ts-expect-error written but not yet read — used once AI gameplay is implemented
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let aiDifficulty: AIDifficulty = 'medium';

// Enter menu mode
setHudVisible(hud, false);
setArenaMeshesVisible(scene, false);
savedCamera = enterSelectionCamera(camera);
setPlayerMeshesVisible(playerMeshes[0], false);
setPlayerMeshesVisible(playerMeshes[1], false);

function startGame(p1Ability: AbilityType, p2Ability: AbilityType, scores: [number, number] = [0, 0]): void {
  state = createInitialState(p1Ability, p2Ability, scores);
  scoreApplied = false;
  gamePhase = 'countdown';
  countdownUI = createCountdownUI(scene);
  if (selectionUI) {
    destroySelectionUI(selectionUI);
    selectionUI = null;
  }
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

function checkPauseToggle(): boolean {
  const p1Pad = getP1GamepadIndex();
  const p2Pad = getP2GamepadIndex();
  return isKeyJustPressed('Escape')
    || (p1Pad !== null && isGamepadStartJustPressed(p1Pad))
    || (p2Pad !== null && isGamepadStartJustPressed(p2Pad));
}

function resumeGame(): void {
  if (controlsUI) {
    destroyControlsMenu(controlsUI);
    controlsUI = null;
  }
  if (pauseMenuUI) {
    destroyPauseMenu(pauseMenuUI);
    pauseMenuUI = null;
  }
  isPaused = false;
}

function handlePauseAction(action: string | null): void {
  if (action === 'resume') {
    resumeGame();
  } else if (action === 'select') {
    resumeGame();
    goToSelection();
  } else if (action === 'menu') {
    resumeGame();
    goToMenu();
  } else if (action === 'controls') {
    controlsUI = createControlsMenu(scene);
  }
}

function goToSelection(): void {
  state = createSelectionState();
  gamePhase = 'selecting';
  selectionUI = createSelectionUI(scene, { mode: gameMode });
  if (countdownUI) {
    destroyCountdown(countdownUI);
    countdownUI = null;
  }
  setHudVisible(hud, false);
  setArenaMeshesVisible(scene, false);
  if (!savedCamera) {
    savedCamera = enterSelectionCamera(camera);
  }
  setPlayerMeshesVisible(playerMeshes[0], true);
  setPlayerMeshesVisible(playerMeshes[1], true);
}

function goToMenu(): void {
  state = createSelectionState();
  gamePhase = 'menu';
  mainMenuUI = createMainMenuUI(scene);
  if (countdownUI) {
    destroyCountdown(countdownUI);
    countdownUI = null;
  }
  setHudVisible(hud, false);
  setArenaMeshesVisible(scene, false);
  if (!savedCamera) {
    savedCamera = enterSelectionCamera(camera);
  }
  setPlayerMeshesVisible(playerMeshes[0], false);
  setPlayerMeshesVisible(playerMeshes[1], false);
}

engine.runRenderLoop(() => {
  const dt = engine.getDeltaTime() / 1000;
  pollGamepads();

  if (gamePhase === 'menu') {
    if (controlsUI) {
      if (updateControlsMenu(controlsUI)) {
        destroyControlsMenu(controlsUI);
        controlsUI = null;
      }
    } else if (difficultyUI) {
      const result = updateDifficultyMenu(difficultyUI);
      if (result === 'back') {
        destroyDifficultyMenu(difficultyUI);
        difficultyUI = null;
        mainMenuUI = createMainMenuUI(scene);
      } else if (result !== null) {
        aiDifficulty = result;
        gameMode = 'ai';
        destroyDifficultyMenu(difficultyUI);
        difficultyUI = null;
        gamePhase = 'selecting';
        selectionUI = createSelectionUI(scene, { mode: 'ai' });
        setPlayerMeshesVisible(playerMeshes[0], true);
        setPlayerMeshesVisible(playerMeshes[1], true);
      }
    } else if (mainMenuUI) {
      const action = updateMainMenu(mainMenuUI);
      if (action === 'local') {
        gameMode = 'local';
        destroyMainMenu(mainMenuUI);
        mainMenuUI = null;
        gamePhase = 'selecting';
        selectionUI = createSelectionUI(scene, { mode: 'local' });
        setPlayerMeshesVisible(playerMeshes[0], true);
        setPlayerMeshesVisible(playerMeshes[1], true);
      } else if (action === 'ai') {
        destroyMainMenu(mainMenuUI);
        mainMenuUI = null;
        difficultyUI = createDifficultyMenu(scene);
      } else if (action === 'controls') {
        controlsUI = createControlsMenu(scene);
      }
    }

  } else if (gamePhase === 'selecting') {
    const result = updateSelection(selectionUI!, state);
    updateSelectionMeshes(playerMeshes, dt, getHoveredAbilities(selectionUI!));
    if (result === 'ready') {
      const p1Ability = state.selections[0]!;
      const p2Ability = state.selections[1]!;
      startGame(p1Ability, p2Ability);
    } else if (result === 'back') {
      destroySelectionUI(selectionUI!);
      selectionUI = null;
      goToMenu();
    }

  } else if (gamePhase === 'countdown') {
    // Pause toggle (skip if controls overlay is active)
    if (!controlsUI && checkPauseToggle()) {
      if (isPaused) {
        resumeGame();
      } else {
        isPaused = true;
        pauseMenuUI = createPauseMenuUI(scene);
      }
    }

    if (isPaused) {
      if (controlsUI) {
        if (updateControlsMenu(controlsUI)) {
          destroyControlsMenu(controlsUI);
          controlsUI = null;
        }
      } else if (pauseMenuUI) {
        handlePauseAction(updatePauseMenu(pauseMenuUI));
      }
    } else {
      if (countdownUI && updateCountdown(countdownUI, dt)) {
        destroyCountdown(countdownUI);
        countdownUI = null;
        gamePhase = 'playing';
        setHudVisible(hud, true);
      }

      // Read input (same as playing phase)
      let p1Input = readInput(P1_KEYS);
      let p2Input = readInput(P2_KEYS);
      const p1Pad = getP1GamepadIndex();
      const p2Pad = getP2GamepadIndex();
      const gp1 = p1Pad !== null ? readGamepadInput(p1Pad) : null;
      const gp2 = p2Pad !== null ? readGamepadInput(p2Pad) : null;
      if (gp1) p1Input = mergeInput(p1Input, gp1);
      if (gp2) p2Input = mergeInput(p2Input, gp2);

      // During countdown: only slapping allowed (no movement, no abilities)
      p1Input.forward = p1Input.back = p1Input.left = p1Input.right = p1Input.ability = false;
      p2Input.forward = p2Input.back = p2Input.left = p2Input.right = p2Input.ability = false;

      // Run game logic (movement, slapping, knockback — everything except abilities)
      updateGame(state, p1Input, p2Input, dt);

      updatePlayerMeshes(playerMeshes[0], state.players[0], 0, dt);
      updatePlayerMeshes(playerMeshes[1], state.players[1], 1, dt);
      updateEffects(effectsPool, state);
    }

  } else {
    // Pause toggle (only when no winner, skip if controls overlay is active)
    if (!controlsUI && state.winner === null && checkPauseToggle()) {
      if (isPaused) {
        resumeGame();
      } else {
        isPaused = true;
        pauseMenuUI = createPauseMenuUI(scene);
      }
    }

    if (isPaused) {
      if (controlsUI) {
        if (updateControlsMenu(controlsUI)) {
          destroyControlsMenu(controlsUI);
          controlsUI = null;
        }
      } else if (pauseMenuUI) {
        handlePauseAction(updatePauseMenu(pauseMenuUI));
      }
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
            goToMenu();
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
  }

  clearJustPressed();
  scene.render();
});

window.addEventListener('resize', () => engine.resize());
