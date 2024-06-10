const DEFAULT_PREFERENCES = {
  sortIdentities: false,
  useForArchive: false,
};

async function restore_options() {
  let prefs = await messenger.storage.local.get(DEFAULT_PREFERENCES);
  for (let key of Object.keys(prefs)) {
    let elem = document.getElementById(key);
    if (!elem) continue;
    if (elem.type == "checkbox") {
      elem.checked = prefs[key];
    }
  }
}

function change_options(event) {
  let node = event.target;
  let defaultPrefs = Object.keys(DEFAULT_PREFERENCES);
  let isPreference =
    defaultPrefs.includes(node.id) || defaultPrefs.includes(node.name);
  if (!node.id || node.localName != "input" || !isPreference) {
    return;
  }

  if (node.getAttribute("type") == "checkbox") {
    messenger.storage.local.set({
      [node.id]: node.checked,
    });
  }
}

function setup_listeners() {
  document.body.addEventListener("change", change_options);
}

document.addEventListener("DOMContentLoaded", setup_listeners);
document.addEventListener("DOMContentLoaded", restore_options);
