import se from '../index'
import WrappedObject from './wrappedobject'

class IBaseFileSystem extends WrappedObject {
    constructor(ptr: NativePointer) {
        super(ptr);
    }

    static CreateInterface() {
        let res = se.CreateInterface(Module.load("FileSystem_stdio.dll"), "VFileSystem022");

        // offset vtable this pointer for IBaseFileSystem
        return new IBaseFileSystem(res.add(Process.pointerSize));
    }

    static vtable_max_index: number = 6;
    Size = se.util.classfn_from_vtable(6, 'int', ['pointer', 'pointer'])
}

export default IBaseFileSystem