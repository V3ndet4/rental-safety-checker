// Popup script for Rental Safety Checker

document.addEventListener('DOMContentLoaded', function() {
  console.log('Popup loaded!');

  // Check AI status
  chrome.storage.sync.get(['claudeApiKey'], (result) => {
    const aiStatusDiv = document.getElementById('aiStatus');
    if (result.claudeApiKey) {
      aiStatusDiv.textContent = '🤖 AI analysis: ENABLED';
      aiStatusDiv.style.background = '#d4edda';
    } else {
      aiStatusDiv.textContent = '🤖 AI analysis: DISABLED (pattern matching only)';
      aiStatusDiv.style.background = '#fff3cd';
    }
  });

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'settings.html' });
  });

  // Check if we're on a Facebook Marketplace page
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    const statusDiv = document.getElementById('status');

    if (currentTab && currentTab.url && currentTab.url.includes('facebook.com/marketplace')) {
      statusDiv.textContent = '✅ Monitoring this listing';
      statusDiv.className = 'status active';
    } else {
      statusDiv.textContent = 'ℹ️ Visit Facebook Marketplace to analyze listings';
      statusDiv.className = 'status';
    }
  });
});
