function checkForExistenceInWiki(message) {
	var url = message.url;
	var extensionId = message.extensionId;
    // this unfortunately requires cross-origin request permissions
	// so we inject it in the page as a content script, which by-pass this limitation
	
	// callback function
    function reqListener() {
        console.log("Downloaded " + url);
		console.log("Extension ID: " + extensionId);
        // send back to the extension the source of the downloaded page
		chrome.runtime.sendMessage(extensionId, {"url": url, "source": this.responseText});
    }

	// download the tentative page
    var oReq = new XMLHttpRequest();
    oReq.addEventListener("load", reqListener);
    oReq.open("GET", url);
    oReq.send();
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	// "message" should contain the tentative url
	checkForExistenceInWiki(message);
});