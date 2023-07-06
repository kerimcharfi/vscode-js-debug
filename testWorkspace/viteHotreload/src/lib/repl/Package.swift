// swift-tools-version: 5.7
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "repl",
    dependencies: [
        .package(name: "CustomDump", url: "https://github.com/pointfreeco/swift-custom-dump", from: "0.3.0")
    ],
    targets: [
        // Targets are the basic building blocks of a package, defining a module or a test suite.
        // Targets can depend on other targets in this package and products from dependencies.
        .target(name: "runtime_imports", dependencies: []),
        // .target(name: "repl", dependencies: []),
        .target(name: "repl_runtime", dependencies: ["runtime_imports", "CustomDump"]),
        .executableTarget(
            name: "repl",
            dependencies: [
                "repl_runtime",   
            ],
            swiftSettings: [.unsafeFlags([
                // "-I", "Sources/hello_cpp",
                // "-enable-experimental-cxx-interop",
                "-emit-module"
            ])]
        )
                // .executableTarget(name: "anothermain", dependencies: ["repl"]),

    ]
)
