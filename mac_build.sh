#!/bin/bash -e
rm -rf .build
mkdir .build
npm install
./minify.sh
node_modules/.bin/electron-packager ./ "SQL Tabs" --platform=darwin --arch=x64 --electron-version=4.1.0 --icon logo.icns --asar --prune --extend-info Info.plist --extra-resource logo_sql.icns --protocol postgres --protocol-name postgres --out .build/

