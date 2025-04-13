const AUDIO_MODES = {
  VINYL: 0,
  RADIO: 1,
  JUNK: 2
};

const BUTTON_COLOR = {
  ON: "#007bff",
  OFF: "#94c8ff"
}

document.addEventListener('DOMContentLoaded', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var currentTab = tabs[0];

    chrome.tabs.sendMessage(currentTab.id, {message: 'popupShown'}, function(item){
      if(!item){
        console.log('Failed to get the response of sendMessage');
        return;
      }

      rotateCd(item.isOn);
      switchPressedModeButton(item.mode);
    });

    
    var currentUrl = currentTab.url;
    // NOTE: Youtube の動画を一意に識別するIDを取得
    var match = currentUrl.match(/[?&]v=([^&]+)/);
    var videoId = match && match[1];

    if (videoId) {
      var thumbnailUrl = "https://i.ytimg.com/vi/" + videoId + "/mqdefault.jpg";
      $('#cdImage').attr('src', thumbnailUrl);
    } else {
      $('#cdImage').attr('src', "../images/cdFallbackImage.png");
    }
  });
});

$(document).ready(function() {
  $('#power-button').on('click', pushPowerButton);
  $('#vinyl-button').on('click', switchModeToVinyl);
  $('#radio-button').on('click', switchModeToRadio);
  $('#junk-button').on('click', switchModeToJunk);
});

function pushPowerButton() {
  chrome.tabs.query( {active: true, currentWindow: true}, function(tabs){
    chrome.tabs.sendMessage(tabs[0].id, {message: 'powerButtonClicked'}, function(item){
      if(!item){
        console.log('Failed to get the response of sendMessage');
        return;
      }

      rotateCd(item.isOn)
      $('#power-button').text(item.isOn ? "ON" : "OFF");
    });
  });
}

function rotateCd(isOn) {
  const cd = $('.cd');
  cd.css('animation-play-state', isOn ? 'running' : 'paused');
}

function switchModeToVinyl() {
  chrome.tabs.query( {active: true, currentWindow: true}, function(tabs){
    chrome.tabs.sendMessage(tabs[0].id, {message: 'vinylButtonClicked'}, function(item) {
      if(!item) {
        console.log('Failed to get the response of sendMessage');
        return;
      }

      switchPressedModeButton(item.mode);
    });
  });
}

function switchModeToRadio() {
  chrome.tabs.query( {active: true, currentWindow: true}, function(tabs){
    chrome.tabs.sendMessage(tabs[0].id, {message: 'radioButtonClicked'}, function(item) {
      if(!item) {
        console.log('Failed to get the response of sendMessage');
        return;
      }

      switchPressedModeButton(item.mode);
    });
  });
}

function switchModeToJunk() {
  chrome.tabs.query( {active: true, currentWindow: true}, function(tabs){
    chrome.tabs.sendMessage(tabs[0].id, {message: 'junkButtonClicked'}, function(item) {
      if(!item) {
        console.log('Failed to get the response of sendMessage');
        return;
      }

      switchPressedModeButton(item.mode);
    });
  });
}

function switchPressedModeButton(mode) {
  let vinylButtonColor = BUTTON_COLOR.OFF;
  let radioButtonColor = BUTTON_COLOR.OFF;
  let junkButtonColor = BUTTON_COLOR.OFF;

  switch (mode) {
    case AUDIO_MODES.VINYL: 
      vinylButtonColor = BUTTON_COLOR.ON;
      break;
    case AUDIO_MODES.RADIO:
      radioButtonColor = BUTTON_COLOR.ON;
      break;
    case AUDIO_MODES.JUNK:
      junkButtonColor = BUTTON_COLOR.ON;
      break;
  }

  $('#vinyl-button').css("background-color", vinylButtonColor);
  $('#radio-button').css("background-color", radioButtonColor);
  $('#junk-button').css("background-color", junkButtonColor);
}
