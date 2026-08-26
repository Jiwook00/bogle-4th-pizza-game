// ============================================================
// 공유 이미지 — 결과 카드를 오프스크린 캔버스에 합성해 PNG로 저장.
// 하단에 매장 문구 고정.
// ============================================================

import { PALETTE, GRADES } from "./config.js";
import { drawFace } from "./characters.js";

function gradeFor(total) {
  return GRADES.find((g) => total >= g.min) || GRADES[GRADES.length - 1];
}

export function buildShareCard({ nickname, total, rounds, rank }) {
  const W = 720,
    H = 1000;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d");

  // 배경
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#2A1E12");
  g.addColorStop(1, PALETTE.bg);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 헤더
  ctx.fillStyle = PALETTE.orange;
  ctx.font = "bold 40px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("보글하우스 4주년", W / 2, 90);
  ctx.fillStyle = PALETTE.cream;
  ctx.font = "22px system-ui, sans-serif";
  ctx.fillText("피자 공평하게 자르기", W / 2, 128);

  // 얼굴 장식 (한 줄)
  const exprs = ["smug", "content", "brow", "shock"];
  exprs.forEach((e, i) => drawFace(ctx, 180 + i * 120, 210, 44, e, i));

  // 등급
  const grade = gradeFor(total);
  ctx.fillStyle = PALETTE.green;
  ctx.font = "bold 68px system-ui, sans-serif";
  ctx.fillText(grade.label, W / 2, 340);

  // 총점
  ctx.fillStyle = PALETTE.cream;
  ctx.font = "bold 110px system-ui, sans-serif";
  ctx.fillText(String(total), W / 2, 470);
  ctx.font = "24px system-ui, sans-serif";
  ctx.fillStyle = PALETTE.crust;
  ctx.fillText("/ 575 점", W / 2, 510);

  // 닉네임 · 순위
  ctx.fillStyle = PALETTE.orange;
  ctx.font = "bold 34px system-ui, sans-serif";
  ctx.fillText(`${nickname}`, W / 2, 575);
  if (rank) {
    ctx.fillStyle = PALETTE.cream;
    ctx.font = "26px system-ui, sans-serif";
    ctx.fillText(`현재 ${rank}위`, W / 2, 612);
  }

  // 라운드별 막대
  const bx = 90,
    bw = W - 180,
    by = 660,
    bh = 40,
    gap = 14;
  ctx.textAlign = "left";
  rounds.forEach((s, i) => {
    const y = by + i * (bh + gap);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(bx, y, bw, bh);
    ctx.fillStyle = PALETTE.orange;
    ctx.fillRect(bx, y, bw * Math.min(1, s / 115), bh);
    ctx.fillStyle = PALETTE.cream;
    ctx.font = "20px system-ui, sans-serif";
    ctx.fillText(`R${i + 1}`, bx + 8, y + 27);
    ctx.textAlign = "right";
    ctx.fillText(String(s), bx + bw - 10, y + 27);
    ctx.textAlign = "left";
  });

  // 하단 매장 문구
  ctx.textAlign = "center";
  ctx.fillStyle = PALETTE.crust;
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText("craft beer & highball house", W / 2, H - 90);
  ctx.fillStyle = PALETTE.orange;
  ctx.font = "bold 24px system-ui, sans-serif";
  ctx.fillText("@bogle_house_seoul", W / 2, H - 58);
  ctx.fillStyle = PALETTE.green;
  ctx.font = "18px system-ui, sans-serif";
  ctx.fillText("4th anniversary", W / 2, H - 30);

  return cv;
}

export function downloadCard(canvas, filename = "bogle-4th.png") {
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}
