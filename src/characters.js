// ============================================================
// 손님 캐릭터 — 보글하우스 마스코트(얼굴+몸통) SVG 스프라이트를 조각 위에 얹음.
// 표정 4종. SVG 미로드 시에는 아래 canvas 벡터 얼굴(drawFace)로 폴백.
// ============================================================

// 표정 키 → 마스코트 SVG (512×512, 캐릭터가 상단~중앙에 배치, 아래 여백)
const FACE_SRC = {
  smug: "assets/mascot/face-smug.svg", // 많이 받음 — 엄지척 능글
  content: "assets/mascot/face-happy.svg", // 제 몫 — 만세 미소
  brow: "assets/mascot/face-meh.svg", // 조금 손해 — 팔짱 애매
  shock: "assets/mascot/face-shock.svg", // 크게 손해 — 만세 충격
};

// 스프라이트 배치 튜닝값 (모바일에서 크기/위치 조정 시 여기만 만짐)
const SPRITE_SCALE = 7.6; // r(≈radius*0.22) 대비 스프라이트 박스 한 변 배수
const ANCHOR_Y = 0.46; // 512 박스 안 캐릭터 세로 중심 비율(위 여백 고려)

const _faceCache = {};
function faceImg(expr) {
  const src = FACE_SRC[expr] || FACE_SRC.content;
  if (!_faceCache[src]) {
    const img = new Image();
    img.src = src;
    _faceCache[src] = img;
  }
  return _faceCache[src];
}

// 시작화면 동안 4장 미리 로드(첫 조각 리액션 폴백 깜빡임 방지)
export function preloadFaces() {
  Object.values(FACE_SRC).forEach((src) => {
    if (!_faceCache[src]) {
      const img = new Image();
      img.src = src;
      _faceCache[src] = img;
    }
  });
}

// 조각 위 리액션 — 마스코트 스프라이트(내부 채움은 SVG 자체에 포함).
// cx,cy = 캐릭터 시각 중심이 놓일 위치, r = 기준 반지름(pop 애니 반영됨)
export function drawReactionFace(ctx, cx, cy, r, expr) {
  const img = faceImg(expr);
  if (img && img.complete && img.naturalWidth > 0) {
    const box = r * SPRITE_SCALE;
    ctx.drawImage(img, cx - box * 0.5, cy - box * ANCHOR_Y, box, box);
  } else {
    drawFace(ctx, cx, cy, r, expr); // SVG 로드 전 폴백
  }
}

// 마스코트 브랜드 컬러 (로고 캐릭터의 하늘색 선)
const BRAND = "#37A9DF";
const BRAND_DEEP = "#2A8FC0";

// 얼굴 바탕 — 살짝 색을 달리해 손님별 미세한 변주만 준다(전부 밝은 크림 톤).
const FACE_TINTS = [
  "#FFFFFF",
  "#FFF7EA",
  "#FBEFD8",
  "#FDF3E2",
  "#FFFBF2",
  "#FBEAD0",
  "#FFF4E0",
  "#F8F1E4",
];

// 표정별 그리기. cx,cy = 얼굴 중심, r = 반지름
export function drawFace(ctx, cx, cy, r, expr, colorIdx = 0) {
  ctx.save();
  ctx.translate(cx, cy);

  // 머리 위 고깔모자(마스코트 시그니처) — 얼굴보다 먼저 그려 뒤로 감춤
  drawPartyHat(ctx, r);

  // 머리
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = FACE_TINTS[colorIdx % FACE_TINTS.length];
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.09);
  ctx.strokeStyle = BRAND;
  ctx.stroke();

  ctx.fillStyle = BRAND_DEEP;
  ctx.strokeStyle = BRAND_DEEP;
  ctx.lineWidth = Math.max(1.5, r * 0.1);
  ctx.lineCap = "round";

  const ex = r * 0.42; // 눈 x간격
  const ey = -r * 0.15; // 눈 y

  if (expr === "smug") {
    // 반달 눈 + 능글 웃음
    arcEye(ctx, -ex, ey, r * 0.22, true);
    arcEye(ctx, ex, ey, r * 0.22, true);
    ctx.beginPath();
    ctx.arc(0, r * 0.2, r * 0.3, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  } else if (expr === "content") {
    // 점 두 개 + 잔잔한 미소 (제 몫 받아 만족)
    dot(ctx, -ex, ey, r * 0.1);
    dot(ctx, ex, ey, r * 0.1);
    ctx.beginPath();
    ctx.arc(0, r * 0.2, r * 0.26, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (expr === "brow") {
    // 눈썹 한쪽만 올라감 + 애매한 입
    dot(ctx, -ex, ey, r * 0.1);
    dot(ctx, ex, ey, r * 0.1);
    line(ctx, ex - r * 0.18, ey - r * 0.35, ex + r * 0.18, ey - r * 0.22); // 오른 눈썹 up
    line(ctx, -r * 0.2, r * 0.38, r * 0.15, r * 0.32);
  } else {
    // shock — 부릅뜬 눈 + 벌린 입
    ring(ctx, -ex, ey, r * 0.2);
    ring(ctx, ex, ey, r * 0.2);
    ctx.beginPath();
    ctx.arc(0, r * 0.4, r * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = BRAND_DEEP;
    ctx.fill();
  }

  ctx.restore();
}

// 마스코트 시그니처 고깔모자 — 오른쪽으로 살짝 기운 줄무늬 삼각뿔.
function drawPartyHat(ctx, r) {
  ctx.save();
  // 머리 꼭대기에 얹고 살짝 기울임(마스코트처럼 오른쪽으로)
  ctx.translate(0, -r * 0.78);
  ctx.rotate(0.18); // ≈10°

  const halfW = r * 0.5; // 밑변 반폭
  const h = r * 1.15; // 높이
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // 모자 몸통(크림 채움 + 브랜드 외곽선)
  ctx.beginPath();
  ctx.moveTo(-halfW, 0);
  ctx.lineTo(halfW, 0);
  ctx.lineTo(0, -h);
  ctx.closePath();
  ctx.fillStyle = "#FFFBF2";
  ctx.fill();
  ctx.lineWidth = Math.max(1.4, r * 0.08);
  ctx.strokeStyle = BRAND;
  ctx.stroke();

  // 줄무늬 2줄(삼각형 안쪽을 가로지르는 짧은 선) — 위로 갈수록 좁아짐
  ctx.lineWidth = Math.max(1.2, r * 0.07);
  ctx.strokeStyle = BRAND;
  for (const t of [0.36, 0.66]) {
    const y = -h * t;
    const w = halfW * (1 - t); // 그 높이의 삼각형 반폭
    ctx.beginPath();
    ctx.moveTo(-w, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // 꼭대기 방울
  ctx.beginPath();
  ctx.arc(0, -h, r * 0.11, 0, Math.PI * 2);
  ctx.fillStyle = BRAND;
  ctx.fill();

  ctx.restore();
}

function dot(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
function ring(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}
function line(ctx, x0, y0, x1, y1) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}
// 반달 눈 (웃는 눈): 위로 볼록한 호
function arcEye(ctx, x, y, r, up) {
  ctx.beginPath();
  if (up) ctx.arc(x, y + r * 0.3, r, Math.PI, 0);
  else ctx.arc(x, y, r, 0, Math.PI);
  ctx.stroke();
}

export function colorForGuest(i) {
  return FACE_TINTS[i % FACE_TINTS.length];
}
