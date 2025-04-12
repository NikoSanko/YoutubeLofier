const AUDIO_MODES = {
  VINYL: 0,
  RADIO: 1,
  GUNK: 2
};

const EFFECT_TYPE = {
  EQ: "eq",
  COMPRESSOR: "compressor",
  SATURATOR: "saturator",
  GAIN: "gain"
}

const EQ_TYPE = {
  HIGHPASS: 'highpass',
  LOWPASS: 'lowpass',
  HIGHSHELF: 'highshelf',
  LOWSHELF: 'lowshelf',
}

const EFFECT_PRESETS = {
  [AUDIO_MODES.VINYL]: [
    { type: EFFECT_TYPE.SATURATOR, params: { distortionAmount: 10, sampleRate: null, mixRatio: 0.1 } },
    { type: EFFECT_TYPE.EQ, params: { type: EQ_TYPE.HIGHPASS, frequency: 20, q: 24, gain: null, mixRatio: 1 } },
    { type: EFFECT_TYPE.EQ, params: { type: EQ_TYPE.LOWPASS, frequency: 18000, q: 24, gain: null, mixRatio: 1 } },
    { type: EFFECT_TYPE.SATURATOR, params: { distortionAmount: 10, sampleRate: 0.5, mixRatio: 0.1 } },
    { type: EFFECT_TYPE.COMPRESSOR, params: { threshold: -1, knee: 40, ratio: 1.5, attack: 0.1, release: 0.5, mixRatio: 1 }},
    { type: EFFECT_TYPE.GAIN, params: { gainAmount: 1.3}}
  ],
  [AUDIO_MODES.RADIO]: [
    { type: EFFECT_TYPE.EQ, params: { type: EQ_TYPE.HIGHPASS, frequency: 150, q: 12, gain: null, mixRatio: 0.5 } },
    { type: EFFECT_TYPE.EQ, params: { type: EQ_TYPE.LOWPASS, frequency: 6700, q: 8, gain: null, mixRatio: 0.8 } },
    { type: EFFECT_TYPE.EQ, params: { type: EQ_TYPE.LOWSHELF, frequency: 500, q: null, gain: -3, mixRatio: 1 } },
    { type: EFFECT_TYPE.SATURATOR, params: { distortionAmount: 13, sampleRate: 0.25, mixRatio: 0.4 } },
    { type: EFFECT_TYPE.COMPRESSOR, params: { threshold: -3, knee: 10, ratio: 5, attack: 0, release: 0, mixRatio: 1 }},
    { type: EFFECT_TYPE.GAIN, params: { gainAmount: 1.7}}
  ],
  [AUDIO_MODES.GUNK]: [
    { type: EFFECT_TYPE.SATURATOR, params: { distortionAmount: 40, sampleRate: null, mixRatio: 0.2 } },
    { type: EFFECT_TYPE.SATURATOR, params: { distortionAmount: 30, sampleRate: null, mixRatio: 0.1 } },
    { type: EFFECT_TYPE.COMPRESSOR, params: { threshold: -6, knee: 10, ratio: 10, attack: 0, release: 0, mixRatio: 1 }},
    { type: EFFECT_TYPE.GAIN, params: { gainAmount: 1.5}}
  ]
};

class AudioProcessor {
  constructor() {
    this.on = false;
    this.mode = AUDIO_MODES.VINYL;
    this.target = null;
    this.audioSource = null;
    this.effectors = [];
    this.mixRatios = [];
    this.context = new AudioContext();
  }

  bypass() {
    try {
      if (!this.audioSource) return;
      
      this.audioSource.disconnect();
      this.audioSource.connect(this.context.destination);
    } catch (e) {
      console.error("Failed to bypass audio. Detail: ", e);
    }
  }

  clearEffectors() {
    this.effectors.forEach(effector => effector.disconnect());
    this.effectors = [];
    this.mixRatios = [];
  }

  attachEffectors() {
    this.addEffectors();
    this.connectAudioNodes();
  }

  addEffectors() {
    const preset = EFFECT_PRESETS[this.mode];
    preset.forEach(effect => {
      if (effect.type === EFFECT_TYPE.EQ) {
        this.insertEQ(effect.params);
      } else if (effect.type === EFFECT_TYPE.COMPRESSOR) {
        this.insertCompressor(effect.params);
      } else if (effect.type === EFFECT_TYPE.SATURATOR) {
        this.insertSaturator(effect.params);
      } else if (effect.type === EFFECT_TYPE.GAIN) {
        this.insertGain(effect.params);
      }
    });
  }

  insertEQ({ type, frequency, q, gain, mixRatio }) {
    const eq = this.context.createBiquadFilter();
    eq.type = type;
    eq.frequency.setValueAtTime(frequency, this.context.currentTime);
    eq.Q.setValueAtTime(q, this.context.currentTime);
    eq.gain.setValueAtTime(gain, this.context.currentTime);

    this.effectors.push(eq);
    this.mixRatios.push(mixRatio);
  }

