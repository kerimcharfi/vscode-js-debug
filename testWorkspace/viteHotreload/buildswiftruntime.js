import { exec } from 'child_process'
import * as path from 'path'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('Rebuilding Swift')

process.chdir(path.join(__dirname, 'src/lib/repl'))
exec(
  '/home/ubu/coding/tools/swift-wasm-DEVELOPMENT-SNAPSHOT-2023-07-07-a/usr/bin/swift build -Xlinker --export=__global_base -Xlinker --export=__data_end  -Xlinker --export=__wasm_call_ctors -Xlinker --export=\\$sSR11baseAddressSPyxGSgvg -Xlinker --export=\\$sSce8ordinaryScexh_tcScfRzlufC -Xlinker --export=__heap_base -Xlinker --export=swift_get_time -Xlinker --export=\\$ss27_allocateUninitializedArrayySayxG_BptBwlFyp_Tg5 -Xlinker --no-gc-sections --disable-dead-strip --triple wasm32-unknown-wasi -Xlinker --export=__stack_pointer -Xlinker --export=malloc -Xlinker --export-if-defined=__start_swift5_typeref -Xlinker --export-if-defined=__stop_swift5_typeref -Xlinker --export-if-defined=__start_swift5_reflstr -Xlinker --export-if-defined=__stop_swift5_reflstr -Xlinker --export-if-defined=__start_swift5_mpenum -Xlinker --export-if-defined=__start_swift5_builtin -Xlinker --export-if-defined=__stop_swift5_builtin  -Xlinker --export-if-defined=__start_swift5_fieldmd -Xlinker --export-if-defined=__stop_swift5_fieldmd -Xlinker --export-if-defined=__start_swift5_capture -Xlinker --export-if-defined=__stop_swift5_capture  -Xlinker --export-if-defined=__start_swift5_assocty -Xlinker --export-if-defined=__stop_swift5_assocty -Xlinker --export-if-defined=__start_swift5_type_metadata -Xlinker --export-if-defined=__stop_swift5_type_metadata -Xlinker --export-if-defined=__start_swift5_protocol_conformances -Xlinker --export-if-defined=__stop_swift5_protocol_conformances -Xlinker --export-if-defined=__sstop_swift5_protocol_conformances -Xlinker --export-if-defined=__start_swift5_protocols -Xlinker --export-if-defined=__stop_swift5_protocols -Xlinker --export-if-defined=__stop_swift5_mpenum -Xlinker --global-base=12000000 -Xlinker --table-base=40000 -Xlinker --import-table -Xlinker --import-memory -Xlinker --export-dynamic -Xlinker -mllvm -Xlinker -debug -Xlinker --threads=1 &> build.log', //-Xlinker -mllvm -Xlinker -debug -Xlinker --threads=1 &> build.log
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
