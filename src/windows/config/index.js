const ipc = require("electron").ipcRenderer;
const { dialog } = require("electron").remote;

const mobbersEl = document.getElementById("mobbers");
const shuffleEl = document.getElementById("shuffle");
const minutesEl = document.getElementById("minutes");
const addEl = document.getElementById("add");
const addMobberForm = document.getElementById("addMobberForm");
const fullscreenSecondsEl = document.getElementById("fullscreen-seconds");
const breakCheckbox = document.getElementById("break");
const breakFrequencyEl = document.getElementById("breakFrequency");
const breakDurationEl = document.getElementById("breakDuration");
const snapToEdgesCheckbox = document.getElementById("snap-to-edges");
const alertAudioCheckbox = document.getElementById("alertAudio");
const replayAudioContainer = document.getElementById("replayAudioContainer");
const replayAlertAudioCheckbox = document.getElementById("replayAlertAudio");
const replayAudioAfterSeconds = document.getElementById(
    "replayAudioAfterSeconds"
);
const useCustomSoundCheckbox = document.getElementById("useCustomSound");
const customSoundEl = document.getElementById("customSound");
const timerAlwaysOnTopCheckbox = document.getElementById("timerAlwaysOnTop");
const shuffleMobbersOnStartupCheckbox = document.getElementById(
    "shuffleMobbersOnStartup"
);
const clearClipboardHistoryOnTurnEndCheckbox = document.getElementById(
    "clearClipboardHistoryOnTurnEnd"
);
const numberOfItemsClipboardHistoryStores = document.getElementById(
    "numberOfItemsClipboardHistoryStores"
);
const gitIntegrationEnabledCheckbox = document.getElementById(
    "gitIntegrationEnabled"
);
const gitIntegrationPortEl = document.getElementById("gitIntegrationPort");
const mobberContainerTemplate = document.getElementById(
    "mobberContainerTemplate"
);

function createMobberEl(mobber, gitIntegrationEnabled) {
    const clonedMobberContainer = mobberContainerTemplate.cloneNode(true);

    clonedMobberContainer.removeAttribute("id");
    clonedMobberContainer.hidden = false;

    if (mobber.disabled) {
        const mobber = clonedMobberContainer.getElementsByClassName("mobber")["0"];
        mobber.classList.add("disabled");
    }

    const imgEl = clonedMobberContainer.getElementsByClassName("image")["0"];

    if (mobber.image) imgEl.src = mobber.image;

    const nameEl = clonedMobberContainer.getElementsByClassName("name")["0"];

    nameEl.innerHTML = mobber.name;

    if (gitIntegrationEnabled) nameEl.classList.add("git-name");

    const gitDetailsAccordianForm = clonedMobberContainer.getElementsByClassName(
        "git-details"
    )["0"];
    nameEl.addEventListener("click", function () {
        if (gitIntegrationEnabledCheckbox.checked) {
            if (gitDetailsAccordianForm.hidden === false) {
                gitDetailsAccordianForm.hidden = true;
            } else {
                Array.prototype.forEach.call(
                    document.getElementsByClassName("git-details"),
                    e => (e.hidden = true)
                );
                gitDetailsAccordianForm.hidden = false;
            }
        }
    });

    clonedMobberContainer.getElementsByClassName("btn")[
        "0"
    ].innerHTML = mobber.disabled ? "Enable" : "Disable";

    if (mobber.gitUsername)
        clonedMobberContainer.getElementsByClassName("git-input")["0"].value =
            mobber.gitUsername;

    if (mobber.gitEmail)
        clonedMobberContainer.getElementsByClassName("git-input")["1"].value =
            mobber.gitEmail;

    const gitNameInput = clonedMobberContainer.getElementsByClassName(
        "git-input"
    )["0"];
    gitNameInput.addEventListener("change", _ => {
        mobber.gitUsername = gitNameInput.value;
        ipc.send("updateMobberWithoutPublish", mobber);
    });
    gitNameInput.addEventListener("focusout", _ => {
        mobber.gitUsername = gitNameInput.value;
        ipc.send("updateMobberWithoutPublish", mobber);
    });

    const gitEmailInput = clonedMobberContainer.getElementsByClassName(
        "git-input"
    )["1"];
    gitEmailInput.addEventListener("change", _ => {
        mobber.gitEmail = gitEmailInput.value;
        ipc.send("updateMobberWithoutPublish", mobber);
    });
    gitEmailInput.addEventListener("focusout", _ => {
        mobber.gitEmail = gitEmailInput.value;
        ipc.send("updateMobberWithoutPublish", mobber);
    });

    imgEl.addEventListener("click", () => selectImage(mobber));

    const disableBtn = clonedMobberContainer.getElementsByClassName("btn")["0"];
    disableBtn.addEventListener("click", () => toggleMobberDisabled(mobber));

    const rmBtn = clonedMobberContainer.getElementsByClassName("btn")["1"];
    rmBtn.addEventListener("click", () => ipc.send("removeMobber", mobber));

    return clonedMobberContainer;
}

