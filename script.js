console.log("SCRIPT LOADED");

// app.js (ES module)

// ---------- Question Bank (replace later) ----------
const QUESTION_BANK = [
  { id: "red-1", color: "Red", text: "Who would be their dream teacher (and what would they teach)?" },
  { id: "orange-1", color: "Orange", text: "What has been the highlight of their year so far?" },
  { id: "yellow-1", color: "Yellow", text: "If they started a religion, what would it be called?" },
  { id: "green-1", color: "Green", text: "If they’d been dumped, how would you cheer them up?" },

  // add more here later
  { id: "red-2", color: "Red", text: "What’s their superpower, but make it inconvenient?" },
  { id: "orange-2", color: "Orange", text: "What would their reality TV show be called?" },
  { id: "yellow-2", color: "Yellow", text: "What’s their villain origin story?" },
  { id: "green-2", color: "Green", text: "What would you text them after they bombed a first date?" }
];

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

// ---------- Network (same-machine multiplayer) ----------
let channel = null;
function openChannel(roomCode) {
  channel?.close?.();
  channel = new BroadcastChannel(`burnbook:${roomCode}`);
  channel.onmessage = (ev) => onMessage(ev.data);
}

function send(type, payload = {}) {
  if (!channel) return;
  channel.postMessage({ type, payload });
}

// ---------- App State ----------
const me = {
  id: randId(),
  name: "",
  role: "none", // "host" | "player"
  room: ""
};

// Host-owned game state (broadcast to everyone)
let game = null;
/*
game shape:
{
  phase: "lobby"|"answering"|"waiting"|"reveal"|"score",
  hostId,
  players: [{id,name,joinedAt}],
  round: {
    qPerPlayer: number,
    questions: [{id,color,text}],
    submissions: [{id, authorId, aboutId, questionId, text}],
    submittedPlayerIds: [],
    revealQueue: [playerId...],
    revealIndex: 0,
    locks: { [aboutId]: { favoriteSubmissionId, guessAuthorId, resolved: true/false } }
  },
  scores: { [playerId]: number }
}
*/

// ---------- DOM hooks ----------
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

// Room screen buttons
$("btnCreateRoom").addEventListener("click", createRoomAsHost);
$("btnJoinRoom").addEventListener("click", joinRoomAsPlayer);

// Lobby buttons
$("btnLeave").addEventListener("click", leaveRoom);
$("btnStartRound").addEventListener("click", hostStartRound);
$("btnBackToLobby").addEventListener("click", () => hostOrPlayerGoLobby());
$("btnSubmitAnswers").addEventListener("click", submitMyAnswers);

// Waiting / reveal / score
$("btnBeginReveal").addEventListener("click", hostBeginReveal);
$("btnNextReveal").addEventListener("click", hostNextReveal);
$("btnLockIn").addEventListener("click", ownerLockIn);
$("btnNewRound").addEventListener("click", hostStartRound);
$("btnBackToReveal").addEventListener("click", () => setPhase("reveal"));

// ---------- Screen Routing ----------
function showScreen(which) {
  Object.values(screens).forEach(s => s.classList.add("hidden"));
  screens[which].classList.remove("hidden");
}

function setTopStatus() {
  roomLabel.textContent = me.room || "—";
  phaseLabel.textContent = game?.phase || "—";
  meLabel.textContent = me.role === "none" ? "—" : `${me.role.toUpperCase()} (${me.name || me.id})`;
}

// ---------- Host Actions ----------
function createRoomAsHost() {
  const room = randId();
  const hostName = "Host";
  me.role = "host";
  me.name = hostName;
  me.room = room;

  openChannel(room);

  game = {
    phase: "lobby",
    hostId: me.id,
    players: [{ id: me.id, name: hostName, joinedAt: Date.now() }],
    round: null,
    scores: { [me.id]: 0 }
  };

  broadcastState();
  render();
  showScreen("lobby");
}

function hostStartRound() {
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
  broadcastState();
  render();
  showScreen("answer");
}

function hostBeginReveal() {
  if (!isHost()) return;
  game.phase = "reveal";
  broadcastState();
  render();
  showScreen("reveal");
}

