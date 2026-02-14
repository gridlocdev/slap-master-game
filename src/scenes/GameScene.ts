import Phaser from 'phaser';
import type { GameState, PlayerInput } from '../types.ts';
import { P1_KEYS, P2_KEYS, RESTART_DELAY_FRAMES } from '../constants.ts';
import { createInitialState, computeHandOffsets } from '../state/gameState.ts';
import { computeFacingAngle, applyMovement, applyVelocity } from '../logic/movement.ts';
import { handleSlapInput, updateHandState, checkSlapHit, applyKnockback } from '../logic/combat.ts';
import { isOutOfBounds } from '../logic/arena.ts';
import { drawPlayer } from '../objects/player.ts';
import { drawArena } from '../objects/arena.ts';
import { createHud, updateHud } from '../objects/hud.ts';
import type { HudElements } from '../objects/hud.ts';

type KeyMap = Record<string, Phaser.Input.Keyboard.Key>;

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private gfx!: Phaser.GameObjects.Graphics;
  private hud!: HudElements;
  private p1Keys!: KeyMap;
  private p2Keys!: KeyMap;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('Game');
  }

  create(): void {
    this.state = createInitialState();
    this.gfx = this.add.graphics();
    this.hud = createHud(this);

    const kb = this.input.keyboard!;
    this.p1Keys = kb.addKeys(P1_KEYS) as KeyMap;
    this.p2Keys = kb.addKeys(P2_KEYS) as KeyMap;
    this.spaceKey = kb.addKey('SPACE');
  }

  update(): void {
    const state = this.state;

    // Handle restart
    if (state.winner !== null) {
      state.restartTimer++;
      if (state.restartTimer > RESTART_DELAY_FRAMES && this.spaceKey.isDown) {
        this.state = createInitialState();
        updateHud(this.hud, this.state);
      }
      this.redraw();
      return;
    }

    // 1. Read input
    const p1Input = this.readInput(this.p1Keys);
    const p2Input = this.readInput(this.p2Keys);

    // 2. Update hand state machines
    for (const player of state.players) {
      for (const hand of player.hands) {
        updateHandState(hand);
      }
    }

    // 3. Handle slap input
    handleSlapInput(state.players[0], p1Input);
    handleSlapInput(state.players[1], p2Input);

    // 4. Compute facing angles
    state.players[0].facingAngle = computeFacingAngle(state.players[0], state.players[1]);
    state.players[1].facingAngle = computeFacingAngle(state.players[1], state.players[0]);

    // 5. Compute hand offsets based on facing
    computeHandOffsets(state.players[0]);
    computeHandOffsets(state.players[1]);

    // 6. Apply movement
    applyMovement(state.players[0], p1Input);
    applyMovement(state.players[1], p2Input);
    applyVelocity(state.players[0]);
    applyVelocity(state.players[1]);

    // 7. Check slap hits
    if (checkSlapHit(state.players[0], state.players[1])) {
      applyKnockback(state.players[0], state.players[1]);
    }
    if (checkSlapHit(state.players[1], state.players[0])) {
      applyKnockback(state.players[1], state.players[0]);
    }

    // 8. Check arena bounds
    for (let i = 0; i < 2; i++) {
      if (isOutOfBounds(state.players[i], state.arenaRect)) {
        state.players[i].isAlive = false;
        state.winner = i === 0 ? 1 : 0;
        state.restartTimer = 0;
      }
    }

    // 9. Redraw
    this.redraw();
  }

  private readInput(keys: KeyMap): PlayerInput {
    return {
      forward: keys['forward'].isDown,
      back: keys['back'].isDown,
      left: keys['left'].isDown,
      right: keys['right'].isDown,
      slapLeft: Phaser.Input.Keyboard.JustDown(keys['slapLeft']),
      slapRight: Phaser.Input.Keyboard.JustDown(keys['slapRight']),
    };
  }

  private redraw(): void {
    const state = this.state;
    this.gfx.clear();

    drawArena(this.gfx, state.arenaRect);
    drawPlayer(this.gfx, state.players[0], 0);
    drawPlayer(this.gfx, state.players[1], 1);
    updateHud(this.hud, state);
  }
}
