// ============================================================
// 효과음 — WebAudio로 즉석 합성(오디오 파일 없이 5종).
// iOS는 사용자 탭 이후에만 열리므로 시작 버튼에서 unlock() 호출.
// ============================================================

let ctx = null;
let unlocked = false;

export function unlock() {
  if (unlocked) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  // 무음 버퍼 한 번 재생해서 언락
  const buf = ctx.createBuffer(1, 1, 22050);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);
  if (ctx.state === "suspended") ctx.resume();
  unlocked = true;
}

function blip({ freq = 440, dur = 0.1, type = "sine", gain = 0.2, sweep = 0 }) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (sweep)
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, freq + sweep),
      t + dur,
    );
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise({ dur = 0.08, gain = 0.25 }) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  src.buffer = buf;
  src.connect(g).connect(ctx.destination);
  src.start(t);
}

export const sfx = {
  slice: () => noise({ dur: 0.09, gain: 0.3 }), // 칼질(스치는 소리)
  spread: () =>
    blip({ freq: 300, dur: 0.18, type: "triangle", sweep: 120, gain: 0.18 }), // 조각 벌어짐
  face: () => blip({ freq: 880, dur: 0.07, type: "square", gain: 0.12 }), // 표정 팝업(툭)
  bottle: () => {
    blip({ freq: 200, dur: 0.05, type: "sine", sweep: 600, gain: 0.25 });
    noise({ dur: 0.05, gain: 0.15 });
  }, // 병뚜껑
  win: () => {
    blip({ freq: 523, dur: 0.12 });
    setTimeout(() => blip({ freq: 784, dur: 0.18 }), 110);
  },
};
