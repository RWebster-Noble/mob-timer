const electron = require("electron");

if (process.env.NODE_ENV !== "test") {
  require("electron-reload")(__dirname);
  console.log("(Hard reload managed with nodemon, ignore the above log)");
}

const { app, ipcMain: ipc } = electron;

let windows = require("./windows/windows");
let TimerState = require("./state/timer-state");
let statePersister = require("./state/state-persister");

let timerState = new TimerState();

app.on("ready", () => {
    timerState.setCallback(onTimerEvent);
    timerState.loadState(statePersister.read());
    windows.setConfigState(timerState.getState());
    const primaryTimerWindow = windows.createTimerWindow();
    timerState.gitIntegration.primaryTimerWindow = primaryTimerWindow;
    if (timerState.getState().shuffleMobbersOnStartup) {
        timerState.shuffleMobbers();
    }
});

function onTimerEvent(event, data) {
    windows.dispatchEvent(event, data);
    if (event === "configUpdated") {
        statePersister.write(timerState.getState(), onTimerEvent);
    }
}

ipc.on("timerWindowReady", timerState.initialize);
ipc.on("configWindowReady", timerState.publishConfig);
ipc.on("fullscreenWindowReady", timerState.publishConfig);
ipc.on("pause", timerState.pause);
ipc.on("unpause", timerState.start);
ipc.on("skip", () => timerState.rotateOrBreak(true));
ipc.on("takeABreakNow", () => timerState.startBreak(true));
ipc.on("startTurn", timerState.start);
ipc.on("shuffleMobbers", timerState.shuffleMobbers);

ipc.on("configure", () => {
    windows.showConfigWindow();
    windows.closeFullscreenWindows();
});

ipc.on("addMobber", (event, mobber) => timerState.addMobber(mobber));
ipc.on("removeMobber", (event, mobber) => timerState.removeMobber(mobber));
ipc.on("updateMobber", (event, mobber) => timerState.updateMobber(mobber));
ipc.on("setSecondsPerTurn", (event, secondsPerTurn) =>
    timerState.setSecondsPerTurn(secondsPerTurn)
);
ipc.on("setSecondsUntilFullscreen", (event, secondsUntilFullscreen) =>
    timerState.setSecondsUntilFullscreen(secondsUntilFullscreen)
);
ipc.on("setBreakEnabled", (event, breakEnabled) =>
    timerState.setBreakEnabled(breakEnabled)
);
ipc.on("setBreakDurationSeconds", (event, breakDurationSeconds) =>
    timerState.setBreakDurationSeconds(breakDurationSeconds)
);
ipc.on("setBreakFrequencySeconds", (event, breakFrequencySeconds) =>
    timerState.setBreakFrequencySeconds(breakFrequencySeconds)
);
ipc.on("setSnapThreshold", (event, threshold) =>
    timerState.setSnapThreshold(threshold)
);
ipc.on("setAlertSoundTimes", (event, alertSoundTimes) =>
    timerState.setAlertSoundTimes(alertSoundTimes)
);
ipc.on("setAlertSound", (event, alertSound) =>
    timerState.setAlertSound(alertSound)
);
ipc.on("setTimerAlwaysOnTop", (event, value) =>
    timerState.setTimerAlwaysOnTop(value)
);
ipc.on("setShuffleMobbersOnStartup", (event, value) =>
    timerState.setShuffleMobbersOnStartup(value)
);
ipc.on("setClearClipboardHistoryOnTurnEnd", (event, value) =>
    timerState.setClearClipboardHistoryOnTurnEnd(value)
);
ipc.on("setNumberOfItemsClipboardHistoryStores", (event, value) =>
    timerState.setNumberOfItemsClipboardHistoryStores(value)
);
ipc.on("updateGitIntegration", (event, value) =>
    timerState.updateGitIntegration(event, value)
);

ipc.on("updateMobberWithoutPublish", (event, mobber) => {
    timerState.mobbers.updateMobber(mobber);
    statePersister.write(timerState.getState(), onTimerEvent);
});

app.on("window-all-closed", function () {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", function () {
    windows.createTimerWindow();
});
