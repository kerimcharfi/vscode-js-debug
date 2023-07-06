/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
import type Protocol from 'devtools-protocol/types/protocol';
import type ProtocolApi from 'devtools-protocol/types/protocol-proxy-api';
import { StackFrame } from '../../../adapter/stackTrace';
import {
  DebuggerDumpCommand,
  DebuggerWorkflowCommand,
  Variable
} from '../DebugCommand';
import { DebugSession } from '../DebugSession';
import { createWasmValueStore } from '../InterOp';

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
    _debugSession: DebugSession,
  ) {
    this.runtime = _runtime;
    this.debugSession = _debugSession;
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

  async listVariable(stackFrame: StackFrame, variableReference?: number) {
    const varlist = this.debugSession.getVariablelistFromAddress(stackFrame.callFrame.location.columnNumber!);

    if (!varlist) {
      return [];
    }

    const list: Variable[] = [];

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

    return list;
  }

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

  async dumpVariable(stackFrame: StackFrame, expr: string) {
    // const frame = this.stackFrames[this.selectedFrameIndex];

    if (!stackFrame.state) {
      if (!stackFrame.statePromise) {
        stackFrame.statePromise = this.createWasmValueStore(stackFrame.callFrame);
      }

      stackFrame.state = await stackFrame.statePromise;
    }

    const wasmVariable = this.debugSession.getVariableValue(
      expr,
      stackFrame.callFrame.location.columnNumber!,
      stackFrame.state,
    );

    // return wasmVariable

    if (!wasmVariable) {
      return;
    }

    let evaluationResult = wasmVariable.evaluate() || '<failure>';
    let limit = 0;
    let address = undefined;

    //while ((expr == "myint" || expr == "size" || expr == "anotherint" || wasmVariable.is_required_memory_slice()) && limit < 2) {
    while (wasmVariable.is_required_memory_slice() && limit < 20) {
      const slice = wasmVariable.required_memory_slice();
      address = slice.address
      const result = await this.memoryEvaluator.evaluate(
        stackFrame.callFrame.callFrameId,
        slice.address,
        slice.byte_size,
      );
      slice.set_memory_slice(new Uint8Array(result));

      evaluationResult = wasmVariable.resume_with_memory_slice(slice) || evaluationResult;

      if(evaluationResult == "Int(4)"){
        return evaluationResult
      }

      limit++;
    }

    return {
      evaluationResult,
      address

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


export function generateSwiftStackFrameCode2(vars){
  let args = []
  let pointerDeref = ""
  let variableDumps = ""

  for(const {name, type, value} of vars){
    if(!value.address) continue

    args.push(`__${name}_ptr: UnsafeMutableRawPointer`)

    pointerDeref = pointerDeref + `let ${name} = __${name}_ptr.assumingMemoryBound(to: ${type}.self).pointee\n  `

    variableDumps = variableDumps + `Variable(name: "${name}", type: "${type}", value: "\\(${name})"),\n    `
  }

  return `
  import mycode
  import imports
  import repl_runtime

  @_cdecl("repl")
  func repl(${args.join(", ")}) -> UnsafePointer<UInt8> {

    ${pointerDeref}
    let variables = [
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