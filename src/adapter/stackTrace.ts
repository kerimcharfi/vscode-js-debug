/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as l10n from '@vscode/l10n';
import Cdp from '../cdp/api';
import { once, posInt32Counter, truthy } from '../common/objUtils';
import { Base0Position } from '../common/positions';
import { SourceConstants } from '../common/sourceUtils';
import Dap from '../dap/api';
import { asyncScopesNotAvailable } from '../dap/errors';
import { ProtocolError } from '../dap/protocolError';
import { StackFrameStepOverReason, shouldStepOverStackFrame } from './smartStepping';
import { IPreferredUiLocation, ScriptLocation } from './sources';
import { Thread } from './threads';
import { IExtraProperty, IScopeRef, IVariableContainer } from './variableStore';

export interface IFrameElement {
  /** DAP stack frame ID */
  frameId: number;
  /** Formats the stack element as V8 would format it */
  formatAsNative(): Promise<string>;
  /** Pretty formats the stack element as text */
  format(): Promise<string>;
  /** Formats the element for DAP */
  toDap(format?: Dap.StackFrameFormat): Promise<Dap.StackFrame>;
}

type FrameElement = StackFrame | AsyncSeparator;

export class StackTrace {
  public readonly frames: FrameElement[] = [];
  private _frameById: Map<number, StackFrame> = new Map();
  private _asyncStackTraceId?: Cdp.Runtime.StackTraceId;
  private _lastFrameThread?: Thread;

  public static fromRuntime(thread: Thread, stack: Cdp.Runtime.StackTrace): StackTrace {
    const result = new StackTrace(thread);
    for (const frame of stack.callFrames) {
      if (!frame.url.endsWith(SourceConstants.InternalExtension)) {
        result.frames.push(StackFrame.fromRuntime(thread, frame, false));
      }
    }

    if (stack.parentId) {
      result._asyncStackTraceId = stack.parentId;
      console.assert(!stack.parent);
    } else {
      result._appendStackTrace(thread, stack.parent);
    }

    return result;
  }

  public static async fromRuntimeWithPredicate(
    thread: Thread,
    stack: Cdp.Runtime.StackTrace,
    predicate: (frame: StackFrame) => Promise<boolean>,
    frameLimit = Infinity,
  ): Promise<StackTrace> {
    const result = new StackTrace(thread);
    for (let frameNo = 0; frameNo < stack.callFrames.length && frameLimit > 0; frameNo++) {
      if (!stack.callFrames[frameNo].url.endsWith(SourceConstants.InternalExtension)) {
        const frame = StackFrame.fromRuntime(thread, stack.callFrames[frameNo], false);
        if (await predicate(frame)) {
          result.frames.push();
          frameLimit--;
        }
      }
    }

    if (stack.parentId) {
      result._asyncStackTraceId = stack.parentId;
      console.assert(!stack.parent);
    } else {
      result._appendStackTrace(thread, stack.parent);
    }

    return result;
  }

  public static fromDebugger(
    thread: Thread,
    frames: Cdp.Debugger.CallFrame[],
    parent?: Cdp.Runtime.StackTrace,
    parentId?: Cdp.Runtime.StackTraceId,
  ): StackTrace {
    const result = new StackTrace(thread);
    for (const callFrame of frames) result._appendFrame(StackFrame.fromDebugger(thread, callFrame));
    if (parentId) {
      result._asyncStackTraceId = parentId;
      console.assert(!parent);
    } else {
      result._appendStackTrace(thread, parent);
    }
    return result;
  }

  constructor(thread: Thread) {
    this._lastFrameThread = thread;
  }

  async loadFrames(limit: number, noFuncEval?: boolean): Promise<FrameElement[]> {
    while (this.frames.length < limit && this._asyncStackTraceId) {
      if (this._asyncStackTraceId.debuggerId)
        this._lastFrameThread = Thread.threadForDebuggerId(this._asyncStackTraceId.debuggerId);
      if (!this._lastFrameThread) {
        this._asyncStackTraceId = undefined;
        break;
      }
      if (noFuncEval)
        this._lastFrameThread
          .cdp
          .DotnetDebugger.setEvaluationOptions({ options: { noFuncEval }, type: 'stackFrame' });

      const response = await this._lastFrameThread
        .cdp
        .Debugger.getStackTrace({ stackTraceId: this._asyncStackTraceId });
      this._asyncStackTraceId = undefined;
      if (response) this._appendStackTrace(this._lastFrameThread, response.stackTrace);
    }
    return this.frames;
  }

