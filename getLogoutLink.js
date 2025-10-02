(() => {
  const logoutLinks = [
    document.querySelector('a[href*="/user/logout"]'),
    document.querySelector('a[href*="/logout"]'),
    document.querySelector('a[data-drupal-link-system-path="user/logout"]')
  ];

  let logoutUrl = null;
  for (const link of logoutLinks) {
    if (link && link.href) {
      logoutUrl = link.href;
      break;
    }
  }

  // Send the found logout URL back to the extension
  chrome.runtime.sendMessage({ action: 'logoutLinkFound', logoutUrl: logoutUrl });
})();