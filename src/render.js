// ============================================================
// 렌더링 — 매장 카운터 시점 배경(실루엣), 피자/조각, 칼 궤적, HUD.
// 디테일 말고 실루엣으로만.
// ============================================================

import { PALETTE } from "./config.js";
import { drawFace } from "./characters.js";

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

  // 우측 하이볼 잔 실루엣
  ctx.fillStyle = "rgba(246,217,138,0.10)";
  const gx = W * 0.86,
    gy = H * 0.08;
  ctx.fillRect(gx, gy, 46, 92);
  ctx.fillStyle = "rgba(246,217,138,0.18)";
  ctx.fillRect(gx, gy + 40, 46, 52); // 음료 채움

  // 카운터 상판
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(-10, H * 0.72, W + 20, H);

  ctx.restore();
}

// 피자 조각 그리기. explode 0~1 로 벌어짐.
export function drawPieces(
  ctx,
  pieces,
  center,
  explode = 0,
  showCrumbColor = false,
) {
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

    // 크러스트 테두리 + 치즈 채움
    ctx.fillStyle = p.isCrumb && showCrumbColor ? "#8a6a3a" : PALETTE.orange;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = PALETTE.crust;
    ctx.stroke();
    ctx.restore();
  }
}

// 토핑 점(장식) — 피자 중앙 기준 고정 위치
export function drawToppings(ctx, center, r, seed = 1) {
  ctx.save();
  let s = seed * 9301 + 49297;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  ctx.fillStyle = PALETTE.orangeDeep;
  for (let i = 0; i < 14; i++) {
    const ang = rnd() * Math.PI * 2;
    const rad = Math.sqrt(rnd()) * r * 0.82;
    const x = center.x + Math.cos(ang) * rad;
    const y = center.y + Math.sin(ang) * rad;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.05, 0, Math.PI * 2);
    ctx.fill();
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
    drawFace(ctx, rx.x, rx.y, r, rx.expr, rx.colorIdx);
    ctx.restore();
  }
}
