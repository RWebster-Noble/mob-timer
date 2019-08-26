let net = require('net');

class GitIntegration {
    constructor(mobbers, mainTimer) {
        this.mobbers = mobbers
        this.mainTimer = mainTimer
        this.server = null;
        this.port = 6904;
    }

    enabled() {
        return this.server != null
    }

    setGitIntegration(gitIntegration) {
        if (gitIntegration.port !== this.port && this.enabled()) {
            this.stopCommitMessageServer()
            this.port = gitIntegration.port
            this.startCommitMessageServer()
            return;
        }

        this.port = gitIntegration.port
        if (!this.enabled() && gitIntegration.enabled)
            this.startCommitMessageServer()
        else if (this.enabled() && !gitIntegration.enabled) {
            this.stopCommitMessageServer()
        }
    }

    startCommitMessageServer() {
        this.server = net.createServer(this.respondToGitHook.bind(this));

        // server.on('error', (e) => {
        // });

        this.server.listen(this.port, '127.0.0.1');
    }

    respondToGitHook(socket) {
        if (!this.mainTimer.isRunning()) {
            socket.end();
            return;
        }

        const activeMobbersWithGitDetails = this.mobbers.getActiveMobbers().filter((m) => {
            return m.gitUsername && m.gitEmail
        });

        if (activeMobbersWithGitDetails.length == 0) {
            socket.end();
            return;
        }

        const activeMobberNames = activeMobbersWithGitDetails.map((m) => {
            return `${m.gitUsername} <${m.gitEmail}>`;
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