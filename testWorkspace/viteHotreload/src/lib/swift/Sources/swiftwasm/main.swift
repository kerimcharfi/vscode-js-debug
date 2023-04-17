@_cdecl("foit")
func foit(ptr: UnsafePointer<CChar>, size: Int){
    let stepfile_text = String(cString: ptr)

    // debugger()
}

func afunc(){
    print("hello world")
}

afunc()
