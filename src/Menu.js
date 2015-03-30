var Actions = require ('./Actions');
// enable cope/paste on OS X
var gui = window.require('nw.gui');

var win = gui.Window.get();
var menu = new gui.Menu({type: 'menubar'});
win.menu = menu;

if (process.platform === "darwin") {
    menu.createMacBuiltin('PgTabs', {
        hideEdit: false,
    });
}

var SetTheme = function(theme){
    Actions.setTheme(theme);
}

var options = new gui.Menu();
var options_item = new gui.MenuItem({label: "Options", submenu: options});
var theme = new gui.Menu();
var theme_item = new gui.MenuItem({label: "Theme", submenu: theme});
var dark_theme = new gui.MenuItem({
    label: "Dark", 
    click: function(){SetTheme("dark");},
    });
var light_theme = new gui.MenuItem({
    label: "Bright",
    click: function(){SetTheme("bright");},
    });

options.append(theme_item);
theme.append(dark_theme);
theme.append(light_theme);

win.menu.insert(options_item, 2);


