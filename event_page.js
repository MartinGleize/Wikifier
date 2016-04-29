// License terms for this source code can be found in LICENSE 

/*#############################################################################################
	UTILS: string functions, url encoding, decoding and resolving, etc...
##############################################################################################*/

function stringToUrlFormat(s) {
    // replace spaces with underscores
	var withoutSpace = s.replace(new RegExp(" ", 'g'), "_");
    // encode the rest of the special characters
    var res = encodeURI(withoutSpace);
    return res;
}

function pageTitle(url) {
	return url.substring(url.lastIndexOf("/") + 1);
}

function wikipediaTitleContains(title, text) {
	var decodedTitle = decodeURI(title);
	var partsTitle = decodedTitle.split("_");
	var partsText = text.split(" ");
	//TODO: decide if === or includes
	return partsText.every(function(t) { return partsTitle.some(function(p) { return p === t; }); });
}

function resolvedWikiUrl(baseUrl, term) {
    var cuttingPoint = baseUrl.lastIndexOf("/");
    var wikiRoot = baseUrl.substring(0, cuttingPoint);
    var res = wikiRoot + "/" + term;
    return res;
}

function resolvedWikiArticleUrl(baseUrl, rawText) {
	var wikifiedTitle = stringToUrlFormat(rawText);
	return resolvedWikiUrl(baseUrl, wikifiedTitle);
}

/*#############################################################################################
	SEARCH: search results parsing
##############################################################################################*/

var WIKIA_SEARCH_PAGE = "Special:Search?search=";
var WIKI_SEARCH_PAGE = "index.php?title=Special%3ASearch&go=Go&search=";

function resolvedWikiSearchUrl(baseUrl, text) {
	if (baseUrl.includes("wikia")) {
		return resolvedWikiUrl(baseUrl, WIKIA_SEARCH_PAGE + text);
	} else {
		return resolvedWikiUrl(baseUrl, WIKI_SEARCH_PAGE + text);
	}
}

var SEARCHRESULTS_CLASS_NAMES = [
	"searchresults",
	"result"
];
var SEARCHRESULTS_LIMIT = 20;

// [B](f: (A) ⇒ [B]): [B]  ; Although the types in the arrays aren't strict (:
Array.prototype.flatMap = function(lambda) { 
    return Array.prototype.concat.apply([], this.map(lambda)); 
};

function allSearchResultsClassStrings() {
	return SEARCHRESULTS_CLASS_NAMES.flatMap(function(s) { return [ "class='" + s, "class=\"" + s]; });
}

function getUniqueMatchingSearchResult(text, message) {
	console.log("Search results were successfully downloaded (" + message.url + ")");
	// find the start of the search results section
	var page = message.source;
	var indices = allSearchResultsClassStrings().map(function(s) { return page.indexOf(s); });
	var startIndex = indices.find(function(i) { return i >= 0; });
	if (startIndex === undefined) return null;
	// extract at most SEARCHRESULTS_LIMIT href links from there on
	var i = startIndex;
	var links = [];
	while (i < page.length && links.length < SEARCHRESULTS_LIMIT) {
		i = page.indexOf("href=\"", i + 1);
		if (i < 0) break;
		i += "href=\"".length;
		var link = page.substring(i, page.indexOf("\"", i));
		console.log("Search result extracted: " + link);
		links.push(link);
	}
	if (i < 0) {
		// no link was found
		return null;
	} else {
		// we check the end of each link for a page whose title contains the selected 'text'
		var matchingTitles = links.filter(function(l) { return wikipediaTitleContains(pageTitle(l), text); });
		//TODO: remove trailing "/" suffixes (these are usually wiki subpages)
		// remove duplicates
		matchingTitles = matchingTitles.filter(function(item, pos, a) {
			return a.indexOf(item) == pos;
		})
		// return the unique matching title, or nothing
		if (matchingTitles.length == 1)
			return matchingTitles[0];
		else
			return null;
	}
}

function checkForUniqueMatchingSearchResult(text, searchUrl, message) {
	if (message.url && message.source) {
		var matchingLink = getUniqueMatchingSearchResult(text, message);
		if (matchingLink != null) {
			// navigate to the unique matching search result
			//var url = resolvedWikiArticleUrl(searchUrl, text);
			chrome.tabs.create({ url: matchingLink });
		} else {
			// navigate to the search results page
			chrome.tabs.create({ url: searchUrl });
		}
	}
}

/*#############################################################################################
	DISPATCHING LOGIC: whether to navigate to the search url, the direct url, etc..
##############################################################################################*/

//TODO: for now, search result processing is disabled
var SIMPLE_SEARCH = false;

function navigateToFinalPage(text, url, doesntExist, parentTabPosition) {
    // opens a new tab on either the valid wiki page or the search page
    var newTabPosition = parentTabPosition + 1;
    if (doesntExist) {
        var searchPageUrl = resolvedWikiSearchUrl(url, text);
        if (SIMPLE_SEARCH) {
			chrome.tabs.create({index: newTabPosition, url: searchPageUrl});
		} else {
			downloadPage(text, searchPageUrl, checkForUniqueMatchingSearchResult);
		}
    } else {
        chrome.tabs.create({index: newTabPosition, "url": url});
    }
}

var NOT_FOUND_STRINGS = [
    "This page needs content.",
    "does not have an article with this exact name",
    "no results",
	"There is currently no text in this page.",
	"This page has been deleted."
];

function checkForPageExistence(text, downloadedUrl, message) {
    if (message.url && message.source) {
      console.log("Tentative page was successfully downloaded (" + message.url + ")");
      // look for every notfound-type strings in the source of the page
      var doesntExist = NOT_FOUND_STRINGS.some(function(elt, i, ar) { return message.source.includes(elt); });
      navigateToFinalPage(text, message.url, doesntExist, message.tabPosition);
    }
}

/*#############################################################################################
	BACKGROUND DOWNLOADING: downloads pages in the background and check them for patterns
##############################################################################################*/

function downloadPage(text, url, callback) {
    // this is done through the injection of "content_script.js" to allow an on-site XMLHttpRequest use
    // handle the response
    function handleResponse(message, sender, sendResponse) {
        //TOCHECK: necessary to remove the listener once the message has been fired, otherwise several pages open...
        chrome.runtime.onMessage.removeListener(handleResponse);
		// here, callback when the download of the next page is complete
        callback(text, url, message);
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
            // download page via content script
            chrome.tabs.executeScript(tabId, {file: 'content_script.js'}, function() {
                console.log("Injecting content_script.js in page " + currentTab.url);
                // send message containing the target url to the content script
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
    downloadPage(text, url, checkForPageExistence);
}

/*#############################################################################################
	CHROME EXTENSION CORE
##############################################################################################*/

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

var DOCUMENT_URL_PATTERNS = [ "http://*.wikia.com/*", "*://*/*wiki*", "*://*/*Wiki*" ];

var HOST_PARTS = [ ".wikia.com", ".wikipedia.org" ];
var PATH_PARTS = [ "wiki/", "wiki", "Wiki" ];

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
