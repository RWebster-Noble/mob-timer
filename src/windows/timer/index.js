const { getTheme } = require("../theme.js");

const ipc = require("electron").ipcRenderer;

const containerEl = document.getElementById("container");
const toggleBtn = document.getElementById("toggleButton");
const configureBtn = document.getElementById("configureButton");
const currentEl = document.getElementById("current");
const nextEl = document.getElementById("next");
const currentPicEl = document.getElementById("currentPic");
const nextPicEl = document.getElementById("nextPic");
const nextBtn = document.getElementById("nextButton");
const timerCanvas = document.getElementById("timerCanvas");
const alertAudio = document.getElementById("alertAudio");
const breakContainer = document.getElementById("breakContainer");
const breakTimeSpn = document.getElementById("breakTime");
const breakNowA = document.getElementById("breakNowLink");

const context = timerCanvas.getContext("2d");

let paused = true;
let alertSoundTimes = [];

let onBreak = false;

ipc.on("timerChange", (event, data) => {
    const { mobberBorderHighlightColor, mobberBorderColor } = getTheme();
    clearCanvas();
    drawTimerCircle(mobberBorderColor);
    drawTimerArc(
        data.secondsRemaining,
        data.secondsPerTurn,
        mobberBorderHighlightColor
    );
});

function clearCanvas() {
    context.clearRect(0, 0, timerCanvas.width, timerCanvas.height);
}

function drawTimerCircle(color) {
    const begin = 0;
    const end = 2 * Math.PI;
    drawArc(begin, end, color);
}

function drawTimerArc(seconds, maxSeconds, color) {
    let percent = 1 - seconds / maxSeconds;
    if (percent === 0) {
        return;
    }
    let begin = -(0.5 * Math.PI);
    let end = begin + 2 * Math.PI * percent;
    drawArc(begin, end, color);
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

ipc.on("rotated", (event, data) => {
    onBreak = data.onbreak;
    if (!data.current) {
        data.current = { name: "Add a mobber" };
    }

    if (data.onbreak) {
        currentEl.innerHTML = "Break!";
        currentPicEl.src = "../img/coffee.png";
    } else {   
        currentPicEl.src = data.current.image || "../img/sad-cyclops.png";
        currentEl.innerHTML = data.current.name;
    }

    if (!data.next) {
        data.next = data.current;
    }
    nextPicEl.src = data.next.image || "../img/sad-cyclops.png";
    nextEl.innerHTML = data.next.name;
});

ipc.on("paused", () => {
    paused = true;
    containerEl.classList.add("isPaused");
    toggleBtn.classList.add("play");
    toggleBtn.classList.remove("pause");
});

ipc.on("started", () => {
    paused = false;
    containerEl.classList.remove("isPaused");
    containerEl.classList.remove("isTurnEnded");
    toggleBtn.classList.remove("play");
    toggleBtn.classList.add("pause");
});

ipc.on("turnEnded", () => {
    paused = true;
    containerEl.classList.remove("isPaused");
    containerEl.classList.add("isTurnEnded");
    toggleBtn.classList.add("play");
    toggleBtn.classList.remove("pause");
});

ipc.on("configUpdated", (event, data) => {
    alertSoundTimes = data.alertSoundTimes;
    alertAudio.src = data.alertSound || "./default.mp3";

    if (data.breakEnabled && data.breakStartsAtTime != -1) {
        breakContainer.hidden = false;
        containerEl.classList.add("continer-break")   
    }
    else{
        
        breakContainer.hidden = true;
        containerEl.classList.remove("continer-break") 
    }

    breakTimeSpn.innerText = new Date(data.breakStartsAtTime).toLocaleTimeString(
        [],
        { hour: "2-digit", minute: "2-digit" }
    );
});

ipc.on("alert", (event, data) => {
    if (alertSoundTimes.some(item => item === data)) {
        alertAudio.currentTime = 0;
        alertAudio.play();
    }
});

ipc.on("stopAlerts", () => {
    alertAudio.pause();
});

toggleBtn.addEventListener("click", () => {
    onBreak
        ? ipc.send("takeABreakNow")
        : paused
            ? ipc.send("unpause")
            : ipc.send("pause")
});
nextBtn.addEventListener("click", () =>
    onBreak ? ipc.send("takeABreakNow") : ipc.send("skip")
);
configureBtn.addEventListener("click", () => ipc.send("configure"));
breakNowA.addEventListener("click", () =>
    onBreak ? ipc.send("takeABreakNow") : ipc.send("takeABreakNow")
);

ipc.send("timerWindowReady");
