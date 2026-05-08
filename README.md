# Patches

A clean, mobile-first clone of LinkedIn's **Patches** puzzle, built with Expo + React Native.

Tile a 6×6 grid by drawing rectangles. Each rectangle must contain exactly one clue chip, match its size, and match its shape constraint (square / wide / tall / any). Solve until every cell is covered, with no overlaps and no gaps.

---

## Features

- **Procedural puzzles** — every game is freshly generated and verified to have a unique solution.
- **Three difficulties** — Easy / Medium / Hard, each with its own area-weight profile and "any-shape" probability.
- **Smooth drag-to-draw** — gesture-handler + Reanimated worklets, with live valid/invalid color feedback and haptics.
- **Tap to fix** — tap a placed patch to remove it.
- **Wrong-patch indicator** — patches that don't match the unique solution show diagonal dotted stripes.
- **Hint, Check, Undo, Reset** controls.
- **Resume in progress** — backgrounding the app or going Home preserves your puzzle. Pick up where you left off from the Home screen.
- **Stats** — per-difficulty solved count, best/avg time, current and best streak — all persisted to AsyncStorage.
- **Share results** — LinkedIn-style text format (`Patches #52 | 0:46 🧶 / With 3 redraws / 🏅 …-win streak!`).
- **Branded splash + About** screens.
- **Light + dark mode**, soft pastel patch palette, subtle grid lines, confetti on solve.

---

## Tech stack

- **Expo SDK 54** with React Native 0.81 and the new architecture
- **TypeScript** in strict mode
- **expo-router** for file-based routing
- **react-native-gesture-handler 2.28** + **react-native-reanimated 4** for drag tracking
- **react-native-svg** for the diagonal-stripe overlay
- **AsyncStorage** for stats and saved-game persistence
- **expo-haptics** for tactile feedback

---

## Quick start

```bash
npm install
npx expo start
```

Open the project with the Expo Go app, an iOS Simulator, or an Android emulator. The default `npm run` scripts are unchanged from `create-expo-app` (`start`, `ios`, `android`, `web`, `lint`).

---

## Project layout

```
game/                          pure logic — no React imports
  types.ts                     Clue, Rect, Patch, Puzzle, ShapeType + helpers
  random.ts                    seeded mulberry32 PRNG (for future daily puzzles)
  generator.ts                 backtracking tiler + per-difficulty area weights
  solver.ts                    backtracking solver — used to verify uniqueness
  validator.ts                 placement check, mistake-finder, hint
  colors.ts                    patch palette + game theme tokens
  storage.ts                   saved-game snapshot persistence
  share.ts                     builds the share-text string

hooks/
  useGameState.ts              reducer-based game state (place / remove / undo / reset / newPuzzle)
  useStats.ts                  per-difficulty stats + puzzle-number counter
  useSavedGame.ts              focus-aware hook for the Home screen

components/
  PatchesLogo.tsx              animated mini-board used as the brand mark
  BrandedSplash.tsx            in-app splash overlay
  game/
    Board.tsx                  the interactive board (drag, tap, layered render)
    ClueChip.tsx               shape-shaped colored chip with number
    Legend.tsx                 shape legend shown under the board
    StripedOverlay.tsx         SVG diagonal-dot pattern for wrong patches
    ControlsBar.tsx            Undo / Hint / Check / Reset
    Confetti.tsx               Reanimated confetti pieces
    WinScreen.tsx              modal with stats, streak, share, next

app/                           expo-router routes
  _layout.tsx                  Stack root + GestureHandlerRootView + branded splash
  game.tsx                     bootstrap (load saved game) → GameView
  about.tsx                    about / how-to-play modal
  (tabs)/
    _layout.tsx                Home + Stats tabs
    index.tsx                  Home (logo, difficulty, stats, Play / Continue)
    explore.tsx                Stats screen
```

---

## How to play

1. **Drag** across empty cells to draw a rectangle. The preview turns green when valid, red when not.
2. The rectangle must contain **exactly one chip**, match the chip's **number** (its area), and match the chip's **shape**:
   - **Square** — width = height
   - **Wide** — width > height
   - **Tall** — height > width
   - **Any** — no shape constraint
