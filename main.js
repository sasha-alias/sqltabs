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

var app = require('app');
var BrowserWindow = require('browser-window');

var mainWindow = null;

app.on('window-all-closed', function() {
    app.quit();
});

app.on('ready', function() {
  mainWindow = new BrowserWindow({
    width: 800, 
    height: 600,
    title: 'SQL Tabs',
  });
  mainWindow.maximize();

  mainWindow.loadUrl('file://' + __dirname + '/index.html');

  mainWindow.on('closed', function() {
    mainWindow = null;
  });

});
