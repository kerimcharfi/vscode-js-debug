
swift build --triple wasm32-unknown-wasi -c release -Xlinker --export=repl -Xlinker --export=malloc

swiftc test2.swift -I . -Xfrontend -disable-access-control
swiftc -target wasm32-unknown-wasi test2.swift -o test2.wasm -I . -L .  -Xfrontend -disable-access-control -Xlinker --allow-undefined


/home/ubu/coding/repos/swiftwasm/.build/dist-toolchain-sdk/swift-wasm-DEVELOPMENT-SNAPSHOT-2023-05-21-a/usr/bin/swiftc -target wasm32-unknown-wasi test2.swift -o test2.wasm -I /home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/lib/swift/.build/debug -L /home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/swift/.build/debug -Xfrontend -disable-access-control -Xlinker --import-undefined -Xlinker --global-base=6000000 -Xlinker --import-table -Xlinker --import-memory -Xlinker --export=repl -Xlinker --experimental-pic -Xlinker --table-base=35000 -Xlinker --allow-undefined


/home/ubu/coding/tools/swift-wasm-DEVELOPMENT-SNAPSHOT-2023-05-27-a/usr/bin/swiftc -target wasm32-unknown-wasi test2.swift -o test2.wasm -I /home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/lib/swift/.build/debug -L /home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/swift/.build/debug -Xfrontend -disable-access-control -Xlinker --import-undefined -Xlinker --global-base=6000000 -Xlinker --import-table -Xlinker --import-memory -Xlinker --export=repl -Xlinker --table-base=35000 -Xlinker --unresolved-symbols=import-dynamic
/home/ubu/coding/tools/swift-wasm-DEVELOPMENT-SNAPSHOT-2023-05-27-a/usr/bin/swiftc -target wasm32-unknown-wasi test2.swift -o test2.wasm -I /home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/lib/swift/.build/debug -L /home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/swift/.build/debug -Xfrontend -disable-access-control -Xlinker --experimental-pic -Xlinker --global-base=6000000 -Xlinker --import-table -Xlinker --import-memory -Xlinker --export=repl -Xlinker --table-base=35000 -Xlinker --unresolved-symbols=import-dynamic
/home/ubu/coding/tools/swift-wasm-DEVELOPMENT-SNAPSHOT-2023-05-27-a/usr/bin/swiftc -target wasm32-unknown-wasi test2.swift -o test2.wasm -I /home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/lib/swift/.build/debug -L /home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/swift/.build/debug -Xfrontend -disable-access-control -Xlinker --experimental-pic -Xlinker --global-base=6000000 -Xlinker --import-table -Xlinker --import-memory -Xlinker --export=repl -Xlinker --table-base=35000 -Xlinker --pie
/home/ubu/coding/tools/swift-wasm-DEVELOPMENT-SNAPSHOT-2023-06-03-a/usr/bin/swiftc -target wasm32-unknown-wasi test2.swift -o test2.wasm -I /home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/lib/swift/.build/debug -L /home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/swift/.build/debug -Xfrontend -disable-access-control -Xlinker --experimental-pic -Xlinker --global-base=6000000 -Xlinker --import-table -Xlinker --import-memory -Xlinker --export=repl -Xlinker --table-base=35000 -Xlinker --unresolved-symbols=import-dynamic -g -emit-module -emit-executable
/home/ubu/coding/tools/swift-wasm-DEVELOPMENT-SNAPSHOT-2023-06-03-a/usr/bin/swiftc -target wasm32-unknown-wasi test2.swift -o test2.wasm -I /home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/lib/swift/.build/debug -I /home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/lib/repl/.build/debug -L /home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/swift/.build/debug -Xfrontend -disable-access-control -Xlinker --experimental-pic -Xlinker --global-base=6000000 -Xlinker --import-table -Xlinker --import-memory -Xlinker --export=repl -Xlinker --table-base=35000 -Xlinker --unresolved-symbols=import-dynamic -g -emit-module -emit-executable -Xlinker --export-dynamic -Xlinker -mllvm -Xlinker -debug -Xlinker --threads=1 &> build.log
emcc hello_cpp.cpp -I include  -o build/cpp.js -sEXPORTED_FUNCTIONS=_add,_main,_generatePoint,_heapPoint,_getX,_getY -sEXPORTED_RUNTIME_METHODS=ccall,cwrap --js-library lib.js -O3




    -Xcc -fmodule-map-file=/home/ubu/coding/codecad/examples/swift-wasm/.build/wasm32-unknown-wasi/debug/hello_cpp.build/module.modulemap

