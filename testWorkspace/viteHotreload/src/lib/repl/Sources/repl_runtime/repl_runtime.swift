import runtime_imports
import CustomDump
import Foundation

struct Variable: Codable{
    var name: String
    var type: String
    var value: String
}

// var testObj = Tire()
// var myStr = "This is a Striinng"
// var myList = ["a", "b", "c", "d"]
// var myInt = 52

// name: string;
// value: string;
// type?: string;

// let variables = [
//     Variable(name: "testObj", type: "Tire", value: "\(testObj)"),
//     Variable(name: "myStr", type: "String", value: "\(myStr)"),
//     Variable(name: "myList", type: "[String]", value: "\(myList)"),
//     Variable(name: "myInt", type: "Int", value: "\(myInt)"),
// ]


// @_cdecl("dump_variables")
func dump_variables(_ variables: [Variable]) -> UnsafePointer<UInt8>{
    // let variables = ptr.assumingMemoryBound(to: [Variable].self).pointee
    let encoder = JSONEncoder()
    encoder.outputFormatting = JSONEncoder.OutputFormatting.prettyPrinted
    let encodedData = try! encoder.encode(variables)
    return encodedData.withUnsafeBytes { (unsafeBytes) in
        return unsafeBytes.bindMemory(to: UInt8.self).baseAddress!
    }
}

//     let jsonString = String(data: encodedData, encoding: .utf8)
//     return jsonString
// }