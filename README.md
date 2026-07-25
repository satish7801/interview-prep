# PrepStudio

Path-based interview prep (Next.js). Lessons and Q&A load from JSON under `public/content/`.

## Local

```bash
npm install
npm run dev
```

## Deploy on Vercel

This repo is ready for Vercel (Next.js + static `/public/content`).

### Option A — Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import **`satish7801/interview-prep`** (or this folder as the repo root)
3. Framework: **Next.js** (auto)
4. Root Directory: leave blank if this folder is the repo root
5. Deploy

### Option B — CLI

```bash
npm i -g vercel
vercel
# production:
vercel --prod
```

### After deploy

- Home loads `/content/catalog.json`
- Each day loads `/content/{trackId}/parts/day-NN.json`
- Progress stays in the browser (Save JSON / Load JSON)

## Content

```bash
npm run content:split
```

Rebuilds `public/content` from `src/data/_archive/`.
