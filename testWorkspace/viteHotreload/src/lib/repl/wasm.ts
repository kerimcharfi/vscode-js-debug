// import { init, WASI } from '@wasmer/wasi'
import { init, WASI } from '/home/ubu/coding/repos/wasmer-js/dist/Library.esm.js'
export { init } from '/home/ubu/coding/repos/wasmer-js/dist/Library.esm.js'
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

function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}
  
function mergeDeep(target, source) {
    let output = Object.assign({}, target);
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        if (isObject(source[key])) {
          if (!(key in target))
            Object.assign(output, { [key]: source[key] });
          else
            output[key] = mergeDeep(target[key], source[key]);
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
}

function nullTerminatedSubarray(array: Uint8Array, begin=0){
    for(let i=begin; i<array.length; i++){
        if(array[i] === 0) {
            return array.subarray(begin, i)
        }
    }
    return array
}


export interface Options{

}


export function instantiateWASM(buf, fns, wasiInstantiate=true, force = true, synchronous = false){
    // if(synchronous)
    //     await init();

    function link(module, symbols){
        const moduleImports = WebAssembly.Module.imports(module)

        let linked_fns = {}
        for(let wasm_import of moduleImports){
            if(!linked_fns[wasm_import.module]){
                linked_fns[wasm_import.module] = {}
            }
            let sym = symbols[wasm_import.module]?.[wasm_import.name]
            if(sym === undefined){
                sym = symbols[wasm_import.name]
            }
            if(sym === undefined){
                if(!force)
                    throw "cannot resolve symbol " + wasm_import.module + "::" + wasm_import.name
                else
                    continue
            }


            if(wasm_import.module == "GOT.mem"){
                linked_fns[wasm_import.module][wasm_import.name] = new WebAssembly.Global({ value: "i32", mutable: true }, sym.value);
            } else {
                linked_fns[wasm_import.module][wasm_import.name] = sym
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
        args: [],
        env: {},
        bindings: {
            fs: wasmFs.fs,
        },
    });

    function getMem(){
        if(swiftmem.byteLength === 0){
            // detached
            if(instance.exports.memory){
                swiftmem = new Uint8Array(instance.exports.memory.buffer)
            } else {
                swiftmem = new Uint8Array(imports.env.memory.buffer)
            }
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
        console.log(JsString(sourcePtr, size));
    }

    function JsString(sourcePtr, size?){
        let data
        if(!size){
            data = nullTerminatedSubarray(getMem(), sourcePtr)
        } else {
            data = getMem().subarray(sourcePtr, sourcePtr+size-1)
        }
        return new TextDecoder().decode(data);
    }

    function _debugger(){
        debugger;
    }

    function SwiftString (str) {
        var encoder = new TextEncoder()
        var encodedString = encoder.encode(str)
        let ptr = instance.exports.malloc(encodedString.length + 1)
        if (swiftmem.byteLength === 0) {
          // detached
          swiftmem = new Uint8Array(instance.exports.memory.buffer)
        }
        swiftmem.set(encodedString, ptr)
        swiftmem.set([0], ptr+encodedString.length)
        return ptr
    }

    let module 
    let instance 
    let swiftmem
    let imports


    if(synchronous){
        console.log("creating WebAssembly.Module")
        module = new WebAssembly.Module(new Uint8Array(buf));

        let wasiImports = wasi.getImports(module);
        imports = link(module, {
            consolelog,
            debugger: _debugger,
            ...fns,
            ...wasiImports
        })
        console.log(imports)

        instance = new WebAssembly.Instance(module, imports)
        console.log("finished creating WebAssembly.Module")

        if(instance.exports.memory){
            swiftmem = new Uint8Array(instance.exports.memory.buffer)
        } else {
            swiftmem = new Uint8Array(imports.memory)
        }
    
        // let cppmem = hello_cpp.HEAPU8;
    
        // hello_cpp._copyOut = (sourcePtr, targetPtr, size)=>{
        //     swiftmem.set(cppmem.subarray(sourcePtr, sourcePtr+size), targetPtr);
        // }
    
        return {
            wasi, instance, string: SwiftString, JsString, getMem
        }
    }
    else {
        return (async()=> {
            module = await WebAssembly.compile(new Uint8Array(buf));

            let wasiImports = wasi.getImports(module);
            imports = link(module, {
                consolelog,
                debugger: _debugger,
                ...fns,
                ...wasiImports
            })
            // let imports = mergeDeep(imports, linked_fns)
            console.log(imports)

            instance = await WebAssembly.instantiate(module, imports)
            if(wasiInstantiate){
                instance = await wasi.instantiate(instance, imports);
            }

            if(instance.exports.memory){
                swiftmem = new Uint8Array(instance.exports.memory.buffer)
            } else {
                swiftmem = new Uint8Array(imports.memory)
            }
        
            return {
                wasi, instance, string: SwiftString, JsString, getMem
            }
        })()
    }
}
