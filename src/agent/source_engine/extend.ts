// handles loading se-extend.dll to access useful source sdk functions through a C interface

// imports all of the helper functions from the extension dll for easy access
class ExtensionModule {
    // the loaded module in this process
    static module: Module | null = null;

    // load the DLL into the process
    static LoadModule() {
        // is it already loaded? we don't need to load it again
        if (this.module !== null) {
            return;
        }

        // load the extension library, throws exception if something goes wrong
        this.module = Module.load("se-extend.dll")

        // ensure we have initialized it before we act on it
        Module.ensureInitialized("se-extend.dll")

        // create function prototypes
        this.bfwrite_New = new NativeFunction(this.module.getExportByName("bfwrite_New"), 'pointer', ['pointer', 'int'])
        this.bfwrite_WriteOneBit = new NativeFunction(this.module.getExportByName("bfwrite_WriteOneBit"), 'void', ['pointer', 'int'])
        this.bfwrite_WriteOneByte = new NativeFunction(this.module.getExportByName("bfwrite_WriteOneByte"), 'void', ['pointer', 'int'])
        this.bfwrite_Reset = new NativeFunction(this.module.getExportByName("bfwrite_Reset"), 'void', ['pointer'])
        this.bfwrite_WriteUBitLong = new NativeFunction(this.module.getExportByName("bfwrite_WriteUBitLong"), 'void', ['pointer', 'int', 'int'])
        this.bfwrite_WriteUBitVar = new NativeFunction(this.module.getExportByName("bfwrite_WriteUBitVar"), 'void', ['pointer', 'int'])
        this.bfwrite_WriteString = new NativeFunction(this.module.getExportByName("bfwrite_WriteString"), 'void', ['pointer', 'pointer'])
        this.bfwrite_WriteLong = new NativeFunction(this.module.getExportByName("bfwrite_WriteLong"), 'void', ['pointer', 'long'])
        this.bfwrite_Destroy = new NativeFunction(this.module.getExportByName("bfwrite_Destroy"), 'void', ['pointer'])
    }

    static UnloadModule() {
        if (this.module === null) {
            return;
        }

        let k32 = Module.load("kernel32.dll")
        let freelibrary = new NativeFunction(k32.getExportByName("FreeLibrary"), 'bool', ['pointer'], 'stdcall')
        let result = freelibrary(this.module.base) as Boolean
        if (!result) {
            throw new Error("Could not unload extension DLL")
        }

        console.log("Unloaded.")
    }

    static bfwrite_New: ((buffer: NativePointer, numBytes: number) => NativeReturnValue);
    static bfwrite_WriteOneBit: ((_this: NativePointer, bit: number) => NativeReturnValue);
    static bfwrite_WriteOneByte: ((_this: NativePointer, byte: number) => NativeReturnValue);
    static bfwrite_Reset: ((_this: NativePointer) => NativeReturnValue);
    static bfwrite_WriteUBitLong: ((_this: NativePointer, value: number, size: number) => NativeReturnValue);
    static bfwrite_WriteUBitVar: ((_this: NativePointer, value: number) => NativeReturnValue);
    static bfwrite_WriteString: ((_this: NativePointer, str: NativePointer) => NativeReturnValue);
    static bfwrite_WriteLong: ((_this: NativePointer, value: number) => NativeReturnValue);
    static bfwrite_Destroy: ((_this: NativePointer) => NativeReturnValue);
}

export default ExtensionModule