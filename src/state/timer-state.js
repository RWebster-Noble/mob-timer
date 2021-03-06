const Timer = require("./timer");
const Mobbers = require("./mobbers");
const GitIntegration = require("../gitIntegration");
const clipboard = require("../clipboard");

class TimerState {
    constructor(options) {
        if (!options) {
            options = {};
        }
        this.secondsPerTurn = 600;
        this.mobbers = new Mobbers();
        this.secondsUntilFullscreen = 30;
        this.breakEnabled = true;
        this.breakFrequencyMilliseconds = 60 * 60 * 1000; // default 60 mins
        this.breakDurationSeconds = 10 * 60; // default 10 min
        this.snapThreshold = 25;
        this.alertSound = null;
        this.alertSoundTimes = [];
        this.timerAlwaysOnTop = true;
        this.shuffleMobbersOnStartup = false;
        this.clearClipboardHistoryOnTurnEnd = false;
        this.numberOfItemsClipboardHistoryStores = 25;

        this.initialize = this.initialize.bind(this);
        this.publishConfig = this.publishConfig.bind(this);
        this.rotate = this.rotate.bind(this);
        this.start = this.start.bind(this);
        this.pause = this.pause.bind(this);
        this.shuffleMobbers = this.shuffleMobbers.bind(this);

        this.lastBreakTime = Date.now();

        this.createTimers(options.Timer || Timer);

        this.gitIntegration = new GitIntegration(this.mobbers, this.mainTimer);

        this.nextMobber = null;
    }

    setCallback(callback) {
        this.callback = callback;
    }

    createTimers(TimerClass) {
        this.mainTimer = new TimerClass(
            {
                countDown: true,
                time: this.secondsPerTurn
            },
            secondsRemaining => {
                this.mainTimerTick(secondsRemaining);
            }
        );

        this.alertsTimer = new TimerClass(
            {
                countDown: false
            },
            alertSeconds => {
                this.callback("alert", alertSeconds);
            }
        );

        this.breakTimer = new TimerClass(
            {
                countDown: true,
                time: this.breakDurationSeconds
            },
            breakSeconds => {
                this.breakTimerTick(breakSeconds);
            }
        );
    }

    reset() {
        this.mainTimer.reset(this.secondsPerTurn);
        this.dispatchTimerChange();
    }

    mainTimerTick(secondsRemaining) {
        this.dispatchTimerChange();
        if (secondsRemaining < 0) {
            this.mainTimerDone();
        }
    }

    mainTimerDone() {
        this.pause();
        if (this.shouldBeOnBreak()) {
            this.startBreak(false);
        } else {
            this.rotateOrBreak(false);
            this.callback("turnEnded");
        }
        this.startAlerts();

        if (this.clearClipboardHistoryOnTurnEnd) {
            clipboard.clearClipboardHistory(this.numberOfItemsClipboardHistoryStores);
        }
    }

    dispatchTimerChange() {
        if (this.breakTimer.isRunning()) {
            this.callback("timerChange", {
                secondsRemaining: this.breakTimer.time,
                secondsPerTurn: this.breakDurationSeconds
            });
            return;
        }

        this.callback("timerChange", {
            secondsRemaining: this.mainTimer.time,
            secondsPerTurn: this.secondsPerTurn
        });
    }

    reset() {
        this.mainTimer.reset(this.secondsPerTurn);
        this.dispatchTimerChange(this.secondsPerTurn);
    }

    startAlerts() {
        this.alertsTimer.reset(0);
        this.alertsTimer.start();
        this.callback("alert", 0);
    }

    stopAlerts() {
        this.alertsTimer.pause();
        this.callback("stopAlerts");
    }

    breakTimerTick(secondsRemaining) {
        this.dispatchTimerChange();
        if (secondsRemaining < 0) {
            this.breakOver();
        }
    }

    startBreak(immediately) {
        if (this.breakTimer.isRunning()) {
            this.callback("alert", true);
            return;
        };

        if (immediately) {
            this.callback("alert", true);
            if (this.breakTimer.isRunning())
                return;
        }

        this.breakTimer.reset(this.breakDurationSeconds);
        this.breakTimer.start();
        this.mainTimer.pause();

        if (this.mainTimer.time > (this.secondsPerTurn / 2.0))// less than half way through the turn) 
        {
            this.reset();
            this.callback("rotated", this.getCurrentAndNextMobbers());
        }
        else {
            this.rotate();
        }
    }

