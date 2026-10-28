export async function getCustomComposeDetails(details, folder) {
  if (details.type == "draft") {
    return {};
  }

  if (!folder) {
    return {};
  }

  let [settings] = Object.values(await browser.storage.local.get(folder.id));
  // In case of reply, forward and redirect use the folder containing the
  // related message, unless it is shown in a saved search folder with
  // applicable settings.
  if (details.type != "new" && !(folder.isVirtual && settings)) {
    const relatedMessage = await messenger.messages
      .get(details.relatedMessageId)
      .catch((e) => {
        console.warn("Could not find related message:", e);
      });
    if (relatedMessage?.folder) {
      folder = relatedMessage.folder;
      [settings] = Object.values(await browser.storage.local.get(folder.id));
    }
  }

  if (!settings) {
    const parentFolders = await messenger.folders.getParentFolders(folder.id);
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

  newDetails.isModified = false;
  return newDetails;
}

// Move the settings of a renamed or moved folder, and of all its subfolders,
// to their new folder ids.
export async function updateSettings(originalFolder, newFolder) {
  const oldId = originalFolder.id;
  const newId = newFolder.id;
  const stored = await browser.storage.local.get(null);

  let updated = {};
  let removed = [];
  for (const [key, settings] of Object.entries(stored)) {
    if (key == oldId || key.startsWith(oldId + "/")) {
      updated[newId + key.slice(oldId.length)] = settings;
      removed.push(key);
    }
  }
  if (!removed.length) {
    return;
  }

  await browser.storage.local.set(updated);
  await browser.storage.local.remove(removed);
}
