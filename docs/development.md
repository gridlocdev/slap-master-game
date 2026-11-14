# Development

Slap Master is written in TypeScript on [Babylon.js](https://www.babylonjs.com), and [Vite](https://vite.dev) serves and bundles it. The rules in `AGENTS.md` at the repository root apply to everyone working on it.

## Getting set up

You need [Node.js](https://nodejs.org) 20.19 or later and [pnpm](https://pnpm.io). Use pnpm for every package task.

```bash
pnpm install   # install Babylon.js, TypeScript and Vite into node_modules
pnpm dev       # serve with hot reload on http://localhost:5173
pnpm build     # type-check with tsc, then bundle into dist/
pnpm preview   # serve the dist/ build
```

There is no `justfile`. `dist/` is ignored by git. The repository also has a `package-lock.json` from npm, but `pnpm-lock.yaml` is the one the `Dockerfile` installs from.

## Checking your work

The project has no test suite and no separate check script. Run the type checker after every change:

```bash
pnpm exec tsc   # type-check src/ without writing files (tsconfig.json sets noEmit)
pnpm build      # the same type check, then a production bundle
```

## Layout

```
index.html              # The page: a full-window canvas that loads src/main.ts.
src/
├── main.ts             # Creates the scene and objects, then runs the render loop and switches between menu, ability select, countdown and play.
├── game.ts             # One step of a match: movement, slaps, abilities, ring-outs.
├── types.ts            # GameState, PlayerState, PlayerInput and the other shared types.
├── constants.ts        # Speeds, sizes, timings, colours and key maps.
├── input.ts            # Keyboard and gamepad state, with "just pressed" tracking.
├── settings.ts         # Volumes, effect toggles and input choices, saved to localStorage.
├── audio.ts            # Music and sound effects through the Web Audio API.
├── scene.ts            # The Babylon engine, scene and camera.
├── state/gameState.ts  # A new match or round as a plain object.
├── logic/              # Pure game rules: movement, combat, abilities, arena bounds.
├── ai/                 # The computer opponent: difficulty settings and its controller.
├── objects/            # Babylon meshes and effects: arena, players, HUD, hit effects.
└── ui/                 # Menus, ability select, countdown, input setup and button icons.
public/
├── audio/              # Music (bgm/) and sound effects (sfx/).
├── icons/              # The favicon.
├── kenney-input-prompts/  # Keyboard and Xbox button icons.
└── screenshots/        # A gameplay screenshot.
Dockerfile              # Builds the game and serves dist/ on port 8080.
```

## Deploying

`vite.config.js` sets `base: './'`, and the button icons load from `import.meta.env.BASE_URL`, so the game works from a subfolder such as `/games/slap-master`. Upload the contents of `dist/` after `pnpm build`, or build and run the Docker image:

```bash
docker build -t slap-master .
docker run --rm -p 8080:8080 slap-master
```
