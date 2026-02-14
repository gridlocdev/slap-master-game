# Slap Master

local co op game

phaser JS

2d sprite-based art

players are floating heads with two large hands
always facing eachother regardless of wasd

goal of the game is to smack eachother
two ways to win a round:
1. get rid of all of your opponent's hearts
2. knock them off of the stage

split into 3 rounds: Best of 3 wins.

Player 1:
Movement:
- W - Forward
- S - Backward
- A - Left
- D - Right
Actions:
- Left Slap: Q
- Right Slap: E
- Both Hand Slap: Left Shift
- Special Ability: C

Player 2:
Movement:
- O - Forward
- l - Backward
- K - Left
- ; - Right
Actions:
- Left Slap: U
- Right Slap: P
- Both Hand Slap: Right Shift
- Special Ability: M

Left / Right movement moves perpendicularly to the direction of the opponent
Forward / Back movement moves directly towards or away from the opponent

If both hands are slapped together (should have a decently long startup time), and the opponent is in its hitbox, launch the opponent far away, deal no damage
If only one hand is swung, and the other player swings their same hand (i.e. both right hands come together similar to a handshake), then it makes a slapping noise and visual impact but no one is pushed.
if one player slaps the other player, push them slightly and they lose one of five hearts.

hitting opponent and doing a heart of damage should trigger brief invulnerability period

when starting the game, each player gets to choose one of three abilities

- Black Bean Burrito: Boost forward towards your opponent, leaving a green gassy translucent stink cloud behind you. 
- Literal Child: Become smaller and faster, but lose a corresponding amount of hitbox range on slaps
- Melon: Throw a melon directly in front of you. It has invulnerability for a brief period after launch, and is a physics object that is pushable by both players. Only when either player uses double slap, the melon is exploded and leaves a juice mark on the level.

Inspirations:
- Circle of Sumo
- Hand Shakers (i think that was its name, puzzle game where you shake hands)
- Wii Sports Boxing

#game-idea

---

Here's a scoped breakdown for each stage of **Slap Master**:

---

## **PROTOTYPE**

**Goal:** Prove the core slapping mechanic is fun

**Must Have:**

- Two player characters (simple circles or rectangles with hand indicators)
- Basic WASD/OKIL movement that works relative to opponent
- Single slap attack (just one hand to start)
- Basic knockback on hit
- Simple arena boundary (players can fall off)
- Placeholder collision detection

**Can Skip:**

- All art (colored shapes are fine)
- Hearts/health system (just test knockback)
- Round structure
- Abilities
- Double slap
- Hand collision/blocking
- UI beyond "you won/lost"

**Success Metric:** Does slapping feel satisfying? Is the spatial positioning gameplay interesting?

---

## **MVP**

**Goal:** Full core loop is playable and proves the game concept works

**Must Have:**

- Both players as floating heads with visible hands
- All basic slaps: left, right, double slap with different properties
- 5-heart health system
- Win conditions (knockout OR deplete hearts)
- Best of 3 round structure with round reset
- Hand-vs-hand collision (handshake blocking)
- Basic invulnerability frames after getting hit
- Simple stage with boundaries
- Win/loss screen with match results

**Can Skip:**

- Special abilities (save for Alpha)
- Polished sprites (simple but readable art)
- Multiple stages
- Menus/character select
- Sound effects
- Particle effects

**Success Metric:** Can two players have a complete, competitive match that's fun to replay?

---

## **ALPHA**

**Goal:** Feature-complete, all gameplay systems implemented

**Must Have:**

- All 3 special abilities functional (Black Bean Burrito, Literal Child, Melon)
- Ability selection screen at start
- Proper startup/recovery frames on all attacks
- Refined hitboxes and collision
- At least 2 different stages
- Basic SFX (slap sounds, impact, ability sounds)
- Simple particle effects (impact bursts, melon explosion, gas cloud)
- Pause menu
- Rematch option

**Can Have Placeholder:**

- Final art (can still be simple sprites, but more polished than MVP)
- UI polish
- Juice/screenshake

**Success Metric:** All features work, game is balanced enough for extended play sessions

---

## **BETA**

**Goal:** Content-complete, focus on polish and balance

**Must Have:**

- Final sprite art for characters, hands, abilities
- 3-4 polished stages with visual variety
- Full SFX suite (ambient sounds, UI sounds, victory fanfare)
- Polished UI (health display, round indicators, ability icons)
- Screenshake and game feel polish
- Balanced abilities and timing
- Tutorial or control display screen

**Polish Focus:**

- Animation smoothness
- Visual feedback clarity (when are you invulnerable? When can you act?)
- Ability telegraph/readability
- Stage hazard clarity if any added

**Success Metric:** Game feels good to play, no major bugs, ready for external testing

---

## **1.0 RELEASE**

**Goal:** Polished, complete experience ready for public

**Must Have:**

- Everything from Beta, fully polished
- Main menu with options
- Controller support (this is essential for local co-op)
- Credits screen
- Any bugs from Beta fixed
- Settings (volume controls minimum)
- Maybe 1-2 additional stages or cosmetic variants
- Clear tutorial/how-to-play
- Itch.io page with good screenshots/GIF

**Nice to Have:**

- Unlockable cosmetics (different head types, hand styles)
- Local tournament mode (multiple matches in a row)
- Stage hazards or interactive elements
- Replay last round feature

**Success Metric:** Game is shippable, feels complete, players can jump in and have fun immediately

---

## **Quick Timeline Suggestion:**

**Prototype:** just get slapping working  
**MVP:** full game loop  
**Alpha:** all features in  
**Beta:** polish pass  
**1.0:** final bug fixes and presentation

The key is resisting feature creep between stages. Prototype should feel rough but answer "is this fun?", MVP should be a complete (if ugly) game, and everything after is refinement.


---

To disable bluriness in Phaser, do the following:

you need to disable anti-aliasing and use nearest-neighbor scaling. In your Phaser config:

```js
const config = {
  type: Phaser.WEBGL,
  pixelArt: true, // this is the main one — sets nearest-neighbor filtering
  roundPixels: true, // snaps to whole pixels, prevents sub-pixel blurring
  // ...
};
```

`pixelArt: true` is the key setting. It tells Phaser to use `NEAREST` texture filtering instead of `LINEAR`, which is what causes that blurry upscaling.

If you're also scaling the canvas with CSS, make sure you add:

```css
canvas {
  image-rendering: pixelated;
}
```

That covers the browser-side scaling outside of WebGL.

#phaser #game-dev 
