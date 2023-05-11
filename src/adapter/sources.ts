/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as l10n from '@vscode/l10n';
import { inject, injectable } from 'inversify';
import { xxHash32 } from 'js-xxhash';
import { relative } from 'path';
import { NullableMappedPosition, SourceMapConsumer } from 'source-map';
import { URL } from 'url';
import Cdp from '../cdp/api';
import { MapUsingProjection } from '../common/datastructure/mapUsingProjection';
import { EventEmitter } from '../common/events';
import { checkContentHash } from '../common/hash/checkContentHash';
import { ILogger, LogTag } from '../common/logging';
import { once } from '../common/objUtils';
import { forceForwardSlashes, isSubdirectoryOf, properResolve } from '../common/pathUtils';
// import { ISourceMapMetadata, SourceMap } from '../common/sourceMaps/sourceMap';
// import { CachingSourceMapFactory, ISourceMapFactory } from '../common/sourceMaps/sourceMapFactory';
import {
  BasicSourceMapConsumer,
  IndexedSourceMapConsumer,
  MappedPosition,
  MappingItem,
  NullablePosition,
  Position,
  RawIndexMap,
  RawSection,
  RawSourceMap,
  StartOfSourceMap,
} from 'source-map';
import { fixDriveLetterAndSlashes } from '../common/pathUtils';
import { ISourcePathResolver, InlineScriptOffset } from '../common/sourcePathResolver';
import * as sourceUtils from '../common/sourceUtils';
import { prettyPrintAsSourceMap } from '../common/sourceUtils';
import * as utils from '../common/urlUtils';
import { completeUrlEscapingRoot, fileUrlToAbsolutePath, isDataUri } from '../common/urlUtils';
import { AnyLaunchConfiguration } from '../configuration';
import Dap from '../dap/api';
import { IDapApi } from '../dap/connection';
import { sourceMapParseFailed } from '../dap/errors';
import { IInitializeParams } from '../ioc-extras';
import { IStatistics } from '../telemetry/classification';
import { IResourceProvider } from './resourceProvider';
import { ScriptSkipper } from './scriptSkipper/implementation';
import { IScriptSkipper } from './scriptSkipper/scriptSkipper';
import { ExecutionContext, Thread } from './threads';

import { IDisposable } from '../common/disposable';
import { truthy } from '../common/objUtils';
import { IDeferred, delay } from '../common/promiseUtil';
import { IRootDapApi } from '../dap/connection';
import { WebAssemblyFile } from '../dwarf/core/Source';

// This is a ui location which corresponds to a position in the document user can see (Source, Dap.Source).
export interface IUiLocation {
  lineNumber: number; // 1-based
  columnNumber: number; // 1-based
  source: Source;
}

function isUiLocation(loc: unknown): loc is IUiLocation {
  return (
    typeof (loc as IUiLocation).lineNumber === 'number' &&
    typeof (loc as IUiLocation).columnNumber === 'number' &&
    !!(loc as IUiLocation).source
  );
}

const getFallbackPosition = () => ({
  source: null,
  line: null,
  column: null,
  name: null,
  lastColumn: null,
  isSourceMapLoadFailure: true,
});

type ContentGetter = () => Promise<string | undefined>;

// Each source map has a number of compiled sources referncing it.
// type SourceMapData = { compiled: Set<ISourceWithMap>; map?: SourceMap; loaded: Promise<void> };
export type SourceMapTimeouts = {
  // This is a source map loading delay used for testing.
  load: number;

  // When resolving a location (e.g. to show it in the debug console), we wait no longer than
  // |resolveLocation| timeout for source map to be loaded, and fallback to original location
  // in the compiled source.
  resolveLocation: number;

  // When pausing before script with source map, we wait no longer than |sourceMapMinPause| timeout
  // for source map to be loaded and breakpoints to be set. This usually ensures that breakpoints
  // won't be missed.
  sourceMapMinPause: number;

  // Normally we only give each source-map sourceMapMinPause time to load per sourcemap. sourceMapCumulativePause
  // adds some additional time we spend parsing source-maps, but it's spent accross all source-maps in that // // // session
  sourceMapCumulativePause: number;

  // When sending multiple entities to debug console, we wait for each one to be asynchronously
  // processed. If one of them stalls, we resume processing others after |output| timeout.
  output: number;
};

/** Gets whether the URL is a compiled source containing a webpack HMR */
const isWebpackHMR = (url: string) => url.endsWith('.hot-update.js');
const isViteHmr = (url: string) => url.search('\\?t\\=') > -1;

const defaultTimeouts: SourceMapTimeouts = {
  load: 0,
  resolveLocation: 2000,
  sourceMapMinPause: 1000,
  output: 1000,
  sourceMapCumulativePause: 10000,
};


export class Script {
  source: SourceFromScript | undefined;
  scriptLanguage: string | undefined
  url: string;
  scriptId: string;
  executionContextId: number;
  sourcePromise: Promise<SourceFromScript>;
  container: SourceContainer

  constructor(event: Cdp.Debugger.ScriptParsedEvent, container: SourceContainer, sourcePromiseClosure: (s: Script)=>Promise<SourceFromScript>, scriptLanguage: string){
    this.url = event.url
    this.scriptId = event.scriptId
    this.executionContextId = event.executionContextId
    this.container = container
    this.scriptLanguage = scriptLanguage
    this.sourcePromise = sourcePromiseClosure(this)
  }
};

export type ScriptWithSourceMapHandler = (
  script: Script,
  sources: Source[],
) => Promise<IUiLocation[]>;
export type SourceMapDisabler = (hitBreakpoints: string[]) => Source[];

export type ScriptLocation = {
  lineNumber: number; // 1-based
  columnNumber: number; // 1-based
  script: Script;
};

// export interface IScript {
//   executionContextId: Cdp.Runtime.ExecutionContextId;
//   scriptId: Cdp.Runtime.ScriptId;
//   url: string;
// }

// Represents a text source visible to the user.
//
// Source maps flow (start with compiled1 and compiled2). Two different compiled sources
// reference to the same source map, and produce two different resolved urls leading
// to different source map sources. This is a corner case, usually there is a single
// resolved url and a single source map source per each sourceUrl in the source map.
//
//       ------> sourceMapUrl -> SourceContainer._sourceMaps -> SourceMapData -> map
//       |    |                                                                    |
//       |    compiled1  - - - - - - -  source1 <-- resolvedUrl1 <-- sourceUrl <----
//       |                                                                         |
//      compiled2  - - - - - - - - - -  source2 <-- resolvedUrl2 <-- sourceUrl <----
//
// compiled1 and source1 are connected (same goes for compiled2 and source2):
//    compiled1._sourceMapSourceByUrl.get(sourceUrl) === source1
//    source1._compiledToSourceUrl.get(compiled1) === sourceUrl
//
export abstract class Source {
  public readonly sourceReference: number;
  private readonly _name: string;
  private readonly _fqname: string;

  /**
   * Function to retrieve the content of the source.
   */
  private readonly _contentGetter: ContentGetter;

  public readonly _container: SourceContainer;

  /**
   * Hypothesized absolute path for the source. May or may not actually exist.
   */
  public readonly absolutePath: string;

  public outgoingSourceMap?: SourceMap

  // This is the same as |_absolutePath|, but additionally checks that file exists to
  // avoid errors when page refers to non-existing paths/urls.
  private readonly _existingAbsolutePath: Promise<string | undefined>;

