import se from '../index'
import WrappedObject from './wrappedobject'

class CNetChan extends WrappedObject {
    constructor(ptr: NativePointer) {
        super(ptr);
        se.vtable.retsync_vtable(this.pointer, "INetChannel")
    }

    static vtable_max_index: number = 62;
    GetAddress = se.util.classfn_from_vtable(1, 'cstring', [])
    Shutdown = se.util.classfn_from_vtable(36, 'void', ['pointer'])
    ProcessPacket = se.util.classfn_from_vtable(39, 'void', ['pointer', 'bool'])
    SendData = se.util.classfn_from_vtable(41, 'bool', ['pointer', 'bool'])
    RequestFile = se.util.classfn_from_vtable(62, 'uint', ['pointer'])
}

export default CNetChan