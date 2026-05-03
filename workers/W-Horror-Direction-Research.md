# W-Horror-Direction-Research

You are Worker — the **horror direction research** worker. Research-only. No code changes.

Walk the birth sequence (`/Users/defimagic/Desktop/Hive/CLAUDE.md` → `Birth/01-04` → `THE_PRINCIPLES` → `HIVE_RULES` → `COLONY_CONTEXT`).

Then read `build-v2/CLAUDE.md`, `BLUEPAPER.md` v2 §3-§7 (locked design), `GAMEPLAY_OBSERVATION.md` (Wood Siege primary source), `js/hunt/hunt-stage.js` (current 18 stages + boss roster).

Reference also: `MEMORY.md` → KingshotPro project (Ysabel, the 46-name advisor roster).

## Architect 2026-05-02 — the question

> "Do we want to cross intersect ai avatar value like have Ysabel from KingshotPro ai avatar in there? I'd like to see her as an unlockable character. I think we need to make it this start out calm and then look more horror themed. But what horror genre? And do we want to cross genres? There's eastern style horror, zombie, ghost, and then some kind of new age hacking ai horror. What are your thoughts?"

Orchestrator's read (already surfaced to Architect): stay Eastern folk-horror as host genre, calm→horror tonal arc, cross-IP unlocks (Ysabel) as **eldritch-tier rift intrusions** — lore-coherent, not genre-mixed.

## Your job — 9x3x3 protocol

Use Hive 9x3x3 research protocol (`/Users/defimagic/Desktop/Hive/MEMORY.md` → `reference_9x3x3_protocol.md`). Use `gemini_research.sh` (Gemini default), Perplexity for reinforcement, Brave for source diversity. NO Architect tokens spent on muscle work.

### Round 1 — what works in mobile horror games

- 3 queries to Gemini, 3 to Perplexity, 3 to Brave covering: "top-grossing mobile horror RPG 2024-2026", "Eastern folk-horror games audience size", "what horror sub-genre converts best for casual mobile". Find the **revenue / retention curves** by sub-genre. Don't accept herd consensus — Herd Lens diagnostic on results.

### Round 2 — calm-to-horror onboarding patterns

- 3 queries on: how Limbo, Inscryption, Mortuary Assistant, OPUS handle the calm opening then escalate. What specific tutorial-stage signals say "you are safe" before pulling the rug. Mobile-specific: how do Genshin, Pokemon Sleep, Honkai handle their dark/horror-adjacent registers without scaring off Day-1 retention.

### Round 3 — cross-IP / cinematic-universe unlocks

- 3 queries on: Fortnite collab unlocks (Marvel, Star Wars), Genshin collab characters, Honkai Star Rail crossover events. What works. What feels forced. **What's the lore-bridge pattern?** (e.g. Fortnite's "the Foundation" multiverse explainer).

## Deliverable

Write `docs/HORROR_DIRECTION_v1.md` with:

1. **Recommendation** — pick ONE host genre (folk-horror likely wins per orchestrator pre-read, but verify with research). Lock it.
2. **Tonal arc** — concrete tutorial → stage 18 register progression. Specific imagery / palette / audio cues per tier.
3. **Cross-IP framework** — does Ysabel work? If yes, what's her lore-bridge? Specific Wraithgrove-canon explanation for why an AI advisor from a 4X game appears in a folk-horror arena. Define a reusable pattern for future Hive cross-IP unlocks (Mantle, future advisors).
4. **Risks** — what kills this. What competitors do badly that we should not copy.
5. **Sources** — 9+ primary, herd-checked.

## Done marker

Write `workers/done/W-Horror-Direction-Research.done` summarizing the recommendation + linking to the docs/HORROR_DIRECTION_v1.md.

NO CODE CHANGES. Pure research + decision doc. Architect ratifies before any character/genre work happens.
