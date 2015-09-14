# SQL Tabs

Rich SQL console for Postgresql. Home [www.sqltabs.com](http://www.sqltabs.com)

## Building

In order to run SQL Tabs from source code follow the next steps:

1. Install [npm](https://www.npmjs.com) - a javascript package manager

2. Install [electron](http://electron.atom.io) - a runtime environment for application:

        npm install electron-prebuilt -g

3. Install jsx - react javascript extension the application written with:

        npm install -g jsx

4. Get the code and install dependencies:

        git clone https://github.com/sasha-alias/sqltabs
        cd sqltabs
        npm install --target=$(electron -v | sed s/v//)

5. Build the application itself:

        jsx src/ build/

6. Run the application:

        electron .


When you make changes in the source code under *src/* directory you need to repeat the last 2 steps.
During the development it's convenient to have launched in the separate session the following:

        jsx --watch src/ build/

Thus you can skip a manual execution of step 5. The code will be rebuild automatically on changes.


Contributions are welcome.


