import {
  Engine,
  Scene,
  FreeCamera,
  Vector3,
  Color4,
  HemisphericLight,
} from '@babylonjs/core';
import { createArenaMeshes } from '../objects/arena.ts';
import { createPlayerMeshes, updatePlayerMeshes } from '../objects/player.ts';
import type { PlayerMeshes } from '../objects/player.ts';
import { createEffectsPool, updateEffects } from '../objects/effects.ts';
import type { EffectsPool } from '../objects/effects.ts';
import { createInitialState } from '../state/gameState.ts';
import { updateGame } from '../game.ts';
import { createAIState, updateAI } from '../ai/aiController.ts';
import type { AIState } from '../ai/aiConfig.ts';
import type { GameState, AbilityType } from '../types.ts';
import { SCENE_BG_COLOR, LIGHT_INTENSITY } from '../constants.ts';

const ORBIT_SPEED = (2 * Math.PI) / 45;
const ORBIT_RADIUS = 12;
const ORBIT_HEIGHT = 14;
const RESPAWN_DELAY = 1.5;

const DEMO_ABILITIES: AbilityType[] = ['burrito', 'melon'];

function randomAbility(): AbilityType {
  return DEMO_ABILITIES[Math.floor(Math.random() * DEMO_ABILITIES.length)];
}

export interface DemoScene {
  scene: Scene;
  camera: FreeCamera;
  playerMeshes: [PlayerMeshes, PlayerMeshes];
  effectsPool: EffectsPool;
  state: GameState;
  ai1: AIState;
  ai2: AIState;
  orbitAngle: number;
  respawnTimer: number;
}

export function createDemoScene(engine: Engine): DemoScene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(...SCENE_BG_COLOR);

  const camera = new FreeCamera('demoCamera', new Vector3(ORBIT_RADIUS, ORBIT_HEIGHT, 0), scene);
  camera.setTarget(Vector3.Zero());
  camera.inputs.clear();

  const light = new HemisphericLight('demoLight', new Vector3(0, 1, 0), scene);
  light.intensity = LIGHT_INTENSITY;

  createArenaMeshes(scene);

  const playerMeshes: [PlayerMeshes, PlayerMeshes] = [
    createPlayerMeshes(scene, 0),
    createPlayerMeshes(scene, 1),
  ];

  const effectsPool = createEffectsPool(scene);

  const p1Ability = randomAbility();
  const p2Ability = randomAbility();
  const state = createInitialState(p1Ability, p2Ability);

  return {
    scene,
    camera,
    playerMeshes,
    effectsPool,
    state,
    ai1: createAIState(),
    ai2: createAIState(),
    orbitAngle: 0,
    respawnTimer: 0,
  };
}

export function updateDemoScene(demo: DemoScene, dt: number): void {
  // Orbit camera
  demo.orbitAngle += ORBIT_SPEED * dt;
  demo.camera.position.set(
    Math.cos(demo.orbitAngle) * ORBIT_RADIUS,
    ORBIT_HEIGHT,
    Math.sin(demo.orbitAngle) * ORBIT_RADIUS,
  );
  demo.camera.setTarget(Vector3.Zero());

  const { state } = demo;

  // Handle respawn
  if (state.winner !== null) {
    demo.respawnTimer += dt;
    if (demo.respawnTimer >= RESPAWN_DELAY) {
      demo.state = createInitialState(randomAbility(), randomAbility());
      demo.ai1 = createAIState();
      demo.ai2 = createAIState();
      demo.respawnTimer = 0;
    }
    // Still update meshes during fall animation
    updatePlayerMeshes(demo.playerMeshes[0], state.players[0], 0, dt);
    updatePlayerMeshes(demo.playerMeshes[1], state.players[1], 1, dt);
    updateEffects(demo.effectsPool, state, dt);
    state.melonExplosionEvents.length = 0;
    return;
  }

  // P2 AI (normal — AI reads players[1])
  const p2Input = updateAI(state, demo.ai2, 'expert', dt);

  // P1 AI (flipped — AI reads flipped.players[1] which is actual P1)
  const flipped: GameState = {
    ...state,
    players: [state.players[1], state.players[0]],
    scores: [state.scores[1], state.scores[0]],
  };
  const p1Input = updateAI(flipped, demo.ai1, 'expert', dt);

  updateGame(state, p1Input, p2Input, dt);

  updatePlayerMeshes(demo.playerMeshes[0], state.players[0], 0, dt);
  updatePlayerMeshes(demo.playerMeshes[1], state.players[1], 1, dt);
  updateEffects(demo.effectsPool, state, dt);
  state.melonExplosionEvents.length = 0;
}

export function destroyDemoScene(demo: DemoScene): void {
  demo.scene.dispose();
}
