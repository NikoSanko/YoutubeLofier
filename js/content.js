console.log("content.js")
// Lo-fiモード
const AUDIO_MODES = {
  VINYL: 0,
  RADIO: 1,
  GUNK: 2
};

const EFFECT_PRESETS = {
  [AUDIO_MODES.VINYL]: [
    { type: 'saturator', params: { distortionAmount: 40, sampleRate: null, mixRatio: 0.15 } },
    { type: 'eq', params: { type: 'highpass', frequency: 100, q: 12, gain: null, mixRatio: 1 } },
    { type: 'eq', params: { type: 'lowpass', frequency: 18000, q: 12, gain: null, mixRatio: 1 } },
    { type: 'eq', params: { type: 'lowshelf', frequency: 500, q: null, gain: -5, mixRatio: 1 } },
    { type: 'saturator', params: { distortionAmount: 10, sampleRate: 0.5, mixRatio: 0.1 } }
  ],
  [AUDIO_MODES.RADIO]: [
    { type: 'eq', params: { type: 'highpass', frequency: 150, q: 12, gain: null, mixRatio: 0.5 } },
    { type: 'eq', params: { type: 'lowpass', frequency: 6700, q: 8, gain: null, mixRatio: 0.8 } },
    { type: 'eq', params: { type: 'lowshelf', frequency: 500, q: null, gain: -3, mixRatio: 1 } },
    { type: 'saturator', params: { distortionAmount: 13, sampleRate: 0.25, mixRatio: 0.4 } }
  ],
  [AUDIO_MODES.GUNK]: [
    { type: 'saturator', params: { distortionAmount: 20, sampleRate: null, mixRatio: 0.2 } },
    { type: 'eq', params: { type: 'highpass', frequency: 100, q: 12, gain: null, mixRatio: 1 } },
    { type: 'eq', params: { type: 'lowpass', frequency: 18000, q: 36, gain: null, mixRatio: 1 } },
    { type: 'eq', params: { type: 'highshelf', frequency: 14000, q: null, gain: -12, mixRatio: 1 } },
    { type: 'eq', params: { type: 'lowshelf', frequency: 1000, q: null, gain: -8, mixRatio: 1 } },
    { type: 'saturator', params: { distortionAmount: 10, sampleRate: 0.1, mixRatio: 0.1 } }
  ]
};

class AudioProcessor {
  constructor() {
    this.on = false;
    this.mode = AUDIO_MODES.VINYL;
    this.targets = [];
    this.input = [];
    this.effectors = [];
    this.mixRatios = [];
    this.context = null;
  }

  initialize() {
    if (typeof AudioContext === "undefined" && typeof webkitAudioContext === "undefined") {
      console.error("Web Audio API isn't supported");
      return false;
    }
    
    if (!this.context) {
      this.context = new AudioContext();
    }
    return true;
  }

  clearEffects() {
    this.effectors = [];
    this.input.forEach(input => input.disconnect());
    this.mixRatios = [];
  }

  loadEffects() {
    if (!this.initialize()) return false;

    this.clearEffects();
    
    if (this.on) {
      const preset = EFFECT_PRESETS[this.mode];
      preset.forEach(effect => {
        if (effect.type === 'eq') {
          this.insertEQ(effect.params);
        } else if (effect.type === 'saturator') {
          this.insertSaturator(effect.params);
        }
      });
    }

    return true;
  }

  insertEQ({ type, frequency, q, gain, mixRatio }) {
    const eq = this.context.createBiquadFilter();
    eq.type = type;
    eq.frequency.setValueAtTime(frequency, this.context.currentTime);
    if (q) eq.Q.setValueAtTime(q, this.context.currentTime);
    if (gain) eq.gain.setValueAtTime(gain, this.context.currentTime);

    this.effectors.push(eq);
    this.mixRatios.push(mixRatio);
  }

  insertSaturator({ distortionAmount, sampleRate, mixRatio }) {
    const saturator = this.context.createWaveShaper();
    const actualSampleRate = sampleRate ? this.context.sampleRate * sampleRate : this.context.sampleRate;
    saturator.curve = makeDistortionCurve(distortionAmount, actualSampleRate);

    this.effectors.push(saturator);
    this.mixRatios.push(mixRatio);
  }

  attach() {
    console.log(`エフェクト適用対象数: ${this.targets.length}`);
    this.targets.forEach((target, index) => {
      const src = target.src || target.currentSrc;
      if (!src) return;

      this.setupCrossOrigin(target, src);
      this.connectAudioNodes(target, index);
    });
  }

  setupCrossOrigin(target, src) {
    if (document.location.hostname === this.getHostname(src)) return;
    
    const crossorigin = target.getAttribute("crossorigin");
    if (!crossorigin && src.substring(0, 5) !== "blob:") {
      target.setAttribute("crossorigin", "anonymous");
      if (target.src) target.src = target.src + '';
      else if (target.currentSrc) target.load();
    }
  }

