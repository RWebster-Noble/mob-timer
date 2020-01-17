const { BrowserWindow } = require("electron");
const { asLazySingletonWindow } = require("../lazy-singleton-window");

exports.initialize = () => {
  const { showWindow, trySendEvent}  = asLazySingletonWindow(
    createConfigWindow
  );

  return {
    showConfigWindow: showWindow,
    sendEventToConfigWindow: trySendEvent,
  };
};

const createConfigWindow = (parent) => {
  const configWindowInstance = new BrowserWindow({
    parent: parent,
    width: 444,
    height: 680,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true
    },
    minimizable: false,
    maximizable: false
  });

  configWindowInstance.loadURL(`file://${__dirname}/index.html`);

  return configWindowInstance;
};