  /**
   * @param inlineScriptOffset Offset of the start location of the script in
   * its source file. This is used on scripts in HTML pages, where the script
   * is nested in the content.
   * @param contentHash Optional hash of the file contents. This is used to
   * check whether the script we get is the same one as what's on disk. This
   * can be used to detect in-place transpilation.
   * @param runtimeScriptOffset Offset of the start location of the script
   * in the runtime *only*. This differs from the inlineScriptOffset, as the
   * inline offset of also reflected in the file. This is used to deal with
   * the runtime wrapping the source and offsetting locations which should
   * not be shown to the user.
   */
  constructor(
    container: SourceContainer,
    public readonly url: string,
    absolutePath: string | undefined,
    contentGetter: ContentGetter,
    public readonly inlineScriptOffset?: InlineScriptOffset,
    public readonly runtimeScriptOffset?: InlineScriptOffset,
    public readonly contentHash?: string,
  ) {
    this.sourceReference = container.getSourceReference(url);
    this._contentGetter = once(contentGetter);
    this._container = container;
    this.absolutePath = absolutePath || '';
    this._fqname = this._fullyQualifiedName();
    this._name = this._humanName();
    // this.setSourceMapUrl(sourceMapUrl);

    this._existingAbsolutePath = checkContentHash(
      this.absolutePath,
      // Inline scripts will never match content of the html file. We skip the content check.
      inlineScriptOffset || runtimeScriptOffset ? undefined : contentHash,
      container._fileContentOverridesForTest.get(this.absolutePath),
    );
  }

  /**
   * Gets a suggested mimetype for the source.
   */
  get getSuggestedMimeType(): string | undefined {
    // only return an explicit mimetype if the file has no extension (such as
    // with node internals.) Otherwise, let the editor guess.
    if (!/\.[^/]+$/.test(this.url)) {
      return 'text/javascript';
    }
  }

  async content(): Promise<string | undefined> {
    let content = await this._contentGetter();

    // pad for the inline source offset, see
    // https://github.com/microsoft/vscode-js-debug/issues/736
    if (this.inlineScriptOffset?.lineOffset) {
      content = '\n'.repeat(this.inlineScriptOffset.lineOffset) + content;
    }

    return content;
  }

  /**
   * Pretty-prints the source. Generates a beauitified source map if possible
   * and it hasn't already been done, and returns the created map and created
   * ephemeral source. Returns undefined if the source can't be beautified.
   */
  public async prettyPrint(): Promise<{ map: SourceMap; source: Source } | undefined> {
    if (!this._container) {
      return undefined;
    }

    if (isSourceWithMap(this) && this.sourceMap.url.endsWith('-pretty.map')) {
      const map = this._container._sourceMaps.get(this.sourceMap?.url)?.map;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return map && { map, source: [...this.sourceMap.sourceByUrl!.values()][0] };
    }

    const content = await this.content();
    if (!content) {
      return undefined;
    }

    // Eval'd scripts have empty urls, give them a temporary one for the purpose
    // of the sourcemap. See #929
    const baseUrl = this.url || `eval://${this.sourceReference}.js`;
    const sourceMapUrl = baseUrl + '-pretty.map';
    const basename = baseUrl.split(/[\/\\]/).pop() as string;
    const fileName = basename + '-pretty.js';
    const map = await prettyPrintAsSourceMap(fileName, content, baseUrl, sourceMapUrl);
    if (!map) {
      return undefined;
    }

    // Note: this overwrites existing source map.
    this.setSourceMapUrl(sourceMapUrl);
    const asCompiled = this as ISourceWithMap;
    const sourceMap: SourceMapData = {
      compiled: new Set([asCompiled]),
      map,
      loaded: Promise.resolve(),
    };
    this._container._sourceMaps.set(sourceMapUrl, sourceMap);
    await this._container._addSourceMapSources(asCompiled, map);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return { map, source: [...asCompiled.sourceMap.sourceByUrl.values()][0] };
  }

  /**
   * Returns a DAP representation of the source.
   */
  async toDap(): Promise<Dap.Source> {
    return this.toDapShallow();
  }

  /**
   * Returns a DAP representation without including any nested sources.
   */
  public async toDapShallow(): Promise<Dap.Source> {
    const existingAbsolutePath = await this._existingAbsolutePath;
    const dap: Dap.Source = {
      name: this._name,
      path: this._fqname,
      sourceReference: this.sourceReference,
      presentationHint: this.blackboxed() ? 'deemphasize' : undefined,
      origin: this.blackboxed() ? l10n.t('Skipped by skipFiles') : undefined,
    };

    if (existingAbsolutePath) {
      dap.sourceReference = 0;
      dap.path = existingAbsolutePath;
    }

    return dap;
  }

  existingAbsolutePath(): Promise<string | undefined> {
    return this._existingAbsolutePath;
  }

  async prettyName(): Promise<string> {
    const path = await this._existingAbsolutePath;
    if (path) return path;
    return this._fqname;
  }

  /**
   * Gets the human-readable name of the source.
   */
  private _humanName() {
    if (utils.isAbsolute(this._fqname)) {
      for (const root of this._container.rootPaths) {
        if (isSubdirectoryOf(root, this._fqname)) {
          return forceForwardSlashes(relative(root, this._fqname));
        }
      }
    }

    return this._fqname;
  }

  /**
   * Returns a pretty name for the script. This is the name displayed in
   * stack traces and returned through DAP if the file does not verifiably
   * exist on disk.
   */
  private _fullyQualifiedName(): string {
    if (!this.url) {
      return '<eval>/VM' + this.sourceReference;
    }

    if (this.url.endsWith(sourceUtils.SourceConstants.ReplExtension)) {
      return 'repl';
    }

    if (this.absolutePath.startsWith('<node_internals>')) {
      return this.absolutePath;
    }

    if (utils.isAbsolute(this.url)) {
      return this.url;
    }

    const parsedAbsolute = utils.fileUrlToAbsolutePath(this.url);
    if (parsedAbsolute) {
      return parsedAbsolute;
    }

    let fqname = this.url;
    try {
      const tokens: string[] = [];
      const url = new URL(this.url);
      if (url.protocol === 'data:') {
        return '<eval>/VM' + this.sourceReference;
      }

      if (url.hostname) {
        tokens.push(url.hostname);
      }

      if (url.port) {
        tokens.push('\uA789' + url.port); // : in unicode
      }

      if (url.pathname) {
        tokens.push(/^\/[a-z]:/.test(url.pathname) ? url.pathname.slice(1) : url.pathname);
      }

      const searchParams = url.searchParams?.toString();
      if (searchParams) {
        tokens.push('?' + searchParams);
      }

      fqname = tokens.join('');
    } catch (e) {
      // ignored
    }

    if (fqname.endsWith('/')) {
      fqname += '(index)';
    }

    if (this.inlineScriptOffset) {
      fqname += `\uA789${this.inlineScriptOffset.lineOffset + 1}:${
        this.inlineScriptOffset.columnOffset + 1
      }`;
    }
    return fqname;
  }

  /**
   * Gets whether this script is blackboxed (part of the skipfiles).
   */
  public blackboxed(): boolean {
    return this._container.isSourceSkipped(this.url);
  }
}

// /**
//  * A Source that has an associated sourcemap.
//  */
// export interface ISourceWithMap extends Source {
//   readonly sourceMap: {
//     url: string;
//     metadata: ISourceMapMetadata;
//     // When compiled source references a source map, we'll generate source map sources.
//     // This map |sourceUrl| as written in the source map itself to the Source.
//     // Only present on compiled sources, exclusive with |_origin|.
//     sourceByUrl: Map<string, SourceFromMap>;
//   };
// }

