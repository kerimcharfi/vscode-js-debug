import { exec } from 'child_process'
import * as path from 'path'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('Rebuilding Swift')

process.chdir(path.join(__dirname, 'src/lib/swift'))
exec(
  '/home/ubu/coding/tools/swift-wasm-DEVELOPMENT-SNAPSHOT-2023-06-03-a/usr/bin/swift build --triple wasm32-unknown-wasi -Xlinker --export=foit -Xlinker --export=malloc -Xlinker --global-base=1024 -Xlinker --import-table -Xlinker --import-memory -Xlinker --export-dynamic',
  (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`)
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`)
    }
    console.log(`stdout: ${stdout}`)
  },
)
// -Xlinker --export=repl -Xlinker --export=repl2

process.chdir(path.join(__dirname, 'src/lib/repl'))
exec(
  '/home/ubu/coding/tools/swift-wasm-DEVELOPMENT-SNAPSHOT-2023-06-03-a/usr/bin/swift build --triple wasm32-unknown-wasi -Xlinker --export=repl3 -Xlinker --export=malloc -Xlinker --global-base=6000000 -Xlinker --import-table -Xlinker --import-memory -Xlinker --export=__table_base  -Xlinker --table-base=35000',
  (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`)
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`)
    }
    console.log(`stdout: ${stdout}`)
  },
)
