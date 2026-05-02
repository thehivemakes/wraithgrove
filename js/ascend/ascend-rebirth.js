// WG.AscendRebirth — stage-clear Rebirth event modal.
// Shown when the active character has a next-tier available AND the latest
// stage clear satisfies its requiresStageClear gate. Players see a portrait
// crossfade from current → next tier, animated reward chips, and a Cultivate
// button that pays coins to commit the tier advance. Continue closes the
// modal without advancing.
(function(){'use strict';

  // Stage-clear reward chip amounts (the "Rebirth bonus" pile).
  // Per-tier coin cost lives in WG.AscendChars.rebirthCost (the Cultivate
  // cost ladder). SPEC §8: tier-3 advance ≈ 2880 coins.
  const REWARD_DIAMONDS = 100;
  const REWARD_HAMMERS  = 10;

  function inject() {
    if (document.getElementById('rebirth-anim-css')) return;
    const st = document.createElement('style');
    st.id = 'rebirth-anim-css';
    st.textContent = `
      @keyframes rebirth-glow {
        0%,100% { box-shadow: 0 0 28px 4px rgba(255,216,112,0.55); }
        50%     { box-shadow: 0 0 44px 10px rgba(255,232,160,0.85); }
      }
      @keyframes rebirth-portrait-out {
        0%   { opacity: 1; transform: scale(1); filter: brightness(1); }
        45%  { opacity: 0.45; transform: scale(0.92); filter: brightness(2.2) blur(2px); }
        100% { opacity: 0; transform: scale(0.85); filter: brightness(3) blur(4px); }
      }
      @keyframes rebirth-portrait-in {
        0%   { opacity: 0; transform: scale(0.85); filter: brightness(3) blur(4px); }
        55%  { opacity: 1; transform: scale(1.18); filter: brightness(1.6) blur(0); }
        100% { opacity: 1; transform: scale(1); filter: brightness(1); }
      }
      @keyframes rebirth-flash-burst {
        0%,100% { opacity: 0; }
        40%     { opacity: 0.85; }
      }
      @keyframes rebirth-chip-in {
        0%   { opacity: 0; transform: translateY(18px) scale(0.6); }
        70%  { opacity: 1; transform: translateY(-4px) scale(1.18); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes rebirth-arrow-pulse {
        0%,100% { opacity: 0.6; transform: scale(1); }
        50%     { opacity: 1; transform: scale(1.18); }
      }
      .rebirth-card {
        background: radial-gradient(circle at top, #2a1c10 0%, #0a0604 100%);
        border: 2.5px solid #ffd870;
        border-radius: 14px;
        padding: 22px 18px 18px;
        width: 92%;
        max-width: 360px;
        animation: rebirth-glow 2.4s ease-in-out infinite;
        text-align: center;
      }
      .rebirth-title { font-size: 13px; letter-spacing: 4px; color: #ffe888; font-weight: 700; margin-bottom: 4px; text-shadow: 0 0 8px rgba(255,200,100,0.6); }
      .rebirth-sub   { font-size: 11px; letter-spacing: 2px; color: #c8a868; margin-bottom: 14px; }
      .rebirth-portraits {
        position: relative;
        width: 110px; height: 132px;
        margin: 8px auto 16px;
      }
      .rebirth-portrait {
        position: absolute; inset: 0;
        border-radius: 10px;
        border: 1.5px solid #604020;
        background: linear-gradient(to bottom, rgba(20,16,10,0.85), rgba(8,4,2,0.95));
        overflow: hidden;
      }
      .rebirth-flash {
        position: absolute; inset: -12px; border-radius: 18px;
        background: radial-gradient(circle, rgba(255,232,160,0.9) 0%, rgba(255,200,100,0.5) 40%, transparent 70%);
        opacity: 0; pointer-events: none;
      }
      .rebirth-flash.show { animation: rebirth-flash-burst 1100ms ease-out forwards; }
      .rebirth-portrait .body {
        position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%);
        width: 36px; height: 56px; border-radius: 8px 8px 3px 3px;
      }
      .rebirth-portrait .head {
        position: absolute; left: 50%; bottom: 60px; transform: translateX(-50%);
        width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid #2a1c10;
      }
      .rebirth-portrait .glint {
        position: absolute; inset: 0; pointer-events: none;
        background: radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18), transparent 55%);
      }
      .rebirth-arrow {
        color: #ffe888; font-size: 18px;
        position: absolute; top: -22px; left: 50%; transform: translateX(-50%);
        animation: rebirth-arrow-pulse 1s ease-in-out infinite;
        text-shadow: 0 0 8px rgba(255,200,100,0.6);
      }
      .rebirth-chips { display: flex; justify-content: center; gap: 10px; margin: 4px 0 18px; flex-wrap: wrap; }
      .rebirth-chip {
        background: linear-gradient(to bottom, #3a2818, #1a1006);
        border: 1px solid #806040; border-radius: 999px;
        padding: 6px 12px; font-size: 11px; color: #f0d890; letter-spacing: 1px;
        opacity: 0;
      }
      .rebirth-chip.show { animation: rebirth-chip-in 420ms cubic-bezier(0.34,1.56,0.64,1) forwards; }
    `;
    document.head.appendChild(st);
  }

  function isEligible() {
    const ps = WG.State.get().player;
    const charId = ps.activeCharacter || 'lantern_acolyte';
    const ch = WG.AscendChars.get(charId);
    if (!ch) return null;
    const currentTierIdx = (ps.characterTiers && ps.characterTiers[charId]) || ch.defaultTier || 1;
    const next = ch.tiers.find(t => t.tier === currentTierIdx + 1);
    if (!next) return null;
    const need = next.requiresStageClear || 0;
    const highest = ps.highestStageCleared || 0;
    if (highest < need) return null;
    return { character: ch, currentTier: ch.tiers.find(t => t.tier === currentTierIdx) || ch.tiers[0], nextTier: next, charId };
  }

  function buildPortrait(tier) {
    const root = document.createElement('div');
    root.className = 'rebirth-portrait';
    const head = document.createElement('div');
    head.className = 'head';
    head.style.background = tier.accent;
    const body = document.createElement('div');
    body.className = 'body';
    body.style.background = tier.color;
    const glint = document.createElement('div');
    glint.className = 'glint';
    root.appendChild(body);
    root.appendChild(head);
    root.appendChild(glint);
    return root;
  }

  // Show the modal when eligible, then call onContinue. If not eligible,
  // call onContinue immediately and return false. Returns true if modal shown.
  function maybeShow(opts) {
    opts = opts || {};
    const elig = isEligible();
    const onContinue = typeof opts.onContinue === 'function' ? opts.onContinue : function(){};
    if (!elig) { onContinue({ rebirthShown: false }); return false; }
    inject();

    const ps = WG.State.get().player;
    const cost = (opts.cost != null) ? opts.cost : (WG.AscendChars.rebirthCost ? WG.AscendChars.rebirthCost(elig.charId) : 2880);
    const root = document.getElementById('modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-overlay show';
    wrap.style.zIndex = '180';   // above HuntResults

    const card = document.createElement('div');
    card.className = 'rebirth-card';

    const title = document.createElement('div');
    title.className = 'rebirth-title';
    title.textContent = `REBIRTH — TIER ${elig.nextTier.tier} UNLOCKED`;
    card.appendChild(title);

    const sub = document.createElement('div');
    sub.className = 'rebirth-sub';
    sub.textContent = `${elig.character.name} → ${elig.nextTier.name}`;
    card.appendChild(sub);

    // In-place crossfade: both portraits stacked at the same location, the
    // current tier fades + scales out as the next tier fades + scales in.
    // Tiny arrow above hints at progression direction.
    const portraits = document.createElement('div');
    portraits.className = 'rebirth-portraits';
    const arrow = document.createElement('div');
    arrow.className = 'rebirth-arrow';
    arrow.textContent = '⬇';
    const flash = document.createElement('div');
    flash.className = 'rebirth-flash';
    const left = buildPortrait(elig.currentTier);
    const right = buildPortrait(elig.nextTier);
    right.style.opacity = '0';
    portraits.appendChild(arrow);
    portraits.appendChild(flash);
    portraits.appendChild(left);
    portraits.appendChild(right);
    card.appendChild(portraits);

    // Reward chips.
    const chips = document.createElement('div');
    chips.className = 'rebirth-chips';
    const chipDefs = [
      { icon: '🎴', text: `+1 ${elig.nextTier.name} skin` },
      { icon: '💎', text: `+${REWARD_DIAMONDS}` },
      { icon: '🔨', text: `+${REWARD_HAMMERS}` },
    ];
    const chipEls = chipDefs.map(def => {
      const c = document.createElement('div');
      c.className = 'rebirth-chip';
      c.textContent = `${def.icon} ${def.text}`;
      chips.appendChild(c);
      return c;
    });
    card.appendChild(chips);

    // Buttons.
    const btnRow = document.createElement('div');
    btnRow.className = 'modal-btn-row';
    btnRow.style.marginTop = '4px';

    const cultivateBtn = document.createElement('button');
    cultivateBtn.className = 'btn primary';
    cultivateBtn.innerHTML = `CULTIVATE (${cost} <span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:radial-gradient(#ffe89a,#d8a838);border:1px solid #b08820;vertical-align:-2px;margin-right:2px;"></span>)`;
    const playerCoins = WG.State.get().currencies.coins;
    if (playerCoins < cost) cultivateBtn.disabled = true;

    const continueBtn = document.createElement('button');
    continueBtn.className = 'btn';
    continueBtn.textContent = 'CONTINUE';

    btnRow.appendChild(cultivateBtn);
    btnRow.appendChild(continueBtn);
    card.appendChild(btnRow);

    wrap.appendChild(card);
    root.appendChild(wrap);

    // Sequence: 1.2s portrait crossfade, then chips drop in 1-by-1 (180ms stagger).
    const PORTRAIT_DURATION = 1200;
    setTimeout(() => {
      flash.classList.add('show');
      left.style.animation = `rebirth-portrait-out ${PORTRAIT_DURATION}ms ease-in forwards`;
      right.style.opacity = '0';
      right.style.animation = `rebirth-portrait-in ${PORTRAIT_DURATION}ms ease-out forwards`;
    }, 180);
    setTimeout(() => { chipEls[0] && chipEls[0].classList.add('show'); }, 180 + PORTRAIT_DURATION);
    setTimeout(() => { chipEls[1] && chipEls[1].classList.add('show'); }, 180 + PORTRAIT_DURATION + 180);
    setTimeout(() => { chipEls[2] && chipEls[2].classList.add('show'); }, 180 + PORTRAIT_DURATION + 360);

    function close(reason, payload) {
      if (!wrap.parentNode) return;
      wrap.remove();
      onContinue(Object.assign({ rebirthShown: true, reason }, payload || {}));
    }

    continueBtn.addEventListener('click', () => close('continue'));

    cultivateBtn.addEventListener('click', () => {
      const r = WG.AscendChars.tryRebirth(elig.charId, { cost });
      if (!r.ok) {
        cultivateBtn.disabled = true;
        cultivateBtn.textContent = r.reason === 'insufficient-coins' ? 'NEED MORE COINS' : 'UNAVAILABLE';
        return;
      }
      // Grant the stage-clear bonus pile.
      WG.State.grant('diamonds', REWARD_DIAMONDS);
      const f = WG.State.get().forge;
      f.craftFragments = (f.craftFragments || 0) + REWARD_HAMMERS;
      cultivateBtn.disabled = true;
      cultivateBtn.textContent = '✓ ASCENDED';
      // Refresh Ascend tab to reflect new tier portrait.
      if (WG.AscendRender && WG.AscendRender.refresh) WG.AscendRender.refresh();
      WG.Engine.emit('rebirth:committed', { charId: elig.charId, fromTier: elig.currentTier.tier, toTier: elig.nextTier.tier });
      // Brief delay so player reads "ASCENDED" before the modal closes.
      setTimeout(() => close('cultivated', { newTier: elig.nextTier.tier }), 700);
    });

    return true;
  }

  function init() {}

  window.WG.AscendRebirth = { init, maybeShow, isEligible };
})();
