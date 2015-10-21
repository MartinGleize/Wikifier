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

var WIKIA_SEARCH_PAGE = "Special:Search?search=";
var WIKI_SEARCH_PAGE = "index.php?title=Special%3ASearch&go=Go&search=";

function resolvedWikiSearchUrl(baseUrl, text) {
	if (baseUrl.includes("wikia")) {
		return resolvedWikiUrl(baseUrl, WIKIA_SEARCH_PAGE + text);
	} else {
		return resolvedWikiUrl(baseUrl, WIKI_SEARCH_PAGE + text);
	}
}

function navigateToFinalPage(text, url, doesntExist, parentTabPosition) {
    // opens a new tab on either the valid wiki page or the search page
    var newTabPosition = parentTabPosition + 1;
    if (doesntExist) {
        var searchPageUrl = resolvedWikiSearchUrl(url, text);
        chrome.tabs.create({index: newTabPosition, url: searchPageUrl});
    } else {
        chrome.tabs.create({index: newTabPosition, "url": url});
    }
}

var NOT_FOUND_STRINGS = [
    "This page needs content.",
    "does not have an article with this exact name",
    "no results",
	"There is currently no text in this page."
];

function checkForPageExistence(text, message) {
    if (message.url && message.source) {
      console.log("Tentative page was successfully downloaded (" + message.url + ")");
      // look for every notfound-type strings in the source of the page
      var doesntExist = NOT_FOUND_STRINGS.findIndex(function(elt, i, ar) { return message.source.includes(elt); }) >= 0;
      navigateToFinalPage(text, message.url, doesntExist, message.tabPosition)
    }
}

function downloadPage(text, url) {
    // this is done through the injection of "content_script.js" to allow an on-site XMLHttpRequest use
    // handle the response: we then check for the existence of this page on the wiki
    function handleResponse(message, sender, sendResponse) {
        //TOCHECK: necessary to remove the listener once the message has been fired, otherwise several pages open...
        chrome.runtime.onMessage.removeListener(handleResponse);
        checkForPageExistence(text, message)
    }
    chrome.runtime.onMessage.addListener(handleResponse);
    // on current tab
    chrome.tabs.query(
        {currentWindow: true, active : true},
        function(tabArray){
            // get current tab id
            var currentTab = tabArray[0];
            var tabId = currentTab.id;
            var tabPosition = currentTab.index;
            // check for page existence via content script
            chrome.tabs.executeScript(tabId, {file: 'content_script.js'}, function() {
                console.log("Injecting content_script.js in page " + currentTab.url);
                // send message containing the url to the content script
                var message = {
                    "url": url,
                    "extensionId": chrome.runtime.id,
                    "tabPosition": tabPosition
                }
                chrome.tabs.sendMessage(tabId, message);
            });
        }
    );
}

function navigateToTentativeWikiPage(text, url) {
    // start with checking the page for existence
    downloadPage(text, url);
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
        navigateToTentativeWikiPage(text, newUrl);
	}
};

chrome.contextMenus.onClicked.addListener(onClickHandler);

var DOCUMENT_URL_PATTERNS = [ "http://*.wikia.com/*", "*://*/wiki/*" ];

var HOST_PARTS = [ ".wikia.com", ".wikipedia.org" ];
var PATH_PARTS = [ "wiki/" ];

// set up context menu at install time
chrome.runtime.onInstalled.addListener(function() {
	// install the rule for displaying the page action
	chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
		chrome.declarativeContent.onPageChanged.addRules([
		{
			conditions: HOST_PARTS.map(function(elt, i, ar){
				return new chrome.declarativeContent.PageStateMatcher({ pageUrl: { hostContains: elt } });
			}).concat(PATH_PARTS.map(function(elt, i, ar){
				return new chrome.declarativeContent.PageStateMatcher({ pageUrl: { pathContains: elt } });
			})),
			actions: [ new chrome.declarativeContent.ShowPageAction() ]
		}]);
	});
	// create a single context menu item that search the current wiki for the selection
	var title = "Search this wiki for \"%s\"";
	// only enabled on wikia websites for now
	var id = chrome.contextMenus.create({
		"title": title,
		"contexts": ["selection"],
		"documentUrlPatterns": DOCUMENT_URL_PATTERNS,
		"id": "wikify"
	});
});