/**
 * A Source generated from a sourcemap. For example, a TypeScript input file
 * discovered from its compiled JavaScript code.
 */
// export class SourceFromMap extends Source {
//   // Sources generated from the source map are referenced by some compiled sources
//   // (through a source map). This map holds the original |sourceUrl| as written in the
//   // source map, which was used to produce this source for each compiled.
//   public readonly compiledToSourceUrl = new Map<ISourceWithMap, string>();
// }

interface Sized{
  size: number
}

class SizedIterator<T>{
  constructor(private container: Sized, private iterator: IterableIterator<T>){}

  get size(){
    return this.container.size
  }
  public [Symbol.iterator] (){
    return this.iterator
  }
  next(){
    return this.iterator.next()
  }
}

export class SourceFromScript extends Source {
  readonly scriptByExecutionContext: Map<ExecutionContext, Script> = new Map();

  // readonly scripts = this.scriptByExecutionContext.values

  // /**
  //  * Associated a script with this source. This is only valid for a source
  //  * from the runtime, not a {@link SourceFromMap}.
  //  */
  // addScript(script: IScript): void {
  //   this._scripts.push(script);
  // }

  // /**
  //  * Filters scripts from a source, done when an execution context is removed.
  //  */
  // filterScripts(fn: (s: Script) => boolean): void {
  //   this._scripts = this._scripts.filter(fn);
  // }

  /**
   * Gets scripts associated with this source.
   */
  get scripts(): SizedIterator<Script> {
    return new SizedIterator(this.scriptByExecutionContext, this.scriptByExecutionContext.values());
  }

  static async createFromScript(event: Cdp.Debugger.ScriptParsedEvent, thread: Thread, script: Script): Promise<SourceFromScript> {

    const contentGetter = async () => {
      const response = await thread.cdp.Debugger.getScriptSource({ scriptId: event.scriptId });
      return response ? [response.scriptSource] : [];
    };

    const inlineSourceOffset =
      event.startLine || event.startColumn
        ? { lineOffset: event.startLine, columnOffset: event.startColumn }
        : undefined;

    // see https://github.com/microsoft/vscode/issues/103027
    const runtimeScriptOffset = event.url.endsWith('#vscode-extension')
      ? { lineOffset: 2, columnOffset: 0 }
      : undefined;

    const absolutePath = await thread.sourceContainer.sourcePathResolver.urlToAbsolutePath({ url: event.url });

    // this.logger.verbose(LogTag.RuntimeSourceCreate, 'Creating source from url', {
    //   inputUrl: url,
    //   absolutePath,
    // });

    const source = new SourceFromScript(
      thread.sourceContainer,
      event.url,
      absolutePath,
      contentGetter,
      inlineSourceOffset,
      runtimeScriptOffset,
      !event.hasSourceURL && thread.launchConfig.enableContentValidation ? event.hash : undefined,
    );

    return source
  };
}

export class SourceFromMap extends Source {
  // Sources generated from the source map are referenced by some compiled sources
  // (through a source map). This map holds the original |sourceUrl| as written in the
  // source map, which was used to produce this source for each compiled.
  public readonly compiledToSourceUrl = new Map<Source, string>();

  public incommingSourceMaps: Set<SourceMap> = new Set();

  // public get hasIncommingSourceMaps(){
  //   return this.incommingSourceMaps.size > 0
  // }
}

export interface ISourceMapMetadata {
  sourceMapUrl: string;
  cacheKey?: number;
  compiledPath: string;
  loaded: IDeferred<void>
}

/**
 * Wrapper for a parsed sourcemap.
 */
export class SourceMap implements SourceMapConsumer {
  private static idCounter = 0;

  /**
   * Map of aliased source names to the names in the `original` map.
   */
  private sourceActualToOriginal = new Map<string, string>();
  private sourceOriginalToActual = new Map<string, string>();

  // compiled: Set<Script> = new Set();

  public pointsToByUrl = new Set<Source>();
  public source: Source;

  sourceByUrl = new Map();
  finishLoading: Promise<void>

  public get loaded(){
    return this.deferred.hasSettled
  }

  /**
   * Unique source map ID, used for cross-referencing.
   */
  public readonly id = SourceMap.idCounter++;

  constructor(
    private readonly original: BasicSourceMapConsumer | IndexedSourceMapConsumer,
    public readonly metadata: Readonly<ISourceMapMetadata>,
    private readonly actualRoot: string,
    public readonly actualSources: ReadonlyArray<string>,
    public readonly hasNames: boolean,
    private deferred: IDeferred<void>,
  ) {
    if (actualSources.length !== original.sources.length) {
      throw new Error(`Expected actualSources.length === original.source.length`);
    }
    this.finishLoading = deferred.promise

    for (let i = 0; i < actualSources.length; i++) {
      this.sourceActualToOriginal.set(actualSources[i], original.sources[i]);
      this.sourceOriginalToActual.set(original.sources[i], actualSources[i]);
    }
  }

  /**
   * Gets the source filenames of the sourcemap. We preserve them out-of-bounds
   * since the source-map library does normalization that destroys certain
   * path segments.
   *
   * @see https://github.com/microsoft/vscode-js-debug/issues/479#issuecomment-634221103
   */
  public get sources() {
    return this.actualSources.slice();
  }

  /**
   * Gets the source root of the sourcemap.
   */
  public get sourceRoot() {
    // see SourceMapFactory.loadSourceMap for what's happening here
    return this.actualRoot;
  }

  /**
   * Gets the source URL computed from the compiled path and the source root.
   */
  public computedSourceUrl(sourceUrl: string) {
    return fixDriveLetterAndSlashes(
      completeUrlEscapingRoot(
        isDataUri(this.metadata.sourceMapUrl)
          ? this.metadata.compiledPath
          : this.metadata.sourceMapUrl,
        this.sourceRoot + sourceUrl,
      ),
    );
  }

  // /**
  //  * @inheritdoc
  //  */
  // computeColumnSpans(): void {
  //   this.original.computeColumnSpans();
  // }

  /**
   * @inheritdoc
   */
  originalPositionFor(
    generatedPosition: Position & { bias?: number | undefined },
  ): NullableMappedPosition {
    const mapped = this.original.originalPositionFor(generatedPosition);
    if (mapped.source) {
      mapped.source = this.sourceOriginalToActual.get(mapped.source) ?? mapped.source;
    }

    return mapped;
  }

  /**
   * @inheritdoc
   */
  generatedPositionFor(
    originalPosition: MappedPosition & { bias?: number | undefined },
  ): NullablePosition {
    return this.original.generatedPositionFor({
      ...originalPosition,
      source: this.sourceActualToOriginal.get(originalPosition.source) ?? originalPosition.source,
    });
  }

  /**
   * @inheritdoc
   */
  allGeneratedPositionsFor(originalPosition: MappedPosition): NullablePosition[] {
    return this.original.allGeneratedPositionsFor({
      ...originalPosition,
      source: this.sourceActualToOriginal.get(originalPosition.source) ?? originalPosition.source,
    });
  }

  // /**
  //  * @inheritdoc
  //  */
  // hasContentsOfAllSources(): boolean {
  //   return this.original.hasContentsOfAllSources();
  // }

  /**
   * @inheritdoc
   */
  sourceContentFor(source: string, returnNullOnMissing?: boolean | undefined): string | null {
    return this.original.sourceContentFor(
      this.sourceActualToOriginal.get(source) ?? source,
      returnNullOnMissing,
    );
  }