    stopBreak() {
        this.breakTimer.pause();
        this.breakTimer.reset(this.breakDurationSeconds);
        this.startAlerts();
    }

    breakOver() {
        this.stopBreak();
        this.lastBreakTime = Date.now();
        this.reset();
        this.callback("rotated", this.getCurrentAndNextMobbers());
        this.publishConfig();
    }

    deferBreak() {
        this.stopBreak();
        this.callback("rotated", this.getCurrentAndNextMobbers());
    }

    breakStartsAtTime() {
        return this.breakEnabled && !this.breakTimer.isRunning()
            ? this.lastBreakTime + this.breakFrequencyMilliseconds
            : -1;
    }

    shouldBeOnBreak() {
        return this.breakEnabled && Date.now() > this.breakStartsAtTime();
    }

    breakNextTurn() {
        return (
            this.breakEnabled &&
            Date.now() + this.mainTimer.time * 1000 > this.breakStartsAtTime()
        );
    }

    start() {
        if (this.breakTimer.isRunning()) {
            this.deferBreak();
        } else {
            this.mainTimer.start();
            this.callback("started");
            this.stopAlerts();
            this.publishConfig();
        }
    }

    pause() {
        this.mainTimer.pause();
        this.callback("paused");
        this.stopAlerts();
        this.publishConfig();
    }

    rotateOrBreak(skipped) {
        if (this.nextMobber.break && !this.breakTimer.isRunning()) {
            this.startBreak(skipped);
            this.startAlerts();
            this.publishConfig();
            return;
        }

        if (this.breakTimer.isRunning()) {
            this.breakOver();
        } else {
            this.rotate();
            this.alertsTimer.pause();
            this.alertsTimer.reset(0);
        }
    }

    rotate() {
        this.reset();
        this.mobbers.rotate();
        this.callback("rotated", this.getCurrentAndNextMobbers());
    }

    getCurrentAndNextMobbers() {
        let currAndNext = this.mobbers.getCurrentAndNextMobbers();

        if (this.breakTimer.isRunning()) {
            return {
                current: {
                    id: null,
                    name: "Break!",
                    image: "../img/coffee.png"
                },
                next: currAndNext.current,
                onbreak: true,
                breakFrequencyMilliseconds: this.breakFrequencyMilliseconds
            };
        } else if (this.breakNextTurn()) {
            currAndNext.next = {
                id: null,
                name: "Break!",
                image: "../img/coffee.png",
                break: true
            };
        }

        this.nextMobber = currAndNext.next;

        return {
            current: currAndNext.current,
            next: currAndNext.next,
            onbreak: this.breakTimer.isRunning()
        };
    }

    initialize() {
    this.pause();
    this.rotate();
    this.callback("turnEnded");
    this.publishConfig();
  }

    publishConfig() {
        this.callback("configUpdated", this.getState());
        this.callback("rotated", this.getCurrentAndNextMobbers());
        this.dispatchTimerChange();
    }

    addMobber(mobber) {
        this.mobbers.addMobber(mobber);
        this.publishConfig();
        this.callback("rotated", this.getCurrentAndNextMobbers());
    }

    removeMobber(mobber) {
        let currentMobber = this.mobbers.getCurrentAndNextMobbers().current;
        let isRemovingCurrentMobber = currentMobber
            ? currentMobber.name === mobber.name
            : false;

        this.mobbers.removeMobber(mobber);

        if (isRemovingCurrentMobber) {
            this.pause();
            this.reset();
            this.callback("turnEnded");
        }

        this.publishConfig();
        this.callback("rotated", this.getCurrentAndNextMobbers());
    }

    updateMobber(mobber) {
        const currentMobber = this.mobbers.getCurrentAndNextMobbers().current;
        const disablingCurrentMobber =
            currentMobber && currentMobber.id === mobber.id && mobber.disabled;

        this.mobbers.updateMobber(mobber);

        if (disablingCurrentMobber) {
            this.pause();
            this.reset();
            this.callback("turnEnded");
        }

        this.publishConfig();
    }

    setSecondsPerTurn(value) {
        this.secondsPerTurn = value;
        this.publishConfig();
        this.reset();
    }

    setSecondsUntilFullscreen(value) {
        this.secondsUntilFullscreen = value;
        this.publishConfig();
    }

    setBreakEnabled(breakEnabled) {
        this.breakEnabled = breakEnabled;
        this.publishConfig();
    }

    setBreakDurationSeconds(breakDurationSeconds) {
        this.breakDurationSeconds = breakDurationSeconds;
        this.publishConfig();
    }

