document.addEventListener('DOMContentLoaded', () => {
  const captureAndPrepareButton = document.getElementById('captureAndPrepareButton');
  const adminLoginContainer = document.getElementById('admin-login-container');
  const adminLoginButton = document.getElementById('adminLoginButton');
  const logoutAndAdminLoginButton = document.getElementById('logoutAndAdminLoginButton');
  const goToStoredEditButton = document.getElementById('goToStoredEditButton');
  const logoutButton = document.getElementById('logoutButton');
  const clearStoredUrlButton = document.getElementById('clearStoredUrlButton');
  const optionsButton = document.getElementById('optionsButton');
  const goToRootContainer = document.getElementById('go-to-root-container');
  const goToRootLeft = document.getElementById('goToRootLeft');
  const goToRootRight = document.getElementById('goToRootRight');
  const storedUrlContainer = document.getElementById('stored-url-container');
  const storedUrlElement = document.getElementById('stored-url');
  const tabs = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  const historyTableBody = document.querySelector('#history-table tbody');

  // Tab switching logic
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = document.getElementById(tab.dataset.tab);
      tabContents.forEach(c => c.classList.remove('active'));
      target.classList.add('active');
    });
  });

  const renderHistory = () => {
    if (historyTableBody) {
      chrome.storage.local.get({ editHistory: [] }, (result) => {
        const history = result.editHistory;
        historyTableBody.innerHTML = ''; // Clear existing rows
        history.forEach(item => {
          const row = document.createElement('tr');
          const siteCell = document.createElement('td');
          const urlCell = document.createElement('td');
          const link = document.createElement('a');

          siteCell.textContent = item.website;
          link.href = item.editUrl;
          link.textContent = 'Go to Edit URL';
          link.target = '_blank';
          link.classList.add('history-link');

          urlCell.appendChild(link);
          row.appendChild(siteCell);
          row.appendChild(urlCell);
          historyTableBody.appendChild(row);
        });
      });
    }
  };

  if (goToRootLeft) {
    goToRootLeft.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          const url = new URL(tabs[0].url);
          const rootUrl = `${url.protocol}//${url.hostname}`;
          chrome.tabs.create({ url: rootUrl });
        }
      });
    });
  }

  if (goToRootRight) {
    goToRootRight.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          const url = new URL(tabs[0].url);
          const newHostname = url.hostname.replace(/^edit-/, '');
          const rootUrl = `${url.protocol}//${newHostname}`;
          chrome.windows.create({ url: rootUrl, incognito: true });
        }
      });
    });
  }

  if (optionsButton) {
    optionsButton.addEventListener('click', () => {
      chrome.tabs.create({ url: 'options.html' });
    });
  }

  const updateButtonVisibility = () => {
    chrome.storage.local.get(['preparedEditUrl'], (result) => {
      if (result.preparedEditUrl) {
        if (captureAndPrepareButton) captureAndPrepareButton.style.display = 'none';
        if (adminLoginContainer) adminLoginContainer.style.display = 'none';
        if (goToRootContainer) goToRootContainer.style.display = 'none';
        if (goToStoredEditButton) goToStoredEditButton.style.display = 'block';
        if (clearStoredUrlButton) clearStoredUrlButton.style.display = 'block';
        if (storedUrlContainer) {
          storedUrlElement.textContent = result.preparedEditUrl;
          storedUrlContainer.style.display = 'block';
        }
      } else {
        if (captureAndPrepareButton) captureAndPrepareButton.style.display = 'block';
        if (adminLoginContainer) adminLoginContainer.style.display = 'flex';
        if (goToRootContainer) goToRootContainer.style.display = 'flex';
        if (goToStoredEditButton) goToStoredEditButton.style.display = 'none';
        if (clearStoredUrlButton) clearStoredUrlButton.style.display = 'none';
        if (storedUrlContainer) storedUrlContainer.style.display = 'none';
      }
    });
  };

  const saveToHistory = (website, editUrl) => {
    chrome.storage.local.get({ editHistory: [] }, (result) => {
      let history = result.editHistory;
      history.unshift({ website, editUrl });
      if (history.length > 10) {
        history = history.slice(0, 10);
      }
      chrome.storage.local.set({ editHistory: history }, () => {
        renderHistory();
      });
    });
  };

  const prepareAndRedirect = (loginPath) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      const currentUrl = tabs[0].url;
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

          saveToHistory(currentHostname, preparedEditUrlForSecondButton);

          chrome.storage.local.set({ 'preparedEditUrl': preparedEditUrlForSecondButton }, () => {
            chrome.tabs.update(tabs[0].id, { url: targetLoginUrl });
            updateButtonVisibility();
          });
        } else {
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

          saveToHistory(urlObj.hostname, preparedEditUrlForSecondButton);

          chrome.storage.local.set({ 'preparedEditUrl': preparedEditUrlForSecondButton }, () => {
            chrome.tabs.update(tabs[0].id, { url: targetLoginUrl });
            updateButtonVisibility();
          });
        }
      });
    });
  };

  updateButtonVisibility();
  renderHistory();

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
            if (logoutButton) logoutButton.style.display = 'none';
          }
        }
      );
    }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'logoutLinkFound') {
      if (request.logoutUrl) {
        if (logoutButton) {
          logoutButton.dataset.logoutUrl = request.logoutUrl;
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

            chrome.tabs.update(tabs[0].id, { url: logoutUrl });

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