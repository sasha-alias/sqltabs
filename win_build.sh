#!/bin/bash
npm install
npm run build-msnodesqlv8
./minify.sh
electron-packager ./ "sqltabs" --platform=win32 --arch=x64 --electron-version=4.1.0 --icon logo.ico --asar --prune --overwrite
rm sqltabs-win32-x64/LICENSE*
rm sqltabs-win32-x64/version

