/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
import { exec } from 'child_process';
import type Protocol from 'devtools-protocol/types/protocol';
import type ProtocolApi from 'devtools-protocol/types/protocol-proxy-api';
import { copyFileSync, rmSync, writeFileSync } from 'fs';
import { StackFrame } from '../../../adapter/stackTrace';
import Cdp from '../../../cdp/api';
import { getDeferred } from '../../../common/promiseUtil';
import {
  DebuggerDumpCommand,
  DebuggerWorkflowCommand,
  Variable
} from '../DebugCommand';
import { DebugSession } from '../DebugSession';
import { createWasmValueStore } from '../InterOp';
import { WebAssemblyFile } from '../Source';

class MemoryEvaluator {
  private debugger: ProtocolApi.DebuggerApi;

  private evaluationCache: Map<number, number[]>;
  private pendingEvaluations: Map<number, Promise<number[]>>;

  constructor(_debugger: ProtocolApi.DebuggerApi) {
    this.debugger = _debugger;

    this.evaluationCache = new Map();
    this.pendingEvaluations = new Map();
  }

  evaluate(
    callframeId: Protocol.Debugger.CallFrameId,
    address: number,
    size: number,
  ): Promise<number[]> {
    const cache = this.evaluationCache.get(address);

    if (cache && size <= cache.length) {
      return Promise.resolve(Object.values(cache).slice(0, size));
    }

    const pending = this.pendingEvaluations.get(address);

    if (pending) {
      return pending;
    }

    const evaluator = (async () => {
      const evalResult = await this.debugger.evaluateOnCallFrame({
        callFrameId: callframeId,
        expression: `new Uint8Array(memories[0].buffer).subarray(${address}, ${address + size})`,
        returnByValue: true,
      });

      const values = Object.values(evalResult.result.value) as number[];
      this.pendingEvaluations.delete(address);
      this.evaluationCache.set(address, values);

      return values;
    })();

    this.pendingEvaluations.set(address, evaluator);
    return evaluator;
  }
}

export class PausedDebugSessionState implements DebuggerWorkflowCommand, DebuggerDumpCommand {
  private runtime: ProtocolApi.RuntimeApi;
  private debugSession: DebugSession;
  private memoryEvaluator: MemoryEvaluator;

  private selectedFrameIndex = 0;

  constructor(
    _debugger: ProtocolApi.DebuggerApi,
    _runtime: ProtocolApi.RuntimeApi,
  ) {
    this.runtime = _runtime;
    this.memoryEvaluator = new MemoryEvaluator(_debugger);
  }

  // async showLine() {
  //   const frame = this.stackFrames[this.selectedFrameIndex];

  //   if (existsSync(frame.stack.file)) {
  //     const lines = readFileSync(frame.stack.file, { encoding: 'utf8' })
  //       .replace(/\t/g, '    ')
  //       .split('\n');
  //     const startLine = Math.max(0, frame.stack.line - 10);
  //     const endLine = Math.min(lines.length - 1, frame.stack.line + 10);

  //     for (let i = startLine; i <= endLine; i++) {
  //       console.error((i + 1 == frame.stack.line ? '->' : '  ') + ` ${i + 1}  ${lines[i]}`);
  //     }
  //   }
  // }

  // async listVariable(stackFrame: StackFrame, variableReference?: number) {
  //   const varlist = this.debugSession.getVariablelistFromAddress(stackFrame.callFrame.location.columnNumber!);

  //   if (!varlist) {
  //     return [];
  //   }

  //   const list: Variable[] = [];

  //   for (let i = 0; i < varlist.size(); i++) {
  //     const name = varlist.at_name(i);
  //     const displayName = varlist.at_display_name(i);
  //     const type = varlist.at_type_name(i);
  //     const groupId = varlist.at_group_id(i);
  //     const childGroupId = varlist.at_chile_group_id(i);

  //     if (!variableReference) {
  //       list.push({
  //         name,
  //         displayName,
  //         type,
  //         childGroupId,
  //       });
  //     } else if (variableReference == groupId) {
  //       list.push({
  //         name,
  //         displayName,
  //         type,
  //         childGroupId,
  //       });
  //     }
  //   }

  //   return list;
  // }