    setBreakFrequencySeconds(breakFrequencySeconds) {
        this.breakFrequencyMilliseconds = breakFrequencySeconds * 1000;
        this.publishConfig();
    }

    setSnapThreshold(value) {
        this.snapThreshold = value;
        this.publishConfig();
    }

    setAlertSound(soundFile) {
        this.alertSound = soundFile;
        this.publishConfig();
    }

    setAlertSoundTimes(secondsArray) {
        this.alertSoundTimes = secondsArray;
        this.publishConfig();
    }

    setTimerAlwaysOnTop(value) {
        this.timerAlwaysOnTop = value;
        this.publishConfig();
    }

    setShuffleMobbersOnStartup(value) {
        this.shuffleMobbersOnStartup = value;
        this.publishConfig();
    }

    shuffleMobbers() {
        this.mobbers.shuffleMobbers();
        this.publishConfig();
    }

    setClearClipboardHistoryOnTurnEnd(value) {
        this.clearClipboardHistoryOnTurnEnd = value;
        this.publishConfig();
    }

    setNumberOfItemsClipboardHistoryStores(value) {
        this.numberOfItemsClipboardHistoryStores = value;
        this.publishConfig();
    }

    updateGitIntegration(event, value) {
        if (value.enabled === true) {
            this.gitIntegration.displayHelp(event);
        }
        this.setGitIntegration(value);
    }

    setGitIntegration(value) {
        this.gitIntegration.setGitIntegration(value);
        this.publishConfig();
    }

    getState() {
        return {
            mobbers: this.mobbers.getAll(),
            secondsPerTurn: this.secondsPerTurn,
            secondsUntilFullscreen: this.secondsUntilFullscreen,
            breakEnabled: this.breakEnabled,
            breakFrequencySeconds: this.breakFrequencyMilliseconds / 1000,
            breakDurationSeconds: this.breakDurationSeconds,
            snapThreshold: this.snapThreshold,
            alertSound: this.alertSound,
            alertSoundTimes: this.alertSoundTimes,
            timerAlwaysOnTop: this.timerAlwaysOnTop,
            shuffleMobbersOnStartup: this.shuffleMobbersOnStartup,
            clearClipboardHistoryOnTurnEnd: this.clearClipboardHistoryOnTurnEnd,
            numberOfItemsClipboardHistoryStores: this
                .numberOfItemsClipboardHistoryStores,
            timerOnTopBecausePaused: !this.mainTimer.isRunning(),
            breakStartsAtTime: this.breakStartsAtTime(),
            gitIntegration: {
                enabled: this.gitIntegration.enabled(),
                port: this.gitIntegration.port
            }
        };
    }

    loadState(state) {
        if (state.mobbers) {
            state.mobbers.forEach(x => this.addMobber(x));
        }

        this.setSecondsPerTurn(state.secondsPerTurn || this.secondsPerTurn);
        if (typeof state.secondsUntilFullscreen === "number") {
            this.setSecondsUntilFullscreen(state.secondsUntilFullscreen);
        }

        if (typeof state.breakEnabled === "boolean") {
            this.setBreakEnabled(state.breakEnabled);
        }
        if (typeof state.breakFrequencySeconds === "number") {
            this.setBreakFrequencySeconds(state.breakFrequencySeconds);
        }
        if (typeof state.breakDurationSeconds === "number") {
            this.setBreakDurationSeconds(state.breakDurationSeconds);
        }

        if (typeof state.snapThreshold === "number") {
            this.setSnapThreshold(state.snapThreshold);
        }
        this.alertSound = state.alertSound || null;
        this.alertSoundTimes = state.alertSoundTimes || [];
        if (typeof state.timerAlwaysOnTop === "boolean") {
            this.timerAlwaysOnTop = state.timerAlwaysOnTop;
        }
        this.shuffleMobbersOnStartup = !!state.shuffleMobbersOnStartup;
        this.clearClipboardHistoryOnTurnEnd = !!state.clearClipboardHistoryOnTurnEnd;
        this.numberOfItemsClipboardHistoryStores =
            Math.floor(state.numberOfItemsClipboardHistoryStores) > 0
                ? Math.floor(state.numberOfItemsClipboardHistoryStores)
                : 1;

        if (
            typeof state.gitIntegration === "object" &&
            typeof state.gitIntegration.enabled === "boolean" &&
            typeof state.gitIntegration.port === "number"
        ) {
            this.setGitIntegration(state.gitIntegration);
        }
    }
}

module.exports = TimerState;
