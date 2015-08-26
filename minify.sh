for f in build/*.js; do uglifyjs $f --define DEVMODE=false -c -o $f ; done