  /**
   * @inheritdoc
   */
  eachMapping<ThisArg = void>(
    callback: (this: ThisArg, mapping: MappingItem) => void,
    context?: ThisArg,
    order?: number | undefined,
  ): void {
    return this.original.eachMapping(callback, context, order);
  }

  /**
   * @inheritdoc
   */
  destroy(): void {
    this.original.destroy();
  }
}

export interface ISourceMap{
  pointsToByUrl: Set<Source>
  source: Source

  sourceByUrl: Map
  finishLoading: Promise<void>

  get loaded(): boolean

  /**
   * @inheritdoc
   */
  originalPositionFor(
    generatedPosition: Position & { bias?: number | undefined },
  ): NullableMappedPosition

  /**
   * @inheritdoc
   */
  generatedPositionFor(
    originalPosition: MappedPosition & { bias?: number | undefined },
  ): NullablePosition


  /**
   * @inheritdoc
   */
  allGeneratedPositionsFor(originalPosition: MappedPosition): NullablePosition[]
}

export class DwarfSourceMap implements ISourceMap{
  sourceByUrl = new Map();
  sources: string[]
  finishLoading: Promise<void>;

  constructor(private wasmFile: WebAssemblyFile, public source: Source, public deferred: IDeferred<void>){
    this.sources = wasmFile.dwarf.source_list()
    this.finishLoading = deferred.promise
  }

  /**
   * @inheritdoc
   */
  originalPositionFor(
    generatedPosition: Position & { bias?: number | undefined },
  ): NullableMappedPosition {
    const mapped = this.wasmFile.findFileFromLocation({columnNumber: generatedPosition.column});
    if (mapped) {
      return {
        source: mapped.file(),
        line: mapped.line ?? null,
        column: mapped.column ? mapped.column - 1 :  null,
        name: mapped.file(),
      }
      // mapped.source = this.sourceOriginalToActual.get(mapped.source) ?? mapped.source;
    }
    return {
      source: null,
      line: null,
      column: null,
      name: null,
    }
  }

  /**
   * @inheritdoc
   */
  generatedPositionFor(
    originalPosition: MappedPosition & { bias?: number | undefined },
  ): NullablePosition {
    const address =  this.wasmFile.findAddressFromFileLocation(
      originalPosition.source,
      originalPosition.line
      // ...originalPosition,
      // source: this.sourceActualToOriginal.get(originalPosition.source) ?? originalPosition.source,
    );
    return {
      line: 0,
      column: address ?? null,
      lastColumn: null
    }
  }

  /**
   * @inheritdoc
   */
  allGeneratedPositionsFor(originalPosition: MappedPosition): NullablePosition[] {
    return [this.generatedPositionFor(originalPosition)]
  }

  sourceContentFor(source: string, returnNullOnMissing?: boolean | undefined): string | null {
    return null
  }
}


// export const isSourceWithMap = (source: unknown): source is ISourceWithMap =>
//   !!source && source instanceof Source && !!source.outgoingSourceMaps.length && !(source.outgoingSourceMaps[0] instanceof DummySourceMap);

const isCompiledSourceOf = (compiled: Source, original: Source) =>
  compiled.outgoingSourceMap && original instanceof SourceFromMap && original.incommingSourceMaps.has(compiled.outgoingSourceMap);

export interface IPreferredUiLocation extends IUiLocation {
  isMapped: boolean;
  unmappedReason?: UnmappedReason;
}

export enum UnmappedReason {
  /** The map has been disabled temporarily, due to setting a breakpoint in a compiled script */
  MapDisabled,

  /** The source in the UI location has no map */
  HasNoMap,

  /** The location cannot be source mapped due to an error loading the map */
  MapLoadingFailed,

  /** The location cannot be source mapped due to its position not being present in the map */
  MapPositionMissing,

  /**
   * The location cannot be sourcemapped, due to not having a sourcemap,
   * failing to load the sourcemap, not having a mapping in the sourcemap, etc
   */
  CannotMap,
}

const maxInt32 = 2 ** 31 - 1;

export const ISourceMapFactory = Symbol('ISourceMapFactory');

export interface ISourceWithMap extends Source {
  outgoingSourceMap: SourceMap
}
/**
 * Factory that loads source maps.
 */
export interface ISourceMapFactory extends IDisposable {
  /**
   * Loads the provided source map.
   * @throws a {@link ProtocolError} if it cannot be parsed
   */
  load(metadata: ISourceMapMetadata): Promise<SourceMap>;

  /**
   * Guards a call to a source map invokation to catch parse errors. Sourcemap
   * parsing happens lazily, so we need to wrap around their call sites.
   * @see https://github.com/microsoft/vscode-js-debug/issues/483
   */
  guardSourceMapFn<T>(sourceMap: SourceMap, fn: () => T, defaultValue: () => T): T;
}

@injectable()
export class SourceContainer {
  /**
   * Project root path, if set.
   */
  public readonly rootPaths: string[] = [];

  /**
   * Mapping of CDP script IDs to Script objects.
   */
  private readonly scriptsById: Map<Cdp.Runtime.ScriptId, Script> = new Map();

  private onSourceMappedSteppingChangeEmitter = new EventEmitter<boolean>();
  private onScriptEmitter = new EventEmitter<Script>();
  private _dap: Dap.Api;
  private _sourceByOriginalUrl: Map<string, Source> = new MapUsingProjection(s => s.toLowerCase());
  private _sourceByReference: Map<number, Source> = new Map();
  private _sourceMapSourcesByUrl: Map<string, SourceFromMap> = new Map();
  private _sourceByAbsolutePath: Map<string, Source> = utils.caseNormalizedMap();

  // All source maps by url.
  _sourceMaps: Map<string, SourceMap> = new Map();
  _sourcesBySourceMapUrl: Map<string, Source[]> = new Map();
  private _sourceMapTimeouts: SourceMapTimeouts = defaultTimeouts;

  // Test support.
  _fileContentOverridesForTest = new Map<string, string>();

  /**
   * Map of sources with maps that are disabled temporarily. This can happen
   * if stepping stepping in or setting breakpoints in disabled files.
   */
  private readonly _temporarilyDisabledSourceMaps = new Set<ISourceWithMap>();

  /**
   * Map of sources with maps that are disabled for the length of the debug
   * session. This can happen if manually disabling sourcemaps for a file
   * (as a result of a missing source, for instance)
   */
  private readonly _permanentlyDisabledSourceMaps = new Set<ISourceWithMap>();

  /**
   * Fires when a new script is parsed.
   */
  public readonly onScript = this.onScriptEmitter.event;

  private readonly _statistics: IStatistics = { fallbackSourceMapCount: 0 };

  /*
   * Gets an iterator for all sources in the collection.
   */
  public get sources() {
    return this._sourceByReference.values();
  }

  /**
   * Gets statistics for telemetry
   */
  public statistics(): IStatistics {
    return this._statistics;
  }

  private _doSourceMappedStepping = this.launchConfig.sourceMaps;

  /**
   * Gets whether source stepping is enabled.
   */
  public get doSourceMappedStepping() {
    return this._doSourceMappedStepping;
  }

  /**
   * Sets whether source stepping is enabled.
   */
  public set doSourceMappedStepping(enabled: boolean) {
    if (enabled !== this._doSourceMappedStepping) {
      this._doSourceMappedStepping = enabled;
      this.onSourceMappedSteppingChangeEmitter.fire(enabled);
    }
  }

  /**
   * Fires whenever `doSourceMappedStepping` is changed.
   */
  public readonly onSourceMappedSteppingChange = this.onSourceMappedSteppingChangeEmitter.event;

