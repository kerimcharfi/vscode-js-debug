// import VogelModule

// vogel()

// func arepl(hello: Vogel){
//     print(hello)
// }
import mycode
import imports


@_cdecl("repl")
func repl(ptr: UnsafeMutableRawPointer) {
    debugger()
    // let x = UnsafeMutablePointer<aclass>(ptr)
    // var car = Car()
    var tire = Tire()
    var onestruct = astruct()
    // print(car.maxSpeed)
    let x = ptr.assumingMemoryBound(to: Car.self)
    
    // print(x.pointee)
    print(onestruct)
    dump(x.pointee)
    dump(x.pointee.maxSpeed)
    dump(x.pointee.myDict)
    // dump(x.pointee.mySet)
    // dump(x.pointee.myTuple)
    // print(x.pointee.maxSpeed)
    // dump(x.pointee.myList)
    // print(tire)
    // dump(tire)
    // dump(x.pointee.tire)
    // x.pointee.
    // let myint = 47; // var30
    // let anotherint = myint + size
    // print(myint)
    // let stepfile_text = String(cString: ptr)
    // var aobj = aclass()

    // var address = withUnsafeMutablePointer(to: &aobj) {UnsafeMutablePointer<Void>($0)}

    // repl(address)
    // debugger()
}