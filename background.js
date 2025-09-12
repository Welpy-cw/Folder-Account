import * as folderAccount from "./folderAccount.mjs";

let lastFocusedWindow = messenger.windows.WINDOW_ID_NONE;
messenger.windows.getCurrent().then((w) => (lastFocusedWindow = w.id));

messenger.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId < 0) {
    return;
  }

  let focusedWindow = await messenger.windows.get(windowId);
  if (focusedWindow?.type == "messageCompose") {
    return;
  }

  lastFocusedWindow = windowId;
});

messenger.folders.onRenamed.addListener(
  async (originalFolder, renamedFolder) => {
    await folderAccount.updateSettings(originalFolder, renamedFolder);
  }
);

const menuId = "folderAccount";

messenger.menus.create({
  contexts: ["folder_pane"],
  title: "Folder Account",
  id: menuId,
});

messenger.menus.onShown.addListener((info, tab) => {
  if (!info.contexts.includes("folder_pane")) {
    return;
  }

  messenger.menus.update(menuId, {
    visible: Boolean(info.selectedFolder),
  });
  messenger.menus.refresh();
});

messenger.menus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId != menuId) {
    return;
  }

  const folder = info.selectedFolder;
  const params = new URLSearchParams({
    id: folder.id,
  });
  const { windowSize } = await browser.storage.local.get({
    windowSize: { height: 400, width: 600 },
  });
  messenger.windows.create({
    type: "popup",
    url: `folderSettings.html?${params}`,
    allowScriptsToClose: true,
    height: windowSize.height,
    width: windowSize.width,
  });
});

messenger.windows.onCreated.addListener(async (window) => {
  if (window.type != "messageCompose") {
    return;
  }

  const [currentTab] = await messenger.tabs.query({ windowId: window.id });
  const [lastFocusedTab] = await messenger.tabs.query({
    active: true,
    type: ["mail", "messageDisplay"],
    windowId: lastFocusedWindow,
  });
  if (!currentTab || !lastFocusedTab) {
    return;
  }

  const folder =
    lastFocusedTab.type == "mail"
      ? (await messenger.mailTabs.get(lastFocusedTab.id)).displayedFolder
      : (await messenger.messageDisplay.getDisplayedMessage(lastFocusedTab.id))
          .folder;

  const details = await messenger.compose.getComposeDetails(currentTab.id);
  const customDetails = await folderAccount.getCustomComposeDetails(
    details,
    folder
  );
  await messenger.compose.setComposeDetails(currentTab.id, customDetails);
});
