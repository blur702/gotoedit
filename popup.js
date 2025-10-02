document.addEventListener('DOMContentLoaded', () => {
  const captureAndPrepareButton = document.getElementById('captureAndPrepareButton');
  const adminLoginButton = document.getElementById('adminLoginButton');
  const logoutAndAdminLoginButton = document.getElementById('logoutAndAdminLoginButton');
  const goToStoredEditButton = document.getElementById('goToStoredEditButton');
  const logoutButton = document.getElementById('logoutButton');
  const clearStoredUrlButton = document.getElementById('clearStoredUrlButton');
  const optionsButton = document.getElementById('optionsButton');

  if (optionsButton) {
    optionsButton.addEventListener('click', () => {
      chrome.tabs.create({ url: 'options.html' });
    });
  }

  // Function to update button visibility based on stored URL
  const updateButtonVisibility = () => {
    chrome.storage.local.get(['preparedEditUrl'], (result) => {
      if (result.preparedEditUrl) {
        if (captureAndPrepareButton) captureAndPrepareButton.style.display = 'none';
        if (adminLoginButton) adminLoginButton.style.display = 'none';
        if (logoutAndAdminLoginButton) logoutAndAdminLoginButton.style.display = 'none';
        if (goToStoredEditButton) goToStoredEditButton.style.display = 'block';
        if (clearStoredUrlButton) clearStoredUrlButton.style.display = 'block';
      } else {
        if (captureAndPrepareButton) captureAndPrepareButton.style.display = 'block';
        if (adminLoginButton) adminLoginButton.style.display = 'block';
        if (logoutAndAdminLoginButton) logoutAndAdminLoginButton.style.display = 'block';
        if (goToStoredEditButton) goToStoredEditButton.style.display = 'none';
        if (clearStoredUrlButton) clearStoredUrlButton.style.display = 'none';
      }
    });
  };

  const prepareAndRedirect = (loginPath) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return; // Exit if no active tab
      const currentUrl = tabs[0].url;
      // Prevent running on chrome:// or edge:// pages
      if (currentUrl.startsWith('chrome://') || currentUrl.startsWith('edge://')) {
        console.log("Cannot run on special browser pages.");
        return;
      }

      chrome.storage.local.get({ urls: [] }, (result) => {
        const savedUrls = result.urls;
        const currentUrlObj = new URL(currentUrl);
        const currentHostname = currentUrlObj.hostname.replace(/^www\./, '');

        let matchedUrl = null;
        for (const savedUrl of savedUrls) {
          try {
            const publicUrl1Hostname = new URL(savedUrl.publicUrl1).hostname.replace(/^www\./, '');
            const publicUrl2Hostname = savedUrl.publicUrl2 ? new URL(savedUrl.publicUrl2).hostname.replace(/^www\./, '') : null;

            if (currentHostname === publicUrl1Hostname || (publicUrl2Hostname && currentHostname === publicUrl2Hostname)) {
              matchedUrl = savedUrl;
              break;
            }
          } catch (e) {
            console.error("Invalid URL in storage:", savedUrl, e);
          }
        }

        if (matchedUrl) {
          let baseEditUrl = matchedUrl.editUrl;
          if (baseEditUrl.endsWith('/user')) {
            baseEditUrl = baseEditUrl.slice(0, -5);
          }
          if (baseEditUrl.endsWith('/')) {
            baseEditUrl = baseEditUrl.slice(0, -1);
          }

          const originalPath = currentUrlObj.pathname + currentUrlObj.search + currentUrlObj.hash;
          const targetLoginUrl = baseEditUrl + loginPath;
          const preparedEditUrlForSecondButton = baseEditUrl + originalPath;

          // Store the URL for the second button
          chrome.storage.local.set({ 'preparedEditUrl': preparedEditUrlForSecondButton }, () => {
            // Redirect to the login page immediately after capture
            chrome.tabs.update(tabs[0].id, { url: targetLoginUrl });

            // Update button visibility in the popup
            updateButtonVisibility();
          });
        } else {
          // Fallback to old logic if no match is found
          const urlObj = new URL(currentUrl);
          let targetLoginUrl;
          let preparedEditUrlForSecondButton;

          const hostnameParts = urlObj.hostname.split('.');
          const protocol = urlObj.protocol;
          const originalPath = urlObj.pathname + urlObj.search + urlObj.hash;

          if (hostnameParts[0].startsWith('edit-')) {
            targetLoginUrl = `${protocol}//${urlObj.hostname}${loginPath}`;
            preparedEditUrlForSecondButton = currentUrl;
          } else {
            const memberName = hostnameParts[0];
            const domain = hostnameParts.slice(1).join('.');
            targetLoginUrl = `${protocol}//edit-${memberName}.${domain}${loginPath}`;
            preparedEditUrlForSecondButton = `${protocol}//edit-${memberName}.${domain}${originalPath}`;
          }

          chrome.storage.local.set({ 'preparedEditUrl': preparedEditUrlForSecondButton }, () => {
            chrome.tabs.update(tabs[0].id, { url: targetLoginUrl });
            updateButtonVisibility();
          });
        }
      });
    });
  };

  // Initial update of button visibility
  updateButtonVisibility();

  // Inject content script to find logout link
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id && tabs[0].url && !tabs[0].url.startsWith('chrome://') && !tabs[0].url.startsWith('edge://')) {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          files: ['getLogoutLink.js'],
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error('Script injection failed:', chrome.runtime.lastError.message);
            if (logoutButton) logoutButton.style.display = 'none'; // Hide logout button if script fails
          }
        }
      );
    }
  });

  // Listener for messages from content script (getLogoutLink.js)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'logoutLinkFound') {
      if (request.logoutUrl) {
        if (logoutButton) {
          logoutButton.dataset.logoutUrl = request.logoutUrl; // Store URL in button's dataset
          logoutButton.style.display = 'block';
          logoutAndAdminLoginButton.disabled = false;
        }
      } else {
        if (logoutButton) logoutButton.style.display = 'none';
        if (logoutAndAdminLoginButton) logoutAndAdminLoginButton.disabled = true;
      }
    }
  });

  if (captureAndPrepareButton) {
    captureAndPrepareButton.addEventListener('click', () => {
      prepareAndRedirect('/user');
    });
  }

  if (adminLoginButton) {
    adminLoginButton.addEventListener('click', () => {
      prepareAndRedirect('/user/login');
    });
  }

  if (logoutAndAdminLoginButton) {
    logoutAndAdminLoginButton.addEventListener('click', () => {
      const logoutUrl = logoutButton.dataset.logoutUrl;
      if (logoutUrl) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0] && tabs[0].id) {
            const urlObj = new URL(logoutUrl);
            let targetLoginUrl;

            const hostnameParts = urlObj.hostname.split('.');
            const protocol = urlObj.protocol;

            if (hostnameParts[0].startsWith('edit-')) {
              targetLoginUrl = `${protocol}//${urlObj.hostname}/user/login`;
            } else {
              const memberName = hostnameParts[0];
              const domain = hostnameParts.slice(1).join('.');
              targetLoginUrl = `${protocol}//edit-${memberName}.${domain}/user/login`;
            }

            // First, go to the logout URL
            chrome.tabs.update(tabs[0].id, { url: logoutUrl });

            // After 10 seconds, go to the admin login page
            setTimeout(() => {
              chrome.tabs.update(tabs[0].id, { url: targetLoginUrl });
            }, 10000);
          }
        });
      } else {
        alert('No logout link found on this page.');
      }
    });
  }

  if (goToStoredEditButton) {
    goToStoredEditButton.addEventListener('click', () => {
      chrome.storage.local.get(['preparedEditUrl'], (result) => {
        const targetUrl = result.preparedEditUrl;
        if (targetUrl) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
              chrome.tabs.update(tabs[0].id, { url: targetUrl });
              // Clear the stored URL after use
              chrome.storage.local.remove(['preparedEditUrl'], () => {
                updateButtonVisibility();
              });
            }
          });
        } else {
          alert('No edit URL prepared. Please capture one first.');
        }
      });
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      const logoutUrl = logoutButton.dataset.logoutUrl;
      if (logoutUrl) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0] && tabs[0].id) {
            const urlObj = new URL(logoutUrl);
            const rootUrl = urlObj.protocol + '//' + urlObj.hostname;
            chrome.tabs.update(tabs[0].id, { url: logoutUrl });
            setTimeout(() => {
              chrome.tabs.update(tabs[0].id, { url: rootUrl });
            }, 5000);
          }
        });
      } else {
        alert('No logout link found on this page.');
      }
    });
  }

  if (clearStoredUrlButton) {
    clearStoredUrlButton.addEventListener('click', () => {
      chrome.storage.local.remove(['preparedEditUrl'], () => {
        updateButtonVisibility();
      });
    });
  }
});