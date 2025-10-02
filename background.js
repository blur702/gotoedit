chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Check if the tab has finished loading and has a URL
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if we are on an edit site
    if (tab.url.includes('edit-')) {
      chrome.storage.local.get('preparedEditUrl', (result) => {
        if (result.preparedEditUrl) {
          // Inject a script to check for the logout link
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['getLogoutLink.js'],
          });
        }
      });
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'logoutLinkFound' && request.logoutUrl) {
    // A logout link was found, which means the user is logged in.
    // Now, let's get the preparedEditUrl and redirect.
    chrome.storage.local.get('preparedEditUrl', (result) => {
      if (result.preparedEditUrl) {
        chrome.tabs.update(sender.tab.id, { url: result.preparedEditUrl });
        // Clean up the stored URL
        chrome.storage.local.remove('preparedEditUrl');
      }
    });
  }
});