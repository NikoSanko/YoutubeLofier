// let lofiStatus = false; // Global status of the lo-fi effect

// // Function to inject or remove the content script
// function updateTabAudio(tabId) {
//     if (lofiStatus) {
//         // Inject the content script to apply the lo-fi effect
//         chrome.scripting.executeScript({
//             target: { tabId: tabId },
//             files: ['content.js']
//         });
//     } else {
//         // Remove the lo-fi effect
//         // Note: You might need a different approach to disable the effect,
//         // such as sending a message to the content script or reloading the tab.
//     }
// }

// // Listener for messages from the popup
// chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
//     if (request.lofiStatus !== undefined) {
//         lofiStatus = request.lofiStatus;

//         // Update all tabs
//         chrome.tabs.query({}, function (tabs) {
//             tabs.forEach(tab => {
//                 updateTabAudio(tab.id);
//             });
//         });
//     }
// });

// // Initialize the lo-fi status from storage
// chrome.storage.local.get('lofiStatus', function (data) {
//     lofiStatus = data.lofiStatus || false;
//     // Update all tabs with the initial status
//     chrome.tabs.query({}, function (tabs) {
//         tabs.forEach(tab => {
//             updateTabAudio(tab.id);
//         });
//     });
// });

// // Optional: Listen to tab updates to reapply the effect when necessary
// chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
//     if (changeInfo.status === 'complete') {
//         updateTabAudio(tabId);
//     }
// });

// chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
//     console.log("background.js message");

//     if (message.lofiStatus) {
//     console.log("background.js if内");

//       // content.jsにメッセージを送信
//       chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
//         const activeTabId = tabs[0].id;
//         chrome.tabs.sendMessage(activeTabId, { lofiStatus: true });
//       });
//     }
//   });