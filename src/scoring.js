// ============================================================
// 채점 — 공평도(최소조각÷최대조각), 시간계수, 최소칼질 보너스,
// 그리고 기획서의 "예상되는 구멍들" 처리.
// ============================================================

import { SCORE, MIN_CUTS } from "./config.js";

// pieces: [{area, ...}], order: 주문 조각 수, remaining/limit: 시간, cuts: 칼질 횟수
// 반환: { score, fairness, timeCoeff, bonus, counted, crumbs, status, shares }
export function scoreRound({ pieces, order, remaining, limit, cuts }) {
  const total = pieces.reduce((s, p) => s + p.area, 0);
  const crumbThreshold = total * SCORE.crumbRatio;

  // 극소 조각(부스러기)은 조각으로 세지 않음
  const counted = pieces.filter((p) => p.area >= crumbThreshold);
  const crumbs = pieces.filter((p) => p.area < crumbThreshold);

  const n = counted.length;
  const areas = counted.map((p) => p.area);
  const minA = Math.min(...areas);
  const maxA = Math.max(...areas);

  // 공평도: 제일 작은 조각이 제일 큰 조각의 몇 %인가
  let fairness = maxA > 0 ? (minA / maxA) * 100 : 0;

  // 공정 몫 = 전체 / 주문수. 캐릭터 리액션용 비율.
  const fairShare = total / order;
  const shares = counted.map((p) => p.area / fairShare);

  let status = "ok";

  // 구멍 1: 주문 초과 — 공평도 50%만
  if (n > order) {
    fairness *= SCORE.overcutPenalty;
    status = "over";
  }

  // 구멍 3: 시간 초과로 조각 부족 — 부족분만큼 감점
  const timedOut = limit != null && remaining <= 0;
  if (n < order) {
    const ratio = n / order; // 부족한 만큼 비례 감점
    fairness *= ratio;
    status = timedOut ? "timeout" : "short";
  }

  // 시간계수 (하한 0.7)
  let timeCoeff = 1;
  if (limit != null) {
    timeCoeff =
      SCORE.timeFloor +
      ((1 - SCORE.timeFloor) * Math.max(0, remaining)) / limit;
  }

  // 최소 칼질 보너스: 정확히 주문수 달성 + 이론상 최소 칼질
  let bonus = 0;
  if (n === order && cuts === MIN_CUTS[order]) {
    bonus = SCORE.minCutBonus;
  }

  const score = Math.round(fairness * timeCoeff + bonus);

  return {
    score,
    fairness: Math.round(fairness),
    timeCoeff: +timeCoeff.toFixed(2),
    bonus,
    counted,
    crumbs,
    status,
    shares,
    n,
  };
}

// 조각 비율 → 표정 키
export function faceFor(share) {
  if (share >= 1.1) return "smug"; // 능글맞게 웃음
  if (share >= 0.95) return "content"; // 무표정 만족
  if (share >= 0.8) return "brow"; // 눈썹 한쪽
  return "shock"; // 부릅뜸
}
