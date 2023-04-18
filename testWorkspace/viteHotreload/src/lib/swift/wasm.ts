import { init, WASI } from '@wasmer/wasi'
import { WasmFs } from "@wasmer/wasmfs"
import { Buffer } from 'buffer';

try{
    if(window){
        // @ts-ignore
        window.Buffer = Buffer;
     }
} catch(e){
    console.log(e)
}


export async function instantiateWASM(swiftbuf, oc){
    await init();
    function link(moduleImports){
        let linked_fns = {}
        for(let key in oc){
            if(key[0] == "_" && key[1] != "_"){
            let fn_name = key.slice(1)
            for(let wasm_import of moduleImports){
                if(wasm_import.name == fn_name){
                linked_fns[fn_name] = oc[key]
                }
            }
            }
        }
        return linked_fns
    }

    const wasmFs = new WasmFs();
    // Output stdout and stderr to console
    // const originalWriteSync = wasmFs.fs.writeSync;
    // wasmFs.fs.writeSync = (fd, buffer, offset, length, position) => {
    //   const text = new TextDecoder("utf-8").decode(buffer);
    //   switch (fd) {
    //     case 1:
    //       console.log(text);
    //       break;
    //     case 2:
    //       console.error(text);
    //       break;
    //   }
    //   return originalWriteSync(fd, buffer, offset, length, position);
    // };

    // Instantiate a new WASI Instance
    let wasi = new WASI({
        bindings: {
            fs: wasmFs.fs,
        },
    });

    console.log("compiling swift wasm")
    const module = await WebAssembly.compile(new Uint8Array(swiftbuf));
    console.log("finished compiling swift wasm")

    let linked_fns = link(WebAssembly.Module.imports(module))

    let ocmem = oc.HEAPU8;

    function getswiftmem(){
        if(swiftmem.byteLength === 0){
        // detached
        swiftmem = new Uint8Array(instance.exports.memory.buffer);
        }
        return swiftmem
    }

    function cpp_malloc(size){
        let ptr = oc._malloc(size)
        return ptr
    }

    function cpp_memset(sourcePtr, targetPtr, size){
        if(swiftmem.byteLength === 0){
        // detached
        swiftmem = new Uint8Array(instance.exports.memory.buffer);
        }
        ocmem.set(swiftmem.subarray(sourcePtr, sourcePtr+size), targetPtr);
    }

    function cpp_memget(sourcePtr, targetPtr, size){
        if(swiftmem.byteLength === 0){
        // detached
        swiftmem = new Uint8Array(instance.exports.memory.buffer);
        }
        swiftmem.set(ocmem.subarray(sourcePtr, sourcePtr+size), targetPtr);
    }
    console.log("wasi.instantiate")

    function consolelog(sourcePtr, size){
        let utf8decoder = new TextDecoder();
        console.log(utf8decoder.decode(getswiftmem().subarray(sourcePtr, sourcePtr+size-1)));
    }
    let imports = wasi.getImports(module);

    function _debugger(){
        debugger;
    }

    let instance = await WebAssembly.instantiate(module,
    {
        ...imports,
        env: {
            // cpp_malloc,
            ...linked_fns,
            consolelog,
            // cpp_memset,
            // cpp_memget,
            debugger: _debugger
        }
    }
    );

    instance = await wasi.instantiate(instance);

    function SwiftString(str){
        var encoder = new TextEncoder();
        var encodedString = encoder.encode(str);
        let ptr = instance.exports.malloc(encodedString.length)
        if(swiftmem.byteLength === 0){
        // detached
        swiftmem = new Uint8Array(instance.exports.memory.buffer);
        }
        swiftmem.set(encodedString, ptr)
        return ptr
    }

    // Instantiate the WebAssembly file
    // await WebAssembly.instantiate(wasmBinary, {
    //   wasi_snapshot_preview1: wasi.wasiImport,
    //   env: {
    //     add: (lhs, rhs) => (lhs + rhs),
    //   }
    // });

    let swiftmem = new Uint8Array(instance.exports.memory.buffer);
    // let cppmem = hello_cpp.HEAPU8;

    // hello_cpp._copyOut = (sourcePtr, targetPtr, size)=>{
    //     swiftmem.set(cppmem.subarray(sourcePtr, sourcePtr+size), targetPtr);
    // }

    return {
        wasi, instance, string: SwiftString
    }
}