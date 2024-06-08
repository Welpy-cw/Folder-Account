export async function checkForMigration() {
  const kAlreadyMigrated = "alreadyMigrated";
  let results = await browser.storage.local.get(kAlreadyMigrated);
  if (kAlreadyMigrated in results) {
    return;
  }
  await browser.storage.local.set({ [kAlreadyMigrated]: true });
  const settings = await messenger.FolderAccount.getFolderAccountSettings();
  console.log(settings);
  settings.forEach(async (value, key) => {
    console.log(key);
    console.log(value);
    await browser.storage.local.set({ [key]: value });
  });
}

export async function getCustomComposeDetails(
  details,
  currentTabId,
  lastFocusedTabId
) {
  if (details.type == "draft") {
    return {};
  }

  let folder = await messenger.FolderAccount.getDisplayedFolder(
    lastFocusedTabId
  );

  let [settings] = Object.values(await browser.storage.local.get(folder.id));
  // In case of reply, forward and redirect use the folder containing the
  // related message, unless it is shown in a saved search folder with
  // applicable settings.
  if (details.type != "new" && !(folder.isVirtual && settings)) {
    folder = await messenger.FolderAccount.getRelatedMessageFolder(
      currentTabId
    );
  }

  if (!settings) {
    const parentFolders = await messenger.folders.getParentFolders(folder);
    for (let parentFolder of parentFolders) {
      [settings] = Object.values(
        await browser.storage.local.get(parentFolder.id)
      );
      if (settings) {
        break;
      }
    }
  }

  if (!settings) {
    return {};
  }

  let newDetails = {};

  // Do NOT overwrite 'To:' address if the message is new and already has one:
  // The user probably selected an address from the address book and wants to
  // use that one.
  // Only set the 'To:' address on a new message.  For forward, or reply-all,
  // more likely than not the user will want to use a non-default To: address.
  if (details.type == "new" && details.to.length == 0 && settings.to?.length) {
    newDetails.to = settings.to;
  }

  // 'Reply-To:' Set everytime (by Jakob).
  if (
    (details.type == "new" || settings.replyToOnReplyForward) &&
    details.replyTo.length == 0 &&
    settings.replyTo?.length
  ) {
    newDetails.replyTo = settings.replyTo;
  }

  // Set 'CC:' for replies.
  if (
    details.type == "reply" &&
    details.cc.length == 0 &&
    settings.to?.length &&
    settings.addToCcOnReply
  ) {
    newDetails.cc = settings.to;
  }

  // 'From:' Make sure we are using the desired identity. No override if this
  // is a reply or reply-all and overrideReturnAddress is true.
  // Assume the user always wants the default 'From:', for all sorts of
  // messages, unless they have specified one.
  if (
    settings.identityId &&
    !(details.type == "reply" && settings.overrideReturnAddress)
  ) {
    newDetails.identityId = settings.identityId;
  }

  return newDetails;
}

export async function updateSettings(originalFolder, renamedFolder) {
  const [settings] = Object.values(
    await browser.storage.local.get(originalFolder.id)
  );
  if (!settings) {
    return;
  }
  await browser.storage.local.set({ [renamedFolder.id]: settings });
  await browser.storage.local.remove(originalFolder.id);
}
