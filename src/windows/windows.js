const electron = require('electron')
const windowSnapper = require('./window-snapper')

let timerWindows, configWindow, fullscreenWindows
let snapThreshold, secondsUntilFullscreen, timerAlwaysOnTop

exports.createTimerWindow = () => {
  if (timerWindows) {
    return
  }

  timerWindows = [];
  let displays = electron.screen.getAllDisplays()
  displays.forEach(display => {
    let { width, height } = display.workAreaSize
    let { x, y } = display.bounds

    const timerWidth = 220;
    const timerHeight = 90;

    let timerWindow = new electron.BrowserWindow({
      x: x + width - timerWidth,
      y: y + height - timerHeight,
      width: timerWidth,
      height: timerHeight,
      resizable: false,
      alwaysOnTop: timerAlwaysOnTop,
      frame: false,
      icon: __dirname + '/../../src/windows/img/icon.png'
    })

    timerWindow.loadURL(`file://${__dirname}/timer/index.html`)

    timerWindow.on('closed', x => {
      if (timerWindows) {
        let i = timerWindows.indexOf(x.sender);
        timerWindows.splice(i, 1);
        if (timerWindows.length == 0)
          timerWindows = null;
        exports.closeTimerWindows()
      }
    })

    let getCenter = bounds => {
      return {
        x: bounds.x + (bounds.width / 2),
        y: bounds.y + (bounds.height / 2)
      }
    }

    timerWindow.on('move', e => {
      if (snapThreshold <= 0) {
        return
      }

      let getCenter = bounds => {
        return {
          x: bounds.x + (bounds.width / 2),
          y: bounds.y + (bounds.height / 2)
        }
      }

      let windowBounds = timerWindow.getBounds()
      let screenBounds = electron.screen.getDisplayNearestPoint(getCenter(windowBounds)).workArea

      let snapTo = windowSnapper(windowBounds, screenBounds, snapThreshold)
      if (snapTo.x != windowBounds.x || snapTo.y != windowBounds.y) {
        timerWindow.setPosition(snapTo.x, snapTo.y)
      }
    })

    timerWindows.push(timerWindow)
  });
}

exports.closeTimerWindows = () => {
  if (timerWindows) {
    windowsCopy = timerWindows.slice();
    timerWindows = null;
    windowsCopy.forEach(window => {
      window.close()
    })
  }
}

exports.showConfigWindow = () => {
  if (configWindow) {
    configWindow.show()
    return
  }
  exports.createConfigWindow()
}

exports.createConfigWindow = () => {
  if (configWindow) {
    return
  }

  configWindow = new electron.BrowserWindow({
    width: 420,
    height: 500,
    autoHideMenuBar: true
  })

  configWindow.loadURL(`file://${__dirname}/config/index.html`)
  configWindow.on('closed', _ => configWindow = null)
}

exports.createFullscreenWindow = () => {
  if (fullscreenWindows) {
    return
  }

  fullscreenWindows = [];
  let displays = electron.screen.getAllDisplays()
  displays.forEach(display => {

    let { x, y } = display.bounds
    let { width, height } = display.workAreaSize

    window = new electron.BrowserWindow({
      x,
      y,
      fullscreen: true,
      resizable: false,
      alwaysOnTop: true,
      frame: false
    })

    window.loadURL(`file://${__dirname}/fullscreen/index.html`)

    window.on('closed', x => {
      if (fullscreenWindows) {
        let i = fullscreenWindows.indexOf(x.sender);
        fullscreenWindows.splice(i, 1);
        if (fullscreenWindows.length == 0)
          fullscreenWindows = null;

        exports.closeFullscreenWindows();
      }
    })

    fullscreenWindows.push(window)
  })
}

exports.closeFullscreenWindows = () => {
  if (fullscreenWindows) {
    windowsCopy = fullscreenWindows.slice();
    fullscreenWindows = null;
    windowsCopy.forEach(window => {
      window.close()
    })
  }
}

exports.dispatchEvent = (event, data) => {
  if (event === 'configUpdated') {
    exports.setConfigState(data)
  }
  if (event === 'alert' && data == secondsUntilFullscreen) {
    exports.createFullscreenWindow()
  }
  if (event === 'stopAlerts') {
    exports.closeFullscreenWindows()
  }

  if (timerWindows) {
    timerWindows.forEach(timerWindow => {
      timerWindow.webContents.send(event, data)
    });
  }
  if (configWindow) {
    configWindow.webContents.send(event, data)
  }
  if (fullscreenWindows) {
    fullscreenWindows.forEach(window => {
      window.webContents.send(event, data)
    })
  }
}

exports.setConfigState = data => {
  snapThreshold = data.snapThreshold
  secondsUntilFullscreen = data.secondsUntilFullscreen
  breakEnabled = data.breakEnabled
  breakFrequencySeconds = data.breakFrequencySeconds
  breakDurationSeconds = data.breakDurationSeconds
  timerAlwaysOnTop = data.timerAlwaysOnTop || data.timerOnTopBecausePaused

  if (timerWindows) {
    timerWindows.forEach(timerWindow => {
      timerWindow.setAlwaysOnTop(timerAlwaysOnTop)
    });
  }
}