  constructor(
    @inject(IDapApi) dap: Dap.Api,
    @inject(ISourceMapFactory) public readonly sourceMapFactory: ISourceMapFactory,
    @inject(ILogger) private readonly logger: ILogger,
    @inject(AnyLaunchConfiguration) private readonly launchConfig: AnyLaunchConfiguration,
    @inject(IInitializeParams) public readonly initializeConfig: Dap.InitializeParams,
    @inject(ISourcePathResolver) public readonly sourcePathResolver: ISourcePathResolver,
    @inject(IScriptSkipper) public readonly scriptSkipper: ScriptSkipper,
    @inject(IResourceProvider) private readonly resourceProvider: IResourceProvider,
  ) {
    this._dap = dap;

    const mainRootPath = 'webRoot' in launchConfig ? launchConfig.webRoot : launchConfig.rootPath;
    if (mainRootPath) {
      // Prefixing ../ClientApp is a workaround for a bug in ASP.NET debugging in VisualStudio because the wwwroot is not properly configured
      this.rootPaths = [mainRootPath, properResolve(mainRootPath, '..', 'ClientApp')];
    }

    scriptSkipper.setSourceContainer(this);
    this.setSourceMapTimeouts({
      ...this.sourceMapTimeouts(),
      ...launchConfig.timeouts,
    });
  }

  setSourceMapTimeouts(sourceMapTimeouts: SourceMapTimeouts) {
    this._sourceMapTimeouts = sourceMapTimeouts;
  }

  sourceMapTimeouts(): SourceMapTimeouts {
    return this._sourceMapTimeouts;
  }

  setFileContentOverrideForTest(absolutePath: string, content?: string) {
    if (content === undefined) this._fileContentOverridesForTest.delete(absolutePath);
    else this._fileContentOverridesForTest.set(absolutePath, content);
  }

  /**
   * Returns DAP objects for every loaded source in the container.
   */
  public async loadedSources(): Promise<Dap.Source[]> {
    const promises: Promise<Dap.Source>[] = [];
    for (const source of this._sourceByReference.values()) promises.push(source.toDap());
    return await Promise.all(promises);
  }

  /**
   * Gets the Source object by DAP reference, first by sourceReference and
   * then by path.
   */
  public source(ref: Dap.Source): Source | undefined {
    if (ref.sourceReference) return this._sourceByReference.get(ref.sourceReference);
    if (ref.path) return this._sourceByAbsolutePath.get(ref.path);
    return undefined;
  }

  /**
   * Gets whether the source is skipped.
   */
  public isSourceSkipped(url: string): boolean {
    return this.scriptSkipper.isScriptSkipped(url);
  }

  /**
   * Adds a new script to the source container.
   */
  public addScript(script: Script) {
    this.scriptsById.set(script.scriptId, script);
    this.onScriptEmitter.fire(script);
  }

  /**
   * Gets a script by its script ID.
   */
  public getScriptById(scriptId: string) {
    return this.scriptsById.get(scriptId);
  }

  public getSourceByAbsolutePath(absolutePath: string) {
    return this._sourceByAbsolutePath.get(absolutePath);
  }

  public getSourceMapByUrl(url: string){
    return this._sourceMaps.get(url)
  }

  public getSourcesByUrl(url: string){
    return this._sourcesBySourceMapUrl.get(url)
  }

  /**
   * Gets a source by its original URL from the debugger.
   */
  public getSourceByOriginalUrl(url: string) {
    return this._sourceByOriginalUrl.get(url);
  }

  public getScriptByOriginalUrl(url: string) {
    return this._scriptByOriginalUrl.get(url);
  }

  /**
   * Gets the source preferred source reference for a script. We generate this
   * determistically so that breakpoints have a good chance of being preserved
   * between reloads; previously, we had an incrementing source reference, but
   * this led to breakpoints being lost when the debug session got restarted.
   *
   * Note that the reference returned from this function is *only* used for
   * files that don't exist on disk; the ones that do exist always are
   * rewritten to source reference ID 0.
   */
  public getSourceReference(url: string): number {
    let id = xxHash32(url) & maxInt32; // xxHash32 is a u32, mask again the max positive int32 value

    for (let i = 0; i < 0xffff; i++) {
      if (!this._sourceByReference.has(id)) {
        return id;
      }

      if (id === maxInt32) {
        // DAP spec says max reference ID is 2^31 - 1, int32
        id = 0;
      }

      id++;
    }

    this.logger.assert(false, 'Max iterations exceeding for source reference assignment');
    return id; // conflicts, but it's better than nothing, maybe?
  }

  /**
   * This method returns a "preferred" location. This usually means going
   * through a source map and showing the source map source instead of a
   * compiled one. We use timeout to avoid waiting for the source map for too long.
   * TODO: fix multi hop: e.g. compiled -> source -> pretty printed source (reason for the while loop) or refactor by introducing a sourcemap chain
   */
  public async preferredUiLocation(uiLocation: IUiLocation): Promise<IPreferredUiLocation> {
    let isMapped = false;
    let unmappedReason: UnmappedReason | undefined = UnmappedReason.CannotMap;
    if (this._doSourceMappedStepping) {
      while (true) {
        if (!uiLocation.source.outgoingSourceMap) {
          break;
        }

        // const sourceMap = this._sourceMaps.get(uiLocation.source.outgoingSourceMap.url);
        const sourceMap = uiLocation.source.outgoingSourceMap
        if (
          !this.logger.assert(
            sourceMap,
            `Expected to have sourcemap for loaded source`// ${uiLocation.source.outgoingSourceMap.url}`,
          )
        ) {
          break;
        }

        await Promise.race([sourceMap.loaded, delay(this._sourceMapTimeouts.resolveLocation)]);
        // if (!sourceMap.map) return { ...uiLocation, isMapped, unmappedReason };
        const sourceMapped = this._sourceMappedUiLocation(uiLocation, sourceMap);
        if (!isUiLocation(sourceMapped)) {
          unmappedReason = isMapped ? undefined : sourceMapped;
          break;
        }

        uiLocation = sourceMapped
        isMapped = true;
        unmappedReason = undefined;
      }
    }

    return { ...uiLocation, isMapped, unmappedReason };
  }

  /**
   * This method shows all possible locations for a given one. For example, all
   * compiled sources which refer to the same source map will be returned given
   * the location in source map source. This method does not wait for the
   * source map to be loaded.
   */
  currentSiblingUiLocations(uiLocation: IUiLocation, inSource?: Source): IUiLocation[] {
    return this._uiLocations(uiLocation).filter(
      uiLocation => !inSource || uiLocation.source === inSource,
    );
  }

  /**
   * Clears all sources in the container.
   */
  clear(silent: boolean) {
    this.scriptsById.clear();
    for (const source of this._sourceByReference.values()) {
      this.removeSource(source, silent);
    }

    this._sourceByReference.clear();
    if (this.sourceMapFactory instanceof CachingSourceMapFactory) {
      this.sourceMapFactory.invalidateCache();
    }
  }

  /**
   * Returns all the possible locations the given location can map to or from,
   * taking into account source maps.
   */
  private _uiLocations(uiLocation: IUiLocation): (IUiLocation)[] {
    return [
      ...this.getSourceMapUiLocations(uiLocation),
      uiLocation,
      ...this.getCompiledLocations(uiLocation),
    ];
  }

