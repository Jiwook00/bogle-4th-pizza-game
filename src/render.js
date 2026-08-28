// ============================================================
// 렌더링 — 매장 카운터 시점 배경(실루엣), 피자/조각, 칼 궤적, HUD.
// 디테일 말고 실루엣으로만.
// ============================================================

import { PALETTE } from "./config.js";
import { drawReactionFace } from "./characters.js";

// 이미지 캐시 — src별로 한 번만 로드. 로드 완료 전엔 null 취급(벡터 폴백).
const _imgCache = {};
export function getImage(src) {
  if (!src) return null;
  if (!_imgCache[src]) {
    const img = new Image();
    img.src = src;
    _imgCache[src] = img;
  }
  return _imgCache[src];
}

// 피자 원판 자동 검출 — 배경(대리석/검정)이나 크기가 제각각이어도 보정.
// '따뜻한 색(주황/갈색/치즈)' 픽셀의 경계 상자로 중심·반지름을 구한다.
// 결과를 img._fit = { cx, cy, r } (이미지 원본 px)로 캐시. 실패 시 88% 원판 가정.
function computeFit(img) {
  if (img._fit) return img._fit;
  const W = img.naturalWidth,
    H = img.naturalHeight;
  const fallback = { cx: W / 2, cy: H / 2, r: (Math.min(W, H) / 2) * 0.88 };
  try {
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const c = cv.getContext("2d", { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    const data = c.getImageData(0, 0, W, H).data;
    let minX = W,
      minY = H,
      maxX = 0,
      maxY = 0,
      hit = 0;
    const step = 3; // 샘플 간격(속도)
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        const i = (y * W + x) * 4;
        const a = data[i + 3];
        if (a < 60) continue; // 투명 배경 제외
        const r = data[i],
          g = data[i + 1],
          b = data[i + 2];
        // 따뜻한 음식색: R이 B보다 확실히 큼 (주황/갈색/치즈). 흰/회색 대리석·검정 제외
        if (r - b < 18) continue;
        if (r < 60) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        hit++;
      }
    }
    if (hit < 50) {
      img._fit = fallback;
      return fallback;
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    // 원판 반지름 = 경계 상자 큰 쪽의 절반(가장자리까지 덮어 배경 노출 방지)
    const r = Math.max(maxX - minX, maxY - minY) / 2;
    img._fit = { cx, cy, r };
    return img._fit;
  } catch {
    img._fit = fallback; // getImageData 실패(예: 미로드) 시 폴백
    return fallback;
  }
}

export function drawBackground(ctx, W, H) {
  ctx.save();

  // 벽/카운터 그라디언트
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#241a12");
  g.addColorStop(1, PALETTE.bg);
  ctx.fillStyle = g;
  ctx.fillRect(-10, -10, W + 20, H + 20);

  // 상단 탭 핸들 실루엣 (맥주 탭)
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  for (let i = 0; i < 4; i++) {
    const x = W * 0.12 + i * W * 0.13;
    ctx.fillRect(x, -10, 10, 46);
    ctx.beginPath();
    ctx.arc(x + 5, 40, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  // 카운터 상판
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(-10, H * 0.72, W + 20, H);

  ctx.restore();
}

// 피자 조각 그리기. explode 0~1 로 벌어짐.
// opts:
//   base    = 벡터 채움색(이미지 없을 때). 기본 오렌지.
//   image   = 피자 top-down 이미지(HTMLImageElement). 있으면 조각별 clip 후 drawImage.
//   radius  = 피자 반지름(이미지→기하 정렬용).
export function drawPieces(
  ctx,
  pieces,
  center,
  explode = 0,
  showCrumbColor = false,
  opts = {},
) {
  const {
    base = PALETTE.orange,
    image = null,
    radius = 0,
    pending = false,
  } = opts;
  const useImg = image && image.complete && image.naturalWidth && radius > 0;
  // 검출된 원판(fit.r px)을 게임 반지름에 맞춰 스케일 → 배경/크기 차이 자동 보정
  let dw = 0,
    dh = 0,
    dx0 = 0,
    dy0 = 0;
  if (useImg) {
    const fit = computeFit(image);
    const scale = radius / fit.r;
    dw = image.naturalWidth * scale;
    dh = image.naturalHeight * scale;
    dx0 = center.x - fit.cx * scale;
    dy0 = center.y - fit.cy * scale;
  }

  for (const p of pieces) {
    const ox = p.ox * explode;
    const oy = p.oy * explode;
    ctx.save();
    ctx.translate(ox, oy);

    ctx.beginPath();
    ctx.moveTo(p.poly[0].x, p.poly[0].y);
    for (let i = 1; i < p.poly.length; i++)
      ctx.lineTo(p.poly[i].x, p.poly[i].y);
    ctx.closePath();

    if (useImg && !(p.isCrumb && showCrumbColor)) {
      // 조각 모양으로 잘라 이미지를 그림 (조각이 자기 몫의 이미지를 들고 나감)
      ctx.save();
      ctx.clip();
      ctx.drawImage(image, dx0, dy0, dw, dh);
      ctx.restore();
      // 잘린 면을 살짝 표시(조각 벌어질 때 경계 보이게)
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.stroke();
    } else if (pending && !(p.isCrumb && showCrumbColor)) {
      // 이미지 로딩 중: 옛 피자처럼 안 보이게 중립 도우판(토핑 없음)만
      ctx.fillStyle = PALETTE.cream;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = PALETTE.crust;
      ctx.stroke();
    } else {
      // 벡터 폴백: 크러스트 테두리 + 치즈 채움
      ctx.fillStyle = p.isCrumb && showCrumbColor ? "#8a6a3a" : base;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = PALETTE.crust;
      ctx.stroke();
    }
    ctx.restore();
  }
}

// 토핑 점(장식) — 피자 중앙 기준 고정 위치.
// spec.dots = [{ color, r(상대반지름), n(개수) }] 로 메뉴별 토핑을 뿌린다.
// spec 없으면 기존 단색 점 폴백. 시드 기반이라 라운드마다 위치 고정.
export function drawToppings(ctx, center, r, seed = 1, spec = null) {
  ctx.save();
  let s = seed * 9301 + 49297;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;

  const dots = spec?.dots ?? [{ color: PALETTE.orangeDeep, r: 0.05, n: 14 }];
  for (const d of dots) {
    ctx.fillStyle = d.color;
    for (let i = 0; i < d.n; i++) {
      const ang = rnd() * Math.PI * 2;
      const rad = Math.sqrt(rnd()) * r * 0.82;
      const x = center.x + Math.cos(ang) * rad;
      const y = center.y + Math.sin(ang) * rad;
      ctx.beginPath();
      ctx.arc(x, y, r * d.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// 진행 중 칼 궤적 — 손가락이 슥 지나간 자리를 점선으로
export function drawStroke(ctx, points) {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.setLineDash([2, 6]);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.restore();
}

// 리액션 캐릭터 (조각 위)
export function drawReactions(ctx, reactions, appear) {
  for (const rx of reactions) {
    if (!rx.show) continue;
    const pop = Math.min(1, appear); // 0~1
    const r = rx.r * (0.6 + 0.4 * pop);
    ctx.save();
    ctx.globalAlpha = pop;
    drawReactionFace(ctx, rx.x, rx.y, r, rx.expr);
    ctx.restore();
  }
}
