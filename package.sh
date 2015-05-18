#!/bin/sh
rm -rf ./PGTabs
electron-packager ./ PGTabs --platform=darwin --arch=x64 --version=0.25.2
