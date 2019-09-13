const fs = require("fs");
const os = require("os");
const path = require("path");

const mobTimerDir = path.join(os.homedir(), ".mob-timer");
const stateFile = path.join(mobTimerDir, "state.json");
const oldStateFile = path.join(os.tmpdir(), "state.json");

function read() {
  if (fs.existsSync(stateFile)) {
    return JSON.parse(fs.readFileSync(stateFile, "utf-8"));
  }
  if (fs.existsSync(oldStateFile)) {
    return JSON.parse(fs.readFileSync(oldStateFile, "utf-8"));
  }
  return {};
}

function write(state, onTimerEventCallback) {
  if (!fs.existsSync(mobTimerDir)) {
    fs.mkdirSync(mobTimerDir);
  }

  // Don't persist timerOnTopBecausePaused
  const stateToPersist = Object.assign({}, state);
  delete stateToPersist.timerOnTopBecausePaused;

  var oldState;
  if (fs.existsSync(stateFile)) oldState = fs.readFileSync(stateFile, "utf-8");

  const newstate = JSON.stringify(stateToPersist);

  // Has the state actually changed?
  if (oldState !== newstate) {
    fs.writeFileSync(stateFile, newstate);
    onTimerEventCallback("savedConfig", null);
  }
}

module.exports = {
  read,
  write,
  stateFile,
  oldStateFile,
  mobTimerDir
};
