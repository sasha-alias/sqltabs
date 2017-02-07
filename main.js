
if (process.platform == 'linux'){
    mkdirp = require('mkdirp');
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
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;

var mainWindow = null;
var file2open = null;

var createWindow = function(){
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        title: 'SQL Tabs',
    });
    mainWindow.maximize();
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
    file2open = path;
    if (mainWindow != null){
        var contents = mainWindow.webContents;
        contents.send('open-file', file2open);
    }
});

app.on('ready', function() {
    createWindow();
    if (file2open != null){
        var contents = mainWindow.webContents;
        contents.on('did-finish-load', function(){
            contents.send('open-file', file2open);
        });
    }
});
