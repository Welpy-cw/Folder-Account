const useDefault = "Use default";
const defaultId = "defaultId";

const saveSettings = async () => {
  const params = new URLSearchParams(window.location.search);
  const folderId = params.get("id");

  const identityId = document.getElementById("identityId").value;
  const to = document.getElementById("to").value.trim();
  const replyTo = document.getElementById("replyTo").value.trim();
  const addToCcOnReply = document.getElementById("addToCcOnReply").checked;
  const replyToOnReplyForward = document.getElementById(
    "replyToOnReplyForward"
  ).checked;
  const overrideReturnAddress = document.getElementById(
    "overrideReturnAddress"
  ).checked;

  let [settings] = Object.values(await browser.storage.local.get(folderId));
  if (!settings) {
    settings = {};
  }

  const setOrClearSetting = (pref, value, valueToClear) => {
    if (value == valueToClear) {
      delete settings[pref];
    } else {
      settings[pref] = value;
    }
  };

  setOrClearSetting("identityId", identityId, defaultId);
  setOrClearSetting("to", to, "");
  setOrClearSetting("replyTo", replyTo, "");
  setOrClearSetting("addToCcOnReply", addToCcOnReply, false);
  setOrClearSetting("replyToOnReplyForward", replyToOnReplyForward, false);
  setOrClearSetting("overrideReturnAddress", overrideReturnAddress, false);

  if (Object.entries(settings).length) {
    await browser.storage.local.set({ [folderId]: settings });
  } else {
    await browser.storage.local.remove(folderId);
  }

  const thisWindow = await messenger.windows.getCurrent();
  browser.storage.local.set({
    windowSize: { height: thisWindow.height, width: thisWindow.width },
  });

  window.close();
};

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const folderId = params.get("id");
  document.title = "Folder Account - Settings for " + folderId;

  const saveButton = document.getElementById("save-button");
  const cancelButton = document.getElementById("cancel-button");
  if ((await browser.runtime.getPlatformInfo()).os == "win") {
    saveButton.parentElement.insertBefore(saveButton, cancelButton);
  }
  saveButton.addEventListener("click", saveSettings);
  cancelButton.addEventListener("click", () => {
    window.close();
  });

  const [settings] = Object.values(await browser.storage.local.get(folderId));
  const [sortIdentities] = Object.values(
    await browser.storage.local.get("sortIdentities")
  );

  const menuList = document.getElementById("identityId");
  const option = document.createElement("option");
  option.text = useDefault;
  option.value = defaultId;
  menuList.add(option);
  const accounts = await messenger.accounts.list(false);
  for (const account of accounts) {
    if (!account.identities.length) {
      continue;
    }
    let menuListEntries = [];
    for (const id of account.identities) {
      let entry = "";
      if (id.name.length > 0) {
        entry += id.name + " <" + id.email + ">";
      } else {
        entry += id.email;
      }
      if (id.label.length > 0) {
        entry += " (" + id.label + ")";
      }
      entry += "\u2003[" + account.name + "]";
      menuListEntries[id.id] = entry;
    }
    let entriesArray = Object.entries(menuListEntries);
    if (sortIdentities)
      entriesArray = entriesArray.sort(([, a], [, b]) => a > b);
    const separator = document.createElement("hr");
    menuList.appendChild(separator);
    for (const [id, text] of entriesArray) {
      const option = document.createElement("option");
      option.text = text;
      option.value = id;
      option.selected = settings?.identityId == id;
      menuList.add(option);
    }
  }

  if (!settings) {
    return;
  }

  document.getElementById("to").setAttribute("value", settings.to ?? "");
  document
    .getElementById("replyTo")
    .setAttribute("value", settings.replyTo ?? "");
  document.getElementById("addToCcOnReply").checked = settings.addToCcOnReply;
  document.getElementById("replyToOnReplyForward").checked =
    settings.replyToOnReplyForward;
  document.getElementById("overrideReturnAddress").checked =
    settings.overrideReturnAddress;
});

document.addEventListener("keydown", (event) => {
  if (event.key == "Enter") {
    saveSettings();
  }
  if (event.key == "Escape") {
    window.close();
  }
});
