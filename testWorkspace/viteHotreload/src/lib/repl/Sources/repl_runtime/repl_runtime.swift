import ExtrasJSON


public struct Variable: Codable{
    var name: String
    var type: String
    var value: String
}


let variable = Variable(name: "", type: "", value: "")

func dump_variables(_ variables: [Variable]) -> UnsafePointer<UInt8>{
    // let variables = ptr.assumingMemoryBound(to: [Variable].self).pointee
    let encoder = XJSONEncoder()
    // encoder.outputFormatting = XJSONEncoder.OutputFormatting.prettyPrinted
    let encodedData = try! encoder.encode(variables)
    return encodedData.withUnsafeBytes { (unsafeBytes) in
        return unsafeBytes.bindMemory(to: UInt8.self).baseAddress!
    }
}
