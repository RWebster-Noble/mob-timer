let net = require('net');

class GitIntegration {
    constructor(mobbers, mainTimer) {
        this.mobbers = mobbers
        this.mainTimer = mainTimer
        this.server = null;
    }

    enabled() {
        return this.server != null
    }

    SetGitIntegration(gitIntegrationEnabled) {
        if (!this.enabled() && gitIntegrationEnabled)
            this.startCommitMessageServer()
        else if (this.enabled() && !gitIntegrationEnabled) {
            this.stopCommitMessageServer()
        }
    }

    startCommitMessageServer() {
        this.server = net.createServer(this.respondToGitHook.bind(this));

        // server.on('error', (e) => {
        // });

        this.server.listen(6904, '127.0.0.1');
    }

    respondToGitHook(socket) {
        if (!this.mainTimer.isRunning()) {
            socket.end();
            return;
        }

        const activeMobbers = this.mobbers.getActiveMobbers();
        if (activeMobbers.length == 0) {
            socket.end();
            return;
        }
        const activeMobberNames = activeMobbers.map(function (m) {
            return m.name;
        });
        socket.write("\r\n\r\nCo-authored-by: " + activeMobberNames.join("\r\nCo-authored-by: ") + "\r\n");
        socket.end();
    }

    stopCommitMessageServer() {
        this.server.close()
        this.server = null
    }
}

module.exports = GitIntegration