  /**
   * Returns all UI locations the given location maps to.
   * TODO: this function is weird
   */
  public getSourceMapUiLocations(uiLocation: IUiLocation): IUiLocation[] {
    // if (!uiLocation.source || isSourceWithMap(uiLocation.source) || !this._doSourceMappedStepping) return [];
    // const map = this._sourceMaps.get(uiLocation.source.outgoingSourceMap.url)?.map;
    const map = uiLocation.source?.outgoingSourceMap
    if (!map) return [];
    const sourceMapUiLocation = this._sourceMappedUiLocation(uiLocation, map);
    if (!isUiLocation(sourceMapUiLocation)) return [];

    const r = this.getSourceMapUiLocations(sourceMapUiLocation);
    r.push(sourceMapUiLocation);
    return r;
  }

  private _sourceMappedUiLocation(
    uiLocation: IUiLocation,
    map: SourceMap,
  ): IUiLocation | UnmappedReason {
    const compiled = uiLocation.source;
    if (!compiled?.outgoingSourceMap) {
      return UnmappedReason.HasNoMap;
    }

    if (
      this._temporarilyDisabledSourceMaps.has(compiled) ||
      this._permanentlyDisabledSourceMaps.has(compiled)
    ) {
      return UnmappedReason.MapDisabled;
    }

    const entry = this.getOptiminalOriginalPosition(
      map,
      rawToUiOffset(uiLocation, compiled.inlineScriptOffset),
    );

    if ('isSourceMapLoadFailure' in entry) {
      return UnmappedReason.MapLoadingFailed;
    }

    if (!entry.source) {
      return UnmappedReason.MapPositionMissing;
    }

    const source = map.sourceByUrl.get(entry.source);
    if (!source) {
      return UnmappedReason.MapPositionMissing;
    }

    return {
      lineNumber: entry.line || 1,
      columnNumber: entry.column ? entry.column + 1 : 1, // adjust for 0-based columns
      source: source,
    };
  }

  public getCompiledLocationsFromSource(uiLocation: IUiLocation, inSource?: Source): IUiLocation[] {
    return this.getCompiledLocations(uiLocation).filter(
      uiLoc => !inSource || uiLoc.source === inSource,
    );
  }

  public getSourceMapSourcesByUrl(url: string) {
    return this._sourceMapSourcesByUrl.get(url);
  }

  private getCompiledLocations(uiLocation: IUiLocation): IUiLocation[] {
    let source: Source | undefined = uiLocation.source;
    // if (!(source instanceof SourceFromMap)) {
    //   // 'file:///C:/Users/Kerim/coding/vscode-js-debug/testWorkspace/viteHotreload/src/lib/test.ts'
    //   source = this._sourceMapSourcesByUrl.get(
    //     utils.absolutePathToFileUrl(uiLocation.source.absolutePath),
    //   );
    //   if (source) {
    //     console.log('found SourceFromMap by path');
    //   }
    // }
    if (!(source instanceof SourceFromMap)) {
      return [];
    }

    let output: IUiLocation[] = [];
    for (const sourceMap of source.incommingSourceMaps) {
    // for (const [compiled, sourceUrl] of source.compiledToSourceUrl) {
      // const sourceMap = this._sourceMaps.get(compiled.sourceMap.url);
      // if (!sourceMap || !sourceMap.map) {
      //   continue;
      // }

      const compiled = sourceMap.source

      let sourceUrl: string | undefined

      sourceMap.sourceByUrl.forEach((value, key) => {
        if(value == source){
          sourceUrl = key
        }
      })

      if(!sourceUrl) sourceUrl = compiled.url; // todo: this maybe has to be relative to the sourcemap! Better would be to simply move this inside the sourcemap directly

      const entry = this.sourceMapFactory.guardSourceMapFn(
        sourceMap,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        () => sourceUtils.getOptimalCompiledPosition(sourceUrl, uiLocation, sourceMap),
        getFallbackPosition,
      );

      if (!entry) {
        continue;
      }

      const { lineNumber, columnNumber } = uiToRawOffset(
        {
          lineNumber: entry.line || 1,
          columnNumber: (entry.column || 0) + 1, // correct for 0 index
        },
        compiled.inlineScriptOffset,
      );

      const compiledUiLocation: IUiLocation = {
        lineNumber,
        columnNumber,
        source: compiled,
      };

      output = output.concat(compiledUiLocation); //, this.getCompiledLocations(compiledUiLocation));
    }

    return output;
  }

  /**
   * Gets the best original position for the location in the source map.
   */
  public getOptiminalOriginalPosition(sourceMap: SourceMap, scriptLocation: LineColumn) {
    return this.sourceMapFactory.guardSourceMapFn<NullableMappedPosition>(
      sourceMap,
      () => {
        const glb = sourceMap.originalPositionFor({
          line: scriptLocation.lineNumber,
          column: scriptLocation.columnNumber - 1,
          bias: SourceMapConsumer.GREATEST_LOWER_BOUND,
        });

        if (glb.line !== null) {
          return glb;
        }

        return sourceMap.originalPositionFor({
          line: scriptLocation.lineNumber,
          column: scriptLocation.columnNumber - 1,
          bias: SourceMapConsumer.LEAST_UPPER_BOUND,
        });
      },
      getFallbackPosition,
    );
  }

  public addSource(source: Source) {
    // todo: we should allow the same source at multiple uri's if their scripts
    // have different executionContextId. We only really need the overwrite
    // behavior in Node for tools that transpile sources inline.
    const existingByUrl = source.url && this._sourceByOriginalUrl.get(source.url);
    if (existingByUrl && !isCompiledSourceOf(existingByUrl, source)) {
      this.removeSource(existingByUrl, true);
    }

    this._sourceByOriginalUrl.set(source.url, source);
    this._sourceByReference.set(source.sourceReference, source);
    if (source instanceof SourceFromMap) {
      this._sourceMapSourcesByUrl.set(source.url, source);
    }

    // Some builds, like the Vue starter, generate 'metadata' files for compiled
    // files with query strings appended to deduplicate them, or nested inside
    // of internal prefixes. If we see a duplicate entries for an absolute path,
    // take the shorter of them.
    const existingByPath = this._sourceByAbsolutePath.get(source.absolutePath);
    // if (
    //   existingByPath === undefined ||
    //   existingByPath.url.length > source.url.length ||
    //   isCompiledSourceOf(existingByPath, source)
    // ) {
    //   this._sourceByAbsolutePath.set(source.absolutePath, source);
    // }

    // simply take this one (newest)
    if(!existingByPath || source instanceof SourceFromMap){
      this._sourceByAbsolutePath.set(source.absolutePath, source);
    }

    // this.scriptSkipper.initializeSkippingValueForSource(source);
    return source.toDap().then(dap => this._dap.loadedSource({ reason: 'new', source: dap }));
  }