  frame(frameId: number): StackFrame | undefined {
    return this._frameById.get(frameId);
  }

  _appendStackTrace(thread: Thread, stackTrace: Cdp.Runtime.StackTrace | undefined) {
    console.assert(!stackTrace || !this._asyncStackTraceId);

    while (stackTrace) {
      if (stackTrace.description === 'async function' && stackTrace.callFrames.length)
        stackTrace.callFrames.shift();

      if (stackTrace.callFrames.length) {
        this._appendFrame(new AsyncSeparator(stackTrace.description || 'async'));
        for (const callFrame of stackTrace.callFrames) {
          this._appendFrame(StackFrame.fromRuntime(thread, callFrame, true));
        }
      }

      if (stackTrace.parentId) {
        this._asyncStackTraceId = stackTrace.parentId;
        console.assert(!stackTrace.parent);
      }

      stackTrace = stackTrace.parent;
    }
  }

  _appendFrame(frame: FrameElement) {
    this.frames.push(frame);
    if (frame instanceof StackFrame) {
      this._frameById.set(frame.frameId, frame);
    }
  }

  async formatAsNative(): Promise<string> {
    return await this.formatWithMapper(frame => frame.formatAsNative());
  }

  async format(): Promise<string> {
    return await this.formatWithMapper(frame => frame.format());
  }

  private async formatWithMapper(
    mapper: (frame: FrameElement) => Promise<string>,
  ): Promise<string> {
    let stackFrames = await this.loadFrames(50);
    // REPL may call back into itself; slice at the highest REPL eval in the call chain.
    for (let i = stackFrames.length - 1; i >= 0; i--) {
      const frame = stackFrames[i];
      if (frame instanceof StackFrame && frame.isReplEval) {
        stackFrames = stackFrames.slice(0, i + 1);
        break;
      }
    }
    const promises = stackFrames.map(mapper);
    return (await Promise.all(promises)).join('\n') + '\n';
  }

  async toDap(params: Dap.StackTraceParamsExtended): Promise<Dap.StackTraceResult> {
    const from = params.startFrame || 0;
    let to = (params.levels || 50) + from;
    const frames = await this.loadFrames(to, params.noFuncEval);
    to = Math.min(frames.length, params.levels ? to : frames.length);

    const result: Promise<Dap.StackFrame>[] = [];
    for (let index = from; index < to; index++) {
      result.push(frames[index].toDap(params.format));
    }

    return {
      stackFrames: await Promise.all(result),
      totalFrames: !!this._asyncStackTraceId ? 1000000 : frames.length,
    };
  }
}

interface IScope {
  chain: Cdp.Debugger.Scope[];
  thisObject: Cdp.Runtime.RemoteObject;
  returnValue?: Cdp.Runtime.RemoteObject;
  variables: (IVariableContainer | undefined)[];
  callFrameId: string;
}

const frameIdCounter = posInt32Counter();

export class AsyncSeparator implements IFrameElement {
  public readonly frameId = frameIdCounter();

  constructor(private readonly label = 'async') {}

  public async toDap(): Promise<Dap.StackFrame> {
    return { name: this.label, id: 0, line: 0, column: 0, presentationHint: 'label' };
  }

  public async formatAsNative(): Promise<string> {
    return `    --- ${this.label} ---`;
  }

  public async format(): Promise<string> {
    return `◀ ${this.label} ▶`;
  }
}

export class StackFrame implements IFrameElement {
  public readonly frameId = frameIdCounter();

  private _name: string;
  private _scriptLocation: ScriptLocation;
  public readonly uiLocation: () =>
    | Promise<IPreferredUiLocation | undefined>
    | IPreferredUiLocation
    | undefined;
  private _scope: IScope | undefined;
  private _thread: Thread;
  public readonly isReplEval: boolean;

  public get rawPosition() {
    // todo: move ScriptLocation to use Positions, then just return that.
    return new Base0Position(this._scriptLocation.lineNumber, this._scriptLocation.columnNumber);
  }

  static fromRuntime(
    thread: Thread,
    callFrame: Cdp.Runtime.CallFrame,
    isAsync: boolean,
  ): StackFrame {
    return new StackFrame(thread, callFrame, thread.scriptLocation(callFrame), isAsync);
  }

