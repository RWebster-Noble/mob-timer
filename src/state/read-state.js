let fs = require('fs')
const {app} = require('electron')

let stateFilePath = app.getPath('userData') + '\\Mob-Timer_State.json' 

module.exports = {
    read
}

function read() {
    return fileExists(stateFilePath) ? 
        JSON.parse(fs.readFileSync(stateFilePath, 'utf-8')) :
        {}
}

function fileExists(filePath) {
    try {
        fs.accessSync(filePath, fs.R_OK)    
    } catch (error) {
        return false
    }
    
    return true
}