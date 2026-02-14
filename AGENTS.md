## Development Mode

- Use composition over inheritance for game objects
- Keep game state in plain objects, separate from Phaser classes
- One scene per distinct game screen (menu, gameplay, gameover)
- Extract magic numbers into named constants at file top
- Small, pure functions for game logic; Phaser methods only for rendering/input
- Avoid deep nesting; early return from functions
- TypeScript strict mode enabled
- No `any` types; use interfaces for game entities
- Keep update loops simple; delegate complex logic to separate functions

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.
