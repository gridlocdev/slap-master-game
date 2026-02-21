import { Scene } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock } from '@babylonjs/gui';
import {
  COUNTDOWN_STEPS,
  COUNTDOWN_ZOOM_IN_TIME,
  COUNTDOWN_STEP_DURATION,
  COUNTDOWN_HOLD_TIME,
  COUNTDOWN_FONT_SIZE,
  COUNTDOWN_FINAL_FONT_SIZE,
  COUNTDOWN_TEXT_COLOR,
  COUNTDOWN_OUTLINE_COLOR,
  COUNTDOWN_OUTLINE_WIDTH,
  COUNTDOWN_START_SCALE,
  COUNTDOWN_ZOOM_RANGE,
  COUNTDOWN_GROW_RANGE,
} from '../constants.ts';

export interface CountdownUI {
  texture: AdvancedDynamicTexture;
  text: TextBlock;
  timer: number;
  step: number;
}

export function createCountdownUI(scene: Scene): CountdownUI {
  const texture = AdvancedDynamicTexture.CreateFullscreenUI('countdownUI', true, scene);

  const text = new TextBlock('countdownText', COUNTDOWN_STEPS[0]);
  text.fontSize = COUNTDOWN_FONT_SIZE;
  text.color = COUNTDOWN_TEXT_COLOR;
  text.fontFamily = 'monospace';
  text.fontWeight = 'bold';
  text.outlineWidth = COUNTDOWN_OUTLINE_WIDTH;
  text.outlineColor = COUNTDOWN_OUTLINE_COLOR;
  text.scaleX = COUNTDOWN_START_SCALE;
  text.scaleY = COUNTDOWN_START_SCALE;
  text.alpha = 1;
  texture.addControl(text);

  return { texture, text, timer: 0, step: 0 };
}

/** Returns true when the countdown is finished. */
export function updateCountdown(ui: CountdownUI, dt: number): boolean {
  ui.timer += dt;

  const isLastStep = ui.step === COUNTDOWN_STEPS.length - 1;
  const stepDur = isLastStep
    ? COUNTDOWN_STEP_DURATION + COUNTDOWN_HOLD_TIME
    : COUNTDOWN_STEP_DURATION;

  // Advance to next step
  if (ui.timer >= stepDur) {
    ui.step++;
    ui.timer = 0;
    if (ui.step >= COUNTDOWN_STEPS.length) {
      return true; // done
    }
    ui.text.text = COUNTDOWN_STEPS[ui.step];
    // Adjust font size for the final text so it fits
    ui.text.fontSize = ui.step === COUNTDOWN_STEPS.length - 1 ? COUNTDOWN_FINAL_FONT_SIZE : COUNTDOWN_FONT_SIZE;
  }

  // Animation phases within a step
  const t = ui.timer;

  if (t < COUNTDOWN_ZOOM_IN_TIME) {
    // Fast zoom in: START_SCALE → 1 with ease-out
    const p = t / COUNTDOWN_ZOOM_IN_TIME;
    const eased = 1 - (1 - p) * (1 - p); // ease-out quad
    const scale = COUNTDOWN_START_SCALE + eased * COUNTDOWN_ZOOM_RANGE;
    ui.text.scaleX = scale;
    ui.text.scaleY = scale;
    ui.text.alpha = 1;
  } else {
    // Slow grow away: 1 → 1 + GROW_RANGE with fade
    const backOffDur = stepDur - COUNTDOWN_ZOOM_IN_TIME;
    const p = Math.min((t - COUNTDOWN_ZOOM_IN_TIME) / backOffDur, 1);
    const eased = p * p; // ease-in quad (starts slow, accelerates)
    const scale = 1 + eased * COUNTDOWN_GROW_RANGE;
    ui.text.scaleX = scale;
    ui.text.scaleY = scale;
    // Fade out in the last 40% of the grow
    ui.text.alpha = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
  }

  return false;
}

export function destroyCountdown(ui: CountdownUI): void {
  ui.texture.dispose();
}
