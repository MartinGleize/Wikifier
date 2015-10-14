// License terms for this source code can be found in LICENSE 

// the onClicked callback function
function onClickHandler(info, tab) {
  if (info.menuItemId == "wikify") {
	console.log("The Wikifier context menu item was clicked.");
	// The goal here is to look up the selected text:
	// first directly in the wiki, as a page title
	// second, as a search in the wiki to find closely related pages
  }
};

chrome.contextMenus.onClicked.addListener(onClickHandler);

// set up context menu at install time
chrome.runtime.onInstalled.addListener(function() {
  // create a single context menu item that looks up the current selection in the current wiki/wikia
  var context = "selection";
  var title = "Look up in current wiki";
  // only enabled on wikia websites for now
  var documentUrlPatterns = ["http://*.wikia.com/*"];
  var id = chrome.contextMenus.create({
	  "title": title,
	  "contexts": [context],
	  "documentUrlPatterns": documentUrlPatterns,
	  "id": "wikify"
	});
});
