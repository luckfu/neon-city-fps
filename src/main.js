import "./style.css";
import { Game } from "./game/Game.js";

const canvas = document.getElementById("c");
const startBtn = document.getElementById("startBtn");
const ovMsg = document.getElementById("ovMsg");

const game = new Game(canvas);

startBtn.disabled = true;
startBtn.textContent = "LOADING…";

game
  .init()
  .then(() => {
    startBtn.disabled = false;
    startBtn.textContent = "CLICK TO ENTER";
    const begin = () => game.start();
    startBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      begin();
    });
    document.getElementById("overlay").addEventListener("click", (e) => {
      if (startBtn.disabled) return;
      if (e.target === startBtn) return;
      begin();
    });
  })
  .catch((err) => {
    console.error(err);
    ovMsg.textContent = String(err?.message || err);
    startBtn.textContent = "LOAD FAILED";
  });