function hostNextReveal() {
  if (!isHost()) return;
  const r = game.round;
  r.revealIndex = Math.min(r.revealIndex + 1, r.revealQueue.length); // if equals length, score screen
  if (r.revealIndex >= r.revealQueue.length) {
    game.phase = "score";
  } else {
    game.phase = "reveal";
  }
  broadcastState();
  render();
  showScreen(game.phase === "score" ? "score" : "reveal");
}

// ---------- Player Actions ----------
function joinRoomAsPlayer() {
  const room = $("roomInput").value.trim().toUpperCase();
  const name = $("nameInput").value.trim();

  if (!room) return alert("Enter a room code");
  if (!name) return alert("Enter your name");

  me.role = "player";
  me.name = name;
  me.room = room;

  openChannel(room);

  // Ask host for current state
  send("HELLO", { id: me.id, name: me.name });
  // In case host is in same tab earlier etc, also render as pending
  setTopStatus();
}

function leaveRoom() {
  if (me.room && channel) {
    send("LEAVE", { id: me.id });
  }
  channel?.close?.();
  channel = null;
  me.role = "none";
  me.name = "";
  me.room = "";
  game = null;
  setTopStatus();
  showScreen("room");
}

function hostOrPlayerGoLobby() {
  if (!game) return;
  // if host, can set phase back to lobby
  if (isHost()) {
    game.phase = "lobby";
    broadcastState();
  }
  render();
  showScreen("lobby");
}

// ---------- Submissions ----------
function submitMyAnswers() {
  if (!game?.round) return;
  const r = game.round;

  // collect all question blocks
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

  // send to host
  send("SUBMIT", { playerId: me.id, submissions: my });

  // local UX: waiting
  showScreen("wait");
}

// ---------- Reveal Owner Lock-In ----------
function ownerLockIn() {
  if (!game?.round) return;

  const r = game.round;
  const aboutId = currentRevealPlayerId();
  if (aboutId !== me.id) return;

  const favoriteSubmissionId = $("favoriteSelect").value;
  const guessAuthorId = $("guessSelect").value;

  if (!favoriteSubmissionId || !guessAuthorId) {
    return alert("Pick a favorite and a guess.");
  }

  send("LOCKIN", { aboutId, favoriteSubmissionId, guessAuthorId });
}

// ---------- Message Handling ----------
function onMessage(msg) {
  const { type, payload } = msg;

  // Host: accept join/leave/submit/lockin
  if (type === "HELLO") {
    if (!isHost()) return;
    const { id, name } = payload;

    if (!game.players.find(p => p.id === id)) {
      game.players.push({ id, name, joinedAt: Date.now() });
      game.scores[id] ??= 0;
      broadcastState();
    } else {
      // update name if needed
      const p = game.players.find(p => p.id === id);
      p.name = name;
      broadcastState();
    }
  }

  if (type === "LEAVE") {
    if (!isHost()) return;
    const { id } = payload;
    game.players = game.players.filter(p => p.id !== id);
    delete game.scores[id];
    broadcastState();
  }

  if (type === "STATE") {
    // Everyone: accept host state
    game = payload.game;
    setTopStatus();
    render();

    // Auto-route based on phase
    const phase = game?.phase || "lobby";
    if (phase === "lobby") showScreen("lobby");
    if (phase === "answering") showScreen("answer");
    if (phase === "waiting") showScreen("wait");
    if (phase === "reveal") showScreen("reveal");
    if (phase === "score") showScreen("score");
  }

  if (type === "SUBMIT") {
    if (!isHost()) return;
    const { playerId, submissions } = payload;

    // accept only once per player (simple anti-spam)
    if (game.round.submittedPlayerIds.includes(playerId)) return;

    game.round.submissions.push(...submissions);
    game.round.submittedPlayerIds.push(playerId);

    // When everyone submitted -> waiting phase
    const totalPlayers = game.players.length;
    if (game.round.submittedPlayerIds.length >= totalPlayers) {
      game.phase = "waiting";
    } else {
      game.phase = "waiting"; // keep wait visible as soon as someone submits
    }

    broadcastState();
  }

  if (type === "LOCKIN") {
    if (!isHost()) return;

    const { aboutId, favoriteSubmissionId, guessAuthorId } = payload;
    const r = game.round;

    // resolve correct writer
    const fav = r.submissions.find(s => s.id === favoriteSubmissionId);
    if (!fav) return;

    const correct = fav.authorId === guessAuthorId;

    // scoring rule (matches your description):
    // if correct, page owner + writer get a point
    if (correct) {
      game.scores[aboutId] = (game.scores[aboutId] ?? 0) + 1;
      game.scores[fav.authorId] = (game.scores[fav.authorId] ?? 0) + 1;
    }

    r.locks[aboutId] = {
      favoriteSubmissionId,
      guessAuthorId,
      resolved: true,
      correct,
      writerId: fav.authorId
    };

    broadcastState();
  }
}

