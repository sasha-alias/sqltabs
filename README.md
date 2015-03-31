# PGTABS

Tabbed SQL interface for Postrgesql.

![](/pgtabs.png?raw=true)

## Building
Project is under development. There are no platform builds provided yet.

In order to make a custom build follow the following steps.

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

Action              | Windows and Linux | OSX 
-------------------------------------------------------------
run script          | **Ctrl+R**        | **Command+R**
break execution     | **Ctrl+B**        | **Command+B**

