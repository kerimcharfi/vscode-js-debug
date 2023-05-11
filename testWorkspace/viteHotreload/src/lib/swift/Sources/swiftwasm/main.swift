import imports

@_cdecl("foit")
func foit(ptr: UnsafePointer<CChar>, size: Int){
    let myint = 47; // var30
    let anotherint = myint + size
    print(myint)
    let stepfile_text = String(cString: ptr)
    print("running foit    ")
    // afunc()
    
    anotherone()
    anotherone()
    anotherone()
    anotherone()
    anotherone()
    anotherone()
    // afunc()
}

func afunc() -> String{
    print("hello swifty")
    let mystr = "jeeloo"
    print(mystr)
    debugger()
    return mystr
}

func anotherone(){
    print("DJ KAALIIID")
}

