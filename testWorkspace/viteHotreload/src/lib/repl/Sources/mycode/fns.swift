import imports
import CustomDump

extension Int32: CustomDumpStringConvertible{
    public var customDumpDescription: String { get{
        print("invoced")
        return String(self)
    } }
}

// extension Int: CustomDumpStringConvertible{
//     public var customDumpDescription: String { get{
//         print("invoced")
//         return String(self)
//     } }
// }

struct astruct{
    var a: Float32 = 5
    var b: Int = 3
}

class Car{
    var name = "fiat rary"
    var maxSpeed: Int = 301 
    var gear: Int32 = 3 
    var myDict = ["Nepal": "Kathmandu", "Italy": "Rome", "England": "London"]
    var mySet: Set = [112, 114, 116, 118, 115]
    var myTuple = ("MacBook", 1099.99)

    // var delegate = i32
    
    var tires = [Tire()]
    func accelerate(deltaV: Int){
        maxSpeed += deltaV
    }
}

class Star{
    var name = "maggus"
    var cars =  [Car()]
}

@_cdecl("repl")
func repl(ptr: UnsafeMutableRawPointer) -> Int32 {
    // let x = UnsafeMutablePointer<aclass>(ptr)
    let x = ptr.assumingMemoryBound(to: Car.self)
    // print(x.pointee)
    return Int32(x.pointee.maxSpeed)
    // let myint = 47; // var30
    // let anotherint = myint + size
    // print(myint)
    // let stepfile_text = String(cString: ptr)
    // var aobj = aclass()

    // var address = withUnsafeMutablePointer(to: &aobj) {UnsafeMutablePointer<Void>($0)}

    // repl(address)
    // debugger()
}

@_cdecl("repl2")
func repl2(ptr: UnsafeMutableRawPointer) -> Int32 {
    // let x = UnsafeMutablePointer<aclass>(ptr)
    let x: UnsafeMutablePointer<Car> = ptr.assumingMemoryBound(to: Car.self)
    // print(x.pointee)
    return Int32(x.pointee.maxSpeed)
    // let myint = 47; // var30
    // let anotherint = myint + size
    // print(myint)
    // let stepfile_text = String(cString: ptr)
    // var aobj = aclass()

    // var address = withUnsafeMutablePointer(to: &aobj) {UnsafeMutablePointer<Void>($0)}

    // repl(address)
    // debugger()
}

func i32(_ v: UnsafeMutablePointer<Tire>) -> Int32{ 
    return Int32(Int(bitPattern: v))
}

func i32(_ v: UnsafeMutablePointer<Car>) -> Int32{ 
    return Int32(Int(bitPattern: v))
}


@_cdecl("repl3")
func repl3(ptr: Int32) {
    var instance = Car()
    // let instance = UnsafeMutablePointer<Car>(bitPattern: Int(ptr))!.pointee
    // debugger()
    // let x: UnsafeMutablePointer<aclass> = ptr.assumingMemoryBound(to: aclass.self)
// func repl3(ptr: UnsafeMutableRawPointer) {
//     let x: UnsafeMutablePointer<aclass> = ptr.assumingMemoryBound(to: aclass.self)
    // instance.tires[0].myint32 = 2342
    // print(instance.maxSpeed)
    // print(instance.gear)
    var address = withUnsafeMutablePointer(to: &instance) {i32($0)}

    testfn(address)
    // print(instance.maxSpeed)
    // dump(instance)
    // customDump(instance)
    // // let acopy = aclass()
    // debugger()
    // // acopy.myfloat = x.pointee.myfloat
    // // acopy.myinti = x.pointee.myinti
    // // acopy.mystruct = x.pointee.mystruct
    // // dump()
    // // dump(acopy)
    // print(acopy.myfloat)
    // print(acopy.mystruct)
    // return ptr + 1
    // let myint = 47; // var30
    // let anotherint = myint + size
    // print(myint)
    // let stepfile_text = String(cString: ptr)
    // var aobj = aclass()

    // var address = withUnsafeMutablePointer(to: &aobj) {UnsafeMutablePointer<Void>($0)}

    // repl(address)
    // debugger()
}

@_cdecl("repl4")
func repl4(ptr: Int32) -> Int32 {
    // let x = UnsafeMutablePointer<aclass>(ptr)
    // print(x.pointee)
    return ptr + 1
    // let myint = 47; // var30
    // let anotherint = myint + size
    // print(myint)
    // let stepfile_text = String(cString: ptr)
    // var aobj = aclass()

    // var address = withUnsafeMutablePointer(to: &aobj) {UnsafeMutablePointer<Void>($0)}

    // repl(address)
    // debugger()
}

// @_cdecl("repl")
// func repl(ptr: Int32) -> Int32{
//     // let x = UnsafeMutablePointer<aclass>(ptr)
//     return ptr + 1
//     // let myint = 47; // var30
//     // let anotherint = myint + size
//     // print(myint)
//     // let stepfile_text = String(cString: ptr)
//     // var aobj = aclass()

//     // var address = withUnsafeMutablePointer(to: &aobj) {UnsafeMutablePointer<Void>($0)}

//     // repl(address)
//     // debugger()
// }

