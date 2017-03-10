#!/bin/bash
rm -rf .build
mkdir .build
npm install
./minify.sh
cp index.html .build/
cp main.js .build/
cp logo.png .build/
cp package.json .build/
cp -r build .build/
cp -r css .build/
cp -r node_modules .build/

cd .build
electron-packager ./ "sqltabs" --platform=linux --arch=x64 --electron-version=1.4.7 --icon logo.png --asar --prune
rm sqltabs-linux-x64/LICENSE
rm sqltabs-linux-x64/version
cp ../logo.png sqltabs-linux-x64/logo.png
tar -zcvf sqltabs.linux.tar.gz sqltabs-linux-x64
cp sqltabs.linux.tar.gz ../release/
cd ..

