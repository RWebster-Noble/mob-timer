const theme = require('../theme.js')
const ipc = require('electron').ipcRenderer

const skipBtn = document.getElementById('skip')
const startTurnBtn = document.getElementById('startTurn')
const configureBtn = document.getElementById('configure')
const currentEl = document.getElementById('current')
const currentPicEl = document.getElementById('currentPic')
const nextEl = document.getElementById('next')
const nextPicEl = document.getElementById('nextPic')
const sitMessage = document.getElementById('sitMessage')
const timerCanvas = document.getElementById('timerCanvas')
const breakTimeDiv = document.getElementById('breakTimeContainer')
const breakTimeSpn = document.getElementById('breakTime')

timerCanvas.hidden = true;

const context = timerCanvas.getContext('2d')

ipc.on('rotated', (event, data) => {
  if (!data.current) {
    data.current = { name: "Add a mobber" }
  }

  if (data.onbreak) {
    currentEl.innerHTML = "Break!"
    currentPicEl.src = "../img/sad-cyclops.png"
    startTurnBtn.innerHTML = "Defer"
    sitMessage.hidden = true
    timerCanvas.hidden = false;
  }
  else {
    currentEl.innerHTML = data.current.name
    currentPicEl.src = data.current.image || "../img/sad-cyclops.png"    
    startTurnBtn.innerHTML = "Start"
    sitMessage.hidden = false
    timerCanvas.hidden = true;
  }

  if (!data.next) {
    data.next = data.current
  }
  nextEl.innerHTML = data.next.name
  nextPicEl.src = data.next.image || "../img/sad-cyclops.png"
})

ipc.on('timerChange', (event, data) => {
  clearCanvas()
  drawTimerCircle()
  drawTimerArc(data.secondsRemaining, data.secondsPerTurn)
})

ipc.on('configUpdated', (event, data) => {  
  breakTimeDiv.style.display = data.breakEnabled && data.breakStartsAtTime != -1 ? "" : "none" 

  var date = new Date(data.breakStartsAtTime)  
  var strHours = (date.getHours() < 10 ? '0' : '') + date.getHours()
  var strMins = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes()  
  breakTimeSpn.innerText = strHours + ":" + strMins
})

function clearCanvas() {
  context.clearRect(0, 0, timerCanvas.width, timerCanvas.height)
}

function drawTimerCircle() {
  const begin = 0
  const end = 2 * Math.PI
  drawArc(begin, end, "#EEEEEE")
}

function drawArc(begin, end, color) {
  const circleCenterX = timerCanvas.width / 2
  const circleCenterY = circleCenterX
  const circleRadius = circleCenterX - 6
  context.beginPath()
  context.arc(circleCenterX, circleCenterY, circleRadius, begin, end)
  context.strokeStyle = color
  context.lineWidth = 10
  context.stroke()
}

function drawTimerArc(seconds, maxSeconds) {
  let percent = 1 - (seconds / maxSeconds)
  if (percent == 0) {
    return
  }
  let begin = -(.5 * Math.PI)
  let end = begin + (2 * Math.PI * percent)
  drawArc(begin, end, theme.mobberBorderHighlightColor)
}

// ipc.on('configUpdated', (event, data) => {
//   countEl.innerHTML = formatTime(data.secondsPerTurn)
// })

skipBtn.addEventListener('click', _ => ipc.send('skip'))
startTurnBtn.addEventListener('click', _ => ipc.send('startTurn'))
configureBtn.addEventListener('click', _ => ipc.send('configure'))

ipc.send('fullscreenWindowReady')
