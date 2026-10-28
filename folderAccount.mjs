export async function resolveSettings(details, folder) {
  if (details.type == "draft") {
    return;
  }

  if (!folder) {
    return;
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
    if (relatedMessage.folder) {
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

  return settings;
}

// Thunderbird builds the body of a reply or forward (quote position,
// signature placement, quoting, compose format) from the identity active when
// the compose window opens, and does not rebuild it when the identity changes
// later. Returns how to reopen the message with the folder's identity, or null
// if there is nothing to gain or the original compose action cannot be
// reproduced.
export async function getReopenAction(tabId, details, settings) {
  if (details.type != "reply" && details.type != "forward") {
    return null;
  }

  if (!settings?.identityId || settings.identityId == details.identityId) {
    return null;
  }

  if (details.type == "reply" && settings.overrideReturnAddress) {
    return null;
  }

  // Undefined e.g. for messages opened from file.
  if (!details.relatedMessageId) {
    return null;
  }

  const messageId = details.relatedMessageId;

  // The compose API does not tell how the window was opened, so infer it.
  if (details.type == "forward") {
    // An inline forward carries the attachments of the original message;
    // anything else must be forwarded messages.
    const originalNames = (
      await messenger.messages.listAttachments(messageId)
    ).map((attachment) => attachment.name);
    const forwarded = (await messenger.compose.listAttachments(tabId)).filter(
      (attachment) => !originalNames.includes(attachment.name)
    );
    // Several messages forwarded as attachments cannot be reproduced.
    if (forwarded.length > 1) {
      return null;
    }
    return {
      method: "beginForward",
      messageId,
      type: forwarded.length ? "forwardAsAttachment" : "forwardInline",
    };
  }

  if (details.to.length > 1 || details.cc.length) {
    return { method: "beginReply", messageId, type: "replyToAll" };
  }

  // A reply to sender only differs from a reply to list by its recipient.
  const { headers } = await messenger.messages.getFull(messageId);
  const listAddress = headers["list-post"]?.[0]
    ?.match(/mailto:([^>,\s]+)/i)?.[1]
    ?.toLowerCase();
  const [recipient] = details.to;
  const type =
    listAddress &&
    typeof recipient == "string" &&
    recipient.toLowerCase().includes(listAddress)
      ? "replyToList"
      : "replyToSender";

  return { method: "beginReply", messageId, type };
}

export async function getCustomComposeDetails(details, folder) {
  const settings = await resolveSettings(details, folder);
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
