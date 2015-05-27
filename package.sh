#!/bin/sh
rm -rf ./SQLTabs.app
rm ./sqltabs.dmg
electron-packager ./ "SQL Tabs" --platform=darwin --arch=x64 --version=0.25.2 --icon logo.icns
hdiutil create -format UDZO -srcfolder "SQL Tabs.app" sqltabs.dmg
