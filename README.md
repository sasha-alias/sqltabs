# PGTABS

Rich SQL console for Postgresql. Home [www.sqltabs.com](http://www.sqltabs.com)

![](/pgtabs.png?raw=true)

## Building

In order to make a custom build follow the following steps.

1. Install [npm](https://www.npmjs.com).

2. Install [electron](http://electron.atom.io)

    npm install electron-prebuilt -g

3. Install jsx

    npm install -g jsx

4. Run the following script (beforehand replace value "0.25.2" in the script with electron version you have):

    export npm_config_disturl=https://atom.io/download/atom-shell
    export npm_config_target=0.25.2
    export npm_config_arch=x64
    git clone https://github.com/sasha-alias/sqltabs
    cd sqltabs
    npm install
    jsx src/ build/

5. Run application:

    electron .

