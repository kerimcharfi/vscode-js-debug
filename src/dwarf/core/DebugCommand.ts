/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
import type Protocol from 'devtools-protocol/types/protocol';
import { WasmValueVector } from '../pkg';

export interface Variable {
  name: string;
  displayName: string;
  type: string;
  childGroupId?: number;
}

export interface IBreakPoint {
  id?: number;
  line?: number;
  column?: number;
  verified: boolean;
}

export interface BreakPointMapping {
  id?: number;
  rawId?: string;
  verified: boolean;
}

export type RuntimeBreakPoint = BreakPointMapping & FileLocation;

export interface StackFrameFunction {
  index: number;
  name: string;
  instruction?: number;
}

export interface FileLocation {
  file: string;
  line: number;
  column?: number;
}

export type IRuntimeStackFrame = StackFrameFunction & FileLocation;

export interface WebAssemblyDebugState {
  stacks: WasmValueVector;
  locals: WasmValueVector;
  globals: WasmValueVector;
}

export interface RuntimeStackFrame {
  locals: any[];
  frame: Protocol.Debugger.CallFrame;
  stack: IRuntimeStackFrame;
  state?: WebAssemblyDebugState;
  statePromise?: Promise<WebAssemblyDebugState>;
}

export interface DebuggerDumpCommand {
  showLine(): Promise<void>;
  getStackFrames(): Promise<IRuntimeStackFrame[]>;
  setFocusedFrame(index: number): Promise<void>;
  listVariable(variableReference?: number): Promise<Variable[]>;
  listGlobalVariable(variableReference?: number): Promise<Variable[]>;
  dumpVariable(expr: string): Promise<string | undefined>;
}

export interface DebuggerWorkflowCommand {
  stepOver(): Promise<void>;
  stepIn(): Promise<void>;
  stepOut(): Promise<void>;
  continue(): Promise<void>;
}

export interface DebuggerOtherCommand {
  setBreakPoint(location: FileLocation): Promise<IBreakPoint>;
  removeBreakPoint(id: number): Promise<void>;
  removeAllBreakPoints(path: string): Promise<void>;
  getBreakPointsList(location: string): Promise<IBreakPoint[]>;
  jumpToPage(url: string): Promise<void>;
}

export type DebuggerCommand = DebuggerWorkflowCommand & DebuggerDumpCommand & DebuggerOtherCommand;
