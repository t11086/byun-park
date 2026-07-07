// WebAudio効果音(外部音源なし・すべて合成)
let ctx = null;
let windGain = null;
let windFilter = null;
let waterGain = null;
let waterFilter = null;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();

  // 風切り音: ホワイトノイズをループ再生し、速度に応じて音量と周波数を変える
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  windFilter = ctx.createBiquadFilter();
  windFilter.type = 'bandpass';
  windFilter.frequency.value = 400;
  windFilter.Q.value = 0.8;

  windGain = ctx.createGain();
  windGain.gain.value = 0;

  src.connect(windFilter).connect(windGain).connect(ctx.destination);
  src.start();

  // 水の流れる音: 同じノイズをローパスに通してごぉーっと
  const wsrc = ctx.createBufferSource();
  wsrc.buffer = buf;
  wsrc.loop = true;
  waterFilter = ctx.createBiquadFilter();
  waterFilter.type = 'lowpass';
  waterFilter.frequency.value = 500;
  waterGain = ctx.createGain();
  waterGain.gain.value = 0;
  wsrc.connect(waterFilter).connect(waterGain).connect(ctx.destination);
  wsrc.start();
}

// v01: 0(停止)〜1(最高速)
export function setWater(v01) {
  if (!ctx) return;
  const v = Math.max(0, Math.min(1, v01));
  waterGain.gain.setTargetAtTime(0.1 + v * 0.4, ctx.currentTime, 0.1);
  waterFilter.frequency.setTargetAtTime(400 + v * 1000, ctx.currentTime, 0.1);
}

export function stopWater() {
  if (!ctx) return;
  waterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
}

// 着水の「ザッブーン!」: ノイズの塊+低いドン
export function zabun() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const len = ctx.sampleRate * 0.8;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(1500, t);
  f.frequency.exponentialRampToValueAtTime(300, t + 0.7);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.6, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(t);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(50, t + 0.4);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.35, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  osc.connect(og).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.5);
}

// 英語ボイス(明るい高めの声)。使えない環境では何もしない
export function speakEn(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.9;
    u.pitch = 1.4;
    speechSynthesis.speak(u);
  } catch (e) { /* no-op */ }
}

// v01: 0(停止)〜1(最高速)
export function setWind(v01) {
  if (!ctx) return;
  const v = Math.max(0, Math.min(1, v01));
  windGain.gain.setTargetAtTime(v * 0.45, ctx.currentTime, 0.1);
  windFilter.frequency.setTargetAtTime(300 + v * 900, ctx.currentTime, 0.1);
}

// リフトのカタカタ音
export function clack() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = 95;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.07);
}

// ⭐ゲット音: 明るい2音
export function collectSfx() {
  if (!ctx) return;
  const t = ctx.currentTime;
  [[880, 0], [1320, 0.09]].forEach(([f, d]) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t + d);
    g.gain.exponentialRampToValueAtTime(0.25, t + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.25);
    osc.connect(g).connect(ctx.destination);
    osc.start(t + d);
    osc.stop(t + d + 0.3);
  });
}

// 急降下の「ひゅ〜」: ピッチが上がって下がる
export function dropCry() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(500, t);
  osc.frequency.exponentialRampToValueAtTime(1100, t + 0.5);
  osc.frequency.exponentialRampToValueAtTime(350, t + 1.4);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, t);
  g.gain.exponentialRampToValueAtTime(0.15, t + 0.1);
  g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 1.6);
}

// ゴールのファンファーレ
export function fanfare() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const notes = [[523, 0], [659, 0.15], [784, 0.3], [1047, 0.45]];
  notes.forEach(([f, d]) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t + d);
    g.gain.exponentialRampToValueAtTime(0.3, t + d + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.5);
    osc.connect(g).connect(ctx.destination);
    osc.start(t + d);
    osc.stop(t + d + 0.55);
  });
}
