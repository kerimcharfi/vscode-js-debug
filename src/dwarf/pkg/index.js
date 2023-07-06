let imports = {};
imports['__wbindgen_placeholder__'] = module.exports;
let wasm;
const { TextDecoder, TextEncoder } = require(`util`);

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

const heap = new Array(32).fill(undefined);

heap.push(undefined, null, true, false);

let heap_next = heap.length;

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

let WASM_VECTOR_LEN = 0;

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1);
    getUint8Memory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function getObject(idx) { return heap[idx]; }

function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
    return instance.ptr;
}

let cachegetInt32Memory0 = null;
function getInt32Memory0() {
    if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
        cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachegetInt32Memory0;
}

let cachedTextEncoder = new TextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len);

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function getArrayU8FromWasm0(ptr, len) {
    return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
}

const u32CvtShim = new Uint32Array(2);

const int64CvtShim = new BigInt64Array(u32CvtShim.buffer);

function isLikeNone(x) {
    return x === undefined || x === null;
}
/**
*/
class DwarfDebugSymbolContainer {

    static __wrap(ptr) {
        const obj = Object.create(DwarfDebugSymbolContainer.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_dwarfdebugsymbolcontainer_free(ptr);
    }
    /**
    * @param {Uint8Array} data
    * @returns {DwarfDebugSymbolContainer}
    */
    static new(data) {
        var ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        var ret = wasm.dwarfdebugsymbolcontainer_new(ptr0, len0);
        return DwarfDebugSymbolContainer.__wrap(ret);
    }
    /**
    * @param {number} instruction_offset
    * @returns {WasmLineInfo | undefined}
    */
    find_file_info_from_address(instruction_offset) {
        var ret = wasm.dwarfdebugsymbolcontainer_find_file_info_from_address(this.ptr, instruction_offset);
        return ret === 0 ? undefined : WasmLineInfo.__wrap(ret);
    }
    /**
    * @returns {Array<any>}
    */
    source_list() {
        var ret = wasm.dwarfdebugsymbolcontainer_source_list(this.ptr);
        return takeObject(ret);
    }
    /**
    * @param {WasmLineInfo} info
    * @returns {number | undefined}
    */
    find_address_from_file_info(info) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(info, WasmLineInfo);
            wasm.dwarfdebugsymbolcontainer_find_address_from_file_info(retptr, this.ptr, info.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return r0 === 0 ? undefined : r1 >>> 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {number} instruction_offset
    * @returns {VariableVector | undefined}
    */
    variable_name_list(instruction_offset) {
        var ret = wasm.dwarfdebugsymbolcontainer_variable_name_list(this.ptr, instruction_offset);
        return ret === 0 ? undefined : VariableVector.__wrap(ret);
    }
    /**
    * @param {number} instruction
    * @returns {VariableVector | undefined}
    */
    global_variable_name_list(instruction) {
        var ret = wasm.dwarfdebugsymbolcontainer_global_variable_name_list(this.ptr, instruction);
        return ret === 0 ? undefined : VariableVector.__wrap(ret);
    }
    /**
    * @param {string} opts
    * @param {WasmValueVector} locals
    * @param {WasmValueVector} globals
    * @param {WasmValueVector} stacks
    * @param {number} instruction_offset
    * @returns {VariableInfo | undefined}
    */
    get_variable_info(opts, locals, globals, stacks, instruction_offset) {
        var ptr0 = passStringToWasm0(opts, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        _assertClass(locals, WasmValueVector);
        _assertClass(globals, WasmValueVector);
        _assertClass(stacks, WasmValueVector);
        var ret = wasm.dwarfdebugsymbolcontainer_get_variable_info(this.ptr, ptr0, len0, locals.ptr, globals.ptr, stacks.ptr, instruction_offset);
        return ret === 0 ? undefined : VariableInfo.__wrap(ret);
    }
}
module.exports.DwarfDebugSymbolContainer = DwarfDebugSymbolContainer;
/**
*/
class MemorySlice {

    static __wrap(ptr) {
        const obj = Object.create(MemorySlice.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_memoryslice_free(ptr);
    }
    /**
    * @returns {number}
    */
    get address() {
        var ret = wasm.__wbg_get_memoryslice_address(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} arg0
    */
    set address(arg0) {
        wasm.__wbg_set_memoryslice_address(this.ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get byte_size() {
        var ret = wasm.__wbg_get_memoryslice_byte_size(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} arg0
    */
    set byte_size(arg0) {
        wasm.__wbg_set_memoryslice_byte_size(this.ptr, arg0);
    }
    /**
    * @param {Uint8Array} data
    */
    set_memory_slice(data) {
        var ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.memoryslice_set_memory_slice(this.ptr, ptr0, len0);
    }
}
module.exports.MemorySlice = MemorySlice;
/**
*/
class VariableInfo {

    static __wrap(ptr) {
        const obj = Object.create(VariableInfo.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_variableinfo_free(ptr);
    }
    /**
    * @returns {string | undefined}
    */
    evaluate() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.variableinfo_evaluate(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            let v0;
            if (r0 !== 0) {
                v0 = getStringFromWasm0(r0, r1).slice();
                wasm.__wbindgen_free(r0, r1 * 1);
            }
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {MemorySlice} memory
    * @returns {string | undefined}
    */
    resume_with_memory_slice(memory) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(memory, MemorySlice);
            var ptr0 = memory.ptr;
            memory.ptr = 0;
            wasm.variableinfo_resume_with_memory_slice(retptr, this.ptr, ptr0);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            let v1;
            if (r0 !== 0) {
                v1 = getStringFromWasm0(r0, r1).slice();
                wasm.__wbindgen_free(r0, r1 * 1);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @returns {boolean}
    */
    is_required_memory_slice() {
        var ret = wasm.variableinfo_is_required_memory_slice(this.ptr);
        return ret !== 0;
    }
    /**
    * @returns {boolean}
    */
    is_completed() {
        var ret = wasm.variableinfo_is_completed(this.ptr);
        return ret !== 0;
    }
    /**
    * @returns {MemorySlice}
    */
    required_memory_slice() {
        var ret = wasm.variableinfo_required_memory_slice(this.ptr);
        return MemorySlice.__wrap(ret);
    }
    /**
    * @returns {Uint8Array}
    */
    memory() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.variableinfo_memory(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @returns {string}
    */
    address() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.variableinfo_address(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
}
module.exports.VariableInfo = VariableInfo;
/**
*/
class VariableVector {

    static __wrap(ptr) {
        const obj = Object.create(VariableVector.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_variablevector_free(ptr);
    }
    /**
    * @returns {number}
    */
    size() {
        var ret = wasm.variablevector_size(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} index
    * @returns {string}
    */
    at_name(index) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.variablevector_at_name(retptr, this.ptr, index);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
    /**
    * @param {number} index
    * @returns {string}
    */
    at_address(index) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.variablevector_at_address(retptr, this.ptr, index);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
    /**
    * @param {number} index
    * @returns {string}
    */
    at_display_name(index) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.variablevector_at_display_name(retptr, this.ptr, index);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
    /**
    * @param {number} index
    * @returns {string}
    */
    at_type_name(index) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.variablevector_at_type_name(retptr, this.ptr, index);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
    /**
    * @param {number} index
    * @returns {number}
    */
    at_group_id(index) {
        var ret = wasm.variablevector_at_group_id(this.ptr, index);
        return ret;
    }
    /**
    * @param {number} index
    * @returns {number | undefined}
    */
    at_chile_group_id(index) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.variablevector_at_chile_group_id(retptr, this.ptr, index);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return r0 === 0 ? undefined : r1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}
module.exports.VariableVector = VariableVector;
/**
*/
class WasmLineInfo {

    static __wrap(ptr) {
        const obj = Object.create(WasmLineInfo.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmlineinfo_free(ptr);
    }
    /**
    * @returns {number | undefined}
    */
    get line() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmlineinfo_line(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return r0 === 0 ? undefined : r1 >>> 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {number | undefined} arg0
    */
    set line(arg0) {
        wasm.__wbg_set_wasmlineinfo_line(this.ptr, !isLikeNone(arg0), isLikeNone(arg0) ? 0 : arg0);
    }
    /**
    * @returns {number | undefined}
    */
    get column() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmlineinfo_column(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return r0 === 0 ? undefined : r1 >>> 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {number | undefined} arg0
    */
    set column(arg0) {
        wasm.__wbg_set_wasmlineinfo_column(this.ptr, !isLikeNone(arg0), isLikeNone(arg0) ? 0 : arg0);
    }
    /**
    * @param {string} filepath
    * @param {number | undefined} line
    * @param {number | undefined} column
    * @returns {WasmLineInfo}
    */
    static new(filepath, line, column) {
        var ptr0 = passStringToWasm0(filepath, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ret = wasm.wasmlineinfo_new(ptr0, len0, !isLikeNone(line), isLikeNone(line) ? 0 : line, !isLikeNone(column), isLikeNone(column) ? 0 : column);
        return WasmLineInfo.__wrap(ret);
    }
    /**
    * @returns {string}
    */
    file() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmlineinfo_file(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
}
module.exports.WasmLineInfo = WasmLineInfo;
/**
*/
class WasmValue {

    static __wrap(ptr) {
        const obj = Object.create(WasmValue.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmvalue_free(ptr);
    }
    /**
    * @param {number} v
    * @returns {WasmValue}
    */
    static from_i32(v) {
        var ret = wasm.wasmvalue_from_i32(v);
        return WasmValue.__wrap(ret);
    }
    /**
    * @param {BigInt} v
    * @returns {WasmValue}
    */
    static from_i64(v) {
        int64CvtShim[0] = v;
        const low0 = u32CvtShim[0];
        const high0 = u32CvtShim[1];
        var ret = wasm.wasmvalue_from_i64(low0, high0);
        return WasmValue.__wrap(ret);
    }
    /**
    * @param {number} v
    * @returns {WasmValue}
    */
    static from_f32(v) {
        var ret = wasm.wasmvalue_from_f32(v);
        return WasmValue.__wrap(ret);
    }
    /**
    * @param {number} v
    * @returns {WasmValue}
    */
    static from_f64(v) {
        var ret = wasm.wasmvalue_from_f64(v);
        return WasmValue.__wrap(ret);
    }
}
module.exports.WasmValue = WasmValue;
/**
*/
class WasmValueVector {

    static __wrap(ptr) {
        const obj = Object.create(WasmValueVector.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmvaluevector_free(ptr);
    }
    /**
    * @returns {WasmValueVector}
    */
    static new() {
        var ret = wasm.wasmvaluevector_new();
        return WasmValueVector.__wrap(ret);
    }
    /**
    * @param {WasmValue} v
    */
    push(v) {
        _assertClass(v, WasmValue);
        var ptr0 = v.ptr;
        v.ptr = 0;
        wasm.wasmvaluevector_push(this.ptr, ptr0);
    }
}
module.exports.WasmValueVector = WasmValueVector;

module.exports.__wbindgen_string_new = function(arg0, arg1) {
    var ret = getStringFromWasm0(arg0, arg1);
    return addHeapObject(ret);
};

module.exports.__wbg_error_2aca027c4a37a6a5 = function(arg0, arg1) {
    console.error(getStringFromWasm0(arg0, arg1));
};

module.exports.__wbg_newwithlength_b9cd312bebec8dd5 = function(arg0) {
    var ret = new Array(arg0 >>> 0);
    return addHeapObject(ret);
};

module.exports.__wbg_set_d87dea4838fe4322 = function(arg0, arg1, arg2) {
    getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
};

module.exports.__wbindgen_throw = function(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

const path = require('path').join(__dirname, 'index_bg.wasm');
const bytes = require('fs').readFileSync(path);

const wasmModule = new WebAssembly.Module(bytes);
const wasmInstance = new WebAssembly.Instance(wasmModule, imports);
wasm = wasmInstance.exports;
module.exports.__wasm = wasm;

