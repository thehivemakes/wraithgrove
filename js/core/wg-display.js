// WG.Display already created in index.html boot. This file just wires resize → engine.
(function(){'use strict';
  // No-op shim. WG.Display is in the inline boot script.
  // Kept as a placeholder so module load order is consistent and future Display refactors live here.
  if (!window.WG.Display) console.warn('[wg-display] WG.Display not ready');
})();
