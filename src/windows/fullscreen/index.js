const ipc = require('electron').ipcRenderer

const skipBtn = document.getElementById('skip')
const startTurnBtn = document.getElementById('startTurn')
const configureBtn = document.getElementById('configure')
const currentEl = document.getElementById('current')
const currentPicEl = document.getElementById('currentPic')
const nextEl = document.getElementById('next')
const nextPicEl = document.getElementById('nextPic')
const sitMessage = document.getElementById('sitMessage')

ipc.on('rotated', (event, data) => {
  if (!data.current) {
    data.current = { name: "Add a mobber" }
  }

  if (data.onbreak) {
    currentEl.innerHTML = "Break!"
    currentPicEl.src = "../img/sad-cyclops.png"
    startTurnBtn.innerHTML = "Defer"
    sitMessage.hidden = true

  }
  else {
    currentEl.innerHTML = data.current.name
    currentPicEl.src = data.current.image || "../img/sad-cyclops.png"    
    startTurnBtn.innerHTML = "Start"
    sitMessage.hidden = false
  }

  if (!data.next) {
    data.next = data.current
  }
  nextEl.innerHTML = data.next.name
  nextPicEl.src = data.next.image || "../img/sad-cyclops.png"
})

// ipc.on('configUpdated', (event, data) => {
//   countEl.innerHTML = formatTime(data.secondsPerTurn)
// })

skipBtn.addEventListener('click', _ => ipc.send('skip'))
startTurnBtn.addEventListener('click', _ => ipc.send('startTurn'))
configureBtn.addEventListener('click', _ => ipc.send('configure'))

ipc.send('fullscreenWindowReady')
