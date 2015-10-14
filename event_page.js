// License terms for this source code can be found in LICENSE 

function stringToUrlFormat(s) {
    // replace spaces with underscores
	var withoutSpace = s.replace(new RegExp(" ", 'g'), "_");
    // encode the rest of the special characters
    var res = encodeURI(withoutSpace);
    return res;
}

function resolvedWikiUrl(baseUrl, term) {
    var cuttingPoint = baseUrl.lastIndexOf("/");
    var wikiRoot = baseUrl.substring(0, cuttingPoint);
    var res = wikiRoot + "/" + term;
    return res;
}

function navigateToTentativeWikiPage(url) {
    chrome.tabs.create({"url": url});
}

// the onClicked callback function:
function onClickHandler(info, tab) {
    if (info.menuItemId == "wikify") {
        // here we look up the selected text on the current wiki, opens a new tab with the result
        var text = info.selectionText;
        var url = info.pageUrl;
        console.log("The Wikifier context menu item was clicked.");
        console.log("Selected text: " + text);
        console.log("Page url: " + url);
        // encoded wiki term
        var term = stringToUrlFormat(text);
        var newUrl = resolvedWikiUrl(url, term);
        console.log("New url: " + newUrl);
        // navigate to tentative wiki page (or search for it)
        navigateToTentativeWikiPage(newUrl);
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