  async listGlobalVariable(variableReference?: number) {
    const frame = this.stackFrames[this.selectedFrameIndex];
    const varlists = this.debugSession.getGlobalVariablelist(frame.stack.instruction!);

    if (varlists.length <= 0) {
      return [];
    }

    const list: Variable[] = [];

    for (const varlist of varlists) {
      if (!varlist) {
        continue;
      }

      for (let i = 0; i < varlist.size(); i++) {
        const name = varlist.at_name(i);
        const displayName = varlist.at_display_name(i);
        const type = varlist.at_type_name(i);
        const groupId = varlist.at_group_id(i);
        const childGroupId = varlist.at_chile_group_id(i);

        if (!variableReference) {
          list.push({
            name,
            displayName,
            type,
            childGroupId,
          });
        } else if (variableReference == groupId) {
          list.push({
            name,
            displayName,
            type,
            childGroupId,
          });
        }
      }
    }

    return list;
  }

  async dumpVariable(stackFrame: StackFrame, variable, wasmFile: WebAssemblyFile) {
    // const frame = this.stackFrames[this.selectedFrameIndex];

    if (!stackFrame.state) {
      if (!stackFrame.statePromise) {
        stackFrame.statePromise = this.createWasmValueStore(stackFrame.callFrame);
      }

      stackFrame.state = await stackFrame.statePromise;
    }

    // const wasmVariable = this.debugSession.getVariableValue(
    //   expr,
    //   stackFrame.callFrame.location.columnNumber!,
    //   stackFrame.state,
    // );

    const wasmVariable = wasmFile.dwarf.get_variable_info(
      variable.displayName,
      stackFrame.state.locals,
      stackFrame.state.globals,
      stackFrame.state.stacks,
      stackFrame.callFrame.location.columnNumber // address,
    );

    // return wasmVariable

    if (!wasmVariable) {
      return;
    }

    // wasmVariable.evaluate()

    let limit = 0;
    // let address;

    let address = wasmVariable.address()

    address = parseInt(address.split(",")[0].substring(8))
    //while ((expr == "myint" || expr == "size" || expr == "anotherint" || wasmVariable.is_required_memory_slice()) && limit < 2) {
    // while (wasmVariable.is_required_memory_slice() && limit < 20) {
    //   const slice = wasmVariable.required_memory_slice();
    //   address = slice.address
    //   const result = await this.memoryEvaluator.evaluate(
    //     stackFrame.callFrame.callFrameId,
    //     slice.address,
    //     slice.byte_size,
    //   );
    //   slice.set_memory_slice(new Uint8Array(result));

    //   wasmVariable.resume_with_memory_slice(slice);

    //   limit++;
    // }

    let evaluationResult

    // TODO: this is a hacky way to get primitive constants from dwarf
    get_constants: if(!address){
      let mem = wasmVariable.memory()
      if(!mem?.length){
        break get_constants
      }

      if(variable.type == "UInt8"){
        evaluationResult = mem[0]
      } else
      if(variable.type == "Int8"){
        evaluationResult = new Int8Array(mem.buffer)[0]
      } else
      if(variable.type == "UInt16"){
        evaluationResult = new Uint16Array(mem.buffer)[0]
      } else
      if(variable.type == "Int16"){
        evaluationResult = new Int16Array(mem.buffer)[0]
      } else
      if(variable.type == "Int" || variable.type == "Int32"){
        evaluationResult = new Int32Array(mem.buffer)[0]
      } else
      if(variable.type == "UInt" || variable.type == "UInt32"){
        evaluationResult = new Uint32Array(mem.buffer)[0]
      } else
      if(variable.type == "Int64"){
        evaluationResult = new BigInt64Array(mem.buffer)[0]
      } else
      if(variable.type == "UInt64"){
        evaluationResult = new BigUint64Array(mem.buffer)[0]
      } else
      if(variable.type == "Float"){
        evaluationResult = new Float32Array(mem.buffer)[0]
      } else
      if(variable.type == "Double"){
        evaluationResult = new Float64Array(mem.buffer)[0]
      }
    }

    const isPrimitive = [
      "UInt8", "Int8", "UInt16", "Int16", "Int32", "UInt32", "Int", "UInt", "Int64", "UInt64", "Float", "Double", "Bool"
    ].find(el => el == variable.type)

    return {
      evaluationResult,
      address,
      isPrimitive
    };
  }

