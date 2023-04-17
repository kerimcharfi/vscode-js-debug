<script>
  import { instantiateWASM } from './wasm';

  import STEP_FILE_TEXT from '@/assets/step-files/basic_nobends.step?raw';
  // import STEP_FILE_TEXT from "@/assets/step-files/assembly.step?raw"
  import swiftwasmurl from '.build/debug/swiftwasm.wasm?url';

  const main = async () => {
    // const buf = await readFile("../.build/wasm32-unknown-wasi/release/swiftwasm.wasm");
    const buf = await fetch(swiftwasmurl).then(response => response.arrayBuffer());

    const { wasi, instance, string } = await instantiateWASM(buf, {});

    function foit(ptr) {
      instance.exports.foit(ptr);
    }

    let exitCode = 'none';
    console.log('running');
    try {
      foit(string(STEP_FILE_TEXT));
      exitCode = wasi.start();
    } catch (e) {
      console.error(e);
    }

    let stdout = wasi.getStdoutString();
    let stderr = wasi.getStderrString();

    // This should print "hello world (exit code: 0)"
    console.log(`${stdout}`);
    console.log(`${stderr}(exit code: ${exitCode})`);
  };

  main();
</script>

hello
