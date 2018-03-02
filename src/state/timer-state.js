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
    this.breakFrequencyMilliseconds = 1000 * 20
    this.breakDurationSeconds = 10
    this.snapThreshold = 25
    this.alertSound = null
    this.alertSoundTimes = []
    this.timerAlwaysOnTop = true

    this.lastBreakTime = Date.now()

    this.createTimers(options.Timer || Timer)
  }

  setCallback(callback) {
    this.callback = callback
  }

  createTimers(TimerClass) {
    this.mainTimer = new TimerClass({ countDown: true, time: this.secondsPerTurn }, secondsRemaining => {
      this.mainTimerTick(secondsRemaining)
    })

    this.alertsTimer = new TimerClass({ countDown: false }, alertSeconds => {
      this.callback('alert', alertSeconds)
    })

    this.breakTimer = new TimerClass({ countDown: true, time: this.breakDurationSeconds }, breakSeconds => {
      this.breakTimerTick(breakSeconds)
    })
  }

  reset() {
    this.mainTimer.reset(this.secondsPerTurn)
    this.dispatchMainTimerChange(this.secondsPerTurn)
  }

  mainTimerTick(secondsRemaining) {
    this.dispatchMainTimerChange(secondsRemaining)
    if (secondsRemaining < 0) {
      this.mainTimerDone()
    }
  }

  mainTimerDone() {
    this.pause()
    if (this.breakEnabled && Date.now() > this.lastBreakTime + this.breakFrequencyMilliseconds) {
      this.startBreak()
    }
    else {
      this.rotate()
      this.callback('turnEnded')
    }
    this.startAlerts()
  }

  dispatchMainTimerChange(secondsRemaining) {
    this.callback('timerChange', {
      secondsRemaining,
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
    // this.callback('timerChange', {
    //   secondsRemaining,
    //   secondsPerTurn: this.secondsPerTurn
    // })
    if (secondsRemaining < 0) {
      this.breakOver()
    }
  }

  startBreak() {
    this.breakTimer.reset(this.breakDurationSeconds)
    this.breakTimer.start()
    this.mainTimer.pause()
    this.lastBreakTime = 0;
    this.callback('rotated', this.getCurrentAndNextMobbers())
  }

  stopBreak() {
    this.breakTimer.pause()
    this.breakTimer.reset(this.breakDurationSeconds)
    this.callback('alert', 0)
  }

  breakOver() {
    this.stopBreak()
    this.lastBreakTime = Date.now()
    this.callback('rotated', this.getCurrentAndNextMobbers())
  }

  start() {
    this.mainTimer.start()
    this.callback('started')
    this.stopAlerts()
    this.publishConfig()
  }

  pause() {
    this.mainTimer.pause()
    this.callback('paused')
    this.stopAlerts()
  }

  rotate() {
    this.reset()
    this.mobbers.rotate()
    this.breakTimer.pause()
    this.callback('rotated', this.getCurrentAndNextMobbers())
  }

  getCurrentAndNextMobbers() {
    var currAndNext = this.mobbers.getCurrentAndNextMobbers()

    if (this.breakTimer.isRunning())
      currAndNext.current = { id: null, name: "Break!" }
    else if (this.breakEnabled && Date.now() + this.mainTimer.time > this.lastBreakTime + this.breakFrequencyMilliseconds)
      currAndNext.next = { id: null, name: "Break!" }

    return { current: currAndNext.current, next: currAndNext.next, onbreak: this.breakTimer.isRunning() }
  }

  initialize() {
    this.rotate()
    this.callback('turnEnded')
    this.publishConfig()
  }

  publishConfig() {
    this.callback('configUpdated', this.getState())
    this.callback('rotated', this.getCurrentAndNextMobbers())
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
      timerAlwaysOnTop: this.timerAlwaysOnTop
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
