const { BrowserWindow } = require("electron");
const { asLazySingletonWindow } = require("../lazy-singleton-window");

exports.initialize = () => {
  const { showWindow, trySendEvent, getWindow}  = asLazySingletonWindow(
    createConfigWindow
  );

  return {
    showConfigWindow: showWindow,
    sendEventToConfigWindow: trySendEvent,
    getConfigWindow: getWindow
  };
};

const createConfigWindow = (parent) => {
  const configWindowInstance = new BrowserWindow({
    width: 444,
    height: 680,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true
    },
    minimizable: false,
    maximizable: false,
    show: false
  });

  configWindowInstance.once("ready-to-show", () => {
    configWindowInstance.show();
  });
  
  configWindowInstance.loadURL(`file://${__dirname}/index.html`);

  return configWindowInstance;
};
