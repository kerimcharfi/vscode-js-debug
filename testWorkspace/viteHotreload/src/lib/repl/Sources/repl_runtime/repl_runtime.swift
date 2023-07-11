import ExtrasJSON


public struct Variable: Codable{
    var name: String
    var type: String
    var value: String
}


let variable = Variable(name: "", type: "", value: "")

func dump_variables(_ variables: [Variable]) -> UnsafeMutableRawPointer{
    // let variables = ptr.assumingMemoryBound(to: [Variable].self).pointee
    let encoder = XJSONEncoder()
    // encoder.outputFormatting = XJSONEncoder.OutputFormatting.prettyPrinted
    let encodedData = try! encoder.encode(variables)
    // return encodedData.withUnsafeBytes { (unsafeBytes) in
    //     return unsafeBytes.bindMemory(to: UInt8.self).baseAddress!
    // }
    // return UnsafeMutableRawPointer.allocate(byteCount: 8, alignment: 0)
    return encodedData.withUnsafeBufferPointer { swift_ptr in
      let ptr = UnsafeMutableRawPointer.allocate(byteCount: swift_ptr.count + 1, alignment: 0)
      ptr.copyMemory(from: swift_ptr.baseAddress!, byteCount: swift_ptr.count)
      ptr.storeBytes(of: UInt8(0), toByteOffset: swift_ptr.count, as: UInt8.self)
      return ptr
    }
}
