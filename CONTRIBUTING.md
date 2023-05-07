# Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Development

For basic development of the extension you will need the [nightly extension](https://github.com/microsoft/vscode-js-debug#nightly-extension) locally, and you can then:

1. Clone the repo and run `npm install`
2. Run `npm run watch` in a terminal. This will compile and watch for changes in sources.
3. Run the `Extension` launch configuration.

For debugging the companion app used to launch browsers from remotes, the process is similar:

- Also clone `vscode-js-debug-companion` as a sibling directory to `vscode-js-debug`.
- Run `npm run watch` for the companion.
- Run the `Extension and Companion` launch configuration.
- Set `"browserLaunchLocation": "ui"` in your launch.json to route requests through the companion extension.

## Getting Started

Main components for this project are: Scripts, Sources, SourceMaps, the SourceContainter, Locations and Breakpoints
A Script represents a unit parsed and executed by chrome/node. It can be a plain js file, a js file containing a sourcemap which was compiled by a bundler or even a wasm module.
A Source represents a source code file which was compiled by build tools into Script, the original code before compilation or e.g. a pretty printed version of either compiled or original code.
SourceFromScript
+script
SourceFromMap
+map

Alternative:

Script

Source

ISourceMap
>ComposedSourceMap

>JSSourceMap

>DwarfSourceMap

>DummySourceMap

e.g. Script --> JsSourceMap --> local Sourcefile
e.g. Script --> ComposedMap --> Pretty printed Source
e.g. Script --> DummySourceMap --> Source contents from Script
e.g. Script --> DwarfSourceMap --> local Sourcefile

Local source Files
some sourcemaps ic

<!-- SourceFromMap // SourceFile that cannot be found on disk or is content is different compared to disk. Its content is fetched from the runtime -->

A SourceMap maps Locations between two sources.
A SourceFromMap can be pointed at from multiple SourceMaps. E.g. a module imported in many other modules. This is especially the case with inlined functions in wasm.
A SourceFromScript however only has one SourceMap pointing to many Sources.

SourceContainer

### When a Script is parsed

We check if theres an sourcemap, if so load the sourcemap and find/load the sourcefiles
if the sourcefile cant be found we log an error.
If no sourcemap is found or associated sources arent found we try to fetch the scripts contents and make a source from it linking it via a DummySourceMap

### When a Script is pretty printed

This could mean Script -> SourceMap -> SourceFile -> PrettyPrintedMap -> PrettySource
So theres a field:  PrettyPrintedMap.priorMap that will be called first

Script -> PrettyPrintedMap -> PrettySource

What about Script.SourceMap?
SourceContainer.chainedMaps
Maps the Script.SourceMap to PrettyPrintedMap

or ComposedMap?

Which Source to choose: from script, from file, from prettyprint ... ?

What are those cases?

### When a breakpoint is set

### When a breakpoint is hit

### While a SourceMap is loading

### Locations

There are ScriptLocations, which refer to locations in a executed module, and UILocations which are Locations inside corresponding Sources


cdp means chrome developer tools
dap represents a debugger adapter protocol representing a api to vscodes debug UI

important functions are

Thread._onScriptParsed which is fired when chrome runtime parsed a new js or wasm file
Thread._onPaused is fired e.g. when a breakpoint is hit