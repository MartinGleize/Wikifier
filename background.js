// License terms for this source code can be found in LICENSE 

/*#############################################################################################
	UTILS: string functions, url encoding, decoding and resolving, etc...
##############################################################################################*/

function stringToUrlFormat(s) {
	// trim first
	var res = s.trim()
    // replace spaces with underscores
	res = res.replace(new RegExp(" ", 'g'), "_");
    // encode the rest of the special characters
    res = encodeURI(res);
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

const WIKIA_SEARCH_PAGE = "Special:Search?search=";
const WIKI_SEARCH_PAGE = "index.php?title=Special%3ASearch&go=Go&search=";

const WIKIA_SEARCH_URL_CONTAIN_CONDITIONS = [
	"wikia",
	".fandom.com"
];

function resolvedWikiSearchUrl(baseUrl, text) {
	if (WIKIA_SEARCH_URL_CONTAIN_CONDITIONS.some(pt => baseUrl.includes(pt))) {
		return resolvedWikiUrl(baseUrl, WIKIA_SEARCH_PAGE + text);
	} else {
		// Wikipedia changes "/wiki/" to "/w/" on searches
		baseUrl = baseUrl.replace("/wiki/", "/w/");
		return resolvedWikiUrl(baseUrl, WIKI_SEARCH_PAGE + text);
	}
}

const SEARCHRESULTS_CLASS_NAMES = [
	"searchresults",
	"result"
];
const SEARCHRESULTS_LIMIT = 20;

// [B](f: (A) ⇒ [B]): [B]  ; Although the types in the arrays aren't strict (:
Array.prototype.flatMap = function(lambda) { 
    return Array.prototype.concat.apply([], this.map(lambda)); 
};

function allSearchResultsClassStrings() {
	return SEARCHRESULTS_CLASS_NAMES.flatMap(s => [ "class='" + s, "class=\"" + s]);
}

function getUniqueMatchingSearchResult(text, message) {
	console.log("Search results were successfully downloaded (" + message.url + ")");
	// find the start of the search results section
	var page = message.source;
	var indices = allSearchResultsClassStrings().map(s => page.indexOf(s));
	var startIndex = indices.find(i => i >= 0);
	if (startIndex === undefined) return null;
	// extract at most SEARCHRESULTS_LIMIT href links from there on
	var i = startIndex;
	var links = [];
	while (i < page.length && links.length < SEARCHRESULTS_LIMIT) {
		i = page.indexOf("href=\"", i + 1);
		if (i < 0) break;
		i += "href=\"".length;
		let link = page.substring(i, page.indexOf("\"", i));
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

function checkForUniqueMatchingSearchResult(text, searchUrl, tab, message) {
	if (message.url && message.source) {
		let matchingLink = getUniqueMatchingSearchResult(text, message);
		if (matchingLink != null) {
			// navigate to the unique matching search result
			//var url = resolvedWikiArticleUrl(searchUrl, text);
			chrome.tabs.create({ url: matchingLink, index: tab.index + 1 });
		} else {
			// navigate to the search results page
			chrome.tabs.create({ url: searchUrl, index: tab.index + 1 });
		}
	}
}

/*#############################################################################################
	DISPATCHING LOGIC: whether to navigate to the search url, the direct url, etc..
##############################################################################################*/

// switch this to true to disable search result processing
const SIMPLE_SEARCH = false;

function navigateToFinalPage(text, url, doesntExist, currentTab) {
    // opens a new tab on either the valid wiki page or the search page
    var newTabPosition = currentTab.index + 1;
    if (doesntExist) {
        var searchPageUrl = resolvedWikiSearchUrl(url, text);
        if (SIMPLE_SEARCH) {
			chrome.tabs.create({index: newTabPosition, url: searchPageUrl});
		} else {
			downloadPage(text, searchPageUrl, currentTab, checkForUniqueMatchingSearchResult);
		}
    } else {
        chrome.tabs.create({index: newTabPosition, "url": url});
    }
}

var NOT_FOUND_STRINGS = [
    "This page needs content.",
    "does not have an article with this exact name",
	"does not yet have a page with this exact name",
    "no results",
	"There is currently no text in this page.",
	"This page has been deleted."
];

function checkForPageExistence(text, downloadedUrl, tab, message) {
    if (message.url && message.source) {
      console.log("Tentative page was successfully downloaded (" + message.url + ")");
      // look for every notfound-type strings in the source of the page
      let doesntExist = NOT_FOUND_STRINGS.some(function(elt, i, ar) { return message.source.includes(elt); });
      navigateToFinalPage(text, message.url, doesntExist, tab);
    }
}

/*#############################################################################################
	BACKGROUND DOWNLOADING: downloads pages in the background and check them for patterns
##############################################################################################*/

function downloadPage(text, url, tab, callback) {
    // this is done through the injection of "content_script.js" to allow an on-site XMLHttpRequest use
    // handle the response
    function handleResponse(message, sender, sendResponse) {
        //TOCHECK: necessary to remove the listener once the message has been fired, otherwise several pages open...
        chrome.runtime.onMessage.removeListener(handleResponse);
		// here, callback when the download of the next page is complete
        callback(text, url, tab, message);
    }
    chrome.runtime.onMessage.addListener(handleResponse);
    // on current tab
	chrome.scripting.executeScript(
		{
			target: {tabId: tab.id},
			files: ['content_script.js'],
		},
		() => {
			console.log("Injecting content_script.js on tab at index" + tab.index);
			// send message containing the target url to the content script
			var message = {
				"url": url,
				"extensionId": chrome.runtime.id,
				"tabPosition": tab.index
			}
			chrome.tabs.sendMessage(tab.id, message);
		}
	);
}

function navigateToTentativeWikiPage(text, url, currentTab) {
    // start with checking the page for existence
    downloadPage(text, url, currentTab, checkForPageExistence);
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
        navigateToTentativeWikiPage(text, newUrl, tab);
	}
};

chrome.contextMenus.onClicked.addListener(onClickHandler);

const DOCUMENT_URL_PATTERNS = [
	"*://*.wikipedia.org/*",
	"*://*.wikia.com/*",
	"*://*.fandom.com/*",
	"*://*/*wiki*",
	"*://*/*Wiki*"
];

// set up context menu at install time
chrome.runtime.onInstalled.addListener(function() {
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
