# Getting started

You can play Slap Master online, run it from source, or serve it from a Docker container.

## What you need

- A desktop browser with WebGL. There are no touch controls.
- For two players: one keyboard that both of you share, a gamepad each, or one of each. Playing against the computer needs only a keyboard or one gamepad.
- For running from source: [Node.js](https://nodejs.org) 20.19 or later and [pnpm](https://pnpm.io).

## Play online

Open [gridloc.dev/games/slap-master](https://gridloc.dev/games/slap-master). Nothing needs installing.

## Run it from source

From the project folder:

```bash
pnpm install   # install Babylon.js, TypeScript and Vite into node_modules
pnpm dev       # serve with hot reload on http://localhost:5173
```

Open the URL `pnpm dev` prints. To play the optimized build instead, run `pnpm build` and then `pnpm preview`.

## Run it in Docker

The `Dockerfile` builds the game and serves it with BusyBox `httpd` on port 8080:

```bash
docker build -t slap-master .
docker run --rm -p 8080:8080 slap-master
```

Then open `http://localhost:8080`.

## First run

The game opens on the main menu with **Local Multiplayer**, **vs AI**, **Controls** and **Settings**. The music starts when you first press a key or click, because browsers block sound until then.

By default, player 1 uses the left side of the keyboard and player 2 the right side. To play with gamepads, open **Settings** and set **P1 Input** and **P2 Input**, or press `Shift` (or `Select` on a gamepad) on the ability select screen. [Controls](controls.md) has the details.

Your volume, effect and input settings are saved in the browser's local storage, so they're still there next time.
