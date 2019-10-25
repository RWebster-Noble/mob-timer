const newGuid = require("uuid/v4");
const https = require('https');
const fs = require('fs');
const { app, dialog } = require('electron');

class Mobbers {
  constructor() {
    this.mobbers = [];
    this.currentMobber = 0;
  }

  getAll() {
    return this.mobbers;
  }

  addMobber(mobber) {
    if (!mobber.id) {
      mobber.id = newGuid();
    }
    this.mobbers.push(mobber);
  }

  getActiveMobbers() {
    return this.mobbers.filter(m => !m.disabled);
  }

  getCurrentAndNextMobbers() {
    let active = this.getActiveMobbers();
    if (!active.length) {
      return { current: null, next: null };
    }

    return {
      current: active[this.currentMobber],
      next: active[(this.currentMobber + 1) % active.length]
    };
  }

  rotate() {
    let active = this.getActiveMobbers();
    this.currentMobber = active.length
      ? (this.currentMobber + 1) % active.length
      : 0;
  }

  removeMobber(mobber) {
    this.mobbers = this.mobbers.filter(m => m.id !== mobber.id);
    if (this.currentMobber >= this.getActiveMobbers().length) {
      this.currentMobber = 0;
    }
  }

  updateMobber(mobber, timerState, event) {
    let currentMobber = this.getActiveMobbers()[this.currentMobber];
    let index = this.mobbers.findIndex(m => m.id === mobber.id);
    if (index >= 0) {
      this.mobbers[index] = mobber;

      let active = this.getActiveMobbers();
      if (currentMobber && currentMobber.id !== mobber.id) {
        this.currentMobber = active.findIndex(m => m.id === currentMobber.id);
      }
      this.currentMobber = active.length
        ? this.currentMobber % active.length
        : 0;

      if (!mobber.image && mobber.gitUsername && mobber.gitEmail) {
        const dir = app.getPath('userData') + "/avatars/"
        const avatarPath = dir + mobber.gitUsername + "_avatar.png"

        fs.exists(avatarPath, function (exists) {
          if (!exists) {
            'use strict';
            var options = {
              host: 'github.com',
              path: '/' + mobber.gitUsername + '.png',
              headers: { 'User-Agent': 'request' }
            };
            https.get(options, function (res) {
                if (res.statusCode === 302) {
                  try {
                    https.get(res.headers.location, function (response) {
                      if (response.statusCode === 200) {
                        if (!fs.existsSync(dir)) {
                          fs.mkdirSync(dir);
                        }
                        const file = fs.createWriteStream(avatarPath);
                        response.pipe(file);
                        file.on('finish', function () {
                          file.close();                         

                          const options = {
                            type: "question",
                            buttons: ["&Yes", "&No"],
                            defaultId: 0,
                            title: "Use Profile Picture",
                            message: "Profile pictue found.",
                            detail: `Found profile picture for ${mobber.gitUsername}\non GitHub would you like to use it?`,
                            cancelId: 1,
                            noLink: false,
                            normalizeAccessKeys: true
                          };
                        
                          dialog.showMessageBox(this.configWindow, options, function (response, _) {
                            if(response == 0)
                            this.mobber.image = avatarPath;
                            this.timerState.publishConfig();
                          }.bind(this));

                        }.bind(this));
                      }
                    }.bind(this));
                  } catch (e) {
                  }
                }
            }.bind(this));
          }
        }.bind({mobber:this.mobbers[index], timerState, configWindow:event.sender.getOwnerBrowserWindow()}));

      }
    }
  }



shuffleMobbers() {
  for (let i = this.mobbers.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [this.mobbers[i], this.mobbers[j]] = [this.mobbers[j], this.mobbers[i]];
  }
}
}

module.exports = Mobbers;