// Host broadcasts state
function broadcastState() {
  send("STATE", { game });
  setTopStatus();
}

// ---------- Rendering ----------
function render() {
  setTopStatus();
  renderLobby();
  renderAnswering();
  renderWaiting();
  renderReveal();
  renderScore();

  // host-only buttons
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

  // Build target list
  const targetOptions = game.players
    .map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
    .join("");

  // Layout: qPerPlayer cards (picked by host)
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

  $("submittedCount").textContent = game.round.submittedPlayerIds.length;
  $("totalCount").textContent = game.players.length;

  // Host can begin reveal only when everyone submitted
  const canReveal = isHost() && game.round.submittedPlayerIds.length >= game.players.length;
  $("btnBeginReveal").disabled = !canReveal;
}

function renderReveal() {
  if (!game?.round) return;

  const r = game.round;
  const aboutId = currentRevealPlayerId();

  if (!aboutId) {
    // no one to reveal (round finished)
    return;
  }

  const aboutPlayer = game.players.find(p => p.id === aboutId);
  $("revealName").textContent = aboutPlayer?.name ?? "—";

  const list = $("revealList");
  list.innerHTML = "";

  // Gather answers ABOUT this player
  const subs = r.submissions.filter(s => s.aboutId === aboutId);

  // Group by questionId (nice structure)
  const qById = new Map(r.questions.map(q => [q.id, q]));
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

  // Owner actions: only the about player sees the dropdowns
  const isOwner = me.id === aboutId;
  $("ownerActions").classList.toggle("hidden", !isOwner);

  // Fill favorite options with submissions (anonymous)
  const favSel = $("favoriteSelect");
  const guessSel = $("guessSelect");

  if (isOwner) {
    favSel.innerHTML = `<option value="">Select…</option>` + subs.map((s, idx) =>
      `<option value="${s.id}">Answer ${idx + 1}: ${truncate(s.text, 42)}</option>`
    ).join("");

    guessSel.innerHTML = `<option value="">Select…</option>` + game.players
      .filter(p => p.id !== aboutId) // optional: allow guessing self? usually no
      .map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
      .join("");
  }

  // If host has a lock result, show it to everyone
  const lock = r.locks[aboutId];
  const resultPanel = $("revealResult");
  if (lock?.resolved) {
    const writer = game.players.find(p => p.id === lock.writerId);
    const guess = game.players.find(p => p.id === lock.guessAuthorId);
    const msg = lock.correct
      ? `Correct! You guessed ${guess?.name}. Writer was ${writer?.name}. Points awarded.`
      : `Not quite. You guessed ${guess?.name}, but writer was ${writer?.name}.`;

    $("resultText").textContent = msg;
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
    .map(p => ({ name: p.name, id: p.id, score: game.scores[p.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);

  rows.forEach((r, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${idx + 1}. ${escapeHtml(r.name)}</span><span><strong>${r.score}</strong></span>`;
    ul.appendChild(li);
  });
}

// ---------- Helpers ----------
function isHost() {
  return game && me.role === "host" && game.hostId === me.id;
}

function currentRevealPlayerId() {
  const r = game?.round;
  if (!r) return null;
  const idx = r.revealIndex ?? 0;
  return r.revealQueue?.[idx] ?? null;
}

function setPhase(phase) {
  if (!isHost()) return;
  game.phase = phase;
  broadcastState();
  render();
}

function pickQuestions(qPerPlayer) {
  // Prototype behavior: pick qPerPlayer from bank (unique)
  const bank = shuffle(QUESTION_BANK);
  return bank.slice(0, qPerPlayer);
}

function clampNumber(val, min, max) {
  const n = Number(val);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
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

// ---------- Boot ----------
function boot() {
  showScreen("room");
  setTopStatus();
}
boot();
