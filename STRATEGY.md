# Text2LaTeX Platform Build-Out Strategy

## Combined Analysis: Claude + Gemini

Strategy developed collaboratively by Claude (codebase analysis, technical verification) and Gemini (product strategy, market positioning). Based on PostHog data from project 52642 showing 603 clicks from 429 unique users across 6 tool tabs currently redirecting to Jenni AI affiliate link.

---

## Where We Corrected Initial Assumptions

1. **Convex file storage already exists** — Convex has built-in file storage (`generateUploadUrl`, `ctx.storage`). No need for Cloudflare R2 or external storage. Currently unused in the codebase — will be the foundation for file-based tools.

2. **Pandoc WASM is not production-ready** — Pandoc is a ~100MB Haskell binary with no reliable WASM build. For LaTeX-to-Word, we use the `docx` npm library in a Cloudflare Worker instead.

3. **Image to TikZ is deprioritized** — Only 1.5% demand (9 clicks) and essentially an unsolved research problem. Dropped from the roadmap entirely.

---

## Build Priority & Phased Rollout

### Phase 1 — The Revenue Drivers (Weeks 1-4)

| # | Tool | Demand | Approach | Monetization |
|---|------|--------|----------|-------------|
| 1 | **LaTeX to Word** | 32% (195 clicks) | Cloudflare Worker with `docx` JS library | **Pro-only** — strongest conversion lever |
| 2 | **Image to LaTeX** | 28% (168 clicks) | Gemini multimodal (SDK already integrated) | Freemium: 5 free/day, unlimited Pro |

### Phase 2 — Expand the Toolkit (Weeks 5-8)