function selectImage(mobber) {
    var image = dialog.showOpenDialog({
        title: "Select image",
        filters: [{ name: "Images", extensions: ["jpg", "png", "gif"] }],
        properties: ["openFile"]
    });

    if (image) {
        mobber.image = image[0];
        ipc.send("updateMobber", mobber);
    }
}

function toggleMobberDisabled(mobber) {
    mobber.disabled = !mobber.disabled;
    ipc.send("updateMobber", mobber);
}

const saved = document.querySelector(".saved");
let timeout = null;
ipc.on("savedConfig", (event, data) => {
    saved.classList.add("savedVisable");
    if (timeout) window.clearTimeout(timeout);

    timeout = setTimeout(() => {
        saved.classList.remove("savedVisable");
    }, 750);
});

ipc.on("configUpdated", (event, data) => {
    minutesEl.value = data.secondsPerTurn / 60;
    mobbersEl.innerHTML = "";
    const frag = document.createDocumentFragment();
    data.mobbers.map(mobber => {
        frag.appendChild(createMobberEl(mobber, data.gitIntegration.enabled));
    });
    mobbersEl.appendChild(frag);
    fullscreenSecondsEl.value = data.secondsUntilFullscreen;

    breakCheckbox.checked = data.breakEnabled;

    breakFrequencyEl.disabled = !data.breakEnabled;
    breakFrequencyEl.value = data.breakFrequencySeconds / 60;

    breakDurationEl.disabled = !data.breakEnabled;
    breakDurationEl.value = data.breakDurationSeconds / 60;

    snapToEdgesCheckbox.checked = data.snapThreshold > 0;

    alertAudioCheckbox.checked = data.alertSoundTimes.length > 0;
    replayAlertAudioCheckbox.checked = data.alertSoundTimes.length > 1;
    replayAudioAfterSeconds.value =
        data.alertSoundTimes.length > 1 ? data.alertSoundTimes[1] : 30;
    updateAlertControls();

    useCustomSoundCheckbox.checked = !!data.alertSound;
    customSoundEl.value = data.alertSound;

    timerAlwaysOnTopCheckbox.checked = data.timerAlwaysOnTop;
    shuffleMobbersOnStartupCheckbox.checked = data.shuffleMobbersOnStartup;
    clearClipboardHistoryOnTurnEndCheckbox.checked =
        data.clearClipboardHistoryOnTurnEnd;
    numberOfItemsClipboardHistoryStores.value =
        data.numberOfItemsClipboardHistoryStores;
    numberOfItemsClipboardHistoryStores.disabled = !clearClipboardHistoryOnTurnEndCheckbox.checked;

    gitIntegrationEnabledCheckbox.checked = data.gitIntegration.enabled;
    gitIntegrationPortEl.disabled = !gitIntegrationEnabledCheckbox.checked;
    gitIntegrationPortEl.value = data.gitIntegration.port;
});

minutesEl.addEventListener("change", () => {
    ipc.send("setSecondsPerTurn", minutesEl.value * 60);
});
minutesEl.addEventListener("focusout", _ => {
    ipc.send("setSecondsPerTurn", minutesEl.value * 60);
});

addMobberForm.addEventListener("submit", event => {
    event.preventDefault();
    let value = addEl.value.trim();
    if (!value) {
        return;
    }
    ipc.send("addMobber", { name: value });
    addEl.value = "";
});

shuffleEl.addEventListener("click", event => {
    event.preventDefault();
    ipc.send("shuffleMobbers");
});

fullscreenSecondsEl.addEventListener("change", () => {
    ipc.send("setSecondsUntilFullscreen", fullscreenSecondsEl.value * 1);
});
fullscreenSecondsEl.addEventListener("focusout", _ => {
    ipc.send("setSecondsUntilFullscreen", fullscreenSecondsEl.value * 1);
});

