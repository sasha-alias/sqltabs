install_name_tool -id "@loader_path/../../../../driver/libpq.5.dylib" driver/libpq.5.dylib
install_name_tool -change "/usr/local/lib/libpq.5.dylib" "@loader_path/../../../../driver/libpq.5.dylib" node_modules/libpq/build/Release/addon.node
