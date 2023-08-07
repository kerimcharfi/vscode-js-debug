
swift build --triple wasm32-unknown-wasi -c release -Xlinker --export=foit -Xlinker --export=malloc -o

emcc hello_cpp.cpp -I include  -o build/cpp.js -sEXPORTED_FUNCTIONS=_add,_main,_generatePoint,_heapPoint,_getX,_getY -sEXPORTED_RUNTIME_METHODS=ccall,cwrap --js-library lib.js -O3




    -Xcc -fmodule-map-file=/home/ubu/coding/codecad/examples/swift-wasm/.build/wasm32-unknown-wasi/debug/hello_cpp.build/module.modulemap

swiftc Sources/swiftwasm/main.swift -o hello.wasm \
    -Xcc -I -Xcc /home/ubu/coding/codecad/examples/swift-wasm/Sources/hello_cpp/include \
    -I Sources/hello_cpp \
    -enable-experimental-cxx-interop \
    -Xcc -fmodule-map-file=/home/ubu/coding/codecad/examples/swift-wasm/.build/x86_64-unknown-linux-gnu/debug/hello_cpp.build/module.modulemap