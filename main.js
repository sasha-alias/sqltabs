
if (process.platform == 'linux'){
    var mkdirp = require('mkdirp');
    mkdirp(process.env.HOME+'/.local/share/icons', function(err){console.log(err)});
    mkdirp(process.env.HOME+'/.local/share/applications');
    var fs = require('fs');
    fs.open(process.env.HOME+"/.local/share/applications/sqltabs.desktop", "wx", function(err){
        if (err){
            return;
        }
        fs.writeFile(process.env.HOME+"/.local/share/applications/sqltabs.desktop", "Icon=sqltabs", function(err) {
            if(err) {
                return console.log(err);
            }
        });
    });
    fs.open(process.env.HOME+"/.local/share/icons/sqltabs.png", "wx", function(err){
        if(err){
            return;
        }
        fs.createReadStream('logo.png').pipe(fs.createWriteStream(process.env.HOME+'/.local/share/icons/sqltabs.png'));
    });
}

var electron = require('electron');
var config = require('./build/Config');

//require('electron-reload')(__dirname);

var app = electron.app;
var BrowserWindow = electron.BrowserWindow;

var mainWindow = null;
var urlToOpen = null;
var files2open = [];

var createWindow = function(){
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        title: 'SQL Tabs',
        webPreferences: {
            nodeIntegration: true,
        },
    });
    mainWindow.maximize();
    //mainWindow.toggleDevTools();
    mainWindow.loadURL('file://' + __dirname + '/index.html');
    mainWindow.on('closed', function() {
        mainWindow = null;
    });
}

app.on('window-all-closed', function() {
    app.quit();
});

app.on('open-file', function(event, path){
    event.preventDefault();
    if (mainWindow != null){
        var contents = mainWindow.webContents;
        contents.send('open-file', path);
    } else {
        files2open.push(path);
    }
});

app.on('ready', function() {
    createWindow();
    if (files2open.length != 0){
        var contents = mainWindow.webContents;
        for (var i in files2open){
            var path = files2open[i];
            var getEmitter = function(contents, path){
                return function(){
                    contents.send('open-file', path);
                }
            }
            var emit_open_file = getEmitter(contents, path);
            contents.on('did-finish-load', emit_open_file);
        }
    }
    if (urlToOpen) {
        mainWindow.webContents.on('did-finish-load', function () {
            mainWindow.webContents.send('open-url', urlToOpen);
        });
    }

    if (!app.isDefaultProtocolClient('postgres') && !config.getNoProtocolDialog()) {
        electron.dialog.showMessageBox({
            type: 'question',
            buttons: ['Yes', 'No'],
            cancelId: 1,
            message: 'Do you want to set SQL Tabs as the default postgres client?'
        }, function (button) {
            config.saveNoProtocolDialog(true); // prevent protocol dialog on next start even if No has bee chosen
            if (button === 0 ) {
                app.setAsDefaultProtocolClient('postgres');
            }
        })
    }
});

app.on('open-url', function (ev, url) {
    ev.preventDefault();
    if (app.isReady()) {
        mainWindow.webContents.send('open-url', url);
    } else {
        urlToOpen = url;
    }
});

console.log('init done');