| # | Tool | Demand | Approach | Monetization |
|---|------|--------|----------|-------------|
| 3 | **PDF to LaTeX** | 23% (141 clicks) | PDF page → image → Gemini multimodal (reuse #2 pipeline) | Freemium: 3 free/day, unlimited Pro |
| 4 | **LaTeX to Image** | 13% (78 clicks) | KaTeX/MathJax server-side render → canvas → PNG in Worker | Freemium: 10 free/day, unlimited Pro |

### Phase 3 — Quick Wins & Polish (Weeks 9-10)

| # | Tool | Demand | Approach | Monetization |
|---|------|--------|----------|-------------|
| 5 | **AI Summarizer** | 2% (12 clicks) | Gemini text (same pattern as `convertToLatex`) | Follows existing free tier limits |
| 6 | ~~Image to TikZ~~ | 1.5% (9 clicks) | **Deprioritized** — too niche, too hard | — |

---

## Architecture: File Processing Pipeline

```
Client uploads file
    → Convex generateUploadUrl() → direct upload to Convex storage
    → Call Convex action (e.g., convertImageToLatex)
        → Fetch file from ctx.storage.get(storageId)
        → For AI tools: send to Gemini multimodal API
        → For non-AI tools: POST to Cloudflare Worker
        → Store output in Convex storage (if file output)
        → Save record to new fileConversions table
    → Return result/download URL to client
```

### New Schema Table

```
fileConversions
├── userId (indexed)
├── sessionId (indexed, optional — for anonymous)
├── tool ("latex-to-word" | "image-to-latex" | "pdf-to-latex" | "latex-to-image")
├── inputStorageId (or inputText for text-based tools)
├── outputStorageId (optional)
├── outputText (optional — for Image/PDF to LaTeX)
├── status ("pending" | "processing" | "success" | "failed")
├── errorMessage (optional)
├── createdAt
```

### Pattern to Follow

The `convertToLatex` action at `convex/conversions.ts:444` is the template for every new tool action. It already handles:
- Auth checks (anonymous vs authenticated)
- Rate limiting (per-user, per-session, global)
- Tier enforcement (free vs pro daily limits)
- Input validation
- PostHog LLM cost tracking
- Conversion history saving

Each new tool action should follow the same structure.

---

## LaTeX to Word — Technical Deep Dive

The most important new feature (32% of all tool clicks).

### Recommended Approach: `docx` npm library in a Cloudflare Worker

1. Parse the LaTeX input into an AST (using a lightweight LaTeX parser)
2. Map LaTeX nodes → `docx` library objects (paragraphs, math, headings, etc.)
3. Generate a `.docx` file in-memory
4. Return the binary buffer

### Why This Beats the Alternatives

| Approach | Verdict |
|----------|---------|
| Pandoc via container | Too heavy, needs Docker/Lambda, cold starts |
| Client-side conversion | Unreliable, limited browser APIs |
| Third-party API (CloudConvert, etc.) | Per-conversion cost, dependency risk |
| **`docx` library (recommended)** | **Pure JS, runs in Workers, no binary deps, full control** |

### Math Handling

For math expressions: LaTeX math → MathML → OMML (Word's native math format). The `docx` library supports paragraphs, headings, math equations, tables, lists, and images.

### Implementation Flow

```
User pastes LaTeX in UI
    → Pro-only check (show UpgradeModal if free)
    → Convex action: POST LaTeX text to Cloudflare Worker
    → Worker: parse LaTeX → build docx → return binary
    → Convex action: store output in Convex storage
    → Return download URL to client
    → Client triggers file download
```

---

## Image to LaTeX — Technical Deep Dive

Second highest demand (28% of clicks). Leverages Gemini multimodal which is already integrated.

### Implementation

1. New Convex action `convertImageToLatex`
2. Accept image via Convex file storage (`storageId`)
3. Fetch image binary from `ctx.storage.get(storageId)`
4. Send to Gemini API with multimodal prompt: "Transcribe the mathematical expressions in this image into LaTeX code"
5. Return LaTeX text output
6. Save to `fileConversions` table

### Reuses Existing Infrastructure

- Same Gemini SDK (`@google/generative-ai`)
- Same rate limiting patterns
- Same PostHog LLM cost tracking
- Same auth/tier enforcement

---

## PDF to LaTeX — Technical Deep Dive

Third highest demand (23%). Built on top of Image to LaTeX pipeline.

### MVP Approach

1. Extract pages from PDF as images (using `pdf-lib` or similar)
2. Send each page image through the Image to LaTeX pipeline
3. Concatenate results
4. Return combined LaTeX output

### Why This Works

- Reuses 90% of the Image to LaTeX implementation
- Handles both text-heavy and equation-heavy PDFs via Gemini's vision
- Avoids complex PDF text extraction edge cases

---

## LaTeX to Image — Technical Deep Dive

Fourth priority (13% of clicks).

### Approach: KaTeX Server-Side Rendering in Cloudflare Worker

1. Receive LaTeX text input
2. Render using KaTeX to HTML/SVG
3. Convert SVG to PNG (using `resvg-wasm` or similar)
4. Return image binary

### Alternative: MathJax + Puppeteer

More accurate rendering but heavier. Could run on a dedicated server if Worker approach has limitations.

---

## Monetization Strategy

### Current Pricing

- Free: 10 conversions/day (anonymous), 60/day (authenticated)
- Pro: $5/month or $30/year (unlimited)

### New Tool Gating

| Tool | Tier | Free Limit | Rationale |
|------|------|------------|-----------|
| Text to LaTeX | Freemium | 10 anon / 60 auth per day | Existing — keep as-is |
| **LaTeX to Word** | **Pro-only** | **0 free** (demo on landing page) | Highest demand, strongest Pro driver |
| Image to LaTeX | Freemium | 5/day | Higher compute cost (Gemini multimodal) |
| PDF to LaTeX | Freemium | 3/day | Highest compute cost (multi-page) |
| LaTeX to Image | Freemium | 10/day | Low compute cost, drives engagement |
| AI Summarizer | Freemium | Follows text-to-LaTeX limits | Low demand, low marginal cost |

### Price Adjustment

Consider raising Pro to **$8/month or $49/year** after shipping Phase 1. Going from 1 tool to 5 justifies the increase. Grandfather existing subscribers at the old price.

---

## Acquisition Strategy for Jenni AI

### Core Positioning

You're not competing with Jenni AI — you're complementary. Jenni is a writing assistant. Text2LaTeX solves the formatting/conversion "last mile" their users already need. The 603 affiliate clicks in 12 days prove this.

### Metrics That Matter for Acquisition

| Metric | Why It Matters | How to Track |
|--------|---------------|-------------|
| MAU growth | Shows momentum | PostHog (already set up) |
| Pro conversion rate | Proves willingness to pay | Stripe + PostHog funnel |
| MRR/ARR | De-risks the deal | Stripe dashboard |
| DAU:MAU ratio | Proves stickiness | PostHog |
| LLM cost per conversion | Shows unit economics | PostHog `$ai_generation` events (already tracked) |
| Tool-specific usage | Shows breadth of engagement | PostHog per-tool events |

### Strategic Moves

1. **Keep the affiliate link running** even after building native tools. The click data is your best proof of product-market fit. When pitching: "Your users are already coming to us. Here's the data."

2. **Build the "LaTeX ecosystem" narrative.** With 5+ tools, you're not just a converter — you're the LaTeX platform. That's worth more than a single feature.

3. **Architecture for acquisition.** Keep each tool as a self-contained Convex action + route. This makes it easy for Jenni to integrate individual tools post-acquisition.

4. **Frame as "buy vs build."** Clean Remix + Convex codebase with modern stack. Acquiring this saves Jenni months of development on features their users already want.

5. **Emphasize synergy.** Your tools make their platform stickier. Users who can convert LaTeX to Word or import images as LaTeX are more likely to stay in the Jenni ecosystem.

---

## Technical Stack Summary

| Component | Technology |
|-----------|-----------|
| Frontend | Remix v2 (Vite) + React + Tailwind + shadcn/ui |
| Backend | Convex (real-time, serverless) |
| Auth | Clerk |
| Payments | Stripe (subscriptions) |
| AI | Google Gemini Flash (text + multimodal) |
| Analytics | PostHog (events + LLM cost tracking) |
| Workers | Cloudflare Workers (heavy processing) |
| Deployment | Vercel (frontend) + Convex (backend) |
| File Storage | Convex built-in storage (new) |

---

## Environment Variables Required for New Features

No new services needed. All new tools use existing integrations:

- `GEMINI_API_KEY` — already configured (for Image/PDF to LaTeX, Summarizer)
- `STRIPE_SECRET_KEY` — already configured (for Pro gating)
- `POSTHOG_API_KEY` — already configured (for analytics)
- Cloudflare Worker URLs — add per-worker as deployed

---

*Strategy prepared Feb 2026. Data source: PostHog project 52642, Jan 28 - Feb 8, 2026.*
