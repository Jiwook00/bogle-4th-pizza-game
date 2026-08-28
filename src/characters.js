// ============================================================
// 손님 캐릭터 — 원 하나에 점 두 개와 선 하나. 표정 4종.
// 색만 바꾼 같은 얼굴이면 충분(오히려 그게 더 그 게임 같다).
// canvas 2d로 직접 그림.
// ============================================================

import { PALETTE } from "./config.js";

const FACE_COLORS = [
  "#F2A65A",
  "#E8C07A",
  "#C9A66B",
  "#F2C879",
  "#E3A857",
  "#D89B6C",
  "#F0B36B",
  "#E8B872",
];

// 표정별 그리기. cx,cy = 얼굴 중심, r = 반지름
export function drawFace(ctx, cx, cy, r, expr, colorIdx = 0) {
  ctx.save();
  ctx.translate(cx, cy);

  // 머리
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = FACE_COLORS[colorIdx % FACE_COLORS.length];
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.08);
  ctx.strokeStyle = PALETTE.ink;
  ctx.stroke();

  ctx.fillStyle = PALETTE.ink;
  ctx.strokeStyle = PALETTE.ink;
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
    ctx.fillStyle = PALETTE.ink;
    ctx.fill();
  }

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
  return FACE_COLORS[i % FACE_COLORS.length];
}
