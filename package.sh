#!/bin/sh
rm -rf ./PGTabs.app
rm ./pgtabs.dmg
electron-packager ./ PGTabs --platform=darwin --arch=x64 --version=0.25.2 --icon logo.icns
hdiutil create -format UDZO -srcfolder PGTabs.app pgtabs.dmg
