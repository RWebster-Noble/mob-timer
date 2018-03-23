const Timer = require('./timer')
const Mobbers = require('./mobbers')

class TimerState {
  constructor(options) {
    if (!options) {
      options = {}
    }
    this.secondsPerTurn = 600
    this.mobbers = new Mobbers()
    this.secondsUntilFullscreen = 30
    this.breakEnabled = true
    this.breakDeffered = false
    this.breakFrequencyMilliseconds = 60 * 60 * 1000 // default 60 mins
    this.breakDurationSeconds = 10 * 60 // default 10 min
    this.snapThreshold = 25
    this.alertSound = null
    this.alertSoundTimes = []
    this.timerAlwaysOnTop = true

    this.lastBreakTime = Date.now()

    this.createTimers(options.Timer || Timer)

    this.nextMobber = null;
  }

  setCallback(callback) {
    this.callback = callback
  }

  createTimers(TimerClass) {
    this.mainTimer = new TimerClass({
      countDown: true,
      time: this.secondsPerTurn
    }, secondsRemaining => {
      this.mainTimerTick(secondsRemaining)
    })

    this.alertsTimer = new TimerClass({
      countDown: false
    }, alertSeconds => {
      this.callback('alert', alertSeconds)
    })

    this.breakTimer = new TimerClass({
      countDown: true,
      time: this.breakDurationSeconds
    }, breakSeconds => {
      this.breakTimerTick(breakSeconds)
    })
  }

  reset() {
    this.mainTimer.reset(this.secondsPerTurn)
    this.dispatchTimerChange()
  }

  mainTimerTick(secondsRemaining) {
    this.dispatchTimerChange()
    if (secondsRemaining < 0) {
      this.mainTimerDone()
    }
  }

  mainTimerDone() {
    this.pause()
    if (this.shouldBeOnBreak()) {
      this.startBreak()
    } else {
      this.rotateOrBreak()
      this.callback('turnEnded')
    }
    this.startAlerts()
    this.breakDeffered = false;
  }

  dispatchTimerChange() {
    if (this.breakTimer.isRunning()) {
      this.callback('timerChange', {
        secondsRemaining: this.breakTimer.time,
        secondsPerTurn: this.breakDurationSeconds
      })
      return;
    }

    this.callback('timerChange', {
      secondsRemaining: this.mainTimer.time,
      secondsPerTurn: this.secondsPerTurn
    })

  }

  startAlerts() {
    this.alertsTimer.reset(0)
    this.alertsTimer.start()
    this.callback('alert', 0)
  }

  stopAlerts() {
    this.alertsTimer.pause()
    this.callback('stopAlerts')
  }

  breakTimerTick(secondsRemaining) {
    this.dispatchTimerChange()
    if (secondsRemaining < 0) {
      this.breakOver()
    }
  }

  startBreak() {
    this.breakTimer.reset(this.breakDurationSeconds)
    this.breakTimer.start()
    this.mainTimer.pause()
    this.callback('rotated', this.getCurrentAndNextMobbers())
    this.dispatchTimerChange()
  }

  stopBreak() {
    this.breakTimer.pause()
    this.breakTimer.reset(this.breakDurationSeconds)
    this.callback('alert', 0)
  }

  breakOver() {
    this.stopBreak()
    this.lastBreakTime = Date.now()
    this.reset()
    this.rotate()
    this.publishConfig()
  }

  deferBreak() {
    this.stopBreak()
    this.breakDeffered = true;
    this.rotate()
  }

  breakStartsAtTime() {
    return this.breakEnabled && !this.breakTimer.isRunning() ? this.lastBreakTime + this.breakFrequencyMilliseconds : -1
  }

  shouldBeOnBreak() {
    return this.breakEnabled && Date.now() > this.breakStartsAtTime()
  }

  breakNextTurn() {
    return this.breakEnabled && Date.now() + (this.mainTimer.time * 1000) > this.breakStartsAtTime()
  }

  start() {
    if (this.breakTimer.isRunning()) {
      this.deferBreak()
    } else {
      this.mainTimer.start()
      this.callback('started')
      this.stopAlerts()
      this.publishConfig()
    }
  }

  pause() {
    this.mainTimer.pause()
    this.callback('paused')
    this.stopAlerts()
    this.publishConfig()
  }