  connectAudioNodes(target, index) {
    try {
      console.log("【start attaching Effectors】");
      console.log(`適用エフェクト数: ${this.effectors.length}`);

      if (!this.input[index]) {
        this.input[index] = this.context.createMediaElementSource(target);
      }

      let output = this.input[index];
      this.effectors.forEach((effect, i) => {
        output = applyEffect(output, effect, this.context, this.mixRatios[i]);
      });
      output.connect(this.context.destination);

      console.log("【all effectors attached!!!】");
    } catch (e) {
      console.error("【Failed in applying effectors】", e);
    }
  }

  getHostname(url) {
    if (url.startsWith("blob:")) {
      url = decodeURIComponent(url.replace("blob:", ''));
    }
    const match = url.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i);
    return (match && match.length > 2 && typeof match[2] === "string" && match[2].length > 0) 
      ? match[2] 
      : null;
  }
}

// シングルトンインスタンスの作成
const audioProcessor = new AudioProcessor();

// イベントハンドラー
const messageHandlers = {
  popupShown: (request, sender, sendResponse) => {
    sendResponse({ message: audioProcessor.on ? "ON" : "OFF", mode: audioProcessor.mode });
  },
  
  onOffButtonClicked: (request, sender, sendResponse) => {
    audioProcessor.on = !audioProcessor.on;
    if (audioProcessor.loadEffects()) {
      audioProcessor.attach();
    }
    sendResponse({ message: audioProcessor.on ? "ON" : "OFF" });
  },

  vinylButtonClicked: (request, sender, sendResponse) => {
    audioProcessor.mode = AUDIO_MODES.VINYL;
    if (audioProcessor.loadEffects()) {
      audioProcessor.attach();
    }
    sendResponse({ message: "ON" });
  },

  radioButtonClicked: (request, sender, sendResponse) => {
    audioProcessor.mode = AUDIO_MODES.RADIO;
    if (audioProcessor.loadEffects()) {
      audioProcessor.attach();
    }
    sendResponse({ message: "ON" });
  },

  gunkButtonClicked: (request, sender, sendResponse) => {
    audioProcessor.mode = AUDIO_MODES.GUNK;
    if (audioProcessor.loadEffects()) {
      audioProcessor.attach();
    }
    sendResponse({ message: "ON" });
  }
};

// メッセージリスナーの設定
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handler = messageHandlers[request.message];
  if (handler) {
    handler(request, sender, sendResponse);
  }
  return true;
});

/**
 * エフェクトを適用する
 * 
 * @param {AudioNode} inputNode 入力ノード
 * @param {AudioNode} effect エフェクトノード
 * @param {AudioContext} audioContext オーディオコンテキスト
 * @param {number} mixRatio エフェクトのミックス割合(0～1.0)
 * @returns {AudioNode} エフェクトを適用したノード
 */
function applyEffect(inputNode, effect, audioContext, mixRatio) {
  // 出力ノード作成
  const output = audioContext.createGain();
  // 加工後音声、元音声
  const appliedNode = audioContext.createGain();
  const rawNode = audioContext.createGain();

  inputNode.connect(effect).connect(appliedNode);
  inputNode.connect(rawNode);

  // 加工後音声と元音声のgainを調整する
  const mixRatioClamped = Math.max(0, Math.min(1, mixRatio));

  // 加工後音声のgainを設定
  appliedNode.gain.value = mixRatioClamped;
  rawNode.gain.value = 1 - mixRatioClamped;

  // 出力ノードに接続
  appliedNode.connect(output);
  rawNode.connect(output);

  return output;
}

// サチュレーションカーブを生成する関数
function makeDistortionCurve(amount, sampleRate) {
  const samples = sampleRate; // サンプリングレートを指定
  const curve = new Float32Array(samples);

  for (let i = 0; i < samples; i++) {
    const x = i * 2 / samples - 1;
    curve[i] = (3 + amount) * x * 20 * (Math.PI / 180) / (Math.PI + amount * Math.abs(x));
  }

  return curve;
}

/**
 * 音源再生時に音声を処理対象に加え、エフェクトを付与する
 */
window.addEventListener("play", function (e) {
  console.log("Play event occurred!");
  // 今後、複数対象にエフェクトをかけるかもしれないため配列にしているが、基本１つで良さそう
  audioProcessor.targets = [];
  audioProcessor.targets.push(e.target);
  // console.log("たーげ: " + audioProcessor.targets.length)

  if (audioProcessor.loadEffects()) audioProcessor.attach();
}, true);

/**
 * 画面遷移、またはタブを閉じた時に処理対象をリセットする
 */
window.addEventListener("pagehide", function (e) {
  console.log("pagehide event occurred!");
  audioProcessor.targets = [];
}, true);