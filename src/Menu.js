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

var options = new gui.Menu();
var options_item = new gui.MenuItem({label: "Options", submenu: options});
var theme = new gui.Menu();
var mode = new gui.Menu();

var theme_item = new gui.MenuItem({label: "Theme", submenu: theme});
var mode_item = new gui.MenuItem({label: "Mode", submenu: mode});

var dark_theme = new gui.MenuItem({
    label: "Dark", 
    click: function(){Actions.setTheme("dark");},
    });

var light_theme = new gui.MenuItem({
    label: "Bright",
    click: function(){Actions.setTheme("bright");},
    });

var mode_classic = new gui.MenuItem({
    label: "Classic", 
    click: function(){Actions.setMode("classic");},
    });

var mode_vim = new gui.MenuItem({
    label: "Vim",
    click: function(){Actions.setMode("vim");},
    });

options.append(theme_item);
theme.append(dark_theme);
theme.append(light_theme);

options.append(mode_item);
mode.append(mode_classic);
mode.append(mode_vim);

win.menu.insert(options_item, 2);


