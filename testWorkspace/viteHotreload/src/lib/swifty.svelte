<script>
  import { runtimeInit } from '/home/ubu/coding/repos/wasm-js-runtime/swift/runtime';
  import { Module, Runtime, instantiateWASM } from '/home/ubu/coding/repos/wasm-js-runtime/wasm';
  import { SwiftRuntime } from '/home/ubu/coding/repos/JavaScriptKit/Runtime/lib/index.mjs';
  // import STEP_FILE_TEXT from '@/assets/step-files/basic_nobends.step?raw';
  // import STEP_FILE_TEXT from "@/assets/step-files/assembly.step?raw"
  // import runtimeurl from '/home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/lib/repl/Sources/repl_runtime/repl_runtime.wasm?url';
  // import swiftwasmurl from '../swift/.build/debug/mycode.wasm?url';
  import swiftwasmurl from './swift/.build/debug/swiftwasm.wasm?url';
  // import replwasmurl from '/home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/lib/test2.wasm?url';
  import runtimeurl from '/home/ubu/coding/repos/wasm-js-runtime/swift/runtime/.build/debug/__runtime.wasm?url';

  let main_wasi;
  const swift = new SwiftRuntime();

  const main = async () => {
    const { runtimeInstantiation, memory, table, runtime } = await runtimeInit(
      await fetch(runtimeurl).then(response => response.arrayBuffer())
    );
    
    const { wasi, instance, string, getMem } = await instantiateWASM(
      await fetch(swiftwasmurl).then(response => response.arrayBuffer()),
      {
        javascript_kit: swift.importObjects(),
        memory,
        __indirect_function_table: table,
        ...runtimeInstantiation.instance.exports,
        // __table_base: 35000,
        _swift_FORCE_LOAD_$_swiftWASILibc: new WebAssembly.Global(
          { value: 'i32', mutable: true },
          0,
        ),
        __start_swift5_accessible_functions: new WebAssembly.Global(
          { value: 'i32', mutable: true },
          0,
        ),
        __stop_swift5_accessible_functions: new WebAssembly.Global(
          { value: 'i32', mutable: true },
          0,
        ),
        __start_swift5_replac2: new WebAssembly.Global({ value: 'i32', mutable: true }, 0),
        __stop_swift5_replac2: new WebAssembly.Global({ value: 'i32', mutable: true }, 0),
        __start_swift5_replace: new WebAssembly.Global({ value: 'i32', mutable: true }, 0),
        __stop_swift5_replace: new WebAssembly.Global({ value: 'i32', mutable: true }, 0),
        'GOT.func': {
          $sSJ9isNewlineSbvg: new WebAssembly.Global({ value: 'i32', mutable: true }, 69999),
          $sSR11baseAddressSPyxGSgvg: new WebAssembly.Global(
            { value: 'i32', mutable: true },
            69998,
          ),
          $sSp10initialize4from5countySPyxG_SitF: new WebAssembly.Global(
            { value: 'i32', mutable: true },
            69997,
          ),
          $sSr11baseAddressSpyxGSgvg: new WebAssembly.Global(
            { value: 'i32', mutable: true },
            69996,
          ),
          $sSp14moveInitialize4from5countySpyxG_SitF: new WebAssembly.Global(
            { value: 'i32', mutable: true },
            69995,
          ),
          swift_deletedMethodError: new WebAssembly.Global({ value: 'i32', mutable: true }, 69994),
          __cxa_pure_virtual: new WebAssembly.Global({ value: 'i32', mutable: true }, 69993),
        },
        // __heap_base:  new WebAssembly.Global({ value: "i32", mutable: false }, 10_000_000),
        // __memory_base: new WebAssembly.Global({ value: "i32", mutable: false }, 6_000_000)
      },
      false,
    );

    main_wasi = wasi;

    Module.fromInstantiation({ instance })
          .insertIntoRuntime(runtime, 'code');


    swift._instance = instance;
    swift.setMemory(memory);

    let exitCode = 'none';
    console.log('running');
    instance.exports.foit(3);

    // setTimeout(() => {
    try {
      // foit(string("STEP_FILE_TEXT"))
      // repl_instance.exports.repl3(4)
      // instance.exports.foit(3);
      // repl_instance.exports.repl(234)
      // let ptr = window.repl(82196, 82120, 82116, 82104, 82096)
      // console.log("<----->")
      // console.log(window.repl_JsString(ptr))
      console.log('finished');

      // exitCode = wasi.start();
    } catch (e) {
      console.error(e);
    }

    let stdout = wasi.getStdoutString();
    let stderr = wasi.getStderrString();

    // This should print "hello world (exit code: 0)"
    console.log(`${stdout}`);
    console.log(`${stderr}(exit code: ${exitCode})`);

    stdout = runtimeInstantiation.wasi.getStdoutString();
    stderr = runtimeInstantiation.wasi.getStderrString();

    // This should print "hello world (exit code: 0)"
    console.log(`${stdout}`);
    console.log(`${stderr}(exit code: ${exitCode})`);
    // }, 0);
  };

  main();
</script>
Swift
<button
  on:click={() => {
    let stdout = main_wasi.getStdoutString();
    let stderr = main_wasi.getStderrString();

    // This should print "hello world (exit code: 0)"
    console.log(`${stdout}`);
    console.log(`${stderr}`);
  }}>print std out</button
>
