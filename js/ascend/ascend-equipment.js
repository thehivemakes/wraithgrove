// WG.AscendEquipment — Melee/Ranged/Pet 3-slot equipment management
(function(){'use strict';
  const SLOT_UNLOCK_COSTS = {
    melee:  { coins: 0 },        // always available
    ranged: { coins: 360 },
    pet:    { coins: 1100 },
  };

  function isSlotUnlocked(slot) {
    const ps = WG.State.get().player;
    if (slot === 'melee') return true;
    return ps.slots[slot] !== null;     // null = locked, set string = unlocked + equipped
  }
  function tryUnlockSlot(slot) {
    if (slot === 'melee') return { ok: false, reason: 'always-on' };
    const cost = SLOT_UNLOCK_COSTS[slot] || { coins: 0 };
    for (const c in cost) if (WG.State.get().currencies[c] < cost[c]) return { ok: false, reason: 'insufficient-' + c };
    for (const c in cost) WG.State.spend(c, cost[c]);
    const default_ = slot === 'ranged' ? 'iron_sling' : 'pet_wisp';
    WG.State.get().player.slots[slot] = default_;
    WG.Engine.emit('slot:unlocked', { slot, equipped: default_ });
    return { ok: true, equipped: default_ };
  }
  function trySetEquipped(slot, weaponId) {
    const w = WG.HuntWeapons.byId(weaponId);
    if (!w || w.slot !== slot) return { ok: false, reason: 'wrong-slot' };
    if (!isSlotUnlocked(slot)) return { ok: false, reason: 'slot-locked' };
    WG.State.get().player.slots[slot] = weaponId;
    WG.Engine.emit('equip:change', { slot, weaponId });
    return { ok: true };
  }
  function listAvailableForSlot(slot) {
    if (slot === 'melee') return WG.HuntWeapons.bySlot('melee');
    if (slot === 'ranged') return WG.HuntWeapons.rangedSlotUnlocks().map(WG.HuntWeapons.byId);
    if (slot === 'pet') return WG.HuntWeapons.petSlotUnlocks().map(WG.HuntWeapons.byId);
    return [];
  }
  function init() {}
  window.WG.AscendEquipment = { init, isSlotUnlocked, tryUnlockSlot, trySetEquipped, listAvailableForSlot, SLOT_UNLOCK_COSTS };
})();
