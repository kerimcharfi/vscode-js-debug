/* tslint:disable */
/* eslint-disable */
/**
*/
export class DwarfDebugSymbolContainer {
  free(): void;
/**
* @param {Uint8Array} data
* @returns {DwarfDebugSymbolContainer}
*/
  static new(data: Uint8Array): DwarfDebugSymbolContainer;
/**
* @param {number} instruction_offset
* @returns {WasmLineInfo | undefined}
*/
  find_file_info_from_address(instruction_offset: number): WasmLineInfo | undefined;
/**
* @returns {Array<any>}
*/
  source_list(): Array<any>;
/**
* @param {WasmLineInfo} info
* @returns {number | undefined}
*/
  find_address_from_file_info(info: WasmLineInfo): number | undefined;
/**
* @param {number} instruction_offset
* @returns {VariableVector | undefined}
*/
  variable_name_list(instruction_offset: number): VariableVector | undefined;
/**
* @param {number} instruction
* @returns {VariableVector | undefined}
*/
  global_variable_name_list(instruction: number): VariableVector | undefined;
/**
* @param {string} opts
* @param {WasmValueVector} locals
* @param {WasmValueVector} globals
* @param {WasmValueVector} stacks
* @param {number} instruction_offset
* @returns {VariableInfo | undefined}
*/
  get_variable_info(opts: string, locals: WasmValueVector, globals: WasmValueVector, stacks: WasmValueVector, instruction_offset: number): VariableInfo | undefined;
}
/**
*/
export class MemorySlice {
  free(): void;
/**
* @param {Uint8Array} data
*/
  set_memory_slice(data: Uint8Array): void;
/**
* @returns {number}
*/
  address: number;
/**
* @returns {number}
*/
  byte_size: number;
}
/**
*/
export class VariableInfo {
  free(): void;
/**
* @returns {string | undefined}
*/
  evaluate(): string | undefined;
/**
* @param {MemorySlice} memory
* @returns {string | undefined}
*/
  resume_with_memory_slice(memory: MemorySlice): string | undefined;
/**
* @returns {boolean}
*/
  is_required_memory_slice(): boolean;
/**
* @returns {boolean}
*/
  is_completed(): boolean;
/**
* @returns {MemorySlice}
*/
  required_memory_slice(): MemorySlice;
/**
* @returns {Uint8Array}
*/
  memory(): Uint8Array;
/**
* @returns {string}
*/
  address(): string;
}
/**
*/
export class VariableVector {
  free(): void;
/**
* @returns {number}
*/
  size(): number;
/**
* @param {number} index
* @returns {string}
*/
  at_name(index: number): string;
/**
* @param {number} index
* @returns {string}
*/
  at_address(index: number): string;
/**
* @param {number} index
* @returns {string}
*/
  at_display_name(index: number): string;
/**
* @param {number} index
* @returns {string}
*/
  at_type_name(index: number): string;
/**
* @param {number} index
* @returns {number}
*/
  at_group_id(index: number): number;
/**
* @param {number} index
* @returns {number | undefined}
*/
  at_chile_group_id(index: number): number | undefined;
}
/**
*/
export class WasmLineInfo {
  free(): void;
/**
* @param {string} filepath
* @param {number | undefined} line
* @param {number | undefined} column
* @returns {WasmLineInfo}
*/
  static new(filepath: string, line?: number, column?: number): WasmLineInfo;
/**
* @returns {string}
*/
  file(): string;
/**
* @returns {number | undefined}
*/
  column?: number;
/**
* @returns {number | undefined}
*/
  line?: number;
}
/**
*/
export class WasmValue {
  free(): void;
/**
* @param {number} v
* @returns {WasmValue}
*/
  static from_i32(v: number): WasmValue;
/**
* @param {BigInt} v
* @returns {WasmValue}
*/
  static from_i64(v: BigInt): WasmValue;
/**
* @param {number} v
* @returns {WasmValue}
*/
  static from_f32(v: number): WasmValue;
/**
* @param {number} v
* @returns {WasmValue}
*/
  static from_f64(v: number): WasmValue;
}
/**
*/
export class WasmValueVector {
  free(): void;
/**
* @returns {WasmValueVector}
*/
  static new(): WasmValueVector;
/**
* @param {WasmValue} v
*/
  push(v: WasmValue): void;
}
