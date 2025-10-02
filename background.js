chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Check if the tab has finished loading and has a URL
  if (changeInfo.status === 'complete' && tab.url) {
    // Prevent execution on special browser pages
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
        return;
    }

    chrome.storage.local.get({ urls: [] }, (result) => {
        const urls = result.urls;

        if (urls && urls.length > 0) {
            try {
                const currentUrl = new URL(tab.url);
                const currentHostname = currentUrl.hostname;

                for (const stored of urls) {
                    // Normalize stored URLs to get hostnames. This handles user input that may or may not include protocols.
                    const publicUrl1Hostname = stored.publicUrl1 ? new URL('http://' + stored.publicUrl1.replace(/^https?:\/\//, '')).hostname : null;
                    const publicUrl2Hostname = stored.publicUrl2 ? new URL('http://' + stored.publicUrl2.replace(/^https?:\/\//, '')).hostname : null;
                    const editUrlHostname = stored.editUrl ? new URL('http://' + stored.editUrl.replace(/^https?:\/\//, '')).hostname : null;

                    if (!editUrlHostname) continue;

                    if (currentHostname === publicUrl1Hostname || (publicUrl2Hostname && currentHostname === publicUrl2Hostname)) {
                        // Match found. Redirect if we're not already on the edit domain.
                        if (currentHostname !== editUrlHostname) {
                            const newUrl = `${currentUrl.protocol}//${editUrlHostname}${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
                            chrome.tabs.update(tabId, { url: newUrl });
                            return; // A redirect was initiated, so we are done.
                        }
                    }
                }
            } catch (e) {
                console.error("Error processing URLs in background script:", e);
                // Fall through to original logic on error
            }
        }

        // If no redirect happened from stored URLs, run original logic.
        if (tab.url.includes('edit-')) {
          chrome.storage.local.get('preparedEditUrl', (result) => {
            if (result.preparedEditUrl) {
              chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['getLogoutLink.js'],
              });
            }
          });
        }
    });
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