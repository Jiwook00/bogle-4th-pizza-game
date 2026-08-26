// ============================================================
// 입력 — 포인터/마우스 드래그로 칼질 스트로크를 추적.
// 첫 포인터만 추적(멀티터치 무시).
//
// 정밀도: 칼선은 "시작점→끝점"을 직접 잇는 직선으로 계산한다.
//   - 손을 누르거나 뗄 때 튀는 점(갈고리)은 걷어내서 각도가 틀어지지 않게 함.
//   - 같은 계산을 미리보기에도 써서(getCutLine) 손 떼기 전에 어디 잘릴지 보인다.
// ============================================================

export class InputTracker {
  constructor(canvas) {
    this.canvas = canvas;
    this.activeId = null;
    this.points = []; // 화면에 그리는 원본 궤적
    this.onCut = null; // (a, b) => void  — 유효 스트로크 종료 시
    this.enabled = false;
    this._bind();
  }

  _bind() {
    const c = this.canvas;
    c.addEventListener("pointerdown", (e) => this._down(e));
    c.addEventListener("pointermove", (e) => this._move(e));
    c.addEventListener("pointerup", (e) => this._up(e));
    c.addEventListener("pointercancel", (e) => this._up(e));
    c.style.touchAction = "none"; // 스크롤/줌 방지
  }

  _pos(e) {
    // 게임은 setTransform(dpr)로 CSS 픽셀 좌표계에 그린다.
    // 따라서 입력도 CSS 픽셀로 반환해야 좌표계가 일치한다(레티나 어긋남 방지).
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _down(e) {
    if (!this.enabled) return;
    if (this.activeId !== null) return; // 이미 첫 포인터 추적 중 → 무시
    this.activeId = e.pointerId;
    this.points = [this._pos(e)];
  }

  _move(e) {
    if (e.pointerId !== this.activeId) return;
    this.points.push(this._pos(e));
  }

  _up(e) {
    if (e.pointerId !== this.activeId) return;
    this.activeId = null;
    const line = this.getCutLine();
    this.points = [];
    if (line && this.onCut) this.onCut(line.a, line.b);
  }

  // 현재 점들로부터 칼선 {a, b}(무한 직선처럼 길게 연장)를 계산.
  // 미리보기(드래그 중)와 확정(손 뗌) 양쪽에서 같은 결과를 쓴다.
  getCutLine() {
    const pts = this.points;
    if (pts.length < 2) return null;

    // 양 끝 15%를 잘라 누를 때/뗄 때의 흔들림·갈고리를 제거하고,
    // 남은 가운데 구간의 PCA(주축)로 방향을 잡는다(여러 점 평균 → 노이즈에 강함).
    const mid = trimEnds(pts, 0.15);
    const fit = pca(mid);
    if (!fit) return null;
    let { cx, cy, dx, dy } = fit;

    // 실제 그은 길이(주축 투영 스팬)가 너무 짧으면 무시
    let tMin = Infinity;
    let tMax = -Infinity;
    for (const p of mid) {
      const t = (p.x - cx) * dx + (p.y - cy) * dy;
      if (t < tMin) tMin = t;
      if (t > tMax) tMax = t;
    }
    if (tMax - tMin < 16) return null;

    const L = 2000;
    return {
      a: { x: cx - dx * L, y: cy - dy * L },
      b: { x: cx + dx * L, y: cy + dy * L },
    };
  }
}

// 양 끝에서 frac 비율만큼 점을 잘라 가운데 구간만 남김(최소 2점 보장)
function trimEnds(pts, frac) {
  const n = pts.length;
  const k = Math.floor(n * frac);
  let lo = k;
  let hi = n - 1 - k;
  if (hi - lo < 1) {
    lo = 0;
    hi = n - 1;
  }
  return pts.slice(lo, hi + 1);
}

// 점 집합의 무게중심 + 주축 단위벡터(PCA). 반환 {cx,cy,dx,dy} 또는 null.
function pca(pts) {
  if (pts.length < 2) return null;
  let mx = 0;
  let my = 0;
  for (const p of pts) {
    mx += p.x;
    my += p.y;
  }
  mx /= pts.length;
  my /= pts.length;

  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of pts) {
    const ex = p.x - mx;
    const ey = p.y - my;
    sxx += ex * ex;
    syy += ey * ey;
    sxy += ex * ey;
  }
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  if (!isFinite(dx) || !isFinite(dy)) return null;
  return { cx: mx, cy: my, dx, dy };
}
