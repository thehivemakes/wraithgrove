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
