// 🔥 Firebase Setup (Realtime Database Multiplayer)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  runTransaction,
  onValue
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyADZrx36oil91a58Nzf7MjZ7_1uJD43Xdg",
  authDomain: "anonymous-roast-room-prototype.firebaseapp.com",
  databaseURL: "https://anonymous-roast-room-prototype-default-rtdb.firebaseio.com",
  projectId: "anonymous-roast-room-prototype",
  storageBucket: "anonymous-roast-room-prototype.firebasestorage.app",
  messagingSenderId: "227276252448",
  appId: "1:227276252448:web:08beea9f9f51a4fe0de345"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


// ---------- Utilities ----------
const $ = (id) => document.getElementById(id);
const randId = () => Math.random().toString(36).slice(2, 9).toUpperCase();

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[s]));
}

function truncate(str, n) {
  const s = String(str);
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function clampNumber(val, min, max) {
  const n = Number(val);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

// ---------- Question Bank ----------
const QUESTION_BANK = [
  { id: "red-1", color: "Red", text: "Who would be their dream teacher (and what would they teach)?" },
  { id: "orange-1", color: "Orange", text: "What has been the highlight of their year so far?" },
  { id: "yellow-1", color: "Yellow", text: "If they started a religion, what would it be called?" },
  { id: "green-1", color: "Green", text: "If they’d been dumped, how would you cheer them up?" },
  { id: "red-2", color: "Red", text: "What’s their superpower, but make it inconvenient?" },
  { id: "orange-2", color: "Orange", text: "What would their reality TV show be called?" },
  { id: "yellow-2", color: "Yellow", text: "What’s their villain origin story?" },
  { id: "green-2", color: "Green", text: "What would you text them after they bombed a first date?" }
];

// ---------- App State ----------
const me = {
  id: randId(),
  name: "",
  role: "none", // "host" | "player"
  room: ""
};

let game = null;
let gameRef = null;
let unsubscribe = null;

// ---------- Screens + Header UI (matches your HTML) ----------
const screens = {
  room: $("screenRoom"),
  lobby: $("screenLobby"),
  answer: $("screenAnswer"),
  wait: $("screenWait"),
  reveal: $("screenReveal"),
  score: $("screenScore")
};

const roomLabel = $("roomLabel");
const phaseLabel = $("phaseLabel");
const meLabel = $("meLabel");

function showScreen(which) {
  Object.values(screens).forEach(s => s?.classList.add("hidden"));
  screens[which]?.classList.remove("hidden");
}

function setTopStatus() {
  roomLabel.textContent = me.room || "—";
  phaseLabel.textContent = game?.phase || "—";
  meLabel.textContent = me.role === "none" ? "—" : `${me.role.toUpperCase()} (${me.name || me.id})`;
}

function isHost() {
  return !!game && me.role === "host" && game.hostId === me.id;
}

function currentRevealPlayerId() {
  const r = game?.round;
  if (!r) return null;
  const idx = r.revealIndex ?? 0;
  return r.revealQueue?.[idx] ?? null;
}

function pickQuestions(qPerPlayer) {
  return shuffle(QUESTION_BANK).slice(0, qPerPlayer);
}

// ---------- Firebase Room ----------
function openRoom(roomCode) {
  me.room = roomCode;
  gameRef = ref(db, `rooms/${roomCode}/game`);

  // kill prior listener if any
  if (unsubscribe) unsubscribe();
  unsubscribe = onValue(gameRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    game = data;
    setTopStatus();
    render();

    // route screen by phase
    const phase = game?.phase || "lobby";
    if (phase === "lobby") showScreen("lobby");
    if (phase === "answering") showScreen("answer");
    if (phase === "waiting") showScreen("wait");
    if (phase === "reveal") showScreen("reveal");
    if (phase === "score") showScreen("score");
  });
}

async function writeGame() {
  if (!gameRef) return;
  await set(gameRef, game);
}

// ---------- Host Actions ----------
async function createRoomAsHost() {
  const room = randId();

  me.role = "host";
  me.name = "Host";
  openRoom(room);

  game = {
    phase: "lobby",
    hostId: me.id,
    players: [{ id: me.id, name: me.name, joinedAt: Date.now() }],
    round: null,
    scores: { [me.id]: 0 }
  };

  await writeGame();

  setTopStatus();
  render();
  showScreen("lobby");

  // helpful UX
  alert(`Room created! Code: ${room}`);
}

async function hostStartRound() {
  if (!isHost()) return;

  const qPerPlayer = clampNumber($("qPerPlayer").value, 1, 10);
  const order = $("revealOrder").value;

  const picked = pickQuestions(qPerPlayer);
  const players = game.players;

  const queue = order === "random"
    ? shuffle(players.map(p => p.id))
    : players.map(p => p.id);

  game.round = {
    qPerPlayer,
    questions: picked,
    submissions: [],
    submittedPlayerIds: [],
    revealQueue: queue,
    revealIndex: 0,
    locks: {}
  };

  game.phase = "answering";
  await writeGame();
}

async function hostBeginReveal() {
  if (!isHost()) return;
  if (!game?.round) return;

  const total = game.players.length;
  const submitted = game.round.submittedPlayerIds?.length ?? 0;

  if (submitted < total) {
    return alert(`Not everyone has submitted yet (${submitted}/${total}).`);
  }

  game.phase = "reveal";
  game.round.revealIndex = 0;

  await writeGame();
}


async function hostNextReveal() {
  if (!isHost()) return;

  const r = game.round;
  r.revealIndex = Math.min((r.revealIndex ?? 0) + 1, r.revealQueue.length);

  if (r.revealIndex >= r.revealQueue.length) {
    game.phase = "score";
  } else {
    game.phase = "reveal";
  }

  await writeGame();
}

async function setPhase(phase) {
  if (!isHost()) return;
  game.phase = phase;
  await writeGame();
}

// ---------- Player Actions ----------
async function joinRoomAsPlayer() {
  const room = $("roomInput").value.trim().toUpperCase();
  const name = $("nameInput").value.trim();

  if (!room) return alert("Enter a room code");
  if (!name) return alert("Enter your name");

  me.role = "player";
  me.name = name;
  openRoom(room);

  // confirm room exists
  const snap = await get(ref(db, `rooms/${room}/game`));
  const data = snap.val();
  if (!data) {
    alert("Room not found.");
    leaveRoom(); // reset UI
    return;
  }

  // transaction: add player safely
  await runTransaction(ref(db, `rooms/${room}/game`), (cur) => {
    if (!cur) return cur;
    cur.players ??= [];
    cur.scores ??= {};

    const exists = cur.players.some(p => p.id === me.id);
    if (!exists) {
      cur.players.push({ id: me.id, name: me.name, joinedAt: Date.now() });
      cur.scores[me.id] = cur.scores[me.id] ?? 0;
    } else {
      // update name if rejoining
      const p = cur.players.find(p => p.id === me.id);
      if (p) p.name = me.name;
    }

    return cur;
  });

  setTopStatus();
  showScreen("lobby");
}

function leaveRoom() {
  // (Optional) you could also remove from players via transaction.
  if (unsubscribe) unsubscribe();
  unsubscribe = null;

  me.role = "none";
  me.name = "";
  me.room = "";
  game = null;
  gameRef = null;

  setTopStatus();
  showScreen("room");
}

// ---------- Submissions ----------
async function submitMyAnswers() {
  if (!game?.round) return;

  const blocks = document.querySelectorAll("[data-qblock]");
  const my = [];

  for (const b of blocks) {
    const questionId = b.getAttribute("data-questionid");
    const aboutId = b.querySelector("select")?.value;
    const text = b.querySelector("textarea")?.value?.trim();

    if (!aboutId || !text) {
      return alert("Please fill every prompt before submitting.");
    }

    my.push({
      id: randId(),
      authorId: me.id,
      aboutId,
      questionId,
      text
    });
  }

  // transaction: append submissions safely
  await runTransaction(gameRef, (cur) => {
    if (!cur?.round) return cur;

    cur.round.submissions ??= [];
    cur.round.submittedPlayerIds ??= [];

    // prevent double submit
    if (cur.round.submittedPlayerIds.includes(me.id)) return cur;

    cur.round.submissions.push(...my);
    cur.round.submittedPlayerIds.push(me.id);

    // once anyone submits, show waiting; host will begin reveal when all submitted
    cur.phase = "waiting";

    return cur;
  });

  showScreen("wait");
}

// ---------- Owner Lock-In ----------
async function ownerLockIn() {
  if (!game?.round) return;

  const aboutId = currentRevealPlayerId();
  if (aboutId !== me.id) return;

  const favoriteSubmissionId = $("favoriteSelect").value;
  const guessAuthorId = $("guessSelect").value;

  if (!favoriteSubmissionId || !guessAuthorId) {
    return alert("Pick a favorite and a guess.");
  }

  await runTransaction(gameRef, (cur) => {
    if (!cur?.round) return cur;

    const r = cur.round;
    r.locks ??= {};
    cur.scores ??= {};

    // already locked
    if (r.locks[aboutId]?.resolved) return cur;

    const fav = (r.submissions ?? []).find(s => s.id === favoriteSubmissionId);
    if (!fav) return cur;

    const correct = fav.authorId === guessAuthorId;

    // scoring: if correct, page owner + writer each get +1
    if (correct) {
      cur.scores[aboutId] = (cur.scores[aboutId] ?? 0) + 1;
      cur.scores[fav.authorId] = (cur.scores[fav.authorId] ?? 0) + 1;
    }

    r.locks[aboutId] = {
      favoriteSubmissionId,
      guessAuthorId,
      resolved: true,
      correct,
      writerId: fav.authorId
    };

    return cur;
  });
}

// ---------- Rendering ----------
function render() {
  if (!game) return;

  renderLobby();
  renderAnswering();
  renderWaiting();
  renderReveal();
  renderScore();

  // host-only UI
  $("btnStartRound").classList.toggle("hidden", !isHost());
  $("hostSetup").classList.toggle("hidden", !isHost());
  $("hostControlsWait").classList.toggle("hidden", !isHost());
  $("btnNextReveal").classList.toggle("hidden", !isHost());
  $("btnBackToReveal").classList.toggle("hidden", !isHost());
  $("btnNewRound").classList.toggle("hidden", !isHost());
}

function renderLobby() {
  if (!game) return;

  const ul = $("playerList");
  ul.innerHTML = "";

  game.players
    .slice()
    .sort((a, b) => a.joinedAt - b.joinedAt)
    .forEach((p, idx) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${idx + 1}. ${escapeHtml(p.name)}</span><span class="badge">${p.id}</span>`;
      ul.appendChild(li);
    });
}

function renderAnswering() {
  if (!game?.round) return;

  const r = game.round;
  const grid = $("questionGrid");
  grid.innerHTML = "";

  const targetOptions = game.players
    .map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
    .join("");

  r.questions.forEach((q, i) => {
    const div = document.createElement("div");
    div.className = "qCard";
    div.setAttribute("data-qblock", "true");
    div.setAttribute("data-questionid", q.id);

    div.innerHTML = `
      <div class="qMeta">
        <strong>Prompt ${i + 1}</strong>
        <span class="badge">${escapeHtml(q.color)}</span>
      </div>
      <p>${escapeHtml(q.text)}</p>

      <label class="field">
        <span>Answer about</span>
        <select>${targetOptions}</select>
      </label>

      <label class="field">
        <span>Anonymous answer</span>
        <textarea placeholder="Type your answer…"></textarea>
      </label>
    `;

    grid.appendChild(div);
  });
}

function renderWaiting() {
  if (!game?.round) return;

  const submitted = game.round.submittedPlayerIds?.length ?? 0;
  const total = game.players.length;

  $("submittedCount").textContent = submitted;
  $("totalCount").textContent = total;

  const allSubmitted = submitted >= total;

  // show host controls only to host
  $("hostControlsWait").classList.toggle("hidden", !isHost());

  // enable reveal only when ready
  $("btnBeginReveal").disabled = !(isHost() && allSubmitted);
}


function renderReveal() {
  if (!game?.round) return;

  const r = game.round;
  const aboutId = currentRevealPlayerId();
  if (!aboutId) return;

  const aboutPlayer = game.players.find(p => p.id === aboutId);
  $("revealName").textContent = aboutPlayer?.name ?? "—";

  const list = $("revealList");
  list.innerHTML = "";

  const subs = (r.submissions ?? []).filter(s => s.aboutId === aboutId);
  const qById = new Map((r.questions ?? []).map(q => [q.id, q]));

  subs.forEach(s => {
    const q = qById.get(s.questionId);
    const block = document.createElement("div");
    block.className = "answerBlock";
    block.innerHTML = `
      <h4>${escapeHtml(q?.color ?? "Prompt")} — ${escapeHtml(q?.text ?? "")}</h4>
      <div>${escapeHtml(s.text)}</div>
      <div class="badge">Submission ID: ${s.id}</div>
    `;
    list.appendChild(block);
  });

  // owner controls
  const isOwner = me.id === aboutId;
  $("ownerActions").classList.toggle("hidden", !isOwner);

  if (isOwner) {
    $("favoriteSelect").innerHTML =
      `<option value="">Select…</option>` +
      subs.map((s, idx) =>
        `<option value="${s.id}">Answer ${idx + 1}: ${escapeHtml(truncate(s.text, 42))}</option>`
      ).join("");

    $("guessSelect").innerHTML =
      `<option value="">Select…</option>` +
      game.players
        .filter(p => p.id !== aboutId)
        .map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
        .join("");
  }

  // show result after lock-in
  const lock = r.locks?.[aboutId];
  const resultPanel = $("revealResult");

  if (lock?.resolved) {
    const writer = game.players.find(p => p.id === lock.writerId);
    const guess = game.players.find(p => p.id === lock.guessAuthorId);

    $("resultText").textContent = lock.correct
      ? `Correct! You guessed ${guess?.name}. Writer was ${writer?.name}. Points awarded.`
      : `Not quite. You guessed ${guess?.name}, but writer was ${writer?.name}.`;

    resultPanel.classList.remove("hidden");
  } else {
    resultPanel.classList.add("hidden");
    $("resultText").textContent = "—";
  }
}

function renderScore() {
  if (!game) return;

  const ul = $("scoreList");
  ul.innerHTML = "";

  const rows = game.players
    .map(p => ({ name: p.name, id: p.id, score: game.scores?.[p.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);

  rows.forEach((r, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${idx + 1}. ${escapeHtml(r.name)}</span><span><strong>${r.score}</strong></span>`;
    ul.appendChild(li);
  });
}

// ---------- Buttons ----------
$("btnCreateRoom").addEventListener("click", createRoomAsHost);
$("btnJoinRoom").addEventListener("click", joinRoomAsPlayer);
$("btnLeave").addEventListener("click", leaveRoom);

$("btnStartRound").addEventListener("click", hostStartRound);
$("btnBackToLobby").addEventListener("click", () => setPhase("lobby"));
$("btnSubmitAnswers").addEventListener("click", submitMyAnswers);

$("btnBeginReveal").addEventListener("click", hostBeginReveal);
$("btnNextReveal").addEventListener("click", hostNextReveal);

$("btnLockIn").addEventListener("click", ownerLockIn);
$("btnNewRound").addEventListener("click", hostStartRound);
$("btnBackToReveal").addEventListener("click", () => setPhase("reveal"));

// ---------- Boot ----------
function boot() {
  showScreen("room");
  setTopStatus();
}
boot();
