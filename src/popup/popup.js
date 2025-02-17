document.addEventListener('DOMContentLoaded', function() {
    const requestPathDisplay = document.getElementById('request-paths');
    const clearButton = document.getElementById('clear-btn');
    let requestPaths = [];

    // Function to update the displayed request paths with timestamp
    function updateRequestPaths(paths) {
        requestPathDisplay.innerHTML = paths.map(path => {
            const timestamp = new Date().toLocaleTimeString();
            return `<li class="request-item">
                      <span class="timestamp">${timestamp}</span>
                      <span class="path">${path}</span>
                      <button class="copy-btn" data-path="${path}">Copy</button>
                    </li>`;
        }).join('');

        // Add copy functionality
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const pathToCopy = this.getAttribute('data-path');
                navigator.clipboard.writeText(pathToCopy)
                    .then(() => {
                        this.textContent = 'Copied!';
                        setTimeout(() => this.textContent = 'Copy', 1500);
                    })
                    .catch(err => console.error('Failed to copy:', err));
            });
        });
    }

    // Clear all requests
    clearButton?.addEventListener('click', () => {
        requestPaths = [];
        updateRequestPaths([]);
        chrome.storage.local.clear();
    });

    // Listen for messages from the content script
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.type === 'updatePaths') {
            requestPaths = [...new Set([...requestPaths, ...request.paths])]; // Remove duplicates
            updateRequestPaths(requestPaths);
            
            // Store in chrome storage
            chrome.storage.local.set({ paths: requestPaths });
        }
    });

    // Load saved paths when popup opens
    chrome.storage.local.get(['paths'], function(result) {
        if (result.paths) {
            requestPaths = result.paths;
            updateRequestPaths(requestPaths);
        }
    });
});