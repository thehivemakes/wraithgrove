## CF-005 — Asset PNGs ship with baked-BG bugs; rembg > color-strip
2026-05-09

**Pattern caught:** Multiple enemy + boss sprites shipped to live with their MJ-generation backgrounds NOT properly stripped — variants included checkerboard (transparency-indicator), solid colored rectangles, magenta residue. Audits checked code paths, never opened PNGs. The visual register failure only surfaced when Architect ran a screenshot Sonnet and noticed in-game artifacts.

**Root cause:** Asset-pipeline workers declared "rembg done" without pixel-level verification. Some assets had been processed by manual screenshot-of-preview save (baking the alpha indicator into RGB), others by incomplete rembg passes that left rectangular frames intact.

**Worse compounding:** First attempt to fix used custom color-matching filters. Too narrow → BG remnants. Too wide → ate subject pixels (saw this on wraith_fast where dark-blue body color overlapped dark-blue checker).

**Discipline going forward:**
1. Any sprite/portrait/boss asset commit must include the corner-transparency pixel check: corners[0,1], [w-1,1], [0,h-1], [w-1,h-1] all `RGBA(_,_,_,<30)` for chibi/portrait register.
2. Use `rembg` (ML BG removal) by default for BG strips — NOT custom color filters. `pip install rembg` + `from rembg import remove`.
3. Visual verification via `Read` on the actual PNG before declaring asset shipped — Claude Code's image preview catches what corner-pixel checks miss.
4. Asset workers MUST display the rendered output in-game (Chrome MCP smoke) before writing done marker — per CLAUDE.md "Test locally before claiming shipped."

# CONTEXT_FLAGS — running list of biases that hurt my judgment on this project

**Add to this file every time the Architect catches a wrong assumption.**
**Read this file every session before specing workers.**

---

## CF-001 — PRE-LAUNCH STATE
**Date:** 2026-05-08
**Caught by:** Architect — *"the fact you think there are existing players is confusing. You know we haven't launched."*

**The bias:** I keep treating this like a live game with active players. I propose migration logic, refund flows, "existing player" considerations.

**The truth:** Unlimited Chaos has not shipped. There are zero players. Zero saved games in the wild. Zero downloads. Zero App Store presence. The only "users" are the Architect and possibly internal browser tests.

**How this corrupts judgment:**
- Wasting design budget on migration paths that no one will traverse
- Asking permission for clean-slate decisions that don't need permission
- Conservatism where bold moves would be cheaper and faster
- Asking "should we refund existing X" when there's no one to refund

**Correct posture:**
- Treat every redesign as fresh ground. Wipe old state schemas without ceremony. No "migration prompts."
- Default to bolder mechanics. Pre-launch ≠ "needs to be safe."
- The only thing to preserve is the orchestrator's own work-in-progress (uncommitted code, in-flight workers).

---

## CF-002 — JUDGMENT-CALLS-AS-QUESTIONS
**Date:** 2026-05-08
**Caught by:** Architect — *"You're asking me for game mechanics that are what YOU need to direct."*

**The bias:** I dress my own indecision as "questions for the Architect." Asking "should walls be 6 or 8 slots" or "should squads be multi-class" is me wanting permission for a call I can make.

**The truth:** Memory feedback `feedback_autonomous_ownership.md` covers this exactly: "Don't escalate judgment calls dressed as open questions. Own the decision, surface reasoning, let the Architect catch if wrong."

**How this corrupts judgment:**
- Slows the Architect down when their job is direction + ratification, not arithmetic
- Reveals I'm pattern-matching for safety instead of designing
- Wastes their time on choices I should ground myself

**Correct posture:**
- Decide. Cite reasoning. Move.
- Surface the decision in the response, not as a question.
- The Architect will catch if wrong. Trust that catching mechanism instead of pre-validating everything.
- Real questions are the rare ones — the ones genuinely outside my context (their preferences for tone/branding/lore — yes those are questions; mechanic numbers are not).

---

## CF-003 — WORKERS/ MUST NOT SHIP TO PUBLIC DEPLOYS
**Date:** 2026-05-08
**Caught by:** GitHub push protection — *"Push cannot contain secrets... GitHub Personal Access Token in workers/W-Player-Sprites-MJ-Chrome.md:227."*

**The bias:** I was copying the entire `workers/` dir to deploy repos when pushing live. Worker prompts contain PATs (for git push commands inline), API keys (for MJ/DALL-E/etc), and full project context. Public deploy repos make this visible.

**Truth:** `workers/` is internal documentation for orchestrator + Sonnet workflow. It belongs ONLY in the source repo, NEVER in deploy mirrors. Source-repo also benefits from sanitization (replace literal PATs with `<read-from-api.rtf-at-runtime>` placeholder + reference).

**Correct posture:**
- Deploy file allowlist: audio, js, index.html, STATE_OF_BUILD.md, docs, images, art, legal — never workers/
- Source repo: replace inline secrets in worker prompts with run-time reference
- Update spawn_sonnet_worker.sh templates so future workers can't accidentally bake secrets into prompts (V2 — track separately)

---

## CF-004 — WORKERS WRITE TO DEPLOY PATHS DIRECTLY, ORPHAN SOURCE REPO
**Date:** 2026-05-08
**Caught by:** Mode5 marker landed but `git log` showed no commits — files only existed at `/tmp/dark-magic-deploy/wraithgrove/`.

**The bias:** I assumed CLI-spawned Sonnet workers run with cwd at the source repo + commit there + then push to deploy. Empirical truth: at least some workers (Mode1, Mode5) wrote files directly into the deploy clone at `/tmp/dark-magic-deploy/`, committed there, pushed there, never touched source repo. Marker lands at the source repo's `workers/done/` (it's the only dir reliably referenced) but the actual code is orphaned in /tmp.

**Truth:** /tmp gets nuked by macOS — these workers' work is at risk every reboot.

**Correct posture:**
- After every Sonnet wave: scan `/tmp/wraithgrove-deploy` and `/tmp/dark-magic-deploy/wraithgrove` for files newer than the source repo's last commit. If found, copy back + commit + this becomes orchestrator boilerplate.
- Worker prompts should explicitly state the cwd convention. spawn_sonnet_worker.sh should set cwd to source repo, not deploy clone.
- Until then: orchestrator does post-wave reconciliation. Auto-mint markers if work shipped but marker missing.
