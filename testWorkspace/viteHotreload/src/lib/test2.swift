import mycode
import imports
import repl_runtime
// import CustomDump
// import Foundation

class MyMightyStruct{
    var importantProperty = 4
}

// class Variable: Codable{
//   var name: String
//   var type: String
//   var value: String

//   init(name: String, type: String, value: String){
//     self.name = name
//     self.type = type
//     self.value = value
//   }
// }

@_cdecl("repl")
func repl(ptr: UnsafeMutableRawPointer) -> UnsafePointer<UInt8> {
    let x = ptr.assumingMemoryBound(to: Car.self).pointee
    let b = MyMightyStruct();
    // debugger()
    // let x = UnsafeMutablePointer<aclass>(ptr)
    // var car = Car()
    var tire = Tire()
    var onestruct = astruct()
    // print(car.maxSpeed)

    let variables = [
        Variable(name: "tire", type: "Tire", value: "\(tire)")
    ]


    // let encoder = JSONEncoder()
    // encoder.outputFormatting = JSONEncoder.OutputFormatting.prettyPrinted
    // let encodedData = try! encoder.encode(variables)
    // let jsonString = String(data: encodedData, encoding: .utf8)
    // print(jsonString!)
    return dump_variables(variables)

    // x.maxSpeed = 1243
    // print(b)
    // print(onestruct)
    // customDump(tire)
    // debugger()
}

print("hello <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<")