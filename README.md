# Folder Account

Originally developed by Christopher Eykamp, updated by Hartmut Welpmann [:welpy-cw]

A Thunderbird extension that makes it easy to manage multiple return addresses.

Lets you associate user accounts and identities with specific folders. Great for multiple users sharing TB, or for managing mailing lists:

You can choose which of your accounts or identities will be used when composing, replying or forwarding mail based on which folder is currently selected. An example where this might be useful is when two people share a set of folders. You could configure TB to set a different return address for you when working with your folders, and for the other user when working with theirs. Alternatively, if you use a different address for a mailing list, you can use this extension to set your return address accordingly when working with the list's folder.

You can also set a default 'To' (as well as an additional 'Reply-To') address for newly composed messages based on which folder you are working in. This can be very useful for mailing lists - if you create a new message in the mailing list folder, your message would automatically be addressed correctly.

Various settings are available for replies/forwarding. In addition, if the current folder does not have specific addresses specified, the extension will check the parent folder, so you can control the settings for an entire branch of your folder tree at once.

Thunderbird lays out a reply or forward (reply above or below the quote, signature position, quoting, HTML or plain text) according to the identity that is active when the compose window opens, and does not redo this when the identity is changed afterwards. If you enable "Rebuild replies and forwards with the composition settings of the folder identity" in the extension's options, the compose window is reopened with the folder's identity, so these settings are applied as well. The window briefly flickers when this happens, and a reply always quotes the whole message, even if only part of it was selected.

Please submit issues at the project's [GitHub page](https://github.com/Welpy-cw/Folder-Account)
