var Actions = require ('./Actions');
var remote = require('remote');
var Menu = remote.require('menu');
var BrowserWindow = remote.require('browser-window');

template = [
    {label: "PGTabs",
    submenu: []
    },
    {label: "File",
    submenu: [
        {label: "Open",
         accelerator: "Command+O",
         click: function(){console.log('ooopen');},
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
        {type: 'separator'
        },
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
        {label: 'Toggle DevTools',
        accelerator: 'Alt+Command+I',
        click: function() { BrowserWindow.getFocusedWindow().toggleDevTools(); }
        },
    ]
    },
    {label: "Help", submenu:[]
    },
]

menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

