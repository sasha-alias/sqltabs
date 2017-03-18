#!/bin/bash -e
rm -rf .build
mkdir .build
npm install
./minify.sh
cp index.html .build/
cp main.js .build/
cp logo.icns .build/
cp logo.png .build/
cp package.json .build/
cp -r build .build/
cp -r css .build/
cp -r node_modules .build/

cd .build
electron-packager ./ "SQL Tabs" --platform=darwin --arch=x64 --electron-version=1.4.7 --icon logo.icns --asar --prune --extend-info ../Info.plist --extra-resource ../logo_sql.icns --protocol postgres ---procol-name postgres
cd ..

