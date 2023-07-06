// swift-tools-version: 5.7
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "swift-wasm",
    dependencies: [
        .package(name: "CustomDump", path: "/home/ubu/coding/repos/swift-custom-dump")
    ],
    targets: [
        // Targets are the basic building blocks of a package, defining a module or a test suite.
        // Targets can depend on other targets in this package and products from dependencies.
        .target(name: "imports", dependencies: []),
        .target(name: "mycode", dependencies: [
            "imports",
            "CustomDump"
            ]),
        .executableTarget(
            name: "swiftwasm",
            dependencies: [
                "mycode",
                // "CustomDump"
            ],
            swiftSettings: [.unsafeFlags([
                // "-I", "Sources/hello_cpp",
                // "-enable-experimental-cxx-interop",
                // "-emit-bc"
            ])]
        ),
    ]
)
