<script>
  import { runtimeInit } from './runtime';
  import { Module, Runtime, instantiateWASM } from './wasm';
  import { SwiftRuntime } from '/home/ubu/coding/repos/JavaScriptKit/Runtime/lib/index.mjs';
  // import STEP_FILE_TEXT from '@/assets/step-files/basic_nobends.step?raw';
  // import STEP_FILE_TEXT from "@/assets/step-files/assembly.step?raw"
  // import runtimeurl from '/home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/lib/repl/Sources/repl_runtime/repl_runtime.wasm?url';
  // import swiftwasmurl from '../swift/.build/debug/mycode.wasm?url';
  import swiftwasmurl from '../swift/.build/debug/swiftwasm.wasm?url';
  // import replwasmurl from '/home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/lib/test2.wasm?url';

  let main_wasi;
  const swift = new SwiftRuntime();
  let wasmRuntime = new Runtime();

  const main = async () => {
    const { runtimeInstantiation, memory, table } = await runtimeInit;

    const swiftRuntimeModule = Module.fromInstantiation(runtimeInstantiation);
    wasmRuntime.insertModule('swiftRuntime', swiftRuntimeModule);

    let buf = await fetch(swiftwasmurl).then(response => response.arrayBuffer());

    const { wasi, instance, string, getMem } = await instantiateWASM(
      buf,
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
    const codeModule = Module.fromInstantiation({ instance });
    wasmRuntime.insertModule('code', codeModule);

    // buf = await fetch(replwasmurl).then(response => response.arrayBuffer());

    // instance.exports.memory.grow(500)
    // let table = instance.exports.__indirect_function_table.grow(13000)

    window.instatiateRepl = buf => {
      const instantiation = instantiateWASM(
        buf,
        {
          memory,
          __indirect_function_table: table,
          ...instance.exports,
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
        },
        false,
        false,
        true,
      );
      instantiation.instance.exports.__wasm_apply_data_relocs();
      instantiation.instance.exports.__wasm_call_ctors();
      return instantiation;
    };
    // const replInstatiation = window.instatiateRepl(buf)
    // const repl_wasi = replInstatiation.wasi;
    // const repl_instance = replInstatiation.instance;
    // const repl_getMem = replInstatiation.getMem;
    // const repl_string = replInstatiation.string;

    // function repl(a1, a2, a3, a4, a5) {
    //   let result = repl_instance.exports.repl(a1, a2, a3, a4, a5);

    //   const stdout = repl_wasi.getStdoutString();
    //   if (stdout) console.log(stdout);
    //   const stderr = repl_wasi.getStderrString();
    //   if (stderr) console.error(stderr);
    // }

    console.log('performing __wasm_apply_data_relocs');

    runtimeInstantiation.instance.exports.__wasm_call_ctors();

    instance.exports.__wasm_apply_data_relocs();
    instance.exports.__wasm_call_ctors();

    window.repl_wasi = runtimeInstantiation.wasi;
    window.repl_JsString = runtimeInstantiation.JsString;

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

<button
  on:click={() => {
    let stdout = main_wasi.getStdoutString();
    let stderr = main_wasi.getStderrString();

    // This should print "hello world (exit code: 0)"
    console.log(`${stdout}`);
    console.log(`${stderr}`);
  }}>print std out</button
>
