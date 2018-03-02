let fs = require('fs')
const {app} = require('electron')

let stateFilePath = app.getPath('userData') + '\\Mob-Timer_State.json' 

module.exports = {
    getStateFilePath,
    setStateFilePath,
    write
}

function write(state) {
    fs.writeFileSync(
        stateFilePath,
        JSON.stringify(state)
    )
}

function getStateFilePath() {
    return stateFilePath
}

function setStateFilePath(filePath) {
    stateFilePath = filePath
}