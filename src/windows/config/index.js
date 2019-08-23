const ipc = require('electron').ipcRenderer
const { dialog } = require('electron').remote

const mobbersEl = document.getElementById('mobbers')
const shuffleEl = document.getElementById('shuffle')
const minutesEl = document.getElementById('minutes')
const addEl = document.getElementById('add')
const addMobberForm = document.getElementById('addMobberForm')
const fullscreenSecondsEl = document.getElementById('fullscreen-seconds')
const breakCheckbox = document.getElementById('break')
const breakFrequencyEl = document.getElementById('break-frequency')
const breakDurationEl = document.getElementById('break-duration')
const snapToEdgesCheckbox = document.getElementById('snap-to-edges')
const alertAudioCheckbox = document.getElementById('alertAudio')
const replayAudioContainer = document.getElementById('replayAudioContainer')
const replayAlertAudioCheckbox = document.getElementById('replayAlertAudio')
const replayAudioAfterSeconds = document.getElementById('replayAudioAfterSeconds')
const useCustomSoundCheckbox = document.getElementById('useCustomSound')
const customSoundEl = document.getElementById('customSound')
const timerAlwaysOnTopCheckbox = document.getElementById('timerAlwaysOnTop')
const shuffleMobbersOnStartupCheckbox = document.getElementById('shuffleMobbersOnStartup')
const clearClipboardHistoryOnTurnEndCheckbox = document.getElementById('clearClipboardHistoryOnTurnEnd')
const numberOfItemsClipboardHistoryStores = document.getElementById('numberOfItemsClipboardHistoryStores')
const gitIntegrationEnabledCheckbox = document.getElementById('gitIntegrationEnabled')

function createMobberEl(frag, mobber) {
  const el = document.createElement('div')
  el.classList.add('mobber')
  if (mobber.disabled) {
    el.classList.add('disabled')
  }

  const imgEl = document.createElement('img')
  imgEl.src = mobber.image || '../img/sad-cyclops.png'
  imgEl.classList.add('image')
  el.appendChild(imgEl)

  const nameEl = document.createElement('div')
  nameEl.innerHTML = mobber.name
  nameEl.classList.add('name')
  el.appendChild(nameEl)

  const disableBtn = document.createElement('button')
  disableBtn.classList.add('btn')
  disableBtn.innerHTML = mobber.disabled ? 'Enable' : 'Disable'
  el.appendChild(disableBtn)

  const rmBtn = document.createElement('button')
  rmBtn.classList.add('btn')
  rmBtn.innerHTML = 'Remove'
  el.appendChild(rmBtn)

  const gitDetailsAccordianForm = document.createElement('form')
  gitDetailsAccordianForm.classList.add('gitDetailsAccordian')
  gitDetailsAccordianForm.style.display = "none"

  const gitNameInput = document.createElement("input")
  gitNameInput.type = "text"
  if (mobber.gitUsername)
    gitNameInput.value = mobber.gitUsername
  gitNameInput.placeholder = "Git Username"

  gitNameInput.addEventListener('change', () => {
    mobber.gitUsername = gitNameInput.value
    ipc.send('updateMobber', mobber)
  })
  gitNameInput.addEventListener('focusout', _ => {
    mobber.gitUsername = gitNameInput.value
    ipc.send('updateMobber', mobber)
  })

  gitDetailsAccordianForm.appendChild(gitNameInput)
  gitDetailsAccordianForm.appendChild(document.createElement('br'))

  const gitEmailInput = document.createElement("input")
  gitEmailInput.type = "text"
  if (mobber.gitEmail)
    gitEmailInput.value = mobber.gitEmail
  gitEmailInput.placeholder = "Git Email Address"
  gitEmailInput.addEventListener('change', () => {
    mobber.gitEmail = gitNameInput.value
    ipc.send('updateMobber', mobber)
  })
  gitEmailInput.addEventListener('focusout', _ => {
    mobber.gitEmail = gitEmailInput.value
    ipc.send('updateMobber', mobber)
  })
  gitDetailsAccordianForm.appendChild(gitEmailInput)


  nameEl.addEventListener("click", function () {
    if (gitIntegrationEnabledCheckbox.checked) {
      if (gitIntegrationEnabledCheckbox.checked && gitDetailsAccordianForm.style.display === "block") {
        gitDetailsAccordianForm.style.display = "none";
      } else {
        Array.prototype.forEach.call(document.getElementsByClassName("gitDetailsAccordian"), (e) => e.style.display = "none")
        gitDetailsAccordianForm.style.display = "block";
      }
    }
  })

  imgEl.addEventListener('click', () => selectImage(mobber))
  disableBtn.addEventListener('click', () => toggleMobberDisabled(mobber))
  rmBtn.addEventListener('click', () => ipc.send('removeMobber', mobber))

  const mobberContainer = document.createElement('div')
  mobberContainer.classList.add('mobberContainer')
  mobberContainer.appendChild(el)
  mobberContainer.appendChild(gitDetailsAccordianForm)
  frag.appendChild(mobberContainer)
}

