for f in build/*.js; do node_modules/uglifyjs/bin/uglifyjs $f --define DEVMODE=false -c -o $f ; done
