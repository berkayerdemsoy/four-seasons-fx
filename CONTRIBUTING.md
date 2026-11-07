# Contributing

Thanks for helping. Small, focused pull requests are easiest to review.

## Setup

```bash
npm install
npm run build
npm run serve          # http://127.0.0.1:4173/site/?dev
npm run dev            # rebuild on change, in a second terminal
```

## Adding or changing a scene

1. One file per scene in `src/scenes/`. Export a `SceneFactory` that returns `resize`, `update`, `draw`.
2. Work in CSS pixels; the engine handles `devicePixelRatio`.
3. Pre-render sprites once with `createSprite` and draw them with `drawImage`. Avoid `shadowBlur` and creating gradients
   per particle per frame.
4. Scale counts with `scaledCount(base, width, height, density)` so phones stay light.
5. Check the scene on a light and a dark background in the demo (Background switch).
6. Register it in `FACTORIES` in `src/index.ts` and document it in `README.md`, `AGENTS.md` and `llms.txt`.

## Preview images

`npm run capture` renders `assets/templates/preview.html` with a local Chrome and encodes the frames with Python Pillow
(`pip install pillow`). Set `CHROME_PATH` if Chrome is not found. Commit the regenerated files in `assets/`.

## Rules

- No runtime dependencies.
- Respect `prefers-reduced-motion` and keep the canvas `pointer-events: none`.
- Keep comments short and technical.
