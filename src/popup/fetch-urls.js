document.addEventListener('DOMContentLoaded', () => {
    const requestPaths = document.getElementById('request-paths');
    requestPaths.style.listStyleType = 'none';
    requestPaths.style.padding = '0';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.webRequest.onCompleted.addListener((details) => {
            const url = new URL(details.url);
            if (url.hostname !== location.hostname && details.url.endsWith('.pbf')) {
                const li = document.createElement('li');
                li.textContent = details.url;
                li.style.padding = '5px';
                li.style.borderBottom = '1px solid #ccc';
                requestPaths.appendChild(li);

                // Download the .pbf file and convert it to GeoJSON
                fetch(details.url)
                    .then(response => response.arrayBuffer())
                    .then(buffer => {
                        const geojson = convertPbfToGeojson(buffer);
                        console.log(geojson); // Display the GeoJSON in the console
                    })
                    .catch(console.error);
            }
        }, { urls: ["<all_urls>"] });
    });
});

// Function to convert PBF to GeoJSON
function convertPbfToGeojson(buffer) {
    // Use the PBF library to decode the buffer
    const pbf = new Pbf(new Uint8Array(buffer));
    const geojson = {};
    console.log("Function to convert PBF to GeoJSON")
    // Implement the conversion logic here
    // This is a placeholder function
    // Example: geojson = somePbfToGeojsonConversionFunction(pbf);
    return geojson; // Return the converted GeoJSON
}
