/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
import { BreakpointEvent, ContinuedEvent, StoppedEvent } from '@vscode/debugadapter';
import type Protocol from 'devtools-protocol/types/protocol';
import type ProtocolApi from 'devtools-protocol/types/protocol-proxy-api';
import { DwarfDebugSymbolContainer } from '../pkg';
import { DebugAdapter } from './DebugAdapterInterface';
import {
  DebuggerCommand,
  DebuggerDumpCommand,
  DebuggerWorkflowCommand,
  FileLocation,
  IBreakPoint,
  RuntimeBreakPoint,
  RuntimeStackFrame,
  WebAssemblyDebugState,
} from './DebugCommand';
import { PausedDebugSessionState } from './DebugSessionState/PausedDebugSessionState';
import { RunningDebugSessionState } from './DebugSessionState/RunningDebugSessionState';
import { WebAssemblyFile } from './Source';

export class DebugSession {
  sources: WebAssemblyFile[];

  constructor() {
    this.sources = [];
  }

  reset() {
    for (const item of this.sources) {
      item.free();
    }

    this.sources = [];
  }

  loadedWebAssembly(wasm: WebAssemblyFile) {
    this.sources.push(wasm);
  }

  findFileFromLocation(loc: Protocol.Debugger.Location) {
    return this.sources.filter(x => x.scriptID == loc.scriptId)[0]?.findFileFromLocation(loc);
  }

  findAddressFromFileLocation(file: string, line: number) {
    for (const x of this.sources) {
      const address = x.findAddressFromFileLocation(file, line);

      if (address) {
        return {
          scriptId: x.scriptID,
          line: 0,
          column: address,
        };
      }
    }

    return undefined;
  }

  getVariablelistFromAddress(address: number) {
    for (const x of this.sources) {
      const list = x.dwarf.variable_name_list(address);

      if (list && list.size() > 0) {
        return list;
      }
    }

    return undefined;
  }

  getGlobalVariablelist(inst: number) {
    const list = [];

    for (const x of this.sources) {
      list.push(x.dwarf.global_variable_name_list(inst));
    }

    return list;
  }

  getVariableValue(expr: string, address: number, state: WebAssemblyDebugState) {
    for (const x of this.sources) {
      const info = x.dwarf.get_variable_info(
        expr,
        state.locals,
        state.globals,
        state.stacks,
        address,
      );

      if (info) {
        return info;
      }
    }

    return undefined;
  }
}

export class DebugSessionManager implements DebuggerCommand {
  private session?: DebugSession;
  private debugger?: ProtocolApi.DebuggerApi;
  private page?: ProtocolApi.PageApi;
  private runtime?: ProtocolApi.RuntimeApi;
  private debugAdapter: DebugAdapter;

  private breakPoints: RuntimeBreakPoint[] = [];

  private readonly DummyThreadID = 1;

  private sessionState: DebuggerWorkflowCommand & DebuggerDumpCommand;
  private scriptParsed?: Promise<void>;

  private steppingOver = false;
  private steppingIn = false;

  constructor(_debugAdapter: DebugAdapter) {
    this.debugAdapter = _debugAdapter;

    this.sessionState = new RunningDebugSessionState();
  }


  async getStackFrames() {
    return await this.sessionState.getStackFrames();
  }

  async setFocusedFrame(index: number) {
    await this.sessionState.setFocusedFrame(index);
  }

  async showLine() {
    await this.sessionState.showLine();
  }

  async listVariable(variableReference?: number) {
    return await this.sessionState.listVariable(variableReference);
  }

  async listGlobalVariable(variableReference?: number) {
    return await this.sessionState.listGlobalVariable(variableReference);
  }

  async dumpVariable(expr: string) {
    return await this.sessionState.dumpVariable(expr);
  }

  async setBreakPoint(location: FileLocation): Promise<IBreakPoint> {
    const debugline = location.line;
    const debugfilename = location.file;
    const bpID =
      this.breakPoints.length > 0
        ? Math.max.apply(
            null,
            this.breakPoints.map(x => x.id!),
          ) + 1
        : 1;

    const bpInfo = {
      id: bpID,
      file: debugfilename,
      line: debugline,
      verified: false,
    };

    this.breakPoints.push(bpInfo);

    await this.updateBreakPoint();

    return bpInfo;
  }

