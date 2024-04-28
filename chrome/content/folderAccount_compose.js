var folderAccountCompose = {

  getPrefs: function (folderURI, blob) {

    // Retrieve the account from the preferences hive
    // Look at the samples below to see how blob is used...

    var acct = "";

    let prefs = Services.prefs.getBranch("extensions.folderaccount.");

    // If a folder has no prefs set, look at parent, then grandparent, et al until something is found or we run out of ancestors
    // folderURI = mailbox://somename@someaddr.com/folder/subfolder/subsubfolder/...

    // user_pref("extensions.folderaccount.mailbox://myemail@xxx.com/test%205ddr/Subfolder%20Level%201", "id1");
    // user_pref("extensions.folderaccount.mailbox://myemail@xxx.com/test%205ddr/Subfolder%20Level%201/gggg", "id2");

    // To retrieve this, we'd set blob to "to."
    // user_pref("extensions.folderaccount.to.mailbox://myemail@xxx.com/test%205ddr/Subfolder%20Level%201", "joe@smith.com");

    var ct = folderURI.split('/').length;
    while (ct > 3) {
      try {
        acct = prefs.getCharPref(blob + folderURI);
        break; // We got our value, let's leave this loop
      } catch (e) {} // Nothing to do, just leave acct at default value
      folderURI = folderURI.substring(0, folderURI.lastIndexOf('/')); // Point folderURI at the parent folder
      ct = folderURI.split('/').length;
    }
    return (acct);
  },

  changeComposeDetails: async function (details) {

    if (details.type == "draft")
      return {};

    let folderURI = "";
    let folderIsVirtual = false;

    try {
      let tabId = await folderAccountCompose.notifyTools.notifyBackground({
        command: "getActiveTab"
      });
      let tabObject = WL.extension.tabManager.get(tabId);
      let displayedFolder = tabObject.nativeTab.folder;
      folderURI = displayedFolder.URI;
      folderIsVirtual = Boolean(displayedFolder.flags & Ci.nsMsgFolderFlags.Virtual);
    } catch (e) {
      console.error("Folder Account: error in changeComposeDetails:", e);
    }

    if (details.type != "new" && !(folderIsVirtual && folderAccountCompose.getPrefs(folderURI, ""))) {
      // in case of reply, forward and redirect use the folder containing the related message,
      // unless it is shown in a saved search folder with applicable settings
      folderURI = window.gMessenger.msgHdrFromURI(window.gMsgCompose.originalMsgURI).folder.URI;
    }

    if (!folderURI)
      return {};

    let newDetails = {};

    // To:
    // Do NOT overwrite To: address if the message is new and already has one: 
    // The user probably selected an addr from the address book and wants to use that one.

    if (details.type == "new" && details.to.length == 0) {
      // Only set the To: address on a new message.  For forwards, or Reply All, 
      // more likely than not the user will want to use a non-default To address.
      try {
        var To = folderAccountCompose.getPrefs(folderURI, "to.");
        if (To) {
          newDetails.to = To;
        }
      } catch (e) {} // Nothing to do, just leave to: at default value
    }

    // Reply-To: Set everytime
    // (by Jakob)

    if ((details.type == "new" || folderAccountCompose.getPrefs(folderURI, "replyToOnReplyForward.")) &&
      details.replyTo.length == 0) {
      try {
        var replyTo = folderAccountCompose.getPrefs(folderURI, "replyTo.");
        if (replyTo) {
          newDetails.replyTo = replyTo;
        }
      } catch (e) {} // Nothing to do, just leave to: at default value
    }

    // Set CC for Replies

    if (details.type == "reply" && details.cc.length == 0) {
      try {
        var To = folderAccountCompose.getPrefs(folderURI, "to.");
        var addToCcOnReply = folderAccountCompose.getPrefs(folderURI, "addToCcOnReply.");
        if (addToCcOnReply == "true") {
          newDetails.cc = To;
        }
      } catch (e) {} // Nothing to do, just leave cc: at default value
    }

    // FROM:    
    // Make sure we are using the desired identity

    var FromID = folderAccountCompose.getPrefs(folderURI, "");

    var overrideReturnAddress = folderAccountCompose.getPrefs(folderURI, "overrideReturnAddress.");

    var override = true;
    // No override if this is a reply or reply-all and overrideReturnAddress is true
    if (details.type == "reply" && overrideReturnAddress == "true")
      override = false;

    // Assume the user always wants the default From, for all sorts of messages, 
    // unless they have specified one

    if (FromID && override) {
      newDetails.identityId = FromID;
    }

    return newDetails;
  },

  folderAccountStateListener: {
    NotifyComposeBodyReady: function () {},

    NotifyComposeFieldsReady: async function () {
      let tabId = WL.extension.tabManager.getWrapper(window).id;
      let details = await folderAccountCompose.notifyTools.notifyBackground({
        command: "getComposeDetails",
        tabId: tabId
      });
      let changedDetails = await folderAccountCompose.changeComposeDetails(details); // { bcc: `tabId.${tabId}@example.com` }

      await folderAccountCompose.notifyTools.notifyBackground({
        command: "setComposeDetails",
        tabId: tabId,
        details: changedDetails
      });

    },

    ComposeProcessDone: function (aResult) {},
    SaveInFolderDone: function (folderURI) {}
  }

};

function onLoad(activatedWhileWindowOpen) {
  window.gMsgCompose.RegisterStateListener(folderAccountCompose.folderAccountStateListener);
}

function onUnload(deactivatedWhileWindowOpen) {
  window.gMsgCompose.UnregisterStateListener(folderAccountCompose.folderAccountStateListener);
}

Services.scriptloader.loadSubScript("chrome://folderaccount/content/scripts/notifyTools/notifyTools.js", folderAccountCompose, "UTF-8");
