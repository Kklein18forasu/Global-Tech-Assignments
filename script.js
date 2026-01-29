// Game data (later becomes backend / Firebase)
let players = [];
let answers = [];

const questions = [
  "Who would survive a zombie apocalypse?",
  "Who is most likely to get arrested?",
  "Who would secretly run a cult?"
];

let currentQuestionIndex = 0;

// Join the game
function joinGame() {
  const name = document.getElementById("nameInput").value.trim();
  if (!name) return alert("Enter a name");

  players.push(name);

  document.getElementById("joinScreen").classList.add("hidden");
  document.getElementById("gameScreen").classList.remove("hidden");

  loadQuestion();
  loadPlayers();
}

// Load current question
function loadQuestion() {
  document.getElementById("questionText").textContent =
    questions[currentQuestionIndex];
}

// Populate dropdown with player names
function loadPlayers() {
  const select = document.getElementById("playerSelect");
  select.innerHTML = "";

  players.forEach(player => {
    const option = document.createElement("option");
    option.value = player;
    option.textContent = player;
    select.appendChild(option);
  });
}

// Submit anonymous answer
function submitAnswer() {
  const about = document.getElementById("playerSelect").value;
  const text = document.getElementById("answerInput").value.trim();

  if (!text) return alert("Write an answer");

  answers.push({
    about,
    text
  });

  console.log("Anonymous answers:", answers);

  document.getElementById("gameScreen").classList.add("hidden");
  document.getElementById("waitScreen").classList.remove("hidden");
}
