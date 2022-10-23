# Wikifier
With this Chrome/Firefox extension, search the currently browsed wiki for any selected text.

If your selected text has an exact page on the wiki, the Wikifier brings you directly to it. This is very convenient, since every interesting term on a page is not necessarily "wikilinked" (even when it might have a relevant page).

# Installation

* From the Chrome Web Store:

https://chrome.google.com/webstore/detail/wikifier/halpmadjihbhgidkaiikhieggmhjhnac

* From the Firefox Add-ons:

[coming]

# Using Wikifier

On supported sites (wikipedia.org, wikia.com, fandom.com), just highlight text you want to search, right-click (this opens the context menu) and click on "Search this wiki for [your selection]".

# For developers and advanced users

## Download (unpacked)

For unpacked loading, the simplest is to clone or to download the ZIP file of the repository.

## Installation on Chrome (unpacked)

1. Download and extract the Wikifier folder.
1. Copy `"manifest_chrome.json"` to `"manifest.json"`.
1. Open Google Chrome.
1. Type `"chrome://extensions"` in the URL bar.
1. Enable "Developer mode" in the top right.
1. Click on "Load unpacked" and target the Wikifier folder.

## Installation on Firefox (unpacked)

1. Download and extract the Wikifier folder.
1. Copy `"manifest_firefox.json"` to `"manifest.json"`.
1. Open Mozilla Firefox.
1. Type `"about:debugging#/runtime/this-firefox"` in the URL bar.
1. Click on "Load Temporary Add-on..." and target the Wikifier folder.

# License

MIT License.
Read LICENSE for more details.