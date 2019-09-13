const electron = require("electron");
const { app } = electron;
const windowSnapper = require("./window-snapper");
const path = require("path");

let timerWindows, configWindow, fullscreenWindows;
let snapThreshold, secondsUntilFullscreen, timerOnTop;

exports.createTimerWindow = () => {
  if (timerWindows) {
    return primaryTimerWindow;
  }

  timerWindows = [];
  let primaryDisplay = electron.screen.getPrimaryDisplay();
  let primaryTimerWindow = openTimerWindow(primaryDisplay, null);

  electron.screen.getAllDisplays().forEach(display => {
    var isPrimaryDisplay = display.id == primaryDisplay.id;
    if (!isPrimaryDisplay) openTimerWindow(display, primaryTimerWindow);
  });
  return primaryTimerWindow;
};

function openTimerWindow(display, parent) {
  let { width, height } = display.workAreaSize;
  let { x, y } = display.bounds;

  const timerWidth = 220;
  const timerHeight = 90;

  let timerWindow = new electron.BrowserWindow({
    x: x + width - timerWidth,
    y: y + height - timerHeight,
    width: timerWidth,
    height: timerHeight,
    resizable: false,
    alwaysOnTop: timerOnTop,
    frame: false,
    icon: path.join(__dirname, "/../../src/windows/img/icon.png"),
    parent: parent,
    show: false
  });

  timerWindow.once("ready-to-show", () => {
    timerWindow.show();
  });

  timerWindow.loadURL(`file://${__dirname}/timer/index.html`);

  timerWindow.on("closed", x => {
    if (timerWindows) {
      closeThisWindow(x); // To prevent an infinate window closing loop
      exports.closeTimerWindows();
    }
  });

  timerWindow.on("move", () => {
    if (snapThreshold <= 0) {
      return;
    }

    let getCenter = bounds => {
      return {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2
      };
    };

    let windowBounds = timerWindow.getBounds();
    let screenBounds = electron.screen.getDisplayNearestPoint(
      getCenter(windowBounds)
    ).workArea;

    if (timerWindow.snappedDist) {
      // set windowBounds to origional position from before snapping
      // as to do snapping calculation on window position as it would be if it hadn't already been snapped
      windowBounds.x -= timerWindow.snappedDist.x;
      windowBounds.y -= timerWindow.snappedDist.y;
    }

    let snapTo = windowSnapper(windowBounds, screenBounds, snapThreshold);
    if (snapTo.x !== windowBounds.x || snapTo.y !== windowBounds.y) {
      // perform snapping
      timerWindow.snappedDist = {};
      timerWindow.snappedDist.x = windowBounds.x - snapTo.x;
      timerWindow.snappedDist.y = windowBounds.y - snapTo.y;
      timerWindow.setPosition(snapTo.x, snapTo.y);
    } else if (timerWindow.snappedDist) {
      // just stopped snapping
      // return to original position before snapping

      // timerWindow.setPosition triggers an timerWindow.on('move') call, making this code recursive.
      // this neeeds to be here to break the recursion and stop unexpected behaivour.
      timerWindow.snappedDist = null;

      // windowBounds will have been set to origional position from before snapping
      timerWindow.setPosition(windowBounds.x, windowBounds.y);
    }
  });

  timerWindows.push(timerWindow);

  return timerWindow;
}

function closeThisWindow(window) {
  let i = timerWindows.indexOf(window.sender);
  timerWindows.splice(i, 1);
  if (timerWindows.length == 0) timerWindows = null;
}

exports.closeTimerWindows = () => {
  if (timerWindows) {
    windowsCopy = timerWindows.slice();
    timerWindows = null;
    windowsCopy.forEach(window => {
      window.close();
    });
  }
};

exports.showConfigWindow = () => {
  if (configWindow) {
    configWindow.show();
    return;
  }
  exports.createConfigWindow();
};

exports.createConfigWindow = () => {
  if (configWindow) {
    return;
  }

  configWindow = new electron.BrowserWindow({
    width: 420,
    height: 500,
    autoHideMenuBar: true,
    show: false
  });

  configWindow.once("ready-to-show", () => {
    configWindow.show();
  });

  configWindow.loadURL(`file://${__dirname}/config/index.html`);
  configWindow.on("closed", () => (configWindow = null));
};

exports.createFullscreenWindow = () => {
  if (fullscreenWindows) {
    return;
  }

  fullscreenWindows = [];
  let displays = electron.screen.getAllDisplays();
  displays.forEach(display => {
    let { x, y } = display.bounds;

    let window = createAlwaysOnTopFullscreenInterruptingWindow({
      x,
      y,
      fullscreen: true,
      resizable: false,
      alwaysOnTop: true,
      frame: false,
      show: false
    });

    window.once("ready-to-show", () => {
      window.show();
    });

    window.loadURL(`file://${__dirname}/fullscreen/index.html`);

    window.on("closed", x => {
      if (fullscreenWindows) {
        let i = fullscreenWindows.indexOf(x.sender);
        fullscreenWindows.splice(i, 1);
        if (fullscreenWindows.length == 0) fullscreenWindows = null;

        exports.closeFullscreenWindows();
      }
    });

    fullscreenWindows.push(window);
  });
};

exports.closeFullscreenWindows = () => {
  if (fullscreenWindows) {
    windowsCopy = fullscreenWindows.slice();
    fullscreenWindows = null;
    windowsCopy.forEach(window => {
      window.close();
    });
  }
};

exports.dispatchEvent = (event, data) => {
  if (event === "configUpdated") {
    exports.setConfigState(data);
  }
  if (event === "alert" && (data === secondsUntilFullscreen || data === true)) {
    exports.createFullscreenWindow();
  }
  if (event === "stopAlerts") {
    exports.closeFullscreenWindows();
  }

  if (timerWindows) {
    timerWindows.forEach(timerWindow => {
      timerWindow.webContents.send(event, data);
    });
  }
  if (configWindow) {
    configWindow.webContents.send(event, data);
  }
  if (fullscreenWindows) {
    fullscreenWindows.forEach(window => {
      window.webContents.send(event, data);
    });
  }
};

exports.setConfigState = data => {
  snapThreshold = data.snapThreshold;
  secondsUntilFullscreen = data.secondsUntilFullscreen;
  breakEnabled = data.breakEnabled;
  breakFrequencySeconds = data.breakFrequencySeconds;
  breakDurationSeconds = data.breakDurationSeconds;
  timerOnTop = data.timerAlwaysOnTop || data.timerOnTopBecausePaused;

  if (timerWindows) {
    timerWindows.forEach(timerWindow => {
      timerWindow.setAlwaysOnTop(timerOnTop);
    });
  }
};

function createAlwaysOnTopFullscreenInterruptingWindow(options) {
  return whileAppDockHidden(() => {
    const window = new electron.BrowserWindow(options);
    window.setAlwaysOnTop(true, "screen-saver");
    return window;
  });
}

function whileAppDockHidden(work) {
  if (app.dock) {
    // Mac OS: The window will be able to float above fullscreen windows too
    app.dock.hide();
  }
  const result = work();
  if (app.dock) {
    // Mac OS: Show in dock again, window has been created
    app.dock.show();
  }
  return result;
}