breakCheckbox.addEventListener("change", _ => {
    ipc.send("setBreakEnabled", breakCheckbox.checked);
});
breakFrequencyEl.addEventListener("change", _ => {
    ipc.send("setBreakFrequencySeconds", breakFrequencyEl.value * 60);
});
breakFrequencyEl.addEventListener("focusout", _ => {
    ipc.send("setBreakFrequencySeconds", breakFrequencyEl.value * 60);
});
breakDurationEl.addEventListener("change", _ => {
    ipc.send("setBreakDurationSeconds", breakDurationEl.value * 60);
});
breakDurationEl.addEventListener("focusout", _ => {
    ipc.send("setBreakDurationSeconds", breakDurationEl.value * 60);
});

ipc.send("configWindowReady");

snapToEdgesCheckbox.addEventListener("change", () => {
    ipc.send("setSnapThreshold", snapToEdgesCheckbox.checked ? 25 : 0);
});

alertAudioCheckbox.addEventListener("change", _ => updateAlertTimes());
replayAlertAudioCheckbox.addEventListener("change", _ => updateAlertTimes());
replayAudioAfterSeconds.addEventListener("change", _ => updateAlertTimes());
replayAudioAfterSeconds.addEventListener("focusout", _ => updateAlertTimes());

function updateAlertTimes() {
    updateAlertControls();

    let alertSeconds = [];
    if (alertAudioCheckbox.checked) {
        alertSeconds.push(0);
        if (replayAlertAudioCheckbox.checked) {
            alertSeconds.push(replayAudioAfterSeconds.value * 1);
        }
    }

    ipc.send("setAlertSoundTimes", alertSeconds);
}

function updateAlertControls() {
    let replayDisabled = !alertAudioCheckbox.checked;
    replayAlertAudioCheckbox.disabled = replayDisabled;

    if (replayDisabled) {
        replayAlertAudioCheckbox.checked = false;
        replayAudioContainer.classList.add("disabled");
    } else {
        replayAudioContainer.classList.remove("disabled");
    }

    let secondsDisabled = !replayAlertAudioCheckbox.checked;
    replayAudioAfterSeconds.disabled = secondsDisabled;
}

useCustomSoundCheckbox.addEventListener("change", () => {
    let mp3 = null;

    if (useCustomSoundCheckbox.checked) {
        const selectedMp3 = dialog.showOpenDialog({
            title: "Select alert sound",
            filters: [{ name: "MP3", extensions: ["mp3"] }],
            properties: ["openFile"]
        });

        if (selectedMp3) {
            mp3 = selectedMp3[0];
        } else {
            useCustomSoundCheckbox.checked = false;
        }
    }

    ipc.send("setAlertSound", mp3);
});

timerAlwaysOnTopCheckbox.addEventListener("change", () => {
    ipc.send("setTimerAlwaysOnTop", timerAlwaysOnTopCheckbox.checked);
});

shuffleMobbersOnStartupCheckbox.addEventListener("change", () => {
    ipc.send(
        "setShuffleMobbersOnStartup",
        shuffleMobbersOnStartupCheckbox.checked
    );
});

clearClipboardHistoryOnTurnEndCheckbox.addEventListener("change", () => {
    numberOfItemsClipboardHistoryStores.disabled = !clearClipboardHistoryOnTurnEndCheckbox.checked;
    ipc.send(
        "setClearClipboardHistoryOnTurnEnd",
        clearClipboardHistoryOnTurnEndCheckbox.checked
    );
});

numberOfItemsClipboardHistoryStores.addEventListener("change", () => {
    ipc.send(
        "setNumberOfItemsClipboardHistoryStores",
        Math.floor(numberOfItemsClipboardHistoryStores.value) > 0
            ? Math.floor(numberOfItemsClipboardHistoryStores.value)
            : 1
    );
});

gitIntegrationEnabledCheckbox.addEventListener("change", () => {
    ipc.send("updateGitIntegration", {
        enabled: gitIntegrationEnabledCheckbox.checked,
        port: gitIntegrationPortEl.value * 1
    });
});

gitIntegrationPortEl.addEventListener("change", () => {
    ipc.send("setGitIntegration", {
        enabled: gitIntegrationEnabledCheckbox.checked,
        port: gitIntegrationPortEl.value * 1
    });
});

gitIntegrationPortEl.addEventListener("focusout", _ => {
    ipc.send("setGitIntegration", {
        enabled: gitIntegrationEnabledCheckbox.checked,
        port: gitIntegrationPortEl.value * 1
    });
});