  public removeSource(source: Source, silent = false) {
    const existing = this._sourceByReference.get(source.sourceReference);
    if (existing === undefined) {
      return; // already removed
    }

    this.logger.assert(
      source === existing,
      'Expected source to be the same as the existing reference',
    );
    this._sourceByReference.delete(source.sourceReference);
    this._sourceByAbsolutePath.delete(source.absolutePath);


    // check for overwrites:
    if (this._sourceByOriginalUrl.get(source.url) === source) {
      this._sourceByOriginalUrl.delete(source.url);
    }

    if (source instanceof SourceFromMap) {
      this._sourceMapSourcesByUrl.delete(source.url);
      for (const [compiled, key] of source.compiledToSourceUrl) {

        // compiled.sourceMap.sourceByUrl.delete(key)
      }
    }

    if (source.outgoingSourceMap) {
      this._permanentlyDisabledSourceMaps.delete(source);
      this._temporarilyDisabledSourceMaps.delete(source);
    }

    if (!silent) {
      source.toDap().then(dap => this._dap.loadedSource({ reason: 'removed', source: dap }));
    }

    // todo: enably again

    if (!source.outgoingSourceMap) return;

    const sourceMap = source.outgoingSourceMap;
    if (
      !this.logger.assert(
        sourceMap,
        `Source map missing for ${source.url} in removeSource()`,
      )
    ) {
      return;
    }
    this.logger.assert(
       sourceMap.source === source,
      `Source map ${source.url} does not contain source ${source.url}`,
    );

    // sourceMap.sourceByUrl.delete(source);
    // if (!sourceMap.compiled.size) {

      // this._sourceMaps.delete(source.outgoingSourceMap?.url);
    // }
    // Source map could still be loading, or failed to load.
    if (sourceMap) {
      this._removeSourceMapSources(source, sourceMap, silent);
    }

    if (sourceMap) sourceMap.destroy();
  }

  async _addSourceMapSources(compiled: Script, map: SourceMap) {
    const todo: Promise<unknown>[] = [];
    const sources: SourceFromMap[] = [];
    for (const url of map.sources) {
      const absolutePath = await this.sourcePathResolver.urlToAbsolutePath({ url, map });
      const resolvedUrl = absolutePath
        ? utils.absolutePathToFileUrl(absolutePath)
        : map.computedSourceUrl(url);

      let existing = this._sourceMapSourcesByUrl.get(resolvedUrl);
      // fix: some modules, like the current version of the 1DS SDK, managed to
      // generate self-referential sourcemaps (sourcemaps with sourcesContent that
      // have a sourceMappingUrl that refer to the same file). Avoid adding those
      // in this check.
      if (compiled === existing) {
        continue;
      }

      if(absolutePath && this._sourceByAbsolutePath.get(absolutePath)){
        existing = this._sourceByAbsolutePath.get(absolutePath)
      }

      let source
      if (existing instanceof SourceFromMap) {
        // In the case of a Webpack HMR, remove the old source entirely and
        // replace it with the new one.
        source = existing
        if (isWebpackHMR(compiled.url) || isViteHmr(compiled.url)) {
          // this.removeSource(existing);
        } else {
          // existing.compiledToSourceUrl.set(compiled, url);
          // existing.sourceByUrl.set(url, existing);
          // continue;
        }
      } else {
        this.logger.verbose(LogTag.RuntimeSourceCreate, 'Creating source from source map', {
          inputUrl: url,
          sourceMapId: map.id,
          absolutePath,
          resolvedUrl,
        });

        const fileUrl = absolutePath && utils.absolutePathToFileUrl(absolutePath);
        const smContent = this.sourceMapFactory.guardSourceMapFn(
          map,
          () => map.sourceContentFor(url, true),
          () => null,
        );

        let sourceMapUrl: string | undefined;
        if (smContent) {
          const rawSmUri = sourceUtils.parseSourceMappingUrl(smContent);
          if (rawSmUri) {
            const smIsDataUri = utils.isDataUri(rawSmUri);
            if (!smIsDataUri && absolutePath) {
              sourceMapUrl = utils.completeUrl(
                absolutePath ? utils.absolutePathToFileUrl(absolutePath) : url,
                rawSmUri,
              );
            } else {
              sourceMapUrl = rawSmUri;
            }
          }

          if (absolutePath && sourceMapUrl) {
            const smMetadata: ISourceMapMetadata = {
              sourceMapUrl,
              compiledPath: absolutePath,
            };

            if (!this.sourcePathResolver.shouldResolveSourceMap(smMetadata)) {
              sourceMapUrl = undefined;
            }
          }
        }

        source = new SourceFromMap(
          this,
          resolvedUrl,
          absolutePath,
          smContent !== null
            ? () => Promise.resolve(smContent)
            : fileUrl
            ? () => this.resourceProvider.fetch(fileUrl).then(r => r.body)
            : () => compiled.source.content(),
          // Support recursive source maps if the source includes the source content.
          // This obviates the need for the `source-map-loader` in webpack for most cases.
          undefined,
          compiled.runtimeScriptOffset,
        );
        todo.push(this.addSource(source));
      }

      sources.push(source)
      source.compiledToSourceUrl.set(source, url);
      source.incommingSourceMaps.add(map)
      // compiled.sourceMap.sourceByUrl.set(url, source);
      map.sourceByUrl.set(url, source);

    }

    await Promise.all(todo);
    return sources
  }

  private _removeSourceMapSources(compiled: Source, map: SourceMap, silent: boolean) {
    for (const sourceFromMap of map.sourceByUrl.values()) {
      sourceFromMap.incommingSourceMaps.delete(map);
      if (sourceFromMap.incommingSourceMaps.size) return;
      this.removeSource(sourceFromMap, silent);
    }
  }

  /**
   * Opens the UI location within the connected editor.
   */
  public async revealUiLocation(uiLocation: IUiLocation) {
    this._dap.revealLocationRequested({
      source: await uiLocation.source.toDap(),
      line: uiLocation.lineNumber,
      column: uiLocation.columnNumber,
    });
  }

  /**
   * Disables the source map for the given source, either only until we
   * stop debugging within the file, or permanently.
   */
  public disableSourceMapForSource(source: Source, permanent = false) {
    if (permanent) {
      this._permanentlyDisabledSourceMaps.add(source);
    } else {
      this._temporarilyDisabledSourceMaps.add(source);
    }
  }

  /**
   * Clears temporarily disables maps for the sources.
   */
  public clearDisabledSourceMaps(forSource?: Source) {
    if (forSource) {
      this._temporarilyDisabledSourceMaps.delete(forSource);
    } else {
      this._temporarilyDisabledSourceMaps.clear();
    }
  }
}

type LineColumn = { lineNumber: number; columnNumber: number }; // 1-based

export function uiToRawOffset<T extends LineColumn>(lc: T, offset?: InlineScriptOffset): T {
  if (!offset) {
    return lc;
  }

  let { lineNumber, columnNumber } = lc;
  if (offset) {
    lineNumber += offset.lineOffset;
    if (lineNumber <= 1) columnNumber += offset.columnOffset;
  }

  return { ...lc, lineNumber, columnNumber };
}

export function rawToUiOffset<T extends LineColumn>(lc: T, offset?: InlineScriptOffset): T {
  if (!offset) {
    return lc;
  }

  let { lineNumber, columnNumber } = lc;
  if (offset) {
    lineNumber = Math.max(1, lineNumber - offset.lineOffset);
    if (lineNumber <= 1) columnNumber = Math.max(1, columnNumber - offset.columnOffset);
  }

  return { ...lc, lineNumber, columnNumber };
}

export const base0To1 = (lc: LineColumn) => ({
  lineNumber: lc.lineNumber + 1,
  columnNumber: lc.columnNumber + 1,
});

export const base1To0 = (lc: LineColumn) => ({
  lineNumber: lc.lineNumber - 1,
  columnNumber: lc.columnNumber - 1,
});



interface RawExternalSection {
  offset: Position;
  url: string;
}

/**
 * The typings for source-map don't support this, but the spec does.
 * @see https://sourcemaps.info/spec.html#h.535es3xeprgt
 */
export interface RawIndexMapUnresolved extends StartOfSourceMap {
  version: number;
  sections: (RawExternalSection | RawSection)[];
}

/**
 * Base implementation of the ISourceMapFactory.
 */