  insertCompressor({ threshold, knee, ratio, attack, release, mixRatio }) {
    const compressor = this.context.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(threshold, this.context.currentTime);
    compressor.knee.setValueAtTime(knee, this.context.currentTime);
    compressor.ratio.setValueAtTime(ratio, this.context.currentTime);
    compressor.attack.setValueAtTime(attack, this.context.currentTime);
    compressor.release.setValueAtTime(release, this.context.currentTime);
  
    this.effectors.push(compressor);
    this.mixRatios.push(mixRatio);
  }

  insertSaturator({ distortionAmount, sampleRate, mixRatio }) {
    const saturator = this.context.createWaveShaper();
    const processedSampleRate = sampleRate ? this.context.sampleRate * sampleRate : this.context.sampleRate;
    saturator.curve = makeDistortionCurve(distortionAmount, processedSampleRate);

    this.effectors.push(saturator);
    this.mixRatios.push(mixRatio);
  }

  insertGain({ gainAmount }) {
    const gainNode = this.context.createGain();
    gainNode.gain.value = gainAmount;

    this.effectors.push(gainNode);
    this.mixRatios.push(1);
  }

  connectAudioNodes() {
    try {
      if (!this.target) return;
  
      if (!this.audioSource) {
        this.audioSource = this.context.createMediaElementSource(this.target);
      } else {
        this.audioSource.disconnect();
      }

      let currentNode = this.audioSource;
      this.effectors.forEach((effector, i) => {
        currentNode = applyEffect(currentNode, effector, this.context, this.mixRatios[i]);
      });
      currentNode.connect(this.context.destination);
    } catch (e) {
      console.error("Failed to connect audio nodes. Detail: ", e);
    }
  }
}

const audioProcessor = new AudioProcessor();

// NOTE: イベントメッセージの処理を割り振るためのハンドラー
const messageHandlers = {
  popupShown: (request, sender, sendResponse) => {
    sendResponse({
      isOn: audioProcessor.on,
      mode: audioProcessor.mode
    });
  },
  
  powerButtonClicked: (request, sender, sendResponse) => {
    audioProcessor.on = !audioProcessor.on;

    if (audioProcessor.on) {
      audioProcessor.clearEffectors();
      audioProcessor.attachEffectors();
    } else {
      audioProcessor.bypass();
    }
    
    sendResponse({ isOn: audioProcessor.on });
  },

  vinylButtonClicked: (request, sender, sendResponse) => {
    audioProcessor.mode = AUDIO_MODES.VINYL;

    if (audioProcessor.on) {
      audioProcessor.clearEffectors();
      audioProcessor.attachEffectors();
    }
    
    sendResponse({ mode: audioProcessor.mode });
  },

  radioButtonClicked: (request, sender, sendResponse) => {
    audioProcessor.mode = AUDIO_MODES.RADIO;

    if (audioProcessor.on) {
      audioProcessor.clearEffectors();
      audioProcessor.attachEffectors();
    }
    
    sendResponse({ mode: audioProcessor.mode });
  },

  gunkButtonClicked: (request, sender, sendResponse) => {
    audioProcessor.mode = AUDIO_MODES.GUNK;

    if (audioProcessor.on) {
      audioProcessor.clearEffectors();
      audioProcessor.attachEffectors();
    }
    
    sendResponse({ mode: audioProcessor.mode });
  }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handler = messageHandlers[request.message];
  if (handler) {
    handler(request, sender, sendResponse);
  }
});

/**
 * エフェクトを適用する
 * @param {AudioNode} inputNode 入力ノード
 * @param {AudioNode} effector エフェクターノード
 * @param {AudioContext} audioContext オーディオコンテキスト
 * @param {number} mixRatio エフェクトのミックス割合(0～1.0)
 * @returns {AudioNode} エフェクトを適用したノード
 */
function applyEffect(inputNode, effector, audioContext, mixRatio) {
  // NOTE: 加工後ノード、元音声ノード、最終出力ノードを作成
  const appliedNode = audioContext.createGain();
  const rawNode = audioContext.createGain();
  const outputNode = audioContext.createGain();

  inputNode.connect(effector).connect(appliedNode);
  inputNode.connect(rawNode);

  // NOTE: 加工後と元音声をミックス
  mixRatio = Math.max(0, Math.min(1, mixRatio));
  appliedNode.gain.value = mixRatio;
  rawNode.gain.value = 1 - mixRatio;
  appliedNode.connect(outputNode);
  rawNode.connect(outputNode);

  return outputNode;
}

/**
 * サチュレーションカーブを生成する関数
 * @param {number} amount ディストーションのかかり具合
 * @param {number} samplingRate サンプリングレート
 * @returns {AudioNode} エフェクタノード
 */
function makeDistortionCurve(amount, samplingRate) {
  const curve = new Float32Array(samplingRate);

  for (let i = 0; i < samplingRate; i++) {
    const x = i * 2 / samplingRate - 1;
    curve[i] = (3 + amount) * x * 20 * (Math.PI / 180) / (Math.PI + amount * Math.abs(x));
  }

  return curve;
}

window.addEventListener("play", function (e) {
  if (!audioProcessor.target) audioProcessor.target = e.target;

  if (audioProcessor.on) {
    audioProcessor.clearEffectors();
    audioProcessor.attachEffectors();
  }
}, true);
