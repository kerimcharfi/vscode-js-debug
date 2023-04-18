import imports

@_cdecl("foit")
func foit(ptr: UnsafePointer<CChar>, size: Int){
    let stepfile_text = String(cString: ptr)
    print("running foit     ")

    debugger()
}

func afunc(){
    print("hello swifty")
}

afunc()
