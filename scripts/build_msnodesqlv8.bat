echo off
set path=%path%;%~dp0
 
echo %~dp0%

set arch=%1


FOR /F "delims=" %%i IN ('node -v') DO set node_ver=%%i
FOR /F "delims=" %%j IN ('node_modules\.bin\electron.cmd --version') DO set electron_ver=%%j



echo "node version : %node_ver%"
echo "electron version : %electron_ver%"

echo "set npm conifg msvs_version to 2015"
REM call npm set config msvs_version=2015

for /F %%I in ("%~dp0..\node_modules") do set "NodeModules=%%~fI"
echo Path to project node moduels: "%NodeModules%"
set "moduleDir=%NodeModules%\msnodesqlv8"


call npm install -g node-gyp


echo on
copy "%moduleDir%\bindingdotgyp.old" "%moduleDir%\binding.gyp"
call node-gyp rebuild --directory=%moduleDir% --target=%electron_ver% --dist-url=https://atom.io/download/atom-shell --verbose --arch=%arch%
copy "%moduleDir%\build\Release\sqlserverv8.node" "%moduleDir%\lib\bin\sqlserverv8.electron.%electron_ver%.%arch%.node"
