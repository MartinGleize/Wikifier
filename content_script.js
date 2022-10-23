function downloadNextPage(message, sender, sendResponse) {
	var url = message.url;
	var extensionId = message.extensionId;
	var tabPosition = message.tabPosition;
    
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