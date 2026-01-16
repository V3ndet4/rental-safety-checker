// Settings page JavaScript
document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');

  // Load saved API key
  chrome.storage.sync.get(['claudeApiKey'], (result) => {
    if (result.claudeApiKey) {
      apiKeyInput.value = result.claudeApiKey;
    }
  });

  // Save settings
  saveBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();

    // Validate API key format
    if (apiKey && !apiKey.startsWith('sk-ant-')) {
      showStatus('Invalid API key format. Should start with "sk-ant-"', 'error');
      return;
    }

    // Save to storage
    chrome.storage.sync.set({ claudeApiKey: apiKey }, () => {
      if (apiKey) {
        showStatus('✅ API key saved! AI analysis is now enabled.', 'success');
      } else {
        showStatus('✅ Settings saved. AI analysis disabled (pattern matching only).', 'success');
      }
    });
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';

    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }
});
