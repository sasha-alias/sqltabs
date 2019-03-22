#!/bin/bash
for f in build/*.js; do node_modules/uglify-es/bin/uglifyjs $f --define DEVMODE=false -c -o $f ; done
