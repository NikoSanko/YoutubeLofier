/**
 * CD画像を読み込む
 * 再生タブが Youtube/Youtube Music の場合はサムネを取得する
 */
document.addEventListener('DOMContentLoaded', function () {
  console.log("Loaded!");
  // タブの情報を取得
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    // rotateすべきかon/offを取得
    chrome.tabs.sendMessage(tabs[0].id, {message: 'popupShown'}, function(item){
    // sendMessageのレスポンスが( item で取得できるのでそれを使って処理する
      if(!item){
        alert('failed in getting the response of sendMessage');
        return;
      }
      console.log("response: " + item.message)
      console.log("response: " + item.mode)
      rotateCd(item.message == "ON")
      switch (item.mode) {
        case 0:
          $('#vinyl-button').on('click', switchModeToVinyl);
          break;
        case 1:
          $('#radio-button').on('click', switchModeToRadio);
          break;
        case 2:
          $('#gunk-button').on('click', switchModeToGunk);
          break;
        default:
          break;
      }
    });
    // 最初にアクティブなタブのURLを取得
    var currentTab = tabs[0];
    var currentUrl = currentTab.url;

    console.log('現在のタブのURL:', currentUrl);
    
    var match = currentUrl.match(/[?&]v=([^&]+)/);
    var videoId = match && match[1];

    console.log("Video ID:", videoId);
    if (videoId) {
      var thumbnailUrl = "https://i.ytimg.com/vi/" + videoId + "/mqdefault.jpg";
      console.log(thumbnailUrl);
      $('#cdImage').attr('src', thumbnailUrl);
    } else {
      $('#cdImage').attr('src', "images/lasa.jpg");
    }
  });
});

// ボタン押下時の処理を設定
$(document).ready(function() {
  // $('#power-button').on('click', rotateCd);
  $('#power-button').on('click', pushPowerButton);

  $('#vinyl-button').on('click', switchModeToVinyl);
  $('#radio-button').on('click', switchModeToRadio);
  $('#gunk-button').on('click', switchModeToGunk);
});

// ボタンをクリックしたときにCDの回転をトグルする関数
function rotateCd(isOn) {
  console.log("CD rotate")
  const cd = $('.cd');
  console.log("isOn: " + isOn)
  cd.css('animation-play-state', isOn ? 'running' : 'paused');
}

function pushPowerButton() {
  chrome.tabs.query( {active: true, currentWindow: true}, function(tabs){
    // 取得したタブid(tabs[0].id)を利用してsendMessageする
    chrome.tabs.sendMessage(tabs[0].id, {message: 'onOffButtonClicked'}, function(item){
      // sendMessageのレスポンスが item で取得できるのでそれを使って処理する
      if(!item){
        alert('failed in getting the response of sendMessage');
        return;
      }
      console.log("response: " + item.message)
      rotateCd(item.message == "ON")
      $('#power-button').text(item.message);
    });
  });
}

/**
 * Vinylモードに切り替え
 */
function switchModeToVinyl() {
  console.log("POOOO")
  chrome.tabs.query( {active: true, currentWindow: true}, function(tabs){
    chrome.tabs.sendMessage(tabs[0].id, {message: 'vinylButtonClicked'}, function(item) {
      if(!item) {
        alert('failed in getting the response of sendMessage');
        return;
      }
      if (item.message == "ON") {
        console.log(item.message);
        $('#vinyl-button').css("background-color", "#007bff")
        $('#radio-button').css("background-color", "#94c8ff")
        $('#gunk-button').css("background-color", "#94c8ff")
      }
    });
  });
}

/**
 * Radioモードに切り替え
 */
function switchModeToRadio() {
  chrome.tabs.query( {active: true, currentWindow: true}, function(tabs){
    chrome.tabs.sendMessage(tabs[0].id, {message: 'radioButtonClicked'}, function(item) {
      if(!item) {
        alert('failed in getting the response of sendMessage');
        return;
      }
      if (item.message == "ON") {
        console.log(item.message);
        $('#vinyl-button').css("background-color", "#94c8ff")
        $('#radio-button').css("background-color", "#007bff")
        $('#gunk-button').css("background-color", "#94c8ff")
      }
    });
  });
}

/**
 * Gunkモードに切り替え
 */
function switchModeToGunk() {
  chrome.tabs.query( {active: true, currentWindow: true}, function(tabs){
    chrome.tabs.sendMessage(tabs[0].id, {message: 'gunkButtonClicked'}, function(item) {
      if(!item) {
        alert('failed in getting the response of sendMessage');
        return;
      }
      if (item.message == "ON") {
        console.log(item.message);
        $('#vinyl-button').css("background-color", "#94c8ff")
        $('#radio-button').css("background-color", "#94c8ff")
        $('#gunk-button').css("background-color", "#007bff")
      }
    });
  });
}

class PopupController {
  constructor() {
    this.currentTab = null;
    this.videoId = null;
  }

  async initialize() {
    await this.setupCurrentTab();
    this.setupEventListeners();
    await this.loadInitialState();
    await this.setupThumbnail();
  }

  async setupCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tabs[0];
  }

  setupEventListeners() {
    $('#power-button').on('click', () => this.handlePowerButton());
    $('#vinyl-button').on('click', () => this.handleModeSwitch('vinyl'));
    $('#radio-button').on('click', () => this.handleModeSwitch('radio'));
    $('#gunk-button').on('click', () => this.handleModeSwitch('gunk'));
  }

  async loadInitialState() {
    const response = await this.sendMessageToTab('popupShown');
    if (response) {
      this.updateUIState(response);
    }
  }

  updateUIState(state) {
    this.rotateCd(state.message === "ON");
    this.updateModeButtons(state.mode);
  }

  async handlePowerButton() {
    const response = await this.sendMessageToTab('onOffButtonClicked');
    if (response) {
      this.rotateCd(response.message === "ON");
      $('#power-button').text(response.message);
    }
  }

  // ... 他のメソッド
}

// DOMContentLoadedイベントで初期化
document.addEventListener('DOMContentLoaded', () => {
  const controller = new PopupController();
  controller.initialize();
});