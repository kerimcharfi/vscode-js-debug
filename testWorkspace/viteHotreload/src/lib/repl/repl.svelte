<script>
  import { instantiateWASM } from './wasm';

  // import STEP_FILE_TEXT from '@/assets/step-files/basic_nobends.step?raw';
  // import STEP_FILE_TEXT from "@/assets/step-files/assembly.step?raw"
  import runtimeurl from '.build/debug/repl.wasm?url';
  // import runtimeurl from '/home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/lib/repl/Sources/repl_runtime/repl_runtime.wasm?url';
  import swiftwasmurl from '../swift/.build/debug/swiftwasm.wasm?url';
  import replwasmurl from '/home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/lib/test2.wasm?url';

  function intToArray(i) {
    return Uint8Array.of(
      (i & 0x000000ff) >> 0,
      (i & 0x0000ff00) >> 8,
      (i & 0x00ff0000) >> 16,
      (i & 0xff000000) >> 24,
    );
  }

  const main = async () => {
    // const buf = await readFile("../.build/wasm32-unknown-wasi/release/swiftwasm.wasm");
    const table = new WebAssembly.Table({ initial: 70000, element: 'anyfunc' });
    const memory = new WebAssembly.Memory({ initial: 500 });

    let buf = await fetch(runtimeurl).then(response => response.arrayBuffer());
    const runtimeInstantiation = await instantiateWASM(buf, {
      repl,
      memory,
      __indirect_function_table: table,
    });

    table.set(69999, runtimeInstantiation.instance.exports['$sSJ9isNewlineSbvg']);

    // console.log(table.get(69999))
    buf = await fetch(swiftwasmurl).then(response => response.arrayBuffer());
    const { wasi, instance, string, getMem } = await instantiateWASM(
      buf,
      {
        repl,
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
        },
        // __heap_base:  new WebAssembly.Global({ value: "i32", mutable: false }, 10_000_000),
        // __memory_base: new WebAssembly.Global({ value: "i32", mutable: false }, 6_000_000)
      },
      false,
    );

    buf = await fetch(replwasmurl).then(response => response.arrayBuffer());

    // instance.exports.memory.grow(500)
    // let table = instance.exports.__indirect_function_table.grow(13000)
    const replInstatiation = await instantiateWASM(
      buf,
      {
        repl,
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
        // __heap_base:  new WebAssembly.Global({ value: "i32", mutable: false }, 10_000_000),
        // __memory_base: new WebAssembly.Global({ value: "i32", mutable: false }, 6_000_000)
      },
      false,
    );
    const repl_wasi = replInstatiation.wasi;
    const repl_instance = replInstatiation.instance;
    const repl_getMem = replInstatiation.getMem;
    const repl_string = replInstatiation.string;
    console.log('performing __wasm_apply_data_relocs');
    repl_instance.exports.__wasm_apply_data_relocs();
    instance.exports.__wasm_apply_data_relocs();

    function repl(a1, a2, a3, a4, a5) {
      let result = repl_instance.exports.repl(a1, a2, a3, a4, a5);

      const stdout = repl_wasi.getStdoutString();
      if (stdout) console.log(stdout);
      const stderr = repl_wasi.getStderrString();
      if (stderr) console.error(stderr);
    }

    window.repl = repl_instance.exports.repl;
    window.repl_wasi = runtimeInstantiation.wasi;
    window.repl_JsString = runtimeInstantiation.JsString;

    let exitCode = 'none';
    console.log('running');
    setTimeout(() => {
      try {
        // foit(string("STEP_FILE_TEXT"))
        // repl_instance.exports.repl3(4)
        instance.exports.foit(3);
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
    }, 0);
  };

  main();
</script>
