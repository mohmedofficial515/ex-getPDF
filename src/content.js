const popupWindow = document.createElement('div');
popupWindow.style.position = 'fixed';
popupWindow.style.top = '50%';
popupWindow.style.left = '50%';
popupWindow.style.transform = 'translate(-50%, -50%)';
popupWindow.style.backgroundColor = 'white';
popupWindow.style.border = '1px solid black';
popupWindow.style.padding = '20px';
popupWindow.style.zIndex = '9999';
popupWindow.style.display = 'none';

document.body.appendChild(popupWindow);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'networkRequest') {
        popupWindow.textContent = `Request Path: ${request.path}`;
        popupWindow.style.display = 'block';
        setTimeout(() => {
            popupWindow.style.display = 'none';
        }, 3000);
    }
});