  rotateOrBreak() {
    if (this.nextMobber.break) {
      this.startBreak()
      this.startAlerts()
      return;
    }

    var currAndNext = this.getCurrentAndNextMobbers()

    if (this.breakTimer.isRunning()) {
      this.breakOver()
    } else {
      this.rotate()
      this.alertsTimer.pause()
      this.alertsTimer.reset(0)
    }
  }

  rotate() {
    this.reset()
    this.mobbers.rotate()
    this.callback('rotated', this.getCurrentAndNextMobbers())
  }

  getCurrentAndNextMobbers() {
    var currAndNext = this.mobbers.getCurrentAndNextMobbers()

    if (this.breakTimer.isRunning()) {
      currAndNext.current = {
        id: null,
        name: "Break!"
      }
    }
    else if (this.breakNextTurn()) {
      currAndNext.next = {
        id: null,
        name: "Break!",
        break: true
      }
    }

    this.nextMobber = currAndNext.next

    return {
      current: currAndNext.current,
      next: currAndNext.next,
      onbreak: this.breakTimer.isRunning()
    }
  }

  initialize() {
    this.rotate()
    this.callback('turnEnded')
    this.publishConfig()
  }

  publishConfig() {
    this.callback('configUpdated', this.getState())
    this.callback('rotated', this.getCurrentAndNextMobbers())
    this.dispatchTimerChange()
  }

  addMobber(mobber) {
    this.mobbers.addMobber(mobber)
    this.publishConfig()
    this.callback('rotated', this.getCurrentAndNextMobbers())
  }

  removeMobber(mobber) {
    let currentMobber = this.getCurrentAndNextMobbers().current
    let isRemovingCurrentMobber = currentMobber ? currentMobber.name == mobber.name : false

    this.mobbers.removeMobber(mobber)

    if (isRemovingCurrentMobber) {
      this.pause()
      this.reset()
      this.callback('turnEnded')
    }

    this.publishConfig()
    this.callback('rotated', this.getCurrentAndNextMobbers())
  }

  updateMobber(mobber) {
    this.mobbers.updateMobber(mobber)
    this.publishConfig()
  }

  setSecondsPerTurn(value) {
    this.secondsPerTurn = value
    this.publishConfig()
    this.reset()
  }

  setSecondsUntilFullscreen(value) {
    this.secondsUntilFullscreen = value
    this.publishConfig()
  }

  setBreakEnabled(breakEnabled) {
    this.breakEnabled = breakEnabled
    this.publishConfig()
  }

  setBreakDurationSeconds(breakDurationSeconds) {
    this.breakDurationSeconds = breakDurationSeconds
    this.publishConfig()
  }

  setBreakFrequencySeconds(breakFrequencySeconds) {
    this.breakFrequencyMilliseconds = breakFrequencySeconds * 1000
    this.publishConfig()
  }

  setSnapThreshold(value) {
    this.snapThreshold = value
    this.publishConfig()
  }

  setAlertSound(soundFile) {
    this.alertSound = soundFile
    this.publishConfig()
  }

  setAlertSoundTimes(secondsArray) {
    this.alertSoundTimes = secondsArray
    this.publishConfig()
  }

  setTimerAlwaysOnTop(value) {
    this.timerAlwaysOnTop = value
    this.publishConfig()
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
      timerOnTopBecausePaused: !this.mainTimer.isRunning(),
      breakStartsAtTime: this.breakStartsAtTime()
    }
  }

  loadState(state) {
    if (state.mobbers) {
      state.mobbers.forEach(x => this.addMobber(x))
    }

    this.setSecondsPerTurn(state.secondsPerTurn || this.secondsPerTurn)
    if (typeof state.secondsUntilFullscreen === 'number') {
      this.setSecondsUntilFullscreen(state.secondsUntilFullscreen)
    }

    if (typeof state.breakEnabled === 'boolean') {
      this.setBreakEnabled(state.breakEnabled)
    }
    if (typeof state.breakFrequencySeconds === 'number') {
      this.setBreakFrequencySeconds(state.breakFrequencySeconds)
    }
    if (typeof state.breakDurationSeconds === 'number') {
      this.setBreakDurationSeconds(state.breakDurationSeconds)
    }

    if (typeof state.snapThreshold === 'number') {
      this.setSnapThreshold(state.snapThreshold)
    }
    this.alertSound = state.alertSound || null
    this.alertSoundTimes = state.alertSoundTimes || []
    if (typeof state.timerAlwaysOnTop === 'boolean') {
      this.timerAlwaysOnTop = state.timerAlwaysOnTop
    }
  }
}

module.exports = TimerState