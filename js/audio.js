// WebAudio効果音(外部音源なし・すべて合成)
let ctx = null;
let windGain = null;
let windFilter = null;

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
