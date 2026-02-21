import {
  Engine,
  Scene,
  FreeCamera,
  Vector3,
  Color4,
  HemisphericLight,
} from '@babylonjs/core';
import { SCENE_BG_COLOR, CAMERA_POS, CAMERA_TARGET, LIGHT_INTENSITY } from './constants.ts';

export interface SceneResult {
  engine: Engine;
  scene: Scene;
  camera: FreeCamera;
}

export function createScene(canvas: HTMLCanvasElement): SceneResult {
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(...SCENE_BG_COLOR);

  const camera = new FreeCamera('camera', new Vector3(...CAMERA_POS), scene);
  camera.setTarget(new Vector3(...CAMERA_TARGET));
  camera.inputs.clear();

  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
  light.intensity = LIGHT_INTENSITY;

  return { engine, scene, camera };
}
