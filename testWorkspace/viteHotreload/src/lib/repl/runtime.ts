
import { instantiateWASM, init } from './wasm';
import runtimeurl from '/home/ubu/coding/repos/wasm-js-runtime/swift/runtime/.build/debug/__runtime.wasm?url';


const main = async () => {
    await init();
    const table = new WebAssembly.Table({ initial: 80000, element: 'anyfunc' });
    const memory = new WebAssembly.Memory({ initial: 500 });

    let buf = await fetch(runtimeurl).then(response => response.arrayBuffer());
    const runtimeInstantiation = await instantiateWASM(buf, {
        memory,
        __indirect_function_table: table,
    });

    table.set(69999, runtimeInstantiation.instance.exports['$sSJ9isNewlineSbvg']);
    table.set(69998, runtimeInstantiation.instance.exports['$sSR11baseAddressSPyxGSgvg']);
    table.set(
        69997,
        runtimeInstantiation.instance.exports['$sSp10initialize4from5countySPyxG_SitF'],
    );
    table.set(69996, runtimeInstantiation.instance.exports['$sSr11baseAddressSpyxGSgvg']);
    table.set(
        69995,
        runtimeInstantiation.instance.exports['$sSp14moveInitialize4from5countySpyxG_SitF'],
    );
    table.set(69994, runtimeInstantiation.instance.exports['swift_deletedMethodError']);
    table.set(69993, runtimeInstantiation.instance.exports['__cxa_pure_virtual']);

    runtimeInstantiation.instance.exports.__wasm_call_ctors();

    window.repl_wasi = runtimeInstantiation.wasi;
    window.repl_JsString = runtimeInstantiation.JsString;

    return {
        runtimeInstantiation,
        memory, 
        table
    }
};

export const runtimeInit = main();