swiftc Sources/swiftwasm/main.swift -o hello.wasm \
    -Xcc -I -Xcc /home/ubu/coding/codecad/examples/swift-wasm/Sources/hello_cpp/include \
    -I Sources/hello_cpp \
    -enable-experimental-cxx-interop \
    -Xcc -fmodule-map-file=/home/ubu/coding/codecad/examples/swift-wasm/.build/x86_64-unknown-linux-gnu/debug/hello_cpp.build/module.modulemap


















  (func $__wasm_apply_data_relocs (type 17)
    i32.const 6000220
    global.get $$sSeMp
    i32.const 6000220
    i32.sub 
    i32.store

    i32.const 6000240
    global.get $$sSe4fromxs7Decoder_p_tKcfCTq
    i32.const 6000240
    i32.sub 
    i32.store
    
    i32.const 6000260
    global.get $$sSEMp
    i32.const 6000260
    i32.sub 
    i32.store

    i32.const 6000280
    global.get $$sSE6encode2toys7Encoder_p_tKFTq
    i32.const 6000280
    i32.sub 
    i32.store
    
    i32.const 6000464
    global.get $$ss28CustomDebugStringConvertibleMp
    i32.const 6000464
    i32.sub 
    i32.store

    i32.const 6000484
    global.get $$ss28CustomDebugStringConvertibleP16debugDescriptionSSvgTq
    i32.const 6000484
    i32.sub 
    i32.store

    i32.const 6000504
    global.get $$ss23CustomStringConvertibleMp
    i32.const 6000504
    i32.sub 
    i32.store
    
    i32.const 6000524
    global.get $$ss23CustomStringConvertibleP11descriptionSSvgTq
    i32.const 6000524
    i32.sub 
    i32.store
    
    i32.const 6000544
    global.get $$sSHMp
    i32.const 6000544
    i32.sub 
    i32.store
    
    i32.const 6000564
    global.get $$sSHSQTb
    i32.const 6000564
    i32.sub 
    i32.store
    
    i32.const 6000572
    global.get $$sSH9hashValueSivgTq
    i32.const 6000572
    i32.sub 
    i32.store
    
    i32.const 6000580
    global.get $$sSH4hash4intoys6HasherVz_tFTq
    i32.const 6000580
    i32.sub 
    i32.store
    
    i32.const 6000588
    global.get $$sSH13_rawHashValue4seedS2i_tFTq
    i32.const 6000588
    i32.sub 
    i32.store
    
    i32.const 6000608
    global.get $$sSQMp
    i32.const 6000608
    i32.sub 
    i32.store
    
    i32.const 6000628
    global.get $$sSQ2eeoiySbx_xtFZTq
    i32.const 6000628
    i32.sub 
    i32.store
    
    i32.const 6000648
    global.get $$ss9CodingKeyMp
    i32.const 6000648
    i32.sub 
    i32.store
    
    i32.const 6000668
    global.get $$ss9CodingKeyPs28CustomDebugStringConvertibleTb
    i32.const 6000668
    i32.sub 
    i32.store
    
    i32.const 6000676
    global.get $$ss9CodingKeyPs23CustomStringConvertibleTb
    i32.const 6000676
    i32.sub 
    i32.store
    
    i32.const 6000684
    global.get $$ss9CodingKeyP11stringValueSSvgTq
    i32.const 6000684
    i32.sub 
    i32.store
    
    i32.const 6000692
    global.get $$ss9CodingKeyP11stringValuexSgSS_tcfCTq
    i32.const 6000692
    i32.sub 
    i32.store
    
    i32.const 6000700
    global.get $$ss9CodingKeyP8intValueSiSgvgTq
    i32.const 6000700
    i32.sub 
    i32.store
    
    i32.const 6000708
    global.get $$ss9CodingKeyP8intValuexSgSi_tcfCTq
    i32.const 6000708
    i32.sub 
    i32.store
    
    i32.const 6001048
    global.get $$sBoWV 
    i32.store
    
    i32.const 6001113
    global.get $$ss22KeyedEncodingContainerVMn
    i32.const 6001113
    i32.sub 
    i32.store
    
    i32.const 6001127
    global.get $$ss22KeyedDecodingContainerVMn
    i32.const 6001127
    i32.sub 
    i32.store)



































