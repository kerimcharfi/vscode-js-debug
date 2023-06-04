
swift build --triple wasm32-unknown-wasi -c release -Xlinker --export=repl -Xlinker --export=malloc

swiftc test2.swift -I . -Xfrontend -disable-access-control
swiftc -target wasm32-unknown-wasi test2.swift -o test2.wasm -I . -L .  -Xfrontend -disable-access-control -Xlinker --allow-undefined


/home/ubu/coding/repos/swiftwasm/.build/dist-toolchain-sdk/swift-wasm-DEVELOPMENT-SNAPSHOT-2023-05-21-a/usr/bin/swiftc -target wasm32-unknown-wasi test2.swift -o test2.wasm -I /home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/lib/swift/.build/debug -L /home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/swift/.build/debug -Xfrontend -disable-access-control -Xlinker --import-undefined -Xlinker --global-base=6000000 -Xlinker --import-table -Xlinker --import-memory -Xlinker --export=repl -Xlinker --experimental-pic -Xlinker --table-base=35000 -Xlinker --allow-undefined


/home/ubu/coding/tools/swift-wasm-DEVELOPMENT-SNAPSHOT-2023-05-27-a/usr/bin/swiftc -target wasm32-unknown-wasi test2.swift -o test2.wasm -I /home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/lib/swift/.build/debug -L /home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/swift/.build/debug -Xfrontend -disable-access-control -Xlinker --import-undefined -Xlinker --global-base=6000000 -Xlinker --import-table -Xlinker --import-memory -Xlinker --export=repl -Xlinker --table-base=35000 -Xlinker --unresolved-symbols=import-dynamic
/home/ubu/coding/tools/swift-wasm-DEVELOPMENT-SNAPSHOT-2023-05-27-a/usr/bin/swiftc -target wasm32-unknown-wasi test2.swift -o test2.wasm -I /home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/lib/swift/.build/debug -L /home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/swift/.build/debug -Xfrontend -disable-access-control -Xlinker --experimental-pic -Xlinker --global-base=6000000 -Xlinker --import-table -Xlinker --import-memory -Xlinker --export=repl -Xlinker --table-base=35000 -Xlinker --unresolved-symbols=import-dynamic
/home/ubu/coding/tools/swift-wasm-DEVELOPMENT-SNAPSHOT-2023-05-27-a/usr/bin/swiftc -target wasm32-unknown-wasi test2.swift -o test2.wasm -I /home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/lib/swift/.build/debug -L /home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/swift/.build/debug -Xfrontend -disable-access-control -Xlinker --experimental-pic -Xlinker --global-base=6000000 -Xlinker --import-table -Xlinker --import-memory -Xlinker --export=repl -Xlinker --table-base=35000 -Xlinker --pie
/home/ubu/coding/tools/swift-wasm-DEVELOPMENT-SNAPSHOT-2023-06-03-a/usr/bin/swiftc -target wasm32-unknown-wasi test2.swift -o test2.wasm -I /home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/lib/swift/.build/debug -L /home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/swift/.build/debug -Xfrontend -disable-access-control -Xlinker --experimental-pic -Xlinker --global-base=6000000 -Xlinker --import-table -Xlinker --import-memory -Xlinker --export=repl -Xlinker --table-base=35000 -Xlinker --unresolved-symbols=import-dynamic
emcc hello_cpp.cpp -I include  -o build/cpp.js -sEXPORTED_FUNCTIONS=_add,_main,_generatePoint,_heapPoint,_getX,_getY -sEXPORTED_RUNTIME_METHODS=ccall,cwrap --js-library lib.js -O3




    -Xcc -fmodule-map-file=/home/ubu/coding/codecad/examples/swift-wasm/.build/wasm32-unknown-wasi/debug/hello_cpp.build/module.modulemap

swiftc Sources/swiftwasm/main.swift -o hello.wasm \
    -Xcc -I -Xcc /home/ubu/coding/codecad/examples/swift-wasm/Sources/hello_cpp/include \
    -I Sources/hello_cpp \
    -enable-experimental-cxx-interop \
    -Xcc -fmodule-map-file=/home/ubu/coding/codecad/examples/swift-wasm/.build/x86_64-unknown-linux-gnu/debug/hello_cpp.build/module.modulemap