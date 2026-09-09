# Gia pha ho Nguyen Ba

Vietnamese genealogy website built with React 19, Vinext, Tailwind, Base UI / shadcn, React Flow and Dagre. Local Be Vietnam Pro and Open Sans fonts come from the supplied archive.

## Current scope

- Home, interactive genealogy tree, member directory and profiles, Vietnamese lunar calendar, family history, and a demo member editor.
- 38 fictional sample people, five generations, three branches. No real family history is asserted.
- Editor changes live in React state for the current session. Reload resets the sample. There is no production database, admin authentication, or file upload.
- Vietnamese lunar conversion uses `@dqcai/vn-lunar`. Anniversaries use the ordinary lunar month, with day 30 observed on day 29 in short months.
- Tree layout groups spouses, retains individual parent edges, and supports pan, pinch zoom, search, generation/branch highlighting and descendant collapse.
- Read-only WebMCP tools: `search_family_members`, `get_family_member`. Registration is feature-detected. No supported WebMCP validation context was available during implementation; runtime contract validation is not claimed.

## Development

`pnpm install`, then `pnpm dev --port 3000`.

`pnpm exec tsc --noEmit` checks types. `node --experimental-strip-types --test tests/domain.test.mjs` checks search, genealogy integrity, layout scale, lunar conversion and anniversaries. `pnpm build` produces the Sites Worker artifact.

## Design inputs

The supplied product document defines the genealogy workflows. DESIGN.md and token files inform flat surfaces, restrained borders, spacing and radii. The product-specific burgundy / bronze palette takes precedence over unrelated example content in design references.

## Artwork

`public/heritage-hero.png` is generated decorative art, not a photo of a real family artifact. Mode: new image, transparent background. Prompt: refined modern Vietnamese heritage motif, partial Dong Son concentric bronze drum and three Lac birds; engraving-inspired bronze, gold and burgundy linework; wide composition with open left side; no text, logo or interface. The image is used as low-contrast decoration; genealogy names and controls remain real HTML.
