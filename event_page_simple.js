
var DOCUMENT_URL_PATTERNS = [ "http://*.wikia.com/*", "*://*/*wiki*", "*://*/*Wiki*" ];

var HOST_PARTS = [ ".wikia.com", ".wikipedia.org" ];
var PATH_PARTS = [ "wiki/", "wiki", "Wiki" ];

// create a single context menu item that search the current wiki for the selection
var title = "Search this wiki for \"%s\"";
browser.contextMenus.create({
	"title": title,
	"contexts": ["selection"],
	"documentUrlPatterns": DOCUMENT_URL_PATTERNS,
	"id": "wikify"
});