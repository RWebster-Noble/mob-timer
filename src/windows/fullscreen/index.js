const { mobberBorderHighlightColor } = require("../theme.js").getTheme();
const ipc = require("electron").ipcRenderer;

const skipBtn = document.getElementById("skip");
const startTurnBtn = document.getElementById("startTurn");
const configureBtn = document.getElementById("configure");
const currentEl = document.getElementById("current");
const currentPicEl = document.getElementById("currentPic");
const nextEl = document.getElementById("next");
const nextPicEl = document.getElementById("nextPic");
const sitMessage = document.getElementById("sitMessage");
const timerCanvas = document.getElementById("timerCanvas");
const breakTimeDiv = document.getElementById("breakTimeContainer");
const breakTimeSpn = document.getElementById("breakTime");
const takeABreakDiv = document.getElementById("takeABreakcontainer");
const takeABreakBtn = document.getElementById("takeABreak");

timerCanvas.hidden = true;

const context = timerCanvas.getContext("2d");

ipc.on("rotated", (event, data) => {
    if (!data.current) {
        data.current = { name: "Add a mobber" };
    }

    if (data.onbreak) {
        currentEl.innerHTML = "Break!";
        currentPicEl.src = "../img/break.png";
        startTurnBtn.innerHTML = "Postpone";
        sitMessage.hidden = true;
        timerCanvas.hidden = false;
        breakTimeDiv.style.display = "none";
        takeABreakDiv.style.display = "none";
    } else {
        currentEl.innerHTML = data.current.name;
        currentPicEl.src = data.current.image || "../img/sad-cyclops.png";
        startTurnBtn.innerHTML = "Start";
        sitMessage.hidden = false;
        timerCanvas.hidden = true;
    }

    if (!data.next) {
        data.next = data.current;
    }
    nextEl.innerHTML = data.next.name;
    nextPicEl.src = data.next.image || "../img/sad-cyclops.png";
});

ipc.on("timerChange", (event, data) => {
    clearCanvas();
    drawTimerCircle();
    drawTimerArc(data.secondsRemaining, data.secondsPerTurn);
});

ipc.on("configUpdated", (event, data) => {
    const showBreak =
        data.breakEnabled && data.breakStartsAtTime != -1 ? "" : "none";

    breakTimeDiv.style.display = showBreak;
    takeABreakDiv.style.display = showBreak;

    breakTimeSpn.innerText = new Date(data.breakStartsAtTime).toLocaleTimeString(
        [],
        { hour: "2-digit", minute: "2-digit" }
    );
});

function clearCanvas() {
    context.clearRect(0, 0, timerCanvas.width, timerCanvas.height);
}

function drawTimerCircle() {
    const begin = 0;
    const end = 2 * Math.PI;
    drawArc(begin, end, "#EEEEEE");
}

function drawArc(begin, end, color) {
    const circleCenterX = timerCanvas.width / 2;
    const circleCenterY = circleCenterX;
    const circleRadius = circleCenterX - 6;
    context.beginPath();
    context.arc(circleCenterX, circleCenterY, circleRadius, begin, end);
    context.strokeStyle = color;
    context.lineWidth = 10;
    context.stroke();
}

function drawTimerArc(seconds, maxSeconds) {
    let percent = 1 - seconds / maxSeconds;
    if (percent == 0) {
        return;
    }
    let begin = -(0.5 * Math.PI);
    let end = begin + 2 * Math.PI * percent;
    drawArc(begin, end, mobberBorderHighlightColor);
}

// ipc.on('configUpdated', (event, data) => {
//   countEl.innerHTML = formatTime(data.secondsPerTurn)
// })

skipBtn.addEventListener("click", () => ipc.send("skip"));
startTurnBtn.addEventListener("click", () => ipc.send("startTurn"));
configureBtn.addEventListener("click", () => ipc.send("configure"));
takeABreakBtn.addEventListener("click", () => ipc.send("takeABreakNow"));

ipc.send("fullscreenWindowReady");
