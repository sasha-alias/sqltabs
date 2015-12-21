rm -rf .build
mkdir .build
jsx src/ build/
./minify.sh
cp index.html .build/
cp main.js .build/
cp logo.png .build/
cp package.json .build/
cp -r build .build/
cp -r css .build/
cp -r driver .build/
cp -r node_modules .build/

cd .build
electron-packager ./ "sqltabs" --platform=linux --arch=x64 --version=0.27.3 --icon logo.png --asar --prune
rm sqltabs-linux/LICENSE
rm sqltabs-linux/version
cp ../logo.png sqltabs-linux/logo.png
cd ..

