import { exec } from "child_process";

console.log("Rebuilding Swift")
process.chdir("./src/lib/swift")

exec("swift build --triple wasm32-unknown-wasi -Xlinker --export=foit -Xlinker --export=malloc", (error, stdout, stderr) => {
    if (error) {
        console.log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
});