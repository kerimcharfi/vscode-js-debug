import { exec } from 'child_process'
import * as path from 'path'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('Rebuilding Swift')

process.chdir(path.join(__dirname, 'src/lib/swift'))
exec(
  '/home/ubu/coding/tools/swift-wasm-DEVELOPMENT-SNAPSHOT-2023-06-03-a/usr/bin/swift build --triple wasm32-unknown-wasi -Xlinker --export=foit -Xlinker --global-base=1024 -Xlinker --import-table -Xlinker --import-memory -Xlinker --export-dynamic -Xlinker --unresolved-symbols=import-dynamic',
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
  '/home/ubu/coding/tools/swift-wasm-DEVELOPMENT-SNAPSHOT-2023-06-25-a/usr/bin/swift build --triple wasm32-unknown-wasi -Xlinker --export=__stack_pointer -Xlinker --export=malloc -Xlinker --export-if-defined=__start_swift5_typeref -Xlinker --export-if-defined=__stop_swift5_typeref -Xlinker --export-if-defined=__start_swift5_reflstr -Xlinker --export-if-defined=__stop_swift5_reflstr -Xlinker --export-if-defined=__start_swift5_mpenum -Xlinker --export-if-defined=__start_swift5_builtin -Xlinker --export-if-defined=__stop_swift5_builtin  -Xlinker --export-if-defined=__start_swift5_fieldmd -Xlinker --export-if-defined=__stop_swift5_fieldmd -Xlinker --export-if-defined=__start_swift5_capture -Xlinker --export-if-defined=__stop_swift5_capture  -Xlinker --export-if-defined=__start_swift5_assocty -Xlinker --export-if-defined=__stop_swift5_assocty -Xlinker --export-if-defined=__start_swift5_type_metadata -Xlinker --export-if-defined=__stop_swift5_type_metadata -Xlinker --export-if-defined=__start_swift5_protocol_conformances -Xlinker --export-if-defined=__stop_swift5_protocol_conformances -Xlinker --export-if-defined=__sstop_swift5_protocol_conformances -Xlinker --export-if-defined=__start_swift5_protocols -Xlinker --export-if-defined=__stop_swift5_protocols -Xlinker --export-if-defined=__stop_swift5_mpenum -Xlinker --global-base=8000000 -Xlinker --table-base=40000 -Xlinker --import-table -Xlinker --import-memory -Xlinker --export-dynamic',
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
