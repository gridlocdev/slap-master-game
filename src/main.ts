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
import { createSettingsMenu, updateSettingsMenu, destroySettingsMenu } from './ui/settingsMenu.ts';
import type { SettingsMenuUI } from './ui/settingsMenu.ts';
import { RESTART_DELAY, SPEED_LINE_THRESHOLD } from './constants.ts';
import { playAbilitySelectBGM, fadeOutAbilitySelectBGM, stopAbilitySelectBGM, playMenuBackSfx, playMainMenuBGM, fadeOutMainMenuBGM } from './audio.ts';
import { initDefaultAssignment } from './ui/inputAssign.ts';
import { createAIState, updateAI } from './ai/aiController.ts';
import type { AIState } from './ai/aiConfig.ts';
import {
  loadSettings, hasSavedSettings, applySettingsToInputAssign,
  getP1KeyMap, getP2KeyMap, getP1PadIndex, getP2PadIndex,
} from './settings.ts';
import type { AbilityType, AIDifficulty, GameMode, PlayerInput } from './types.ts';
import type { Vector3 } from '@babylonjs/core';
import { createDemoScene, updateDemoScene, destroyDemoScene } from './ui/demoScene.ts';
import type { DemoScene } from './ui/demoScene.ts';
import {
  createImpactFx, updateImpactFx, processHitEvents,
  triggerRingOut, spawnSpeedLines, applyHitlagVibration, resetImpactFx,
} from './objects/impactFx.ts';

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
const { engine, scene, camera } = createScene(canvas);

createArenaMeshes(scene);

const playerMeshes = [
  createPlayerMeshes(scene, 0),
  createPlayerMeshes(scene, 1),
] as const;

const hud = createHud(scene);
const effectsPool = createEffectsPool(scene);
const impactFx = createImpactFx(scene);

loadSettings();
if (hasSavedSettings()) {
  applySettingsToInputAssign();
} else {
  initDefaultAssignment();
}
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
let settingsUI: SettingsMenuUI | null = null;
let gameMode: GameMode = 'local';
let aiDifficulty: AIDifficulty = 'medium';
let aiState: AIState | null = null;
let demoScene: DemoScene | null = null;

// Enter menu mode
setHudVisible(hud, false);
setArenaMeshesVisible(scene, false);
savedCamera = enterSelectionCamera(camera);
setPlayerMeshesVisible(playerMeshes[0], false);
setPlayerMeshesVisible(playerMeshes[1], false);
demoScene = createDemoScene(engine);
scene.autoClear = false;
playMainMenuBGM();

function startGame(p1Ability: AbilityType, p2Ability: AbilityType, scores: [number, number] = [0, 0]): void {
  state = createInitialState(p1Ability, p2Ability, scores);
  if (gameMode === 'ai') {
    aiState = createAIState();
  }
  scoreApplied = false;
  gamePhase = 'countdown';
  countdownUI = createCountdownUI(scene);
  fadeOutAbilitySelectBGM();
  if (selectionUI) {
    destroySelectionUI(selectionUI);
    selectionUI = null;
  }
  setHudVisible(hud, false);
  setArenaMeshesVisible(scene, true);
  resetImpactFx(impactFx, camera);
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
  if (gameMode === 'ai') {
    // Preserve adaptation data for Hard difficulty across rounds
    aiState = createAIState(aiState?.adaptation);
  }
  scoreApplied = false;
  gamePhase = 'countdown';
  countdownUI = createCountdownUI(scene);
  setHudVisible(hud, false);
  resetImpactFx(impactFx, camera);
}