3. **Tap** a placed patch to remove it.
4. Wrong placements show **diagonal dotted stripes**. Solved chips disappear so the finished board reads as pure color.
5. Tile the entire grid to win.

---

## How puzzles are generated

`game/generator.ts` performs a backtracking tile of the grid into rectangles:

1. Find the first empty cell in row-major order.
2. Enumerate rectangles starting at that cell whose area is in the difficulty's allowed set, weighted by the difficulty profile.
3. Pick one (weighted random), place it, recurse.
4. On dead end, backtrack.

Once tiled, each rectangle gets a clue at a random cell with shape = the rectangle's actual shape, optionally downgraded to `any` based on the difficulty's `anyChance`. The solver in `game/solver.ts` (also backtracking, pruned by "rectangle for clue *k* must cover the first empty cell") verifies the puzzle has exactly one solution. If not, the generator retries with different `any` choices, then with shapes locked, and finally with a different seed.

Empirically: 100 % unique-solution rate across all difficulties, ~0.1 ms per puzzle.

### Difficulty profiles

Areas per difficulty (weight in parens):

| Difficulty | Areas (weights) | `any` chance | Patches |
|---|---|---|---|
| Easy | 2(7) 3(5) 4(5) 5(1) 6(2) 8(1) 9(1) | 5 % | 7–11 |
| Medium | 2(4) 3(4) 4(5) 5(2) 6(4) 8(2) 9(2) | 20 % | 6–9 |
| Hard | 2(2) 3(3) 4(4) 5(2) 6(5) 8(3) 9(3) 12(1) | 45 % | 4–8 |

**Note:** area 7 is impossible on a 6×6 grid (7 is prime → only 1×7, which doesn't fit). Area 5 is included with a low weight; it's only achievable as a 1×5 strip.

---

## Saved-game persistence

The game writes a `SavedGame` snapshot to AsyncStorage on every state change (debounced 220 ms). The snapshot includes the puzzle, placed patches, moves, redraws, hints used, elapsed time, the puzzle number, and the difficulty.

- **Going back to Home does not abandon** — the snapshot stays on disk; Home shows a `Continue` button when a snapshot is present.
- **Resuming** back-dates `startedAt` by `elapsedMs` so the timer picks up where it stopped.
- **Winning** clears the snapshot.
- **New game while a snapshot exists** shows a confirm dialog; on accept it calls `recordAbandon` (streak → 0) and clears the snapshot.

---

## Notes on the rendering / gesture stack

- **Worklet hygiene** — `react-native-worklets` 0.5 (which Reanimated 4 uses) is strict: a worklet may only call other worklets, `runOnJS(...)`, primitives, `Math.*`, and shared-value accessors. Calling a non-worklet JS closure from a `'worklet'` body throws a JSI error and crashes Hermes (manifests as `SIGABRT` on iOS). The Pan gesture's `onBegin` / `onUpdate` therefore inline their `clamp` math instead of calling a closure.
- **Occupancy bitmap** — to let the worklet check whether a drag started on a filled cell, occupancy is mirrored into two `useSharedValue<number>` 32-bit bitmasks (cells 0–31 / 32–63). Array-typed shared values were unreliable on iOS + new arch.
- **Layering** — the `Board` renders bottom-up: grid lines → patch fills → hint highlight → clue chips → drag preview. Patches use `overflow: 'hidden'` so the SVG stripe overlay clips to the patch shape.

---

## Future work

The architecture has a few seams left intentionally for follow-ups:

- **Daily puzzles** — `generatePuzzle` already accepts a `seed`; the mulberry32 PRNG is deterministic.
- **Other grid sizes** — `size` is parameterized in the puzzle, generator, solver, and board. The shared-value occupancy bitmap covers up to 8×8 (64 cells).
- **Puzzle editor / curated levels** — `loadPuzzle` is exposed on `useGameState` for swapping in arbitrary puzzles.
- **Leaderboards** — stats are already serialized to JSON and ready to ship to a backend.
