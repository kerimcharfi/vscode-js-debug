
import { readFileSync } from 'fs';

import { WASI, init } from '@wasmer/wasi/dist/Library.esm.js';
import { WasmFs } from '@wasmer/wasmfs';
import path from 'path';

const wasmpath = path.join(__dirname, "swiftwasm.wasm")
const buf = readFileSync(wasmpath);
// const buf = readFileSync('.build/debug/swiftwasm.wasm')
// const buf = readFileSync( 'src/swiftwasm.wasm')


async function instantiateWASM (swiftbuf) {
  await init()

  const wasmFs = new WasmFs()

  // Instantiate a new WASI Instance
  let wasi = new WASI({
    args: [],
    env: {},
    bindings: {
      fs: wasmFs.fs,
    },
  })

  const module = await WebAssembly.compile(new Uint8Array(swiftbuf))

  let imports = wasi.getImports(module);
  let moduleImports = WebAssembly.Module.imports(module);

  let linked_fns = {} //link(WebAssembly.Module.imports(module))

  function _debugger(){
    debugger;
  }

  function consolelog(sourcePtr, size){
    let utf8decoder = new TextDecoder();
    console.log(utf8decoder.decode(getswiftmem().subarray(sourcePtr, sourcePtr+size-1)));
  }

  let instance = await WebAssembly.instantiate(module, {
    ...imports,
    env: {
      debugger: _debugger,
      // consolelog
    }
  });

  instance = await wasi.instantiate(instance);

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

  let swiftmem = new Uint8Array(instance.exports.memory.buffer)

  return {
    wasi,
    instance,
    string: SwiftString,
  }
}

const setupPromise = instantiateWASM(buf)

export async function demangle(name){
  if(name.charAt(0) === '$' && name.charAt(1) === '$'){
    name = name.substring(1);
  }

  const { wasi, instance, string } = await setupPromise

  try {
    instance.exports.demangle(string(name))
  } catch (e) {
    console.error(e)
  }
  let stdout = wasi.getStdoutString()
  let stderr = wasi.getStderrString()

  if(stderr){
    console.log(stdout)
    console.error(stderr)
  }

  if(stdout.at(-1) == "\n")
    stdout = stdout.substring(0, stdout.length-1)

  return stdout
}