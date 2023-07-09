<script>
  import { instantiateWASM } from './wasm';
  import { SwiftRuntime } from "/home/ubu/coding/repos/JavaScriptKit/Runtime/lib/index.mjs";

  const swift = new SwiftRuntime();

  // import STEP_FILE_TEXT from '@/assets/step-files/basic_nobends.step?raw';
  // import STEP_FILE_TEXT from "@/assets/step-files/assembly.step?raw"
  import runtimeurl from '.build/debug/repl.wasm?url';
  // import runtimeurl from '/home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/lib/repl/Sources/repl_runtime/repl_runtime.wasm?url';
  import swiftwasmurl from '../swift/.build/debug/swiftwasm.wasm?url';
  import replwasmurl from '/home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/lib/test2.wasm?url';

  let main_wasi

  const main = async () => {
    // const buf = await readFile("../.build/wasm32-unknown-wasi/release/swiftwasm.wasm");
    const table = new WebAssembly.Table({ initial: 80000, element: 'anyfunc' });
    const memory = new WebAssembly.Memory({ initial: 500 });

    let buf = await fetch(runtimeurl).then(response => response.arrayBuffer());
    const runtimeInstantiation = await instantiateWASM(buf, {
      repl,
      memory,
      __indirect_function_table: table,
    });

    table.set(69999, runtimeInstantiation.instance.exports['$sSJ9isNewlineSbvg']);
    table.set(69998, runtimeInstantiation.instance.exports['$sSR11baseAddressSPyxGSgvg']);
    table.set(69997, runtimeInstantiation.instance.exports['$sSp10initialize4from5countySPyxG_SitF']);
    table.set(69996, runtimeInstantiation.instance.exports['$sSr11baseAddressSpyxGSgvg']);
    table.set(69995, runtimeInstantiation.instance.exports['$sSp14moveInitialize4from5countySpyxG_SitF']);
    table.set(69994, runtimeInstantiation.instance.exports['swift_deletedMethodError']);
    table.set(69993, runtimeInstantiation.instance.exports['__cxa_pure_virtual']);

    buf = await fetch(swiftwasmurl).then(response => response.arrayBuffer());
    const { wasi, instance, string, getMem } = await instantiateWASM(
      buf,
      {
        repl,
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
          $sSR11baseAddressSPyxGSgvg: new WebAssembly.Global({ value: 'i32', mutable: true }, 69998),
          $sSp10initialize4from5countySPyxG_SitF: new WebAssembly.Global({ value: 'i32', mutable: true }, 69997),
          $sSr11baseAddressSpyxGSgvg: new WebAssembly.Global({ value: 'i32', mutable: true }, 69996),
          $sSp14moveInitialize4from5countySpyxG_SitF: new WebAssembly.Global({ value: 'i32', mutable: true }, 69995),
          swift_deletedMethodError: new WebAssembly.Global({ value: 'i32', mutable: true }, 69994),
          __cxa_pure_virtual: new WebAssembly.Global({ value: 'i32', mutable: true }, 69993),
        },
        // __heap_base:  new WebAssembly.Global({ value: "i32", mutable: false }, 10_000_000),
        // __memory_base: new WebAssembly.Global({ value: "i32", mutable: false }, 6_000_000)
      },
      false,
    );

    main_wasi = wasi


    // buf = await fetch(replwasmurl).then(response => response.arrayBuffer());

    // instance.exports.memory.grow(500)
    // let table = instance.exports.__indirect_function_table.grow(13000)
    // const replInstatiation = await instantiateWASM(
    //   buf,
    //   {
    //     repl,
    //     memory,
    //     __indirect_function_table: table,
    //     ...instance.exports,
    //     ...runtimeInstantiation.instance.exports,
    //     // __table_base: 35000,
    //     _swift_FORCE_LOAD_$_swiftWASILibc: new WebAssembly.Global(
    //       { value: 'i32', mutable: true },
    //       0,
    //     ),
    //     __start_swift5_accessible_functions: new WebAssembly.Global(
    //       { value: 'i32', mutable: true },
    //       0,
    //     ),
    //     __stop_swift5_accessible_functions: new WebAssembly.Global(
    //       { value: 'i32', mutable: true },
    //       0,
    //     ),
    //     __start_swift5_replac2: new WebAssembly.Global({ value: 'i32', mutable: true }, 0),
    //     __stop_swift5_replac2: new WebAssembly.Global({ value: 'i32', mutable: true }, 0),
    //     __start_swift5_replace: new WebAssembly.Global({ value: 'i32', mutable: true }, 0),
    //     __stop_swift5_replace: new WebAssembly.Global({ value: 'i32', mutable: true }, 0),
    //     // __heap_base:  new WebAssembly.Global({ value: "i32", mutable: false }, 10_000_000),
    //     // __memory_base: new WebAssembly.Global({ value: "i32", mutable: false }, 6_000_000)
    //   },
    //   false,
    // );
    // const repl_wasi = replInstatiation.wasi;
    // const repl_instance = replInstatiation.instance;
    // const repl_getMem = replInstatiation.getMem;
    // const repl_string = replInstatiation.string;
    // console.log('performing __wasm_apply_data_relocs');
    // repl_instance.exports.__wasm_apply_data_relocs();
    runtimeInstantiation.instance.exports.__wasm_call_ctors();
    instance.exports.__wasm_apply_data_relocs();
    instance.exports.__wasm_call_ctors();

    function repl(a1, a2, a3, a4, a5) {
      let result = repl_instance.exports.repl(a1, a2, a3, a4, a5);

      const stdout = repl_wasi.getStdoutString();
      if (stdout) console.log(stdout);
      const stderr = repl_wasi.getStderrString();
      if (stderr) console.error(stderr);
    }

    // window.repl = repl_instance.exports.repl;
    window.repl_wasi = runtimeInstantiation.wasi;
    window.repl_JsString = runtimeInstantiation.JsString;


    swift._instance = instance;
    swift.setMemory(memory)

    let exitCode = 'none';
    console.log('running');
    instance.exports.foit(3);
    // instance.exports._start();

    // setTimeout(() => {
      try {
        // foit(string("STEP_FILE_TEXT"))
        // repl_instance.exports.repl3(4)
        // instance.exports.foit(3);
        // instance.exports._start();
        // repl_instance.exports.repl(234)
        // let ptr = window.repl(82196, 82120, 82116, 82104, 82096)
        // console.log("<----->")
        // console.log(window.repl_JsString(ptr))
        console.log('finished');

        // exitCode = wasi.start();
      } catch (e) {
        console.error(e);
      }

      // let stdout = wasi.getStdoutString();
      // let stderr = wasi.getStderrString();

      // // This should print "hello world (exit code: 0)"
      // console.log(`${stdout}`);
      // console.log(`${stderr}(exit code: ${exitCode})`);

      // stdout = runtimeInstantiation.wasi.getStdoutString();
      // stderr = runtimeInstantiation.wasi.getStderrString();

      // // This should print "hello world (exit code: 0)"
      // console.log(`${stdout}`);
      // console.log(`${stderr}(exit code: ${exitCode})`);
    // }, 0);
  };

  main();
</script>

<button on:click={()=>{
       let stdout = main_wasi.getStdoutString();
      let stderr = main_wasi.getStderrString();

      // This should print "hello world (exit code: 0)"
      console.log(`${stdout}`);
      console.log(`${stderr}`);
}}>print std out</button>