  private async createWasmValueStore(frame: Protocol.Debugger.CallFrame) {
    const getStackStore = async () => {
      let wasmStacks = (
        await this.runtime.getProperties({
          objectId: frame.scopeChain.filter(x => x.type == 'wasm-expression-stack')[0]?.object?.objectId,
        })
      ).result;

      // TODO: no longer needed for node v14.x?
      if (wasmStacks.length > 0 && wasmStacks[0].value!.objectId) {
        wasmStacks = (
          await this.runtime.getProperties({
            objectId: wasmStacks[0].value!.objectId!,
          })
        ).result;
      }

      return await createWasmValueStore(this.runtime, wasmStacks);
    };

    const getLocalsStore = async () => {
      let wasmLocalObject = (
        await this.runtime.getProperties({
          objectId: frame.scopeChain.filter(x => x.type == 'local')[0].object.objectId!,
        })
      ).result;

      // TODO: no longer needed for node v14.x?
      if (wasmLocalObject.length > 0 && wasmLocalObject[0].name == 'locals') {
        wasmLocalObject = (
          await this.runtime.getProperties({
            objectId: wasmLocalObject[0].value!.objectId!,
          })
        ).result;
      }

      return await createWasmValueStore(this.runtime, wasmLocalObject);
    };

    const getGlobalsStore = async () => {
      const wasmModuleObject = (
        await this.runtime.getProperties({
          objectId: frame.scopeChain.filter(x => x.type == 'module')[0].object.objectId!,
          // ownProperties: true
        })
      ).result;

      const wasmGlobalsObject = wasmModuleObject.filter(x => x.name == 'globals')[0];

      const wasmGlobals = (
        await this.runtime.getProperties({
          objectId: wasmGlobalsObject.value!.objectId!,
          // ownProperties: true
        })
      ).result;

      return await createWasmValueStore(this.runtime, wasmGlobals);
    };

    const [StacksStore, LocalsStore, GlobalsStore] = await Promise.all([
      getStackStore(),
      getLocalsStore(),
      getGlobalsStore(),
    ]);

    return {
      stacks: StacksStore,
      globals: GlobalsStore,
      locals: LocalsStore,
    };
  }
}

export function generateSwiftStackFrameCode(vars){
  let args = []
  let pointerDeref = ""
  let variableDumps = ""

  for(const {name, type, value} of vars){
    if(!value.address) continue

    args.push(`__${name}_ptr: UnsafeMutableRawPointer`)

    pointerDeref = pointerDeref + `let ${name} = __${name}_ptr.assumingMemoryBound(to: ${type}.self).pointee\n  `

    variableDumps = variableDumps + `print("--------${name}||${type}--------")\n  dump(${name}, maxDepth: 2)\n  `
  }

  return `import mycode
import imports

@_cdecl("repl")
func repl(${args.join(", ")}) {

  ${pointerDeref}
  ${variableDumps}
}`
}


export function generateSwiftStackFrameCode2(vars, importDecl){
  let args = []
  let pointerDeref = ""
  let variableDumps = ""

  for(let {name, type, address} of vars){
    if(!address) continue

    name = name.replace("<", "_").replace(">", "_").replace("-", "_")
    args.push(`__${name}_ptr: UnsafeMutableRawPointer`)

    pointerDeref = pointerDeref
      + `let ${name} = __${name}_ptr.assumingMemoryBound(to: ${type}.self).pointee\n  `
      + `var __${name}_value = String()\n  `
      + `let __${name}_mirror = Mirror(reflecting: ${name})\n  `
      + `dump(${name}, to: &__${name}_value, maxDepth: 1)\n  `

    // variableDumps = variableDumps + `Variable(name: "${name}", type: "${type}", value: "\\(${name})"),\n      `
    variableDumps = variableDumps
      + `VariableChild( name: "${name}", type: "${type}", value: __${name}_value, kind: __${name}_mirror.displayStyle != nil ? String(describing: __${name}_mirror.displayStyle!): "", countChildren: __${name}_mirror.children.count),\n      `
  }

  return `
  import runtime

  ${importDecl}

  @_cdecl("repl")
  func repl(${args.join(", ")}) -> UnsafeMutableRawPointer {

    ${pointerDeref}
    let variables: [VariableChild] = [
      ${variableDumps}
    ]

    return dump_variables(variables)
  }`
}

export function compileReplCode(fileName: string, outFileName: string, INCLUDE_DIRS: string){
  let deferred = getDeferred()
  // const swift = "/home/ubu/coding/tools/swift-wasm-DEVELOPMENT-SNAPSHOT-2023-06-03-a/usr/bin/swiftc"
  // const swift = "/home/ubu/coding/tools/swift-wasm-DEVELOPMENT-SNAPSHOT-2023-08-17-a-no-runtime/usr/bin/swiftc"
  const swift = "/home/ubu/coding/tools/swift-wasm-DEVELOPMENT-SNAPSHOT-2023-08-22-b/usr/bin/swiftc"
  const log_repl_build = false
  const repl_build_log = log_repl_build ? "-Xlinker -mllvm -Xlinker -debug -Xlinker --threads=1 &> ${fileName}_build.log" : ""
  exec(
    `${swift} -target wasm32-unknown-wasi ${fileName} -o ${outFileName} ${INCLUDE_DIRS} -Onone -suppress-warnings -Xfrontend -disable-access-control -Xlinker --experimental-pic -Xlinker --global-base=30000000 -Xlinker --import-table -Xlinker --import-memory -Xlinker --export=__wasm_call_ctors -Xlinker --export=__table_base -Xlinker --export=__stack_pointer -Xlinker --export=__data_end -Xlinker --export=repl -Xlinker --table-base=60000 -Xlinker --unresolved-symbols=import-dynamic -emit-module -emit-executable -Xlinker --export-dynamic -Xlinker -z -Xlinker stack-size=512000 ${repl_build_log}`,
    (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`)
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`)
      }
      if(stdout) {
        console.log(`stdout: ${stdout}`)
      }
      deferred.resolve(error)
    },
  )

  return deferred.promise
}