Variable als class




  (func $__wasm_apply_data_relocs (type 17)
    i32.const 6000220
    global.get $$sSeMp
    i32.const 6000220
    i32.sub 
    i32.store

    i32.const 6000240
    global.get $$sSe4fromxs7Decoder_p_tKcfCTq
    i32.const 6000240
    i32.sub 
    i32.store

    i32.const 6000260
    global.get $$sSEMp
    i32.const 6000260
    i32.sub 
    i32.store

    i32.const 6000280
    global.get $$sSE6encode2toys7Encoder_p_tKFTq
    i32.const 6000280
    i32.sub 
    i32.store

    i32.const 6000584
    global.get $$ss28CustomDebugStringConvertibleMp
    i32.const 6000584
    i32.sub 
    i32.store

    i32.const 6000604
    global.get $$ss28CustomDebugStringConvertibleP16debugDescriptionSSvgTq
    i32.const 6000604
    i32.sub 
    i32.store

    i32.const 6000624
    global.get $$ss23CustomStringConvertibleMp
    i32.const 6000624
    i32.sub 
    i32.store

    i32.const 6000644
    global.get $$ss23CustomStringConvertibleP11descriptionSSvgTq
    i32.const 6000644
    i32.sub 
    i32.store

    i32.const 6000664
    global.get $$sSHMp
    i32.const 6000664
    i32.sub 
    i32.store

    i32.const 6000684
    global.get $$sSHSQTb
    i32.const 6000684
    i32.sub 
    i32.store

    i32.const 6000692
    global.get $$sSH9hashValueSivgTq
    i32.const 6000692
    i32.sub
    i32.store

    i32.const 6000700
    global.get $$sSH4hash4intoys6HasherVz_tFTq
    i32.const 6000700
    i32.sub
    i32.store

    i32.const 6000708
    global.get $$sSH13_rawHashValue4seedS2i_tFTq
    i32.const 6000708
    i32.sub
    i32.store

    i32.const 6000728
    global.get $$sSQMp
    i32.const 6000728
    i32.sub
    i32.store

    i32.const 6000748
    global.get $$sSQ2eeoiySbx_xtFZTq
    i32.const 6000748
    i32.sub
    i32.store

    i32.const 6000768
    global.get $$ss9CodingKeyMp
    i32.const 6000768
    i32.sub
    i32.store

    i32.const 6000788
    global.get $$ss9CodingKeyPs28CustomDebugStringConvertibleTb
    i32.const 6000788
    i32.sub
    i32.store

    i32.const 6000796
    global.get $$ss9CodingKeyPs23CustomStringConvertibleTb
    i32.const 6000796
    i32.sub
    i32.store

    i32.const 6000804
    global.get $$ss9CodingKeyP11stringValueSSvgTq
    i32.const 6000804
    i32.sub
    i32.store

    i32.const 6000812
    global.get $$ss9CodingKeyP11stringValuexSgSS_tcfCTq
    i32.const 6000812
    i32.sub
    i32.store

    i32.const 6000820
    global.get $$ss9CodingKeyP8intValueSiSgvgTq
    i32.const 6000820
    i32.sub
    i32.store

    i32.const 6000828
    global.get $$ss9CodingKeyP8intValuexSgSi_tcfCTq
    i32.const 6000828
    i32.sub
    i32.store

    i32.const 6001080
    global.get $$sBoWV
    i32.store

    i32.const 6001152
    global.get $$sBoWV
    i32.store

    i32.const 6001257
    global.get $$ss22KeyedEncodingContainerVMn
    i32.const 6001257
    i32.sub
    i32.store

    i32.const 6001271
    global.get $$ss22KeyedDecodingContainerVMn
    i32.const 6001271
    i32.sub
    i32.store)