  static fromDebugger(thread: Thread, callFrame: Cdp.Debugger.CallFrame): StackFrame {
    const result = new StackFrame(thread, callFrame, thread.scriptLocation(callFrame));
    result._scope = {
      chain: callFrame.scopeChain,
      thisObject: callFrame.this,
      returnValue: callFrame.returnValue,
      variables: new Array(callFrame.scopeChain.length).fill(undefined),
      // eslint-disable-next-line
      callFrameId: callFrame.callFrameId!,
    };
    return result;
  }

  constructor(
    thread: Thread,
    public readonly callFrame: Cdp.Debugger.CallFrame | Cdp.Runtime.CallFrame,
    scriptLocation: ScriptLocation,
    private readonly isAsync = false,
  ) {
    this._name = callFrame.functionName || '<anonymous>';
    this._scriptLocation = scriptLocation;
    this.uiLocation = once(() => thread.scriptLocationToUiLocation(scriptLocation));
    this._thread = thread;
    this.isReplEval = scriptLocation.script?.url.endsWith(SourceConstants.ReplExtension) ?? false;
  }

  /**
   * Gets whether the runtime explicitly said this frame can be restarted.
   */
  public get canExplicitlyBeRestarted() {
    return !!(this.callFrame as Cdp.Debugger.CallFrame).canBeRestarted;
  }

  /**
   * Gets whether this stackframe is at the same position as the other frame.
   */
  public equivalentTo(other: unknown) {
    return (
      other instanceof StackFrame &&
      other._scriptLocation.columnNumber === this._scriptLocation.columnNumber &&
      other._scriptLocation.lineNumber === this._scriptLocation.lineNumber &&
      other._scriptLocation.script.scriptId === this._scriptLocation.script.scriptId
    );
  }

  callFrameId(): string | undefined {
    return this._scope ? this._scope.callFrameId : undefined;
  }

  async scopes(): Promise<Dap.ScopesResult> {
    const currentScope = this._scope;
    if (!currentScope) {
      throw new ProtocolError(asyncScopesNotAvailable());
    }

    const scopes = await Promise.all(
      currentScope.chain.map(async (scope, scopeNumber) => {
        let name = '';
        let presentationHint: 'arguments' | 'locals' | 'registers' | undefined;
        switch (scope.type) {
          case 'global':
            name = l10n.t('Global');
            break;
          case 'local':
            name = l10n.t('Local');
            presentationHint = 'locals';
            break;
          case 'with':
            name = l10n.t('With Block');
            presentationHint = 'locals';
            break;
          case 'closure':
            name = l10n.t('Closure');
            presentationHint = 'arguments';
            break;
          case 'catch':
            name = l10n.t('Catch Block');
            presentationHint = 'locals';
            break;
          case 'block':
            name = l10n.t('Block');
            presentationHint = 'locals';
            break;
          case 'script':
            name = l10n.t('Script');
            break;
          case 'eval':
            name = l10n.t('Eval');
            break;
          case 'module':
            name = l10n.t('Module');
            break;
          default:
            // fallback for custom scope types from other runtimes (#651)
            name = scope.type.substr(0, 1).toUpperCase() + scope.type.substr(1);
            break;
        }
        if (scope.name && scope.type === 'closure') {
          name = l10n.t('Closure ({0})', scope.name);
        } else if (scope.name) {
          name = `${name}: ${scope.name}`;
        }

        const variable = this._scopeVariable(scopeNumber, currentScope);
        if (!variable) {
          return undefined;
        }

        const dap: Dap.Scope = {
          name,
          presentationHint,
          expensive: scope.type === 'global',
          variablesReference: variable.id,
        };
        if (scope.startLocation) {
          const startScriptLocation = this._thread.scriptLocation(scope.startLocation);
          const startUiLocation = await this._thread.scriptLocationToUiLocation(startScriptLocation);
          dap.line = (startUiLocation || startScriptLocation).lineNumber;
          dap.column = (startUiLocation || startScriptLocation).columnNumber;
          if (startUiLocation?.source) dap.source = await startUiLocation.source.toDap();
          if (scope.endLocation) {
            const endScriptLocation = this._thread.scriptLocation(scope.endLocation);
            const endUiLocation = await this._thread.scriptLocationToUiLocation(endScriptLocation);
            dap.endLine = (endUiLocation || endScriptLocation).lineNumber;
            dap.endColumn = (endUiLocation || endScriptLocation).columnNumber;
          }
        }
        return dap;
      }),
    );

    return { scopes: scopes.filter(truthy) };
  }