function selectImage(mobber) {
  var image = dialog.showOpenDialog({
    title: 'Select image',
    filters: [
      { name: 'Images', extensions: ['jpg', 'png', 'gif'] }
    ],
    properties: ['openFile']
  })

  if (image) {
    mobber.image = image[0]
    ipc.send('updateMobber', mobber)
  }
}

function toggleMobberDisabled(mobber) {
  mobber.disabled = !mobber.disabled
  ipc.send('updateMobber', mobber)
}

ipc.on('configUpdated', (event, data) => {
  minutesEl.value = data.secondsPerTurn / 60
  mobbersEl.innerHTML = ''
  const frag = document.createDocumentFragment()
  data.mobbers.map(mobber => {
    createMobberEl(frag, mobber)
  })
  mobbersEl.appendChild(frag)
  fullscreenSecondsEl.value = data.secondsUntilFullscreen

  breakCheckbox.checked = data.breakEnabled
  breakFrequencyEl.value = data.breakFrequencySeconds / 60
  breakDurationEl.value = data.breakDurationSeconds / 60

  snapToEdgesCheckbox.checked = data.snapThreshold > 0

  alertAudioCheckbox.checked = data.alertSoundTimes.length > 0
  replayAlertAudioCheckbox.checked = data.alertSoundTimes.length > 1
  replayAudioAfterSeconds.value = data.alertSoundTimes.length > 1 ? data.alertSoundTimes[1] : 30
  updateAlertControls()

  useCustomSoundCheckbox.checked = !!data.alertSound
  customSoundEl.value = data.alertSound

  timerAlwaysOnTopCheckbox.checked = data.timerAlwaysOnTop
  shuffleMobbersOnStartupCheckbox.checked = data.shuffleMobbersOnStartup
  clearClipboardHistoryOnTurnEndCheckbox.checked = data.clearClipboardHistoryOnTurnEnd
  numberOfItemsClipboardHistoryStores.value = data.numberOfItemsClipboardHistoryStores
  numberOfItemsClipboardHistoryStores.disabled = !clearClipboardHistoryOnTurnEndCheckbox.checked
  gitIntegrationEnabledCheckbox.checked = data.gitIntegrationEnabled
})

minutesEl.addEventListener('change', () => {
  ipc.send('setSecondsPerTurn', minutesEl.value * 60)
})
minutesEl.addEventListener('focusout', _ => {
  ipc.send('setSecondsPerTurn', minutesEl.value * 60)
})

addMobberForm.addEventListener('submit', event => {
  event.preventDefault()
  let value = addEl.value.trim()
  if (!value) {
    return
  }
  ipc.send('addMobber', { name: value })
  addEl.value = ''
})

shuffleEl.addEventListener('click', event => {
  event.preventDefault()
  ipc.send('shuffleMobbers')
})

fullscreenSecondsEl.addEventListener('change', () => {
  ipc.send('setSecondsUntilFullscreen', fullscreenSecondsEl.value * 1)
})
fullscreenSecondsEl.addEventListener('focusout', _ => {
  ipc.send('setSecondsUntilFullscreen', fullscreenSecondsEl.value * 1)
})

