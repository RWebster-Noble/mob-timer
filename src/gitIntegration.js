const { dialog, BrowserWindow } = require("electron");
const path = require("path");
const net = require("net");

class GitIntegration {
  constructor(mobbers, mainTimer) {
    this.mobbers = mobbers;
    this.mainTimer = mainTimer;
    this.server = null;
    this.port = 6904;
    this.path = path;
    this.primaryTimerWindow = null;
  }

  enabled() {
    return this.server != null;
  }

  setGitIntegration(gitIntegration) {
    if (gitIntegration.port !== this.port && this.enabled()) {
      this.stopCommitMessageServer();
      this.port = gitIntegration.port;
      this.startCommitMessageServer();
      return;
    }

    this.port = gitIntegration.port;
    if (!this.enabled() && gitIntegration.enabled) {
      this.startCommitMessageServer();
    } else if (this.enabled() && !gitIntegration.enabled) {
      this.stopCommitMessageServer();
    }
  }

  displayHelp() {
    let helpWindow = new BrowserWindow({
      title: "Mob Timer - Git Integration",
      useContentSize: true,
      width: 539,
      height: 700,
      show: false,
      autoHideMenuBar: true
    });
    helpWindow.on("closed", () => {
      helpWindow = null;
    });

    // Or load a local HTML file
    helpWindow.loadURL(`file://${__dirname}\\windows\\gitIntegrationHelp.html`);

    helpWindow.once("ready-to-show", () => {
      helpWindow.show();
    });
  }

  startCommitMessageServer() {
    this.server = net.createServer(this.respondToGitHook.bind(this));

    // server.on('error', (e) => {
    // });

    this.server.listen(this.port, "127.0.0.1");
  }

  respondToGitHook(socket) {
    try {
      const activeMobbersWithGitDetails = this.mobbers
        .getActiveMobbers()
        .filter(m => {
          return m.gitUsername && m.gitEmail;
        });

      if (activeMobbersWithGitDetails.length === 0) {
        return;
      }

      if (!this.mainTimer.isRunning()) {
        const options = {
          type: "warning",
          buttons: ["&Yes", "&No", "&Abort Commit"],
          defaultId: 0,
          title: "Mob Timer Git Commit",
          message: "Mob Timer Paused",
          detail: "Include active mobbers in git co-authors?",
          icon: this.path.join(__dirname, "/../src/windows/img/warning2.ico"),
          cancelId: 1,
          noLink: true,
          normalizeAccessKeys: true
        };

        const dialogResult = dialog.showMessageBox(
          this.primaryTimerWindow,
          options
        );
        if (dialogResult !== 0) {
          // not "Yes"

          if (dialogResult === 2) {
            // "Abort Commit"
            socket.write("MobTimerGitAbortCommit");
          }
          return;
        }
      }

      const activeMobberNames = activeMobbersWithGitDetails.map(m => {
        return `${m.gitUsername} <${m.gitEmail}>`;
      });

      socket.write(
        "MobTimerGitCommitCoAuthors\r\n\r\nCo-authored-by: " +
          activeMobberNames.join("\r\nCo-authored-by: ") +
          "\r\n"
      );
    } finally {
      socket.end();
    }
  }

  stopCommitMessageServer() {
    this.server.close();
    this.server = null;
  }
}

module.exports = GitIntegration;