  async updateBreakPoint() {
    const promises = this.breakPoints
      .filter(x => !x.verified)
      .map(async bpInfo => {
        if (!this.session) {
          return bpInfo;
        }

        const wasmLocation = this.session.findAddressFromFileLocation(bpInfo.file, bpInfo.line);

        if (!wasmLocation) {
          console.error('cannot find address of specified file');
          return bpInfo;
        }

        const wasmDebuggerLocation = {
          scriptId: wasmLocation.scriptId,
          lineNumber: wasmLocation.line,
          columnNumber: wasmLocation.column,
        };

        console.error(`update breakpoint ${bpInfo.file}:${bpInfo.line} -> ${wasmLocation.column}`);

        const bp = await this.debugger!.setBreakpoint({
          location: wasmDebuggerLocation,
        }).catch(e => {
          console.error(e);
          return null;
        });

        if (bp) {
          const correspondingLocation = this.session.findFileFromLocation(wasmDebuggerLocation)!;

          bpInfo.file = correspondingLocation.file();
          bpInfo.line = correspondingLocation.line!;
          bpInfo.rawId = bp.breakpointId;
          bpInfo.verified = true;
        }

        return bpInfo;
      });

    const bps = await Promise.all(promises);
    bps
      .filter(x => x.verified)
      .forEach(x => {
        this.debugAdapter.sendEvent(new BreakpointEvent('changed', x));
      });
  }

  async removeBreakPoint(id: number) {
    const promises = this.breakPoints
      .filter(x => x.id == id)
      .filter(x => !!x.rawId)
      .map(async x => {
        await this.debugger?.removeBreakpoint({
          breakpointId: x.rawId!,
        });
      });

    this.breakPoints = this.breakPoints.filter(x => x.id != id);
    await Promise.all(promises);
  }

  async removeAllBreakPoints(path: string) {
    const promises = this.breakPoints
      .filter(x => x.file == path)
      .filter(x => !!x.rawId)
      .map(async x => {
        await this.debugger?.removeBreakpoint({
          breakpointId: x.rawId!,
        });
      });

    this.breakPoints = this.breakPoints.filter(x => x.file != path);
    await Promise.all(promises);
  }

  getBreakPointsList(location: string): Promise<IBreakPoint[]> {
    const fileInfo = location.split(':');

    if (fileInfo.length < 2) {
      return Promise.resolve([]);
    }

    const debugfilename = fileInfo[0];
    const debugline = Number(fileInfo[1]);

    return Promise.resolve(
      this.breakPoints
        .filter(x => {
          return x.file == debugfilename && x.line == debugline;
        })
        .map(x => {
          return {
            ...x,
            verified: true,
          };
        }),
    );
  }

  async jumpToPage(url: string) {
    await this.page?.navigate({
      url,
    });
  }

  private onScriptLoaded(e: Protocol.Debugger.ScriptParsedEvent) {
    if (e.scriptLanguage == 'WebAssembly') {
      console.error(`Start Loading ${e.url}...`);

      this.scriptParsed = (async () => {
        const response = await this.debugger!.getScriptSource({ scriptId: e.scriptId });
        const buffer = Buffer.from(response?.bytecode || '', 'base64');

        const container = DwarfDebugSymbolContainer.new(new Uint8Array(buffer));
        this.session!.loadedWebAssembly(new WebAssemblyFile(e.scriptId, container));

        console.error(`Finish Loading ${e.url}`);

        await this.updateBreakPoint();
      })();
    }
  }

  private lastPausedLocation?: RuntimeStackFrame;

  private async onPaused(e: Protocol.Debugger.PausedEvent) {
    if (e.reason.startsWith('Break on start')) {
      await this.debugger?.resume({});
      return;
    } else if (e.reason == 'instrumentation') {
      console.error('Instrumentation BreakPoint');
      if (this.scriptParsed) {
        console.error('awaiting scriptParsed...');
        await this.scriptParsed;
      }
      await this.debugger?.resume({});
      return;
    }

    console.error('Hit BreakPoint');

    const stackFrames = e.callFrames.map((v, i) => {
      const dwarfLocation = this.session!.findFileFromLocation(v.location);

      return {
        frame: v,
        stack: {
          index: i,
          name: v.functionName,
          instruction: v.location.columnNumber,
          file: dwarfLocation?.file() || v.url,
          line: dwarfLocation?.line || v.location.lineNumber,
        },
      };
    });

    if (
      (this.steppingOver || this.steppingIn) &&
      this.lastPausedLocation?.stack.file == stackFrames[0].stack.file &&
      this.lastPausedLocation?.stack.line == stackFrames[0].stack.line
    ) {
      if (this.steppingOver) {
        void this.debugger?.stepOver({});
      } else {
        void this.debugger?.stepInto({});
      }
    } else {
      this.steppingOver = false;
      this.steppingIn = false;
      this.lastPausedLocation = stackFrames[0];

      this.sessionState = new PausedDebugSessionState(
        this.debugger!,
        this.runtime!,
        this.session!,
        stackFrames,
      );
      this.debugAdapter.sendEvent(new StoppedEvent('BreakPointMapping', this.DummyThreadID));
    }
  }

  private onResumed() {
    this.sessionState = new RunningDebugSessionState();
    this.debugAdapter.sendEvent(new ContinuedEvent(this.DummyThreadID));
  }

  private onLoad() {
    console.error('Page navigated.');
    this.breakPoints.forEach(x => (x.verified = false));
    this.session!.reset();
  }
}
