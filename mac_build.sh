rm -rf .build
mkdir .build
jsx src/ build/
cp index.html .build/
cp main.js .build/
cp logo.icns .build/
cp logo.png .build/
cp package.json .build/
cp -r build .build/
cp -r css .build/
cp -r driver .build/

# bootstrap
mkdir -p .build/node_modules/bootstrap
cp -r node_modules/bootstrap/dist .build/node_modules/bootstrap/
# brace
cp -r node_modules/brace .build/node_modules/

# c3
cp -r node_modules/c3 .build/node_modules/

# flux
cp -r node_modules/flux .build/node_modules/
# jquery
cp -r node_modules/jquery .build/node_modules/

# libpq
cp -r node_modules/libpq .build/node_modules/

# lowdb
cp -r node_modules/lowdb .build/node_modules/

# marked
cp -r node_modules/marked .build/node_modules/

# microevent
cp -r node_modules/microevent .build/node_modules/

# react
cp -r node_modules/react .build/node_modules/

# react-bootstrap
cp -r node_modules/react-bootstrap .build/node_modules/

# request
cp -r node_modules/request .build/node_modules/


cd .build
electron-packager ./ "SQL Tabs" --platform=darwin --arch=x64 --version=0.25.2 --icon logo.icns --asar --prune
cd ..