breakCheckbox.addEventListener('change', _ => {
  ipc.send('setBreakEnabled', breakCheckbox.checked)
})
breakFrequencyEl.addEventListener('change', _ => {
  ipc.send('setBreakFrequencySeconds', breakFrequencyEl.value * 60)
})
breakFrequencyEl.addEventListener('focusout', _ => {
  ipc.send('setBreakFrequencySeconds', breakFrequencyEl.value * 60)
})
breakDurationEl.addEventListener('change', _ => {
  ipc.send('setBreakDurationSeconds', breakDurationEl.value * 60)
})
breakDurationEl.addEventListener('focusout', _ => {
  ipc.send('setBreakDurationSeconds', breakDurationEl.value * 60)
})

ipc.send('configWindowReady')

snapToEdgesCheckbox.addEventListener('change', () => {
  ipc.send('setSnapThreshold', snapToEdgesCheckbox.checked ? 25 : 0)
})

alertAudioCheckbox.addEventListener('change', _ => updateAlertTimes())
replayAlertAudioCheckbox.addEventListener('change', _ => updateAlertTimes())
replayAudioAfterSeconds.addEventListener('change', _ => updateAlertTimes())
replayAudioAfterSeconds.addEventListener('focusout', _ => updateAlertTimes())

function updateAlertTimes() {
  updateAlertControls()

  let alertSeconds = []
  if (alertAudioCheckbox.checked) {
    alertSeconds.push(0)
    if (replayAlertAudioCheckbox.checked) {
      alertSeconds.push(replayAudioAfterSeconds.value * 1)
    }
  }

  ipc.send('setAlertSoundTimes', alertSeconds)
}

function updateAlertControls() {
  let replayDisabled = !alertAudioCheckbox.checked
  replayAlertAudioCheckbox.disabled = replayDisabled

  if (replayDisabled) {
    replayAlertAudioCheckbox.checked = false
    replayAudioContainer.classList.add('disabled')
  } else {
    replayAudioContainer.classList.remove('disabled')
  }

  let secondsDisabled = !replayAlertAudioCheckbox.checked
  replayAudioAfterSeconds.disabled = secondsDisabled
}

useCustomSoundCheckbox.addEventListener('change', () => {
  let mp3 = null

  if (useCustomSoundCheckbox.checked) {
    const selectedMp3 = dialog.showOpenDialog({
      title: 'Select alert sound',
      filters: [
        { name: 'MP3', extensions: ['mp3'] }
      ],
      properties: ['openFile']
    })

    if (selectedMp3) {
      mp3 = selectedMp3[0]
    } else {
      useCustomSoundCheckbox.checked = false
    }
  }

  ipc.send('setAlertSound', mp3)
})

timerAlwaysOnTopCheckbox.addEventListener('change', () => {
  ipc.send('setTimerAlwaysOnTop', timerAlwaysOnTopCheckbox.checked)
})

shuffleMobbersOnStartupCheckbox.addEventListener('change', () => {
  ipc.send('setShuffleMobbersOnStartup', shuffleMobbersOnStartupCheckbox.checked)
})

clearClipboardHistoryOnTurnEndCheckbox.addEventListener('change', () => {
  numberOfItemsClipboardHistoryStores.disabled = !clearClipboardHistoryOnTurnEndCheckbox.checked
  ipc.send('setClearClipboardHistoryOnTurnEnd', clearClipboardHistoryOnTurnEndCheckbox.checked)
})

numberOfItemsClipboardHistoryStores.addEventListener('change', () => {
  ipc.send('setNumberOfItemsClipboardHistoryStores', Math.floor(numberOfItemsClipboardHistoryStores.value) > 0 ? Math.floor(numberOfItemsClipboardHistoryStores.value) : 1)
})

gitIntegrationEnabledCheckbox.addEventListener('change', () => {
  ipc.send('setGitIntegration', gitIntegrationEnabledCheckbox.checked)
})
