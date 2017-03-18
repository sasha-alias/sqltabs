#!/bin/bash
rm -rf .build
mkdir .build
npm install
./minify.sh
cp index.html .build/
cp main.js .build/
cp logo.ico .build/
cp logo.png .build/
cp package.json .build/
cp -r build .build/
cp -r css .build/
cp -r node_modules .build/

cd .build
electron-packager ./ "sqltabs" --platform=win32 --arch=x64 --version=1.4.7 --icon logo.ico --asar --prune
rm sqltabs-win32-x64/LICENSE*
rm sqltabs-win32-x64/version
cd ..

