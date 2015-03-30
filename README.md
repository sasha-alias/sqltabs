# PGTABS

Tabbed SQL interface for Postrgesql.

![](/pgtabs.png?raw=true)

## Building
Project is under development. There are no platform builds provided yet.

Prerequisities:

Install [nwjs](http://nwjs.io) (former Node Webkit).

Install [npm](https://www.npmjs.com).

Run:

    npm install -g nw-gyp
    npm install -g jsx

    git clone https://github.com/sasha-alias/pgtabs
    cd pgtabs
    npm install

    cd node_modules/libpq
    nw-gyp configure
    nw-gyp build

    cd ../../
    jsx src/ build/

    nwjs .

## Using

There are two basic shortcuts:

Windows/Linux:
    - _Ctrl+R_ run script
    - _Ctrl+B_ cancel execution

Mac OSX:
    - _Command+R_ run script
    - _Command+B_ cancel execution


