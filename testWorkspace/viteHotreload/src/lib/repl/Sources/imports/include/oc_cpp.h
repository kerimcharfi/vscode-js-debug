#ifndef c_base_h
#define c_base_h

// __attribute__((__import_name__("malloc")))
// extern int cpp_malloc(int size);

// __attribute__((__import_name__("free")))
// extern void cpp_free(int targetPtr);

// __attribute__((__import_name__("cpp_memset")))
// extern void cpp_memset(int sourcePtr, int targetPtr, int size);

// __attribute__((__import_name__("cpp_memget")))
// extern void cpp_memget(int sourcePtr, int targetPtr, int size);

// __attribute__((__import_name__("strlen")))
// extern int cpp_strlen(int targetPtr);

__attribute__((__import_name__("consolelog")))
extern void consolelog(int targetPtr, int size);

__attribute__((__import_name__("debugger")))
extern void debugger(void);


__attribute__((__import_name__("foit")))
extern void testfn(int targetPtr);

// __attribute__((__import_name__("StringStream")))
// extern int StringStream(int CStringPtr);

// __attribute__((__import_name__("std_cout")))
// extern void std_cout(int sourcePtr);

#endif