@injectable()
export class SourceMapFactory implements ISourceMapFactory {
  /**
   * A set of sourcemaps that we warned about failing to parse.
   * @see ISourceMapFactory#guardSourceMapFn
   */
  private hasWarnedAboutMaps = new WeakSet<SourceMap>();

  constructor(
    @inject(ISourcePathResolver) private readonly pathResolve: ISourcePathResolver,
    @inject(IResourceProvider) private readonly resourceProvider: IResourceProvider,
    @inject(IRootDapApi) protected readonly dap: Dap.Api,
    @inject(ILogger) private readonly logger: ILogger,
  ) {}

  /**
   * @inheritdoc
   */
  public async load(metadata: ISourceMapMetadata): Promise<SourceMap> {
    const basic = await this.parseSourceMap(metadata.sourceMapUrl);

    // The source-map library is destructive with its sources parsing. If the
    // source root is '/', it'll "helpfully" resolve a source like `../foo.ts`
    // to `/foo.ts` as if the source map refers to the root of the filesystem.
    // This would prevent us from being able to see that it's actually in
    // a parent directory, so we make the sourceRoot empty but show it here.
    const actualRoot = basic.sourceRoot;
    basic.sourceRoot = undefined;

    let hasNames = false;

    // The source map library (also) "helpfully" normalizes source URLs, so
    // preserve them in the same way. Then, rename the sources to prevent any
    // of their names colliding (e.g. "webpack://./index.js" and "webpack://../index.js")
    let actualSources: string[] = [];
    if ('sections' in basic) {
      actualSources = [];
      let i = 0;
      for (const section of basic.sections) {
        actualSources.push(...section.map.sources);
        section.map.sources = section.map.sources.map(() => `source${i++}.js`);
        hasNames ||= !!section.map.names?.length;
      }
    } else if ('sources' in basic && Array.isArray(basic.sources)) {
      actualSources = basic.sources;
      basic.sources = basic.sources.map((_, i) => `source${i}.js`);
      hasNames = !!basic.names?.length;
    }

    return new SourceMap(
      await new SourceMapConsumer(basic),
      metadata,
      actualRoot ?? '',
      actualSources,
      hasNames,
      metadata.loaded
    );
  }

  private async parseSourceMap(sourceMapUrl: string): Promise<RawSourceMap | RawIndexMap> {
    let sm: RawSourceMap | RawIndexMapUnresolved | undefined;
    try {
      sm = await this.parseSourceMapDirect(sourceMapUrl);
    } catch (e) {
      sm = await this.parsePathMappedSourceMap(sourceMapUrl);
      if (!sm) {
        throw e;
      }
    }

    if ('sections' in sm) {
      const resolved = await Promise.all(
        sm.sections.map((s, i) =>
          'url' in s
            ? this.parseSourceMap(s.url)
                .then(map => ({ offset: s.offset, map: map as RawSourceMap }))
                .catch(e => {
                  this.logger.warn(LogTag.SourceMapParsing, `Error parsing nested map ${i}: ${e}`);
                  return undefined;
                })
            : s,
        ),
      );

      sm.sections = resolved.filter(truthy);
    }

    return sm as RawSourceMap | RawIndexMap;
  }

  public async parsePathMappedSourceMap(url: string) {
    if (isDataUri(url)) {
      return;
    }

    const localSourceMapUrl = await this.pathResolve.urlToAbsolutePath({ url });
    if (!localSourceMapUrl) return;

    try {
      return this.parseSourceMapDirect(localSourceMapUrl);
    } catch (error) {
      this.logger.info(LogTag.SourceMapParsing, 'Parsing path mapped source map failed.', error);
    }
  }

  /**
   * @inheritdoc
   */
  public guardSourceMapFn<T>(sourceMap: SourceMap, fn: () => T, defaultValue: () => T): T {
    try {
      return fn();
    } catch (e) {
      if (!/error parsing/i.test(String(e.message))) {
        throw e;
      }

      if (!this.hasWarnedAboutMaps.has(sourceMap)) {
        const message = sourceMapParseFailed(sourceMap.metadata.compiledPath, e.message).error;
        this.dap.output({
          output: message.format + '\n',
          category: 'stderr',
        });
        this.hasWarnedAboutMaps.add(sourceMap);
      }

      return defaultValue();
    }
  }

  /**
   * @inheritdoc
   */
  public dispose() {
    // no-op
  }

  private async parseSourceMapDirect(
    sourceMapUrl: string,
  ): Promise<RawSourceMap | RawIndexMapUnresolved> {
    let absolutePath = fileUrlToAbsolutePath(sourceMapUrl);
    if (absolutePath) {
      absolutePath = this.pathResolve.rebaseRemoteToLocal(absolutePath);
    }

    const content = await this.resourceProvider.fetch(absolutePath || sourceMapUrl);
    if (!content.ok) {
      throw content.error;
    }

    let body = content.body;
    if (body.slice(0, 3) === ')]}') {
      body = body.substring(body.indexOf('\n'));
    }

    return JSON.parse(body);
  }
}

/**
 * A cache of source maps shared between the Thread and Predictor to avoid
 * duplicate loading.
 */
@injectable()
export class CachingSourceMapFactory extends SourceMapFactory {
  private readonly knownMaps = new MapUsingProjection<
    string,
    {
      metadata: ISourceMapMetadata;
      reloadIfNoMtime: boolean;
      prom: Promise<SourceMap>;
    }
  >(s => s.toLowerCase());

  /**
   * Sourcemaps who have been overwritten by newly loaded maps. We can't
   * destroy these since sessions might still references them. Once finalizers
   * are available this can be removed.
   */
  private overwrittenSourceMaps: Promise<SourceMap>[] = [];

  /**
   * @inheritdoc
   */
  public load(metadata: ISourceMapMetadata): Promise<SourceMap> {
    const existing = this.knownMaps.get(metadata.sourceMapUrl);
    if (!existing) {
      return this.loadNewSourceMap(metadata);
    }

    const curKey = metadata.cacheKey;
    const prevKey = existing.metadata.cacheKey;
    // If asked to reload, do so if either map is missing a mtime, or they aren't the same
    if (existing.reloadIfNoMtime) {
      if (!(curKey && prevKey && curKey === prevKey)) {
        this.overwrittenSourceMaps.push(existing.prom);
        return this.loadNewSourceMap(metadata);
      } else {
        existing.reloadIfNoMtime = false;
        return existing.prom;
      }
    }

    // Otherwise, only reload if times are present and the map definitely changed.
    if (prevKey && curKey && curKey !== prevKey) {
      this.overwrittenSourceMaps.push(existing.prom);
      return this.loadNewSourceMap(metadata);
    }

    return existing.prom;
  }

  private loadNewSourceMap(metadata: ISourceMapMetadata) {
    const created = super.load(metadata);
    this.knownMaps.set(metadata.sourceMapUrl, { metadata, reloadIfNoMtime: false, prom: created });
    return created;
  }

  /**
   * @inheritdoc
   */
  public dispose() {
    for (const map of this.knownMaps.values()) {
      map.prom.then(
        m => m.destroy(),
        () => undefined,
      );
    }

    for (const map of this.overwrittenSourceMaps) {
      map.then(
        m => m.destroy(),
        () => undefined,
      );
    }

    this.knownMaps.clear();
  }

  /**
   * Invalidates all source maps that *don't* have associated mtimes, so that
   * they're reloaded the next time they're requested.
   */
  public invalidateCache() {
    for (const map of this.knownMaps.values()) {
      map.reloadIfNoMtime = true;
    }
  }
}