function checkPauseToggle(): boolean {
  const p1Pad = getP1PadIndex();
  const p2Pad = getP2PadIndex();
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
  playAbilitySelectBGM();
  selectionUI = createSelectionUI(scene, { mode: gameMode });
  if (countdownUI) {
    destroyCountdown(countdownUI);
    countdownUI = null;
  }
  setHudVisible(hud, false);
  setArenaMeshesVisible(scene, false);
  updateEffects(effectsPool, state);
  resetImpactFx(impactFx, camera);
  if (!savedCamera) {
    savedCamera = enterSelectionCamera(camera);
  }
  setPlayerMeshesVisible(playerMeshes[0], true);
  setPlayerMeshesVisible(playerMeshes[1], true);
}

function stopDemo(): void {
  if (demoScene) {
    destroyDemoScene(demoScene);
    demoScene = null;
    scene.autoClear = true;
  }
}

function goToMenu(): void {
  stopAbilitySelectBGM();
  playMainMenuBGM();
  state = createSelectionState();
  gamePhase = 'menu';
  mainMenuUI = createMainMenuUI(scene);
  if (countdownUI) {
    destroyCountdown(countdownUI);
    countdownUI = null;
  }
  setHudVisible(hud, false);
  setArenaMeshesVisible(scene, false);
  updateEffects(effectsPool, state);
  resetImpactFx(impactFx, camera);
  if (!savedCamera) {
    savedCamera = enterSelectionCamera(camera);
  }
  setPlayerMeshesVisible(playerMeshes[0], false);
  setPlayerMeshesVisible(playerMeshes[1], false);
  demoScene = createDemoScene(engine);
  scene.autoClear = false;
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
    } else if (settingsUI) {
      const result = updateSettingsMenu(settingsUI);
      if (result === 'back') {
        destroySettingsMenu(settingsUI);
        settingsUI = null;
        mainMenuUI = createMainMenuUI(scene);
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
        stopDemo();
        fadeOutMainMenuBGM();
        gamePhase = 'selecting';
        playAbilitySelectBGM();
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
        stopDemo();
        fadeOutMainMenuBGM();
        gamePhase = 'selecting';
        playAbilitySelectBGM();
        selectionUI = createSelectionUI(scene, { mode: 'local' });
        setPlayerMeshesVisible(playerMeshes[0], true);
        setPlayerMeshesVisible(playerMeshes[1], true);
      } else if (action === 'ai') {
        destroyMainMenu(mainMenuUI);
        mainMenuUI = null;
        difficultyUI = createDifficultyMenu(scene);
      } else if (action === 'settings') {
        destroyMainMenu(mainMenuUI);
        mainMenuUI = null;
        settingsUI = createSettingsMenu(scene);
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
        playMenuBackSfx();
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
      const cdFx = updateImpactFx(impactFx, camera, dt);
      const cdGameDt = cdFx.freeze ? 0 : dt * cdFx.dtScale;

      if (countdownUI && updateCountdown(countdownUI, dt)) {
        destroyCountdown(countdownUI);
        countdownUI = null;
        gamePhase = 'playing';
        setHudVisible(hud, true, gameMode === 'ai');
      }

      // Read input (same as playing phase)
      const p1KeyMap = getP1KeyMap();
      let p1Input: PlayerInput = p1KeyMap ? readInput(p1KeyMap) : { forward: false, back: false, left: false, right: false, slapLeft: false, slapRight: false, ability: false };
      const p1Pad = getP1PadIndex();
      const gp1 = p1Pad !== null ? readGamepadInput(p1Pad) : null;
      if (gp1) p1Input = mergeInput(p1Input, gp1);

      let p2Input: PlayerInput;
      if (gameMode === 'ai' && aiState) {
        p2Input = updateAI(state, aiState, aiDifficulty, dt);
      } else {
        const p2KeyMap = getP2KeyMap();
        p2Input = p2KeyMap ? readInput(p2KeyMap) : { forward: false, back: false, left: false, right: false, slapLeft: false, slapRight: false, ability: false };
        const p2Pad = getP2PadIndex();
        const gp2 = p2Pad !== null ? readGamepadInput(p2Pad) : null;
        if (gp2) p2Input = mergeInput(p2Input, gp2);
      }

      // During countdown: only slapping allowed (no movement, no abilities)
      p1Input.forward = p1Input.back = p1Input.left = p1Input.right = p1Input.ability = false;
      p2Input.forward = p2Input.back = p2Input.left = p2Input.right = p2Input.ability = false;

      if (!cdFx.freeze) {
        updateGame(state, p1Input, p2Input, cdGameDt);
        processHitEvents(impactFx, state.hitEvents);
      }

      updatePlayerMeshes(playerMeshes[0], state.players[0], 0, dt);
      updatePlayerMeshes(playerMeshes[1], state.players[1], 1, dt);
      if (cdFx.freeze) applyHitlagVibration(playerMeshes, impactFx.hitlagTimer);
      updateEffects(effectsPool, state);
    }

  } else {
    // Pause toggle (only when no winner, skip if controls overlay is active)
    if (!controlsUI && state.winner === null && checkPauseToggle()) {
      if (isPaused) {
        playMenuBackSfx();
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
      // Impact effects: hitlag, shake, zoom, particles
      const fx = updateImpactFx(impactFx, camera, dt);
      const gameDt = fx.freeze ? 0 : dt * fx.dtScale;

      // Read input based on control scheme settings
      const p1KeyMap = getP1KeyMap();
      let p1Input: PlayerInput = p1KeyMap ? readInput(p1KeyMap) : { forward: false, back: false, left: false, right: false, slapLeft: false, slapRight: false, ability: false };
      const p1Pad = getP1PadIndex();
      const p2Pad = gameMode !== 'ai' ? getP2PadIndex() : null;
      const gp1 = p1Pad !== null ? readGamepadInput(p1Pad) : null;
      if (gp1) p1Input = mergeInput(p1Input, gp1);

      let p2Input: PlayerInput;
      if (gameMode === 'ai' && aiState) {
        p2Input = updateAI(state, aiState, aiDifficulty, dt);
      } else {
        const p2KeyMap = getP2KeyMap();
        p2Input = p2KeyMap ? readInput(p2KeyMap) : { forward: false, back: false, left: false, right: false, slapLeft: false, slapRight: false, ability: false };
        const gp2 = p2Pad !== null ? readGamepadInput(p2Pad) : null;
        if (gp2) p2Input = mergeInput(p2Input, gp2);
      }

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
      } else if (!fx.freeze) {
        // Save pre-update falling state for ring-out detection
        const wasFalling = [state.players[0].isFalling, state.players[1].isFalling];

        updateGame(state, p1Input, p2Input, gameDt);
        processHitEvents(impactFx, state.hitEvents);

        // Ring-out detection
        for (let i = 0; i < 2; i++) {
          if (state.players[i].isFalling && !wasFalling[i]) {
            triggerRingOut(impactFx, state.players[i].pos, i);
          }
        }

        // Speed lines for fast-moving players
        for (let i = 0; i < 2; i++) {
          const kv = state.players[i].knockbackVel;
          const speed = Math.sqrt(kv.x * kv.x + kv.y * kv.y);
          if (speed > SPEED_LINE_THRESHOLD) {
            spawnSpeedLines(impactFx, state.players[i].pos, kv);
          }
        }
      }

      if (gamePhase === 'playing') {
        updatePlayerMeshes(playerMeshes[0], state.players[0], 0, dt);
        updatePlayerMeshes(playerMeshes[1], state.players[1], 1, dt);
        if (fx.freeze) applyHitlagVibration(playerMeshes, impactFx.hitlagTimer);
        updateHud(hud, state, dt, gameMode === 'ai');
        updateEffects(effectsPool, state);
      }
    }
  }

  if (demoScene) {
    updateDemoScene(demoScene, dt);
    demoScene.scene.render();
  }

  clearJustPressed();
  scene.render();
});

window.addEventListener('resize', () => engine.resize());
