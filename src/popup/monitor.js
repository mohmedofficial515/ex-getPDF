(function() {
    const requestPaths = document.getElementById('request-paths');

    function logRequest(url) {
        console.log('Request URL:', url);
        const listItem = document.createElement('li');
        listItem.textContent = url;
        requestPaths.appendChild(listItem);
    }

    function monitorRequests() {
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            const response = await originalFetch.apply(this, args);
            logRequest(args[0]);
            return response;
        };

        const originalXhrOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            logRequest(url);
            return originalXhrOpen.apply(this, [method, url, ...rest]);
        };
    }

    document.addEventListener('DOMContentLoaded', monitorRequests);
})();
