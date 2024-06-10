var { ExtensionCommon } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionCommon.sys.mjs"
);

var { MailServices } = ChromeUtils.importESModule(
  "resource:///modules/MailServices.sys.mjs"
);

var FolderAccount = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      FolderAccount: {
        async getRelatedMessageFolder(tabId) {
          const tabObject = context.extension.tabManager.get(tabId);
          const realTabWindow = tabObject.window;
          const folder = realTabWindow.gMessenger.msgHdrFromURI(
            realTabWindow.gMsgCompose.originalMsgURI
          ).folder;
          return context.extension.folderManager.convert(folder);
        },
        async getFolderAccountSettings() {
          const folderPrefs = new Map();
          const branch = Services.prefs.getBranch("extensions.folderaccount.");
          for (const child of branch.getChildList("")) {
            let pref;
            try {
              pref = branch.getCharPref(child);
            } catch (e) {
              continue;
            }
            const matches = child.match(
              /(?<setting>addToCcOnReply|overrideReturnAddress|replyTo(OnReplyForward)?|to)?\.?(?<folder>.*)/
            );
            const folderURI = matches.groups["folder"];
            const settingKey = matches.groups["setting"] ?? "identityId";
            if (
              /addToCcOnReply|overrideReturnAddress|replyToOnReplyForward/.test(
                settingKey
              )
            ) {
              pref = pref == "true";
            }
            folderPrefs.set(folderURI, {
              ...folderPrefs.get(folderURI),
              [settingKey]: pref,
            });
          }
          const mailFolderPrefs = new Map();
          folderPrefs.forEach((value, key) => {
            const folder = MailServices.folderLookup.getFolderForURL(key);
            const mailFolder = context.extension.folderManager.convert(folder);
            if (mailFolder) {
              mailFolderPrefs.set(mailFolder.id, value);
            }
          });
          return mailFolderPrefs;
        },
      },
    };
  }
};
