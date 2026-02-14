import {
  Engine,
  Scene,
  FreeCamera,
  Vector3,
  Color4,
  HemisphericLight,
} from '@babylonjs/core';

export interface SceneResult {
  engine: Engine;
  scene: Scene;
  camera: FreeCamera;
}

export function createScene(canvas: HTMLCanvasElement): SceneResult {
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.1, 0.1, 0.18, 1);

  const camera = new FreeCamera('camera', new Vector3(0, 14, -10), scene);
  camera.setTarget(new Vector3(0, 0, 1));
  camera.inputs.clear();

  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
  light.intensity = 0.7;

  return { engine, scene, camera };
}
