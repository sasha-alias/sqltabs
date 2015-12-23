# SQL Tabs

Rich SQL console for Postgresql. Home [www.sqltabs.com](http://www.sqltabs.com)

## Building

In order to run SQL Tabs from source code follow the next steps:

1. Install [npm](https://www.npmjs.com) - a javascript package manager

2. Install [electron](http://electron.atom.io) - a runtime environment for application (version is important):

        npm install electron-prebuilt@0.27.3 -g

3. Install React javascript extension the application is written with:

        npm install -g react-tools

4. For building postgresql driver `pg_config` is needed, so depending on your platform install:

    Ubuntu:
        
        apt-get install libpq-dev

    OSX:

        brew install postgresql
    

5. Get the code, install dependencies and build the application:

        git clone https://github.com/sasha-alias/sqltabs
        cd sqltabs
        export npm_config_disturl=https://atom.io/download/atom-shell
        export npm_config_target=0.27.3
        export npm_config_arch=x64
        export npm_config_runtime=electron
        npm install

5. Run the application:

        electron .


When you make changes in the source code under *src/* directory it's enough to rebuild only application with the command:

        jsx src/ build/

During the development it's convenient to have launched in the separate session the following:

        jsx --watch src/ build/

Thus you can skip a manual rebuild. The code will be rebuilt automatically on changes.


Contributions are welcome.


