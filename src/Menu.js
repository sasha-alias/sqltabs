var Actions = require ('./Actions');
var TabsStore = require('./TabsStore');
var remote = require('remote');
var Menu = remote.require('menu');
var BrowserWindow = remote.require('browser-window');
var dialog = remote.require('dialog');

var fs = require('fs');

var openFile = function(){
    dialog.showOpenDialog({ properties: ['openFile']}, 
    function(filenames){
        if (typeof(filenames) != 'undefined' && filenames.length == 1){
            var filename = filenames[0];
            var existing_tab = TabsStore.getTabByFilename(filename);
            if ( existing_tab != null){
                Actions.select(existing_tab);
            } else {
                Actions.newTab();
                Actions.openFile(filename);
            }
        }
    }
    );
}

var saveFile = function(){
    var filename = TabsStore.tabs[TabsStore.selectedTab].filename;
    if ( filename != null){
        Actions.saveFile(filename);
    } else {
        dialog.showSaveDialog(function(filename){
            if (typeof(filename) != 'undefined'){
                Actions.saveFile(filename);
            }
        })
    }
}

var saveFileAs = function(){
    dialog.showSaveDialog(function(filename){
        console.log(filename);
    })
}

template = [
    {label: "PGTabs",
    submenu: []
    },
    {label: "File",
    submenu: [
        {label: "Open",
         accelerator: "Command+O",
         click: function(){openFile();},
        },
        {label: "Save",
         accelerator: "Command+S",
         click: function(){saveFile();},
        },
        {label: "Save As",
         accelerator: "Command+Shift+S",
         click: function(){saveFileAs();},
        },
        {type: 'separator'},
        {label: "New Tab",
         accelerator: "Command+T",
         click: function(){Actions.select(0)},
        },
        {label: "Close Tab",
         accelerator: "Command+W",
         click: function(){Actions.close()},
        },
    ]
    },
    {label: 'Edit',
    submenu: [
        {label: 'Undo',
         accelerator: 'Command+Z',
         selector: 'undo:'
        },
        {label: 'Redo',
         accelerator: 'Shift+Command+Z',
         selector: 'redo:'
        },
        {type: 'separator'},
        {label: 'Cut',
         accelerator: 'Command+X',
         selector: 'cut:'
        },
        {label: 'Copy',
         accelerator: 'Command+C',
         selector: 'copy:'
        },
        {label: 'Paste',
         accelerator: 'Command+V',
         selector: 'paste:'
        },
        {label: 'Select All',
         accelerator: 'Command+A',
         selector: 'selectAll:'
        },
    ]
    },
    {label: "Database",
     submenu:[
        {label: "Run Query",
         accelerator: "Command+R",
         click: function(){Actions.execScript()},
        },
        {label: "Break Execution",
         accelerator: "Command+B",
         click: function(){Actions.cancelQuery()},
        },
        {label: "Edit connect string",
         accelerator: "Command+L",
         click: function(){Actions.gotoConnstr()},
        },
     ]
    },
    {label: "Options",
    submenu: [
        {label: "Theme",
        submenu:[
            {label: "Dark", click: function(){Actions.setTheme("dark");}},
            {label: "Bright", click: function(){Actions.setTheme("bright");}},
        ]},
        {label: "Mode",
        submenu: [
            {label: "Classic", click: function(){Actions.setMode("classic");}},
            {label: "Vim", click: function(){Actions.setMode("vim");}},
        ]},
    ]},
    {label: "Window", submenu:[
        {label: "Toggle DevTools",
        accelerator: "Alt+Command+I",
        click: function() { BrowserWindow.getFocusedWindow().toggleDevTools(); }
        },
        {type: "separator"},
        {label: "Next Tab",
         accelerator: "Command+]",
         click: function(){Actions.nextTab()},
        },
        {label: "Previous Tab",
         accelerator: "Command+[",
         click: function(){Actions.previosTab();},
        },
    ]
    },
]

menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