  /** @inheritdoc */
  async toDap(format?: Dap.StackFrameFormat): Promise<Dap.StackFrame> {
    const uiLocation = await this.uiLocation();
    const source = uiLocation?.source ? await uiLocation.source.toDap() : undefined;
    const isSmartStepped = await shouldStepOverStackFrame(this);
    const presentationHint = isSmartStepped ? 'deemphasize' : 'normal';
    if (isSmartStepped && source) {
      source.origin =
        isSmartStepped === StackFrameStepOverReason.SmartStep
          ? l10n.t('Skipped by smartStep')
          : l10n.t('Skipped by skipFiles');
    }

    const line = (uiLocation || this._scriptLocation).lineNumber;
    const column = (uiLocation || this._scriptLocation).columnNumber;

    let formattedName = this._name;

    if (source && format) {
      if (format.module) {
        formattedName += ` [${source.name}]`;
      }

      if (format.line) {
        formattedName += ` Line ${line}`;
      }
    }

    return {
      id: this.frameId,
      name: formattedName, // TODO: Use params to format the name
      line,
      column,
      source,
      presentationHint,
      // If `canBeRestarted` is present, use that
      // https://github.com/microsoft/vscode-js-debug/issues/1283
      canRestart: (this.callFrame as Cdp.Debugger.CallFrame).canBeRestarted ?? !this.isAsync,
    } as Dap.StackFrame;
  }

  /** @inheritdoc */
  async formatAsNative(): Promise<string> {
    const uiLocation = await this.uiLocation();
    const url =
      (await uiLocation?.source.existingAbsolutePath()) ||
      (await uiLocation?.source.prettyName()) ||
      this.callFrame.url;
    const { lineNumber, columnNumber } = uiLocation || this._scriptLocation;
    return `    at ${this._name} (${url}:${lineNumber}:${columnNumber})`;
  }

  /** @inheritdoc */
  async format(): Promise<string> {
    const uiLocation = await this.uiLocation();
    const prettyName = (await uiLocation?.source.prettyName()) || '<unknown>';
    const anyLocation = uiLocation || this._scriptLocation;
    let text = `${this._name} @ ${prettyName}:${anyLocation.lineNumber}`;
    if (anyLocation.columnNumber > 1) text += `:${anyLocation.columnNumber}`;
    return text;
  }

  /** Gets the variable container for a scope. Returns undefined if the thread is not longer paused. */
  private _scopeVariable(scopeNumber: number, scope: IScope): IVariableContainer | undefined {
    const existing = scope.variables[scopeNumber];
    if (existing) {
      return existing;
    }

    const scopeRef: IScopeRef = {
      stackFrame: this,
      callFrameId: scope.callFrameId,
      scopeNumber,
    };

    const extraProperties: IExtraProperty[] = [];
    if (scopeNumber === 0) {
      if (scope.thisObject) extraProperties.push({ name: 'this', value: scope.thisObject });
      if (scope.returnValue)
        extraProperties.push({
          name: l10n.t('Return value'),
          value: scope.returnValue,
        });
    }

    const paused = this._thread.pausedVariables();
    if (!paused) {
      return undefined;
    }

    const variable = paused.createScope(scope.chain[scopeNumber].object, scopeRef, extraProperties);
    return (scope.variables[scopeNumber] = variable);
  }

  public readonly completions = once(async (): Promise<Dap.CompletionItem[]> => {
    if (!this._scope) return [];
    const variableStore = this._thread.pausedVariables();
    if (!variableStore) {
      return [];
    }

    const promises: Promise<Dap.CompletionItem[]>[] = [];
    for (let scopeNumber = 0; scopeNumber < this._scope.chain.length; scopeNumber++) {
      const scopeVariable = this._scopeVariable(scopeNumber, this._scope);
      if (!scopeVariable) {
        continue;
      }

      promises.push(
        variableStore
          .getVariableNames({
            variablesReference: scopeVariable.id,
          })
          .then(variables => variables.map(label => ({ label, type: 'property' }))),
      );
    }
    const completions = await Promise.all(promises);
    return ([] as Dap.CompletionItem[]).concat(...completions);
  });
}
