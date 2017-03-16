/*
  Copyright (C) 2015  Aliaksandr Aliashkevich

      This program is free software: you can redistribute it and/or modify
      it under the terms of the GNU General Public License as published by
      the Free Software Foundation, either version 3 of the License, or
      (at your option) any later version.

      This program is distributed in the hope that it will be useful,
      but WITHOUT ANY WARRANTY; without even the implied warranty of
      MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
      GNU General Public License for more details.

      You should have received a copy of the GNU General Public License
      along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var Actions = require ('./Actions');
var TabsStore = require('./TabsStore');
var remote = require('electron').remote;
var Menu = remote.Menu;
var BrowserWindow = remote.BrowserWindow;
var dialog = remote.dialog;
var app = remote.app;
var fs = require('fs');

if (typeof(DEVMODE) == 'undefined'){
    DEVMODE = true;
}

var openFile = function(){
    dialog.showOpenDialog({ properties: ['openFile', 'multiSelections']},
    function(filenames){
        filenames.forEach(function(filename){
            var existing_tab = TabsStore.getTabByFilename(filename);
            if ( existing_tab != null){
                Actions.select(existing_tab);
            } else {
                Actions.newTab(null, filename);
            }
        });
    });
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
        if (typeof(filename) != 'undefined'){
            Actions.saveFile(filename);
        }
    })
}

var exportResult = function(format){
    dialog.showSaveDialog(function(filename){
        if (typeof(filename) != 'undefined'){
            Actions.exportResult(filename, format);
        }
    })
}



var setFontSize = function(size){
    Actions.setFontSize(size);
}

if (process.platform == 'darwin'){

    var template = [
        {label: "SQL Tabs",
        submenu: [
          { label: "About SQL Tabs",
            click: Actions.about
          },
          {
            label: 'Preferences',
            accelerator: 'Command+,',
            click: Actions.showSettings
          },
          {
            label: 'Hide SQL Tabs',
            accelerator: 'Command+H',
            selector: 'hide:'
          },
          {
            label: 'Hide Others',
            accelerator: 'Command+Shift+H',
            selector: 'hideOtherApplications:'
          },
          {
            label: 'Show All',
            selector: 'unhideAllApplications:'
          },
          {
            type: 'separator'
          },
          {
            label: 'Quit',
            accelerator: 'Command+Q',
            click: app.quit,
          },
        ]
        },
        {label: "File",
        submenu: [
            {label: "Open",
             accelerator: "Command+O",
             click: openFile,
            },
            {label: "Save",
             accelerator: "Command+S",
             click: saveFile,
            },
            {label: "Save As",
             accelerator: "Command+Shift+S",
             click: saveFileAs,
            },
            {label: "Close File",
             click: Actions.closeFile,
            },
            {type: 'separator'},
            {label: "Export to JSON",
             click: function(){exportResult('json')}
            },
            {label: "Export to CSV",
             click: function(){exportResult('csv')}
            },
            {type: 'separator'},
            {label: "New Tab",
             accelerator: "Command+T",
             click: function(){Actions.select(0)},
            },
            {label: "Close Tab",
             accelerator: "Command+W",
             click: Actions.close,
            },
        ]
        },
        {label: 'Edit',
        submenu: [
            {label: 'Find',
             accelerator: 'Command+F',
             click: Actions.toggleFindBox,
            },
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
            {label: "Database Info",
             click: Actions.getObjectInfo,
            },
            {label: "Run Script",
             accelerator: "Command+R",
             click: Actions.execScript,
            },
            {label: "Execute Block",
             accelerator: "Command+E",
             click: Actions.execBlock,
            },
            {label: "Execute All Blocks",
             accelerator: "Command+Shift+E",
             click: Actions.execAll,
            },
            {label: "Break Execution",
             accelerator: "Command+B",
             click: Actions.cancelQuery,
            },
            {label: "Edit connect string",
             accelerator: "Command+L",
             click: Actions.gotoConnstr,
            },
            {label: "Object Info",
             accelerator: "Command+I",
             click: Actions.objectInfo,
            },
            {label: "History",
             accelerator: "Command+Y",
             click: Actions.toggleHistory,
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
            {label: "Font",
            submenu: [
                {label: "X-Small", click: function(){setFontSize("x-small");}},
                {label: "Small", click: function(){setFontSize("small");}},
                {label: "Medium", click: function(){setFontSize("medium");}},
                {label: "Large", click: function(){setFontSize("large");}},
                {label: "X-Large", click: function(){setFontSize("x-large");}},
                {label: "XX-Large", click: function(){setFontSize("xx-large");}},
            ]},
            {label: "Output",
            submenu: [
                {label: "Echo on", click: function(){TabsStore.setEcho(true);}},
                {label: "Echo off", click: function(){TabsStore.setEcho(false);}},
            ]},
            {label: "Filter Schemas",
            submenu: [
                {label: "Filter on", click: function(){Actions.setSchemaFilter(true);}},
                {label: "Filter off", click: function(){Actions.setSchemaFilter(false);}},
            ]},
            {label: "Autocompletion",
            submenu: [
                {label: "On", click: function(){TabsStore.setAutocompletion(true);}},
                {label: "Off", click: function(){TabsStore.setAutocompletion(false);}},
            ]},
        ]},
        {label: "Window", submenu:[
            {label: "Next Tab",
             accelerator: "Command+]",
             click: Actions.nextTab
            },
            {label: "Previous Tab",
             accelerator: "Command+[",
             click: Actions.previosTab
            },
            {label: "Switch Tab View",
             accelerator: "Command+\\",
             click: Actions.switchView
            },
            {label: "Show Project",
             accelerator: "Command+P",
             click: Actions.showProject
            },
            {label: "Hide Project",
             accelerator: "Command+Shift+P",
             click: Actions.hideProject
            },
        ]
        },
    ];

    if (DEVMODE) {
        template[template.length-1].submenu.unshift(
            {label: "Toggle DevTools",
            accelerator: "Alt+Command+I",
            click: function() { BrowserWindow.getFocusedWindow().toggleDevTools(); }
            }
        );
    }

} else {

    var template = [

        {label: "File",
        submenu: [
            {label: "Open",
             accelerator: "Ctrl+O",
             click: function(){openFile();},
            },
            {label: "Save",
             accelerator: "Ctrl+S",
             click: function(){saveFile();},
            },
            {label: "Save As",
             accelerator: "Ctrl+Shift+S",
             click: function(){saveFileAs();},
            },
            {label: "Close File",
             click: function(){Actions.closeFile()},
            },
            {type: 'separator'},
            {label: "Export to JSON",
             click: function(){exportResult('json')}
            },
            {label: "Export to CSV",
             click: function(){exportResult('csv')}
            },
            {type: 'separator'},
            {label: "New Tab",
             accelerator: "Ctrl+N",
             click: function(){Actions.select(0)},
            },
            {label: "Close Tab",
             accelerator: "Ctrl+W",
             click: function(){Actions.close()},
            },
        ]
        },
        {label: "Edit", submenu:[
            {label: 'Find',
             accelerator: 'Ctrl+F',
             click: function(){Actions.toggleFindBox()},
            },
        ]},

        {label: "Database",
         submenu:[
            {label: "Database Info",
             click: function(){Actions.getObjectInfo()},
            },
            {label: "Run Script",
             accelerator: "Ctrl+R",
             click: function(){Actions.execScript()},
            },
            {label: "Execute Block",
             accelerator: "Ctrl+E",
             click: function(){Actions.execBlock()},
            },
            {label: "Execute All Blocks",
             accelerator: "Ctrl+Shift+E",
             click: function(){Actions.execAll()},
            },
            {label: "Break Execution",
             accelerator: "Ctrl+B",
             click: function(){Actions.cancelQuery()},
            },
            {label: "Edit connect string",
             accelerator: "Ctrl+L",
             click: function(){Actions.gotoConnstr()},
            },
            {label: "Object Info",
             accelerator: "Ctrl+I",
             click: function(){Actions.objectInfo()},
            },
            {label: "History",
             accelerator: "Ctrl+H",
             click: function(){Actions.toggleHistory()},
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
            {label: "Font",
            submenu: [
                {label: "X-Small", click: function(){setFontSize("x-small");}},
                {label: "Small", click: function(){setFontSize("small");}},
                {label: "Medium", click: function(){setFontSize("medium");}},
                {label: "Large", click: function(){setFontSize("large");}},
                {label: "X-Large", click: function(){setFontSize("x-large");}},
                {label: "XX-Large", click: function(){setFontSize("xx-large");}},
            ]},
            {label: "Output",
            submenu: [
                {label: "Echo on", click: function(){TabsStore.setEcho(true);}},
                {label: "Echo off", click: function(){TabsStore.setEcho(false);}},
            ]},
            {label: "Autocompletion",
            submenu: [
                {label: "On", click: function(){TabsStore.setAutocompletion(true);}},
                {label: "Off", click: function(){TabsStore.setAutocompletion(false);}},
            ]},
        ]},


        {label: "Window", submenu:[
            {label: "Next Tab",
             accelerator: "Ctrl+Tab",
             click: function(){Actions.nextTab()},
            },
            {label: "Previous Tab",
             accelerator: "Ctrl+Shift+Tab",
             click: function(){Actions.previosTab();},
            },
            {label: "Switch Tab View",
             accelerator: "Alt+\\",
             click: function(){Actions.switchView();}
            },
            {label: "Show Project",
             accelerator: "Alt+P",
             click: function(){Actions.showProject();}
            },
            {label: "Hide Project",
             accelerator: "Alt+Shift+P",
             click: function(){Actions.hideProject();}
            },
,
        ]
        },

        {label: "Help", submenu:[
            {label: "About",
             click: function(){Actions.about()},
            }
        ]
	},

    ];

    if (DEVMODE) {
        template[template.length-2].submenu.unshift(
            {label: "Toggle DevTools",
            accelerator: "Alt+Ctrl+I",
            click: function() { BrowserWindow.getFocusedWindow().toggleDevTools(); }
            }
        );
    }
}

menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

