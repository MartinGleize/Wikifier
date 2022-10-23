function downloadNextPage(message, sender, sendResponse) {
	var url = message.url;
	var extensionId = message.extensionId;
	var tabPosition = message.tabPosition;
    // this unfortunately requires cross-origin request permissions
	// so we inject it in the page as a content script, which by-pass this limitation
	
	// // callback function
    // function reqListener() {
    //     console.log("Downloaded " + url);
	// 	console.log("Extension ID: " + extensionId);
    //     // send back to the extension the source of the downloaded page
	// 	chrome.runtime.sendMessage(extensionId, {"url": url, "source": this.responseText, "tabPosition": tabPosition});
    // }

	// // download the tentative page
    // var oReq = new XMLHttpRequest();
    // oReq.addEventListener("load", reqListener);
    // oReq.open("GET", url);
    // oReq.send();
    fetch(url)
        .then(response => response.text())
        .then((response) => {
            console.log("Downloaded " + url);
            console.log("Extension ID: " + extensionId);
            // send back to the extension the source of the downloaded page
            chrome.runtime.sendMessage(
                extensionId,
                {"url": url, "source": response, "tabPosition": tabPosition}
            );
        })
        .catch(err => console.log(err));
}

chrome.runtime.onMessage.addListener(downloadNextPage);