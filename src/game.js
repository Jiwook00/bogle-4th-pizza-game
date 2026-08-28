// ============================================================
// 게임 — 상태 머신 + 라운드 흐름 + 리액션 타이밍 비트.
// 캔버스 게임플레이/HUD/리빌 애니메이션을 담당.
// DOM 화면(시작/결과/랭킹)은 main.js가 콜백으로 받아 처리.
//
// 리액션 비트(리듬천국의 맛):
//   spread(0.4s 조각 벌어짐) → hold(0.3s 정적) → faces(한 프레임에 툭) → 점수
// ============================================================

import { ROUNDS, GUEST_NAMES } from "./config.js";
import {
  makePizza,
  makePiece,
  cutPieces,
  cutIsValid,
  dissolveSlivers,
} from "./geometry.js";
import { scoreRound, faceFor } from "./scoring.js";
import { InputTracker } from "./input.js";
import { sfx } from "./audio.js";
import {
  drawBackground,
  drawPieces,
  drawToppings,
  drawStroke,
  drawReactions,
  getImage,
} from "./render.js";

const REVEAL = { spread: 0.4, hold: 0.3, faces: 0.25 }; // 초

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.input = new InputTracker(canvas);
    this.input.onCut = (a, b) => this._tryCut(a, b);

    this.state = "idle"; // idle | intro | round | reveal | scored | done
    this.roundIdx = -1;
    this.results = []; // 라운드별 결과
    this.paused = false;

    // 콜백 (main.js가 채움)
    this.onRoundStart = null; // (round, idx, isBonus) => void  — intro 연출(쿵/말풍선)
    this.onTick = null; // (remaining, roundInfo) => void
    this.onRoundEnd = null; // () => void  — 리빌 시작(완성/시간초과)
    this.onRoundScored = null; // (result, roundInfo) => void
    this.onFinished = null; // ({ total, rounds }) => void
    this.onCoachStart = null; // (round) => void — 튜토리얼 안내 시퀀스 시작(입력은 잠금 유지)

    this._setupCanvas();
    document.addEventListener("visibilitychange", () => {
      this.paused = document.hidden; // 백그라운드 전환 시 타이머 정지
    });
  }

  _setupCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = this.canvas.getBoundingClientRect();
    this.W = rect.width;
    this.H = rect.height;
    this.canvas.width = this.W * dpr;
    this.canvas.height = this.H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 피자를 화면 상단 60% 지점에 (아래→위 긋기 유도, 손가락 가림 방지)
    this.center = { x: this.W / 2, y: this.H * 0.4 };
    this.radius = Math.min(this.W, this.H) * 0.28;
  }

  // skipTutorial: 재방문(2회차+)이면 튜토리얼(ROUNDS[0]) 건너뛰고 바로 실전부터.
  start(skipTutorial = false) {
    // 라운드 이미지 미리 로드(첫 라운드 벡터 깜빡임 방지)
    ROUNDS.forEach((r) => getImage(r.image));
    this.results = [];
    // roundIdx=0 → _nextRound가 1로 올려 튜토리얼(index 0)을 건너뜀
    this.roundIdx = skipTutorial ? 0 : -1;
    this._nextRound();
    this._loop();
  }

  _nextRound() {
    this.roundIdx++;
    if (this.roundIdx >= ROUNDS.length) {
      this._finish();
      return;
    }
    const r = ROUNDS[this.roundIdx];
    this.round = r;
    this.pieces = [
      makePiece(makePizza(this.center.x, this.center.y, this.radius)),
    ];
    this.cuts = 0;
    this.remaining = r.limit ?? Infinity;
    this.reveal = null;
    // intro: 주문 "쿵" 연출 동안 타이머 정지·입력 차단(공정). 끝나면 round로.
    this.intro = { t: 0, dur: r.bonus ? 1.6 : 0.9 };
    this.state = "intro";
    this.input.enabled = false;
    sfx.bottle(); // 병뚜껑 따는 소리 = 라운드 시작
    if (this.onRoundStart) this.onRoundStart(r, this.roundIdx, !!r.bonus);
    if (this.onTick) this.onTick(this.remaining, r);
  }

  _tryCut(a, b) {
    if (this.state !== "round") return;
    if (!cutIsValid(this.pieces, a, b)) return;
    this.pieces = cutPieces(this.pieces, a, b);
    this.cuts++;
    sfx.slice();
  }

  // main.js의 "완성" 버튼 또는 타이머 종료가 호출
  endRound() {
    if (this.state !== "round") return;
    this.input.enabled = false;
    if (this.onRoundEnd) this.onRoundEnd();
    // 채점 전에 사리(미세 조각)를 이웃에 흡수시켜 조각 수를 정직하게 맞춤
    this.pieces = dissolveSlivers(this.pieces, this.round.order);
    const result = scoreRound({
      pieces: this.pieces,
      order: this.round.order,
      remaining: Math.max(
        0,
        this.remaining === Infinity ? (this.round.limit ?? 0) : this.remaining,
      ),
      limit: this.round.limit,
      cuts: this.cuts,
    });
    // 무제한(튜토리얼)은 시간계수 1
    // 보너스 라운드(케이크): 최종 점수 ×배율
    if (this.round.bonus) {
      result.mult = this.round.bonus;
      result.baseScore = result.score;
      result.score = Math.round(result.score * this.round.bonus);
    }
    this.results[this.roundIdx] = result;
    this._buildReveal(result);
  }

  _buildReveal(result) {
    // 조각별 폭발 방향 + 표정 배정
    result.counted.forEach((p, i) => {
      const dx = p.cx - this.center.x;
      const dy = p.cy - this.center.y;
      const d = Math.hypot(dx, dy) || 1;
      const mag = this.radius * 0.35;
      p.ox = (dx / d) * mag;
      p.oy = (dy / d) * mag;
      p.isCrumb = false;
    });
    result.crumbs.forEach((p) => {
      p.ox = 0;
      p.oy = 0;
      p.isCrumb = true;
    });

    // 가장 억울한 조각(최소 share) 찾기 — shock이 옆을 쳐다보게 할 수도(추후)
    this.reactions = result.counted.map((p, i) => ({
      x: p.cx + p.ox,
      y: p.cy + p.oy - this.radius * 0.15,
      r: this.radius * 0.22,
      expr: faceFor(result.shares[i]),
      colorIdx: i,
      name: GUEST_NAMES[i % GUEST_NAMES.length],
      show: false,
    }));

    this.reveal = { t: 0, phase: "spread", facesSfxDone: false };
    this.state = "reveal";
    sfx.spread();
  }

  _finish() {
    this.state = "done";
    // 튜토리얼(limit=null)은 점수 미반영 — 채점 라운드만 합산.
    // rounds와 total이 일치해야 ranking.validate() 통과.
    const scored = this.results.filter((_, i) => ROUNDS[i].limit != null);
    const rounds = scored.map((r) => r.score);
    const total = rounds.reduce((s, v) => s + v, 0);
    sfx.win();
    if (this.onFinished) this.onFinished({ total, rounds, results: scored });
  }

  // 코치(튜토리얼) 안내가 끝나면 main.js가 호출 — 칼질 입력을 연다.
  beginCutting() {
    if (this.state === "round") this.input.enabled = true;
  }

  // 리빌 진행 후 다음 라운드로 (main.js에서 탭으로 호출)
  advanceFromScore() {
    if (this.state !== "scored") return;
    this._nextRound();
  }

  _loop() {
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!this.paused) this._update(dt);
      this._draw();
      if (this.state !== "done") requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  _update(dt) {
    if (this.state === "intro") {
      this.intro.t += dt;
      if (this.intro.t >= this.intro.dur) {
        this.state = "round";
        // 코치(튜토리얼) 라운드는 안내가 끝난 뒤 beginCutting()으로 입력을 연다.
        if (this.round.coach) {
          this.input.enabled = false;
          if (this.onCoachStart) this.onCoachStart(this.round);
        } else {
          this.input.enabled = true;
        }
      }
    } else if (this.state === "round") {
      if (this.round.limit != null) {
        this.remaining -= dt;
        if (this.onTick) this.onTick(Math.max(0, this.remaining), this.round);
        if (this.remaining <= 0) {
          this.remaining = 0;
          this.endRound();
        }
      }
    } else if (this.state === "reveal") {
      const rv = this.reveal;
      rv.t += dt;
      if (rv.phase === "spread" && rv.t >= REVEAL.spread) {
        rv.phase = "hold";
        rv.t = 0;
      } else if (rv.phase === "hold" && rv.t >= REVEAL.hold) {
        // 표정이 한 프레임에 툭 — 여기서 전부 show=true + 효과음
        rv.phase = "faces";
        rv.t = 0;
        this.reactions.forEach((rx) => (rx.show = true));
        sfx.face();
      } else if (rv.phase === "faces" && rv.t >= REVEAL.faces) {
        rv.phase = "done";
        this.state = "scored";
        if (this.onRoundScored) {
          this.onRoundScored(
            this.results[this.roundIdx],
            this.round,
            this.roundIdx,
          );
        }
      }
    }
  }

  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);
    drawBackground(ctx, this.W, this.H);

    const topping = this.round?.topping;
    // 라운드별 피자/케이크 이미지. 이미지 쓰면 벡터 토핑은 생략.
    const pizzaImg = getImage(this.round?.image);
    const useImg = pizzaImg && pizzaImg.complete && pizzaImg.naturalWidth;
    const pieceOpts = {
      base: topping?.base,
      image: pizzaImg,
      radius: this.radius,
    };
    if (this.state === "intro" || this.state === "round") {
      drawPieces(ctx, this.pieces, this.center, 0, false, pieceOpts);
      if (!useImg)
        drawToppings(ctx, this.center, this.radius, this.roundIdx + 2, topping);
      if (this.state === "round") drawStroke(ctx, this.input.points);
    } else if (this.state === "reveal" || this.state === "scored") {
      const rv = this.reveal;
      let explode = 0;
      if (rv.phase === "spread") explode = rv.t / REVEAL.spread;
      else explode = 1;
      drawPieces(ctx, this.pieces, this.center, explode, true, pieceOpts);
      if (!useImg)
        drawToppings(ctx, this.center, this.radius, this.roundIdx + 2, topping);
      const appear = this.reactions.some((r) => r.show)
        ? Math.min(1, rv.phase === "faces" ? rv.t / REVEAL.faces : 1)
        : 0;
      drawReactions(ctx, this.reactions, appear);
    }
  }
}
