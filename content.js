chrome.storage.local.get(['gotoEditOriginalPath'], (result) => {
  const originalPath = result.gotoEditOriginalPath;

  if (originalPath) {
    // Clear the stored path immediately to prevent multiple redirects
    chrome.storage.local.remove(['gotoEditOriginalPath']);

    const currentUrl = window.location.href;
    const url = new URL(currentUrl);

    // Construct the new URL with the original path
    // Ensure we don't double-slash if originalPath is empty or starts with a slash
    let newPath = originalPath;
    if (newPath.startsWith('/')) {
      newPath = newPath.substring(1);
    }

    const newUrl = `${url.protocol}//${url.host}/${newPath}`;

    // Only redirect if the current URL is different from the target URL
    // This prevents infinite loops if the content script runs on the target page itself
    if (currentUrl !== newUrl) {
      window.location.replace(newUrl);
    }
  }
});