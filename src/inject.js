(function() {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.right = '0';
  container.style.width = '300px';
  container.style.height = '100%';
  container.style.backgroundColor = 'white';
  container.style.zIndex = '10000';
  container.style.overflowY = 'scroll';
  container.style.border = '1px solid black';
  container.style.padding = '10px';
  container.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
  document.body.appendChild(container);

  const title = document.createElement('h2');
  title.innerText = 'Network Requests';
  container.appendChild(title);

  const list = document.createElement('ul');
  container.appendChild(list);

  const requestPaths = document.createElement('ul');
  requestPaths.id = 'request-paths';
  requestPaths.style.listStyleType = 'none';
  requestPaths.style.padding = '0';
  container.appendChild(requestPaths);

  function logRequest(details) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = details.url;
    link.target = '_blank';
    link.innerText = `${details.method} ${details.url}`;
    item.appendChild(link);
    list.appendChild(item);

    // Inject link into requestPaths
    const li = document.createElement('li');
    li.textContent = details.url;
    li.style.padding = '5px';
    li.style.borderBottom = '1px solid #ccc';
    requestPaths.appendChild(li);
  }

  if (chrome.webRequest) {
    chrome.webRequest.onCompleted.addListener(
      logRequest,
      { urls: ["<all_urls>"] }
    );

    chrome.webRequest.onBeforeRequest.addListener(
      logRequest,
      { urls: ["<all_urls>"] }
    );
  } else {
    const errorItem = document.createElement('li');
    errorItem.innerText = 'chrome.webRequest API is not available.';
    list.appendChild(errorItem);
  }

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'logRequest') {
      logRequest(message.details);
    }
  });

  // Automatically update the list every 5 seconds
  setInterval(() => {
    container.scrollTop = container.scrollHeight;
  }, 5000);
})();