let currentEvaluation = Promise.resolve(undefined)

export async function evaluateRepl(replWasmB64: string, args: string, cdp: Cdp.Api, callFrameId?: string, fileId){
  console.time("evaluateOnCallFrame")
  console.log("evaluating with args: ", args)
  const expression = `
  //let result = "[]"
  console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<< evaluate ${args}")
  try{
    const wasmB64 = '${replWasmB64}'
    let buf = window.base64ToArrayBuffer(wasmB64)
    const {instance, JsString} = window.instatiateRepl(buf)

    let ptr = instance.exports.repl(${args})
    // const stdout = window.repl_wasi.getStdoutString()
    // if(stdout)
    //   console.log(stdout);
    // const stderr = window.repl_wasi.getStderrString();
    // if(stderr)
    //   console.error(stderr);
    let result = JsString(ptr)
    //let result = JSON.parse(resultStr)
    //console.log(result)
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>> evaluate ${args} done")
    result
  } catch (e) {
    console.error(e)
    let result = "[]"
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>> evaluate ${args} done")
    result
  }
`

  writeFileSync(`.repl/repl_temp${fileId}.js`, expression)

  currentEvaluation = currentEvaluation.then(
    ()=>{
      if(callFrameId){
        return cdp.Debugger.evaluateOnCallFrame({
          callFrameId,
          expression,
          returnByValue: true,
        });
      } else {
        return cdp.Runtime.evaluate({
          expression,
          returnByValue: true,
        });
      }
    }
  )

  let replExecution  = await currentEvaluation

  let evalResult = replExecution?.result?.value;

  console.log("done")

  console.timeEnd("evaluateOnCallFrame")
  return evalResult
}

let __file_id = 0

export const getReplFileId = ()=>{return __file_id++}

export function clearReplBuild(file: string){
  copyFileSync(`${file}.swift`, ".repl/repl.swift")
  rmSync(`${file}.swift`)
  copyFileSync(`${file}.wasm`, ".repl/repl.wasm")
  rmSync(`${file}.wasm`)
  copyFileSync(`${file}.swiftdoc`, ".repl/repl.swiftdoc")
  rmSync(`${file}.swiftdoc`)
  copyFileSync(`${file}.swiftmodule`, ".repl/repl.swiftmodule")
  rmSync(`${file}.swiftmodule`)
  copyFileSync(`${file}.swiftsourceinfo`, ".repl/repl.swiftsourceinfo")
  rmSync(`${file}.swiftsourceinfo`)
}

