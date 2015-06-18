cd node_modules/libpq
export npm_config_disturl=https://atom.io/download/atom-shell
export npm_config_target=0.27.1
export npm_config_arch=x64
HOME=~/.electron-gyp npm install
cd ../..
