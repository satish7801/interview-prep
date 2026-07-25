# PrepStudio

Path-based interview prep. **All lesson text and Q&A are loaded from JSON** under `public/content/`, lazily per part.

## Routes

- `/` — catalog only (`/content/catalog.json`)
- `/paths/[trackId]` — manifest only
- `/paths/[trackId]/days/[day]` — one part JSON (`parts/day-NN.json`, includes `qa[]`)

## Content layout

```text
public/content/
  catalog.json
  {trackId}/manifest.json
  {trackId}/parts/day-01.json   # full lesson + qa
  {trackId}/quiz.json           # quiz items (fetched on Start quiz)
```

Regenerate from archived sources:

```bash
node scripts/split-content.mjs
```

Sources live in `src/data/_archive/` after the first split.

## Progress JSON

Autosave + **Save JSON** / **Load JSON** (`prepstudio-progress-v2`).

## Dev

```bash
npm install
npm run dev
```
