
import imports
import JavaScriptEventLoop
import JavaScriptKit

let alert = JSObject.global.alert.function!
let document = JSObject.global.document
let JSON = JSObject.global.JSON


public struct Response: Decodable {
    let uuid: String
}

private let jsFetch = JSObject.global.fetch.function!
func fetch(_ url: String) -> JSPromise {
    JSPromise(jsFetch(url).object!)!
}

struct astruct{
    var a: Float32 = 5
    var b: Int = 3
}

struct uselessType{
    var a: Float32 = 5
    var b: Int = 3
}


class Car{
    var name = "fiat rary"
    var maxSpeed: Int = 301
    var gear: Int32 = 3
    var myDict = ["Nepal": "Kathmandu", "Italy": "Rome", "England": "London"]
    var mySet: Set<Int32> = [112, 114, 116, 118, 115]
    var myList = [112, 114, 116, 118, 115]
    var myTuple = ("MacBook", 1099.99)
    var tire = Tire()

    // var delegate = i32

    var tires = [Tire(), Tire()]
    func accelerate(deltaV: Int){
        maxSpeed += deltaV
    }
}

struct Tire{
    var myint: Int = 3
    var myint8: Int8 = 14
    var myint16: Int16 = 232
    var myint32: Int32 = 232
    var myint64: Int64 = 52
    var myunint32: UInt32 = 52
    var myfloat: Float = 42
    var myfloat32: Float32 = 52
    var myfloat64: Float64 = 7345
    var mystruct = astruct()
    var mychar: Character = "d"
    var mybool: Bool = true
}

func i32(_ v: UnsafeMutablePointer<Car>) -> Int32{
    return Int32(Int(bitPattern: v))
}

func replSim(_ ptr: Int32) {
    let instance = UnsafeMutablePointer<Car>(bitPattern: Int(ptr))!.pointee
    // print("class.init @\(ptr): \(instance.myinti)")
    print(instance.maxSpeed)
}

@_cdecl("foit")
// func foit(ptr: UnsafePointer<CChar>, size: Int){
func foit(ptr: Int32){
    let constantInt = 47; // var30
    // let anotherint = myint + size
    // print(myint)
    // let stepfile_text = String(cString: ptr)
    var atire = Tire()
    var aobj =  Car()
    // var aobj = UnsafeMutablePointer<Car>(bitPattern: Int(ptr))!.pointee
    let useless = uselessType()
    // print(234)
    // print(useless)
    var address = withUnsafeMutablePointer(to: &aobj) {i32($0)}

    JavaScriptEventLoop.installGlobalExecutor()

    // alert("hello")

    // customDump(atire)
    // Task {
    //     do {
    //         print("task is")
            
    //         let response = try await fetch("https://httpbin.org/uuid").value
    //         let json = try await JSPromise(response.json().object!)!.value
    //         let parsedResponse = try JSValueDecoder().decode(Response.self, from: json)
    //         alert(parsedResponse.uuid)
    //         alert(json)
    //     } catch {
    //         print(error)
    //     }
    // }

    print("----------------------- grooggi ----------------------")

    // Task {
    //     do {
    //         // let response = try await fetch("https://httpbin.org/uuid").value
    //         let response = fetch("https://httpbin.org/uuid")
    //         // let json = try await JSPromise(response.json().object!)!.value
    //         // let parsedResponse = try JSValueDecoder().decode(Response.self, from: json)
    //         // alert(parsedResponse.uuid)
    //     } catch {
    //         print(error)
    //     }
    // }

    var asyncButtonElement = document.createElement("button")

    var closure = JSClosure { _ in
            Task {
                do {
                    let response = try await fetch("https://httpbin.org/uuid").value
                    let json = try await JSPromise(response.json().object!)!.value
                    JSObject.global.console.log("hello")
                    let jsonstring = JSON.stringify(json)
                    // let parsedResponse = try JSValueDecoder().decode(Response.self, from: json)
                    alert(jsonstring)
                    print(jsonstring)
                    JSObject.global.console.log(String(describing: type(of: jsonstring)))

                } catch {
                    print(error)
                }
            }

            return .undefined
    }

    asyncButtonElement.innerText = "Fetch UUID demo"
    asyncButtonElement.onclick = .object(closure)

    _ = document.body.appendChild(asyncButtonElement)

    print("runned")


    // print(atire)
    // aobj.maxSpeed = 401
    // aobj.name = "lamborgotti"
    // var address = withUnsafeMutablePointer(to: &aobj) {i32($0)}
    // afunc(address)
    // replSim(address)
    // repl(address)
    // dump(aobj)

    // debugger()
    // print(aobj)
    // dump(aobj)
    // dump(aobj.tires[0])
    // print("running foit    ")
    // // afunc()

    // anotherone()
    // anotherone()
    // anotherone()
    // anotherone()
    // anotherone()
    // anotherone()
    // // afunc()
}

// func afunc() -> String{
//     print("hello swifty")
//     let mystr = "jeeloo"
//     print(mystr)
//     debugger()
//     return mystr
// }

// var asyncButtonElement = document.createElement("button")
// asyncButtonElement.innerText = "Fetch UUID demo"
// asyncButtonElement.onclick = .object(JSClosure { _ in
//     Task {
//         do {
//             let response = try await fetch("https://httpbin.org/uuid").value
//             let json = try await JSPromise(response.json().object!)!.value
//             let parsedResponse = try JSValueDecoder().decode(Response.self, from: json)
//             alert(parsedResponse.uuid)
//         } catch {
//             print(error)
//         }
//     }

//     return .undefined
// })

// _ = document.body.appendChild(asyncButtonElement)

func afunc(_ ptr: Int32){
    let aobj = UnsafeMutablePointer<Tire>(bitPattern: Int(ptr))!.pointee
    dump(aobj)
}

func anotherone(){
    print("DJ KAALIIID")
}