export function generateSwiftChildrenDumpCode(vars, importDecl, params){
  let args = []
  let pointerDeref = ""
  let variableDumps = ""

  for(let {context, type, address, kind, countChildren, keyPath, keyPathRoot, keyPathDepth} of vars){

    let name = context.name.replace("<", "_").replace(">", "_").replace("-", "_").replace(".", "")
    const isOptional = type.startsWith("Optional<")
    const parentIsOptional = context.parent?.type?.startsWith("Optional<")

    if(address){
      args.push(`__${name}_ptr: UnsafeMutableRawPointer?`)

      pointerDeref = pointerDeref + `var _${name} = __${name}_ptr!.assumingMemoryBound(to: ${type}.self).pointee\n  `
    } else if (context.parent?.address && name && context.parent.kind != "dictionary" && context.parent.kind != "set") {
      args.push(`__${name}_parent_ptr: UnsafeMutableRawPointer`)

      let targetExpr = `__${name}_parent_ptr.assumingMemoryBound(to: ${context.parent.type}.self).pointee${parentIsOptional ? '!' : ''}${keyPath}`
      pointerDeref = pointerDeref
                          + `var _${name}_parent = __${name}_parent_ptr.assumingMemoryBound(to: ${context.parent.type}.self).pointee\n    `
                          + `var _${name} = ${targetExpr}\n    `
                          + `let __${name}_ptr: UnsafePointer<Int>? = Optional.none\n  `
                          // + `let __${name}_ptr = Optional.some(withUnsafePointer(to: &${targetExpr}){\n      ptr in ptr\n    })\n  `

    } else if (keyPathRoot && keyPath){
      args.push(`__${name}_root_ptr: UnsafeMutableRawPointer`)
      let prefix = "(".repeat(keyPathDepth)
      pointerDeref = pointerDeref
        + `var _${name}_root = __${name}_root_ptr.assumingMemoryBound(to: ${keyPathRoot.type}.self).pointee\n    `
        + `var _${name} = ${prefix}_${name}_root${keyPath}\n    `
        + `let __${name}_ptr: UnsafePointer<Int>? = Optional.none\n  `
    } else {
      console.error("variable has no address nor parent")
    }

    // variableDumps = variableDumps + `Variable(name: "${name}", type: "${type}", value: "\\(${name})"),\n      `

    if(kind == 'enum'){
      variableDumps = variableDumps + `Variable(children: [dumpVariable(_${name}.rawValue, "rawValue")], address: 0),\n      `
    } else {
      variableDumps = variableDumps + `dumpVariablesChildren(&_${name}, __${name}_ptr != nil ? Int(bitPattern:__${name}_ptr!) : 0, ${params.start ?? 0}, ${params.count ?? 99}),\n      `
    }
  }

  return `
  import runtime

  ${importDecl}

  extension Dictionary where Key : Hashable{
    public func elAt(_ position: Int) -> Element {
      return self[self.index(self.startIndex, offsetBy: position)]
    }
  }

  extension Set where Element : Hashable{
    public func elAt(_ position: Int) -> Element {
      return self[self.index(self.startIndex, offsetBy: position)]
    }
  }

  // func dumpVariablesChildren<V>(_ obj: inout Set<V>, _ address: Int, _ start: Int, _ count: Int) -> Variable {
  //   var result = Variable(
  //     children: [],
  //     address: address
  //   )

  //   for (i, el) in obj.enumerated() {
  //       if i < start {
  //         continue
  //       }
  //       if i >= start + count {
  //         break
  //       }

  //     //  result.children.append(dumpVariable(el, "\\(i),\\(index),\\(keyAddress),\\(valueAddress)"))
  //      result.children.append(dumpVariable(el, String(i)))
  //   }

  //   return result
  // }

  func dumpVariablesChildren<T>(_ obj: inout T, _ address: Int, _ start: Int, _ count: Int) -> Variable {
    let mirror = Mirror(reflecting: obj)

    var result = Variable(
      children: [],
      address: address
    )

    for (i, child) in mirror.children.enumerated() {
      if i < start {
        continue
      }
      if i >= start + count {
        break
      }
      let accessor = child.label ?? String(i)

      result.children.append(dumpVariable(child.value, accessor))
    }

    return result
  }

  func dumpVariable<T>(_ child: T, _ name: String) -> VariableChild{
      let childMirror = Mirror(reflecting: child)
      return VariableChild(
          name: name,
          type: "\\(childMirror.subjectType)",
          value: "\\(child)",
          kind: childMirror.displayStyle != nil ? String(describing: childMirror.displayStyle!): "",
          countChildren: childMirror.children.count
      )
  }

  @_cdecl("repl")
  func repl(${args.join(", ")}) -> UnsafeMutableRawPointer {

    ${pointerDeref}
    let variables: [Variable] = [
      ${variableDumps}
    ]

    return dump_variables(variables)
  }`
}


export function generateSwiftStackFrameCode3(vars){
  let args = []
  let pointerDeref = ""
  let variableDumps = ""

  for(const {name, type, value} of vars){
    if(!value.address) continue

    args.push(`__${name}_ptr: UnsafeMutableRawPointer`)

    pointerDeref = pointerDeref + `let ${name} = __${name}_ptr.assumingMemoryBound(to: ${type}.self).pointee\n  `

    variableDumps = variableDumps + `Variable(name: "${name}", type: "${type}", value: "\(${name})"),\n    `
  }

  return `import mycode
import imports
import Foundation

struct Variable: Codable{
  var name: String
  var type: String
  var value: String
}

@_cdecl("repl")
func repl(${args.join(", ")}) {

  ${pointerDeref}
  let variables = [
    ${variableDumps}
  ]

  let encoder = JSONEncoder()
  encoder.outputFormatting = JSONEncoder.OutputFormatting.prettyPrinted
  let encodedData = try! encoder.encode(variables)
  let jsonString = String(data: encodedData, encoding: .utf8)
  print(jsonString!)
}`
}