 const electron = require('electron')
const { app, ipcMain: ipc } = electron

let windows = require('./windows/windows')
let TimerState = require('./state/timer-state')
let statePersister = require('./state/state-persister')

let timerState = new TimerState()

app.on('ready', () => {
  timerState.setCallback(onTimerEvent)
  timerState.loadState(statePersister.read())
  windows.setConfigState(timerState.getState())
  windows.createTimerWindow()
  if (timerState.getState().shuffleMobbersOnStartup) {
    timerState.shuffleMobbers()
  }
})

function onTimerEvent(event, data) {
  windows.dispatchEvent(event, data)
  if (event === 'configUpdated') {
    statePersister.write(timerState.getState())
  }
}

ipc.on('timerWindowReady', () => timerState.initialize())
ipc.on('configWindowReady', () => timerState.publishConfig())
ipc.on('fullscreenWindowReady', () => timerState.publishConfig())

ipc.on('pause', _ => timerState.pause())
ipc.on('unpause', _ => timerState.start())
ipc.on('skip', _ => timerState.rotateOrBreak())
ipc.on('takeABreakNow', _ => timerState.startBreak())
ipc.on('startTurn', _ => timerState.start())
ipc.on('configure', _ => {
  windows.showConfigWindow()
  windows.closeFullscreenWindows()
})

ipc.on('shuffleMobbers', () => timerState.shuffleMobbers())
ipc.on('addMobber', (event, mobber) => timerState.addMobber(mobber))
ipc.on('removeMobber', (event, mobber) => timerState.removeMobber(mobber))
ipc.on('updateMobber', (event, mobber) => timerState.updateMobber(mobber))
ipc.on('setSecondsPerTurn', (event, secondsPerTurn) => timerState.setSecondsPerTurn(secondsPerTurn))
ipc.on('setSecondsUntilFullscreen', (event, secondsUntilFullscreen) => timerState.setSecondsUntilFullscreen(secondsUntilFullscreen))
ipc.on('setBreakEnabled', (event, breakEnabled) => timerState.setBreakEnabled(breakEnabled))
ipc.on('setBreakDurationSeconds', (event, breakDurationSeconds) => timerState.setBreakDurationSeconds(breakDurationSeconds))
ipc.on('setBreakFrequencySeconds', (event, breakFrequencySeconds) => timerState.setBreakFrequencySeconds(breakFrequencySeconds))
ipc.on('setSnapThreshold', (event, threshold) => timerState.setSnapThreshold(threshold))
ipc.on('setAlertSoundTimes', (event, alertSoundTimes) => timerState.setAlertSoundTimes(alertSoundTimes))
ipc.on('setAlertSound', (event, alertSound) => timerState.setAlertSound(alertSound))
ipc.on('setTimerAlwaysOnTop', (event, value) => timerState.setTimerAlwaysOnTop(value))
ipc.on('setShuffleMobbersOnStartup', (event, value) => timerState.setShuffleMobbersOnStartup(value))
ipc.on('setClearClipboardHistoryOnTurnEnd', (event, value) => timerState.setClearClipboardHistoryOnTurnEnd(value))
ipc.on('setNumberOfItemsClipboardHistoryStores', (event, value) => timerState.setNumberOfItemsClipboardHistoryStores(value))

app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function() {
  windows.createTimerWindow()
})
