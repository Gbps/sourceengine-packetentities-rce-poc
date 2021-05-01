import util from '../util'

class WrappedObject {
    static vtable_addresses: Record<number, NativePointer> = {};
    static vtable_functions: Record<number, NativeFunction> = {};
    static vtable_max_index: number = 0;
    static vtable_resolved: boolean = false;

    pointer: NativePointer;

    static _PrecacheVTable(pointer: NativePointer) {
        if (this.vtable_resolved || this.vtable_max_index === 0) { return; }

        let vtable_ptr = pointer.readPointer();
        for (let i = 0; i < this.vtable_max_index + 1; i++) {
            this.vtable_addresses[i] = vtable_ptr.add(i * Process.pointerSize).readPointer();
        }

        this.vtable_resolved = true;
    }

    // get a cached vtable index for this object
    GetVTableIndex(vtableIndex: number) {
        return (this.constructor as any).vtable_addresses[vtableIndex]
    }

    constructor(ptr: NativePointer) {
        this.pointer = ptr;
        if (!this.pointer.isNull()) {
            (this.constructor as any)._PrecacheVTable(this.pointer);
        }
    }
}

export default WrappedObject;