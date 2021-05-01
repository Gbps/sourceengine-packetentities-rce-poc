import WrappedObject from "./wrappedobject";
import ExtensionModule from "../extend"

// Wraps around the bf_write class used to do bitpacking operations
class bf_write extends WrappedObject {
    // the pointer to memory allocated for this bf_write
    buffer: NativePointer;

    // size of the buffer
    bufferSize: number;

    constructor(ptr: NativePointer, buffer: NativePointer, bufferSize: number) {
        super(ptr);
        this.buffer = buffer;
        this.bufferSize = bufferSize;
    }

    // create a bf_write with a buffer of the given size
    static Create(maxBytes: number) {
        // we need the extension module for this
        ExtensionModule.LoadModule();

        let buf = Memory.alloc(maxBytes);

        // create a new bf_write with a malloc'd buffer
        let createdObj = ExtensionModule.bfwrite_New(buf, maxBytes) as NativePointer
        return new bf_write(createdObj, buf, maxBytes);
    }

    // write a single bit to the buffer
    WriteBit(bit: number) {
        ExtensionModule.bfwrite_WriteOneBit(this.pointer, bit)
    }

    // write a single byte to the buffer
    WriteByte(byte: number) {
        ExtensionModule.bfwrite_WriteOneByte(this.pointer, byte)
    }

    // reset the pointer
    Reset() {
        ExtensionModule.bfwrite_Reset(this.pointer)
    }

    // Write an integer
    WriteUBitLong(value: number, size: number) {
        ExtensionModule.bfwrite_WriteUBitLong(this.pointer, value, size)
    }

    // Write a variable length integer using engine-custom packing
    WriteUBitVar(value: number) {
        ExtensionModule.bfwrite_WriteUBitVar(this.pointer, value)
    }

    // Write a string value to the bf_write
    WriteString(str: string) {
        ExtensionModule.bfwrite_WriteString(this.pointer, Memory.allocAnsiString(str))
    }

    // Write a `long` value to the output stream
    WriteLong(value: number) {
        ExtensionModule.bfwrite_WriteLong(this.pointer, value)
    }

    // Destroy the bf_write object
    Destroy() {
        ExtensionModule.bfwrite_Destroy(this.pointer)
    }

}

export default bf_write