exports.asLazySingletonWindow = createBrowserWindow => {
  let browserWindow;

  return {
    showWindow: (parent) => {
      if (browserWindow) {
        browserWindow.show();
        return;
      }
      browserWindow = createBrowserWindow(parent);
      browserWindow.on("closed", () => (browserWindow = undefined));
    },
    trySendEvent: (event, data) =>
      browserWindow && browserWindow.webContents.send(event, data),
      
    getWindow: () => browserWindow
  };
};
