// Listen for when a tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if the URL matches Twitter/X or YouTube
    if (
      tab.url.match(/^https?:\/\/(.*\.)?(twitter\.com|x\.com|youtube\.com)/)
    ) {
      console.log('Matching site detected:', tab.url);
    }
  }
}); 