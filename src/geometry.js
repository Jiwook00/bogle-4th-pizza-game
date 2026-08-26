// ============================================================
// 기하학 — 피자(원)를 고해상도 다각형으로 근사하고,
// 직선(칼질)으로 조각을 쪼갠 뒤 면적을 계산한다.
// 조각 = 다각형(점 배열). 렌더링/폭발/채점에 그대로 재사용.
// ============================================================

const CIRCLE_SEGMENTS = 160; // 원 근사 해상도

// 원형 피자 한 조각(=통짜) 다각형 생성
export function makePizza(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
    const a = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

// 신발끈 공식 — 부호 없는 면적
export function polygonArea(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

export function centroid(poly) {
  let x = 0,
    y = 0,
    a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const cross = p.x * q.y - q.x * p.y;
    a += cross;
    x += (p.x + q.x) * cross;
    y += (p.y + q.y) * cross;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-9) {
    // 퇴화 — 정점 평균으로 대체
    let mx = 0,
      my = 0;
    for (const p of poly) {
      mx += p.x;
      my += p.y;
    }
    return { x: mx / poly.length, y: my / poly.length };
  }
  return { x: x / (6 * a), y: y / (6 * a) };
}

// 점 p가 직선 a→b의 어느 쪽인지 (부호 있는 값)
function side(a, b, p) {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
}

// 선분 교점 (직선 a-b 위에서 seg s0-s1 이 교차하는 지점)
function intersect(a, b, s0, s1) {
  const d0 = side(a, b, s0);
  const d1 = side(a, b, s1);
  const t = d0 / (d0 - d1);
  return { x: s0.x + t * (s1.x - s0.x), y: s0.y + t * (s1.y - s0.y) };
}

const EPS = 1e-7;

// 다각형 poly를 직선 a→b로 쪼갬 → [left, right] (한쪽이 null일 수 있음)
export function splitPolygon(poly, a, b) {
  const left = [];
  const right = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const nxt = poly[(i + 1) % poly.length];
    const dCur = side(a, b, cur);
    const dNxt = side(a, b, nxt);

    if (dCur >= -EPS) left.push(cur);
    if (dCur <= EPS) right.push(cur);

    // 부호가 바뀌면 교점 삽입 (양쪽 모두에)
    if ((dCur > EPS && dNxt < -EPS) || (dCur < -EPS && dNxt > EPS)) {
      const ip = intersect(a, b, cur, nxt);
      left.push(ip);
      right.push(ip);
    }
  }
  const okL = left.length >= 3 ? left : null;
  const okR = right.length >= 3 ? right : null;
  // 직선이 다각형을 실제로 가르지 않았으면 한쪽만 유효
  if (okL && okR) return [okL, okR];
  return [okL || okR, null];
}

// 조각 목록 전체를 직선 a→b로 한 번 쪼갬
export function cutPieces(pieces, a, b) {
  const out = [];
  for (const piece of pieces) {
    const [l, r] = splitPolygon(piece.poly, a, b);
    if (l && r) {
      out.push(makePiece(l));
      out.push(makePiece(r));
    } else {
      out.push(piece); // 안 갈렸으면 그대로 유지
    }
  }
  return out;
}

let pieceSeq = 0;
export function makePiece(poly) {
  const c = centroid(poly);
  return {
    id: pieceSeq++,
    poly,
    area: polygonArea(poly),
    cx: c.x,
    cy: c.y,
    ox: 0, // 폭발 오프셋
    oy: 0,
  };
}

// 이 칼질(직선 a-b)이 피자를 실제로 가르는가 (조각 하나라도 쪼개지는가)
export function cutIsValid(pieces, a, b) {
  for (const piece of pieces) {
    const [l, r] = splitPolygon(piece.poly, a, b);
    if (l && r) return true;
  }
  return false;
}

// ============================================================
// 사리(의도치 않은 미세 조각) 흡수
// 칼선들이 중앙에서 완벽히 한 점에 만나지 않으면 아주 작은 조각이 생긴다.
// 임계값보다 작은 조각을 "가장 긴 변을 공유하는 이웃"에 흡수시켜
// 조각 수와 면적을 정직하게 맞춘다. (한 조각이 그만큼 커진다)
// ============================================================

// 두 변(a-b)과(c-d)이 같은 직선 위에서 겹치는 길이
function edgeOverlap(a, b, c, d) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) return 0;
  const len = Math.sqrt(len2);
  // c, d 가 직선 a-b 위에 있는가(수직거리)
  const distC = Math.abs((c.x - a.x) * dy - (c.y - a.y) * dx) / len;
  const distD = Math.abs((d.x - a.x) * dy - (d.y - a.y) * dx) / len;
  if (distC > 0.5 || distD > 0.5) return 0; // 0.5px 이상 벗어나면 비공선
  // 파라미터 투영 후 [0,1] 구간과의 겹침
  const tc = ((c.x - a.x) * dx + (c.y - a.y) * dy) / len2;
  const td = ((d.x - a.x) * dx + (d.y - a.y) * dy) / len2;
  const lo = Math.max(0, Math.min(tc, td));
  const hi = Math.min(1, Math.max(tc, td));
  return hi > lo ? (hi - lo) * len : 0;
}

// 조각 T와 조각 P가 공유하는 경계 길이의 합
function sharedLength(T, P) {
  let total = 0;
  for (let i = 0; i < T.poly.length; i++) {
    const a = T.poly[i];
    const b = T.poly[(i + 1) % T.poly.length];
    for (let j = 0; j < P.poly.length; j++) {
      const c = P.poly[j];
      const d = P.poly[(j + 1) % P.poly.length];
      total += edgeOverlap(a, b, c, d);
    }
  }
  return total;
}

// 임계값(공정 몫의 fraction 미만) 조각을 이웃에 흡수.
// order = 주문 조각 수. 반환: 정리된 조각 배열(이웃 area가 커짐).
export function dissolveSlivers(pieces, order, fraction = 0.3) {
  const list = pieces.slice();
  const total = list.reduce((s, p) => s + p.area, 0);
  const thr = (total / order) * fraction;

  let guard = 0;
  while (guard++ < 100) {
    // 가장 작은 사리 후보
    let idx = -1;
    let minArea = Infinity;
    for (let i = 0; i < list.length; i++) {
      if (list[i].area < thr && list[i].area < minArea) {
        minArea = list[i].area;
        idx = i;
      }
    }
    if (idx < 0) break; // 더 없음
    if (list.length <= 1) break; // 흡수할 이웃이 없음

    const sliver = list[idx];
    // 최장 공유변 이웃 찾기
    let best = -1;
    let bestLen = 0;
    for (let i = 0; i < list.length; i++) {
      if (i === idx) continue;
      const len = sharedLength(sliver, list[i]);
      if (len > bestLen) {
        bestLen = len;
        best = i;
      }
    }
    // 이웃을 못 찾으면(고립된 파편) 가장 큰 조각에 면적만 몰아줌
    if (best < 0) {
      let bi = 0;
      for (let i = 1; i < list.length; i++)
        if (list[i].area > list[bi].area) bi = i;
      best = bi === idx ? (idx === 0 ? 1 : 0) : bi;
    }
    list[best].area += sliver.area; // 이웃이 그만큼 커짐(정직)
    list.splice(idx, 1);
  }
  return list;
}
