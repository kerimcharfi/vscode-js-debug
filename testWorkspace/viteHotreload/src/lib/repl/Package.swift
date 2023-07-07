// swift-tools-version: 5.7
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "repl",
    dependencies: [
      .package(url: "https://github.com/swift-extras/swift-extras-json.git", .upToNextMajor(from: "0.6.0")),
    ],
    targets: [
      // Targets are the basic building blocks of a package, defining a module or a test suite.
      // Targets can depend on other targets in this package and products from dependencies.
      // .target(name: "repl", dependencies: []),
      .target(name: "repl_runtime", dependencies: ["runtime_imports",
              .product(name: "ExtrasJSON", package: "swift-extras-json"),
      ]),
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
    ]
)
