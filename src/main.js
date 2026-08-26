// ============================================================
// main — DOM 화면 오케스트레이션.
// 시작 화면 → 인트로 → 게임(HUD) → 결과 → 닉네임/랭킹 → 공유/재도전.
// 게임플레이는 Game(캔버스)이, 그 외 화면은 여기가 담당.
// ============================================================

import { Game } from "./game.js";
import { ROUNDS, GRADES } from "./config.js";
import { faceFor } from "./scoring.js";
import { unlock } from "./audio.js";
import { submit, board, cleanNickname } from "./ranking.js";
import { buildShareCard, downloadCard } from "./share.js";

const $ = (id) => document.getElementById(id);
const canvas = $("game");
let game;
let lastNickname = localStorage.getItem("bogle4th_nick") || "";

function show(id) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));
  $(id).classList.add("active");
}

function gradeFor(total) {
  return GRADES.find((g) => total >= g.min) || GRADES[GRADES.length - 1];
}

// ---- 시작 ----
$("startBtn").addEventListener("click", () => {
  unlock(); // iOS 오디오 언락 (사용자 탭 시점)
  startGame();
});

function startGame() {
  show("gameScreen");
  game = new Game(canvas);
  wireGame(game);
  // 3초 마스코트 인트로
  const bubble = $("introBubble");
  bubble.textContent = "주방 알바 왔구나? 손님이 말한 개수대로, 공평하게 잘라!";
  bubble.classList.add("active");
  setTimeout(() => {
    bubble.classList.remove("active");
    game.start();
  }, 2600);
}

function wireGame(g) {
  g.onTick = (remaining, round) => {
    $("roundLabel").textContent = round.label;
    $("orderText").textContent = `주문: ${round.order}조각 · ${round.pizza}`;
    const t = round.limit == null ? "연습" : remaining.toFixed(1);
    $("timer").textContent = t;
    $("timer").classList.toggle(
      "danger",
      round.limit != null && remaining <= 4,
    );
    $("doneBtn").style.display = "block";
  };

  g.onRoundEnd = () => {
    $("doneBtn").style.display = "none";
  };

  g.onRoundScored = (result, round, idx) => {
    $("doneBtn").style.display = "none";
    showRoundScore(result, round, () => g.advanceFromScore());
  };

  g.onFinished = (summary) => finish(summary);
}

// 라운드 점수 팝업 (탭하면 다음)
function showRoundScore(result, round, next) {
  const pop = $("roundScore");
  const worst = Math.min(...result.shares.map((s) => s));
  const worstExpr = faceFor(worst);
  const comment = {
    smug: "흡족한 표정이야.",
    content: "다들 조용하네.",
    brow: "누가 눈썹을 올렸어.",
    shock: "한 명이 자기 조각을 노려봐.",
  }[worstExpr];

  $("rsFair").textContent = `${result.fairness}%`;
  $("rsBonus").textContent = result.bonus ? `+${result.bonus} 최소칼질!` : "";
  $("rsScore").textContent = `+${result.score}`;
  $("rsComment").textContent = statusComment(result.status) || comment;
  pop.classList.add("active");

  const handler = () => {
    pop.classList.remove("active");
    pop.removeEventListener("click", handler);
    next();
  };
  pop.addEventListener("click", handler);
}

function statusComment(status) {
  if (status === "over") return "너무 많이 잘랐어! 공평도 반토막.";
  if (status === "timeout") return "손님이 그냥 가버렸습니다.";
  if (status === "short") return "조각이 모자라잖아.";
  return null;
}

// ---- 완성 버튼 ----
$("doneBtn").addEventListener("click", () => game && game.endRound());

// ---- 결과 ----
async function finish(summary) {
  show("resultScreen");
  const grade = gradeFor(summary.total);
  $("gradeLabel").textContent = grade.label;
  $("gradeComment").textContent = grade.comment;
  $("totalScore").textContent = summary.total;

  // 라운드 막대
  const wrap = $("roundBars");
  wrap.innerHTML = "";
  summary.rounds.forEach((s, i) => {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `<span>${ROUNDS[i].label}</span>
      <div class="bar"><div class="fill" style="width:${Math.min(100, (s / 115) * 100)}%"></div></div>
      <b>${s}</b>`;
    wrap.appendChild(row);
  });

  $("nickInput").value = lastNickname;
  $("submitState").textContent = "";
  window._summary = summary;
}

// ---- 랭킹 등록 ----
$("submitBtn").addEventListener("click", async () => {
  const nickname = cleanNickname($("nickInput").value);
  const summary = window._summary;
  localStorage.setItem("bogle4th_nick", nickname);
  lastNickname = nickname;
  $("submitState").textContent = "등록 중…";
  try {
    const res = await submit({
      nickname,
      score: summary.total,
      rounds: summary.rounds,
    });
    if (!res.ok) {
      $("submitState").textContent = "점수 검증 실패";
      return;
    }
    await renderBoard(nickname);
    show("rankScreen");
  } catch (e) {
    $("submitState").textContent = "등록 실패 — 나중에 다시";
  }
});

async function renderBoard(nickname) {
  const { top, me } = await board(nickname, 20);
  const list = $("rankList");
  list.innerHTML = "";
  top.forEach((e) => {
    const row = document.createElement("div");
    row.className = "rank-row" + (e.nickname === nickname ? " me" : "");
    row.innerHTML = `<span class="rk">${e.rank}</span><span class="nm">${e.nickname}</span><b>${e.score}</b>`;
    list.appendChild(row);
  });
  if (me && me.rank > 20) {
    const row = document.createElement("div");
    row.className = "rank-row me";
    row.innerHTML = `<span class="rk">${me.rank}</span><span class="nm">${me.nickname}</span><b>${me.score}</b>`;
    list.appendChild(row);
  }
}

// ---- 공유 이미지 ----
$("shareBtn").addEventListener("click", async () => {
  const nickname = lastNickname || "주방알바";
  const s = window._summary;
  const { me } = await board(nickname, 20);
  const card = buildShareCard({
    nickname,
    total: s.total,
    rounds: s.rounds,
    rank: me ? me.rank : null,
  });
  downloadCard(card, `bogle4th-${nickname}.png`);
});

// ---- 재도전 ----
document
  .querySelectorAll(".retryBtn")
  .forEach((b) => b.addEventListener("click", () => startGame()));
$("backToResult").addEventListener("click", () => show("resultScreen"));
