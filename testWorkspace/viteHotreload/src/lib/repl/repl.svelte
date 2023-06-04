<script>
  import { instantiateWASM } from './wasm';

  // import STEP_FILE_TEXT from '@/assets/step-files/basic_nobends.step?raw';
  // import STEP_FILE_TEXT from "@/assets/step-files/assembly.step?raw"
  import swiftwasmurl from '../swift/.build/debug/swiftwasm.wasm?url';
  // import replwasmurl from '.build/debug/repl.wasm?url';
  import replwasmurl from '/home/ubu/coding/repos/vscode-js-debug/testWorkspace/viteHotreload/src/lib/test2.wasm?url';

  function intToArray(i) {
    return Uint8Array.of(
      (i&0x000000ff)>> 0,
      (i&0x0000ff00)>> 8,
      (i&0x00ff0000)>>16,
      (i&0xff000000)>>24,
    );
  }

  const main = async () => {
    // const buf = await readFile("../.build/wasm32-unknown-wasi/release/swiftwasm.wasm");
    const table = new WebAssembly.Table({ initial: 70000, element: "anyfunc" });
    const memory = new WebAssembly.Memory({ initial: 500 });
    let buf = await fetch(swiftwasmurl).then(response => response.arrayBuffer());
    const { wasi, instance, string, getMem } = await instantiateWASM(buf, {repl, memory,__indirect_function_table: table});

    buf = await fetch(replwasmurl).then(response => response.arrayBuffer());

    // instance.exports.memory.grow(500)
    // let table = instance.exports.__indirect_function_table.grow(13000)
    const replInstatiation = await instantiateWASM(buf, {repl, memory, __indirect_function_table: table, ...instance.exports, __memory_base: new WebAssembly.Global({ value: "i32", mutable: false }, 7_000_000)}, false);
    const repl_wasi = replInstatiation.wasi
    const repl_instance = replInstatiation.instance
    const repl_getMem = replInstatiation.getMem
    const repl_string = replInstatiation.string

    function repl(address){
      // let replmem = repl_getMem()
      // let mem = getMem()

      // repl_getMem().set(getMem())
      // repl_getMem().set(getMem().subarray(address), address)
      // repl_getMem().set(getMem().subarray(0, 1250000), 0)
      // repl_instance.exports.__stack_pointer.value = instance.exports.__stack_pointer.value
      let result = repl_instance.exports.repl(address)
      // let result = repl_instance.exports.malloc(10)
      // getMem().set(repl_getMem())
      console.log(repl_wasi.getStdoutString());
      console.error(repl_wasi.getStderrString());
      let i = 5
    }

    let exitCode = 'none';
    console.log('running');
    setTimeout(()=>{
        try {
            // foit(string("STEP_FILE_TEXT"))
            // repl_instance.exports.repl3(4)
            instance.exports.foit(3)
          // exitCode = wasi.start();
        } catch (e) {
          console.error(e);
        }

        let stdout = wasi.getStdoutString();
        let stderr = wasi.getStderrString();

        // This should print "hello world (exit code: 0)"
        console.log(`${stdout}`);
        console.log(`${stderr}(exit code: ${exitCode})`);
      }
    , 1000);
  };

  main();
</script>

hello
