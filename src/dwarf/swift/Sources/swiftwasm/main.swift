// Copyright 2020 Carton contributors
// https://github.com/swiftwasm/carton/blob/main/Sources/CartonHelpers/StackTrace.swift
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// #if canImport(Darwin)
//   import Darwin
// #elseif canImport(Glibc)
//   import Glibc
// #endif

import Foundation
import imports

@_silgen_name("swift_demangle")
public func _stdlib_demangleImpl(
  mangledName: UnsafePointer<CChar>?,
  mangledNameLength: UInt,
  outputBuffer: UnsafeMutablePointer<CChar>?,
  outputBufferSize: UnsafeMutablePointer<UInt>?,
  flags: UInt32
) -> UnsafeMutablePointer<CChar>?

func _demangle(_ mangledName: String) -> String {
  mangledName.utf8CString.withUnsafeBufferPointer { mangledNameUTF8CStr in
    let demangledNamePtr = _stdlib_demangleImpl(
      mangledName: mangledNameUTF8CStr.baseAddress,
      mangledNameLength: UInt(mangledNameUTF8CStr.count - 1),
      outputBuffer: nil,
      outputBufferSize: nil,
      flags: 0
    )

    if let demangledNamePtr = demangledNamePtr {
      let demangledName = String(cString: demangledNamePtr)
      free(demangledNamePtr)
      return
        demangledName
        .replacingOccurrences(of: " Swift.", with: " ")
        .replacingOccurrences(of: "(Swift.", with: "(")
        .replacingOccurrences(of: "<Swift.", with: "<")
    }
    return mangledName
  }
}


@_cdecl("demangle")
func demangle(ptr: UnsafePointer<CChar>) {
  let str = String(cString: ptr)
  // print(str)
  print(_demangle(str))
  // print("_demangle(String(cString: ptr)")
  // debugger()
  // print("demangled")
}

// print("helooo")
// import imports

// @_cdecl("foit")
// func foit(ptr: UnsafePointer<CChar>, size: Int){
//     let myint = 47; // var30
//     let anotherint = myint + size
//     print(myint)
//     let stepfile_text = String(cString: ptr)
//     print("running foit ")
//     print(demangle("$s9swiftwasm4foit3ptr4sizeySPys4Int8VG_SitF"))
//     print(demangle("$s9swiftwasm5afuncSSyF"))

//     afunc()
// }

// func afunc() -> String{
//     print("hello swifty ")
//     let mystr = "jeeloo"
//     print(mystr)
//     debugger()
//     return mystr
// }
