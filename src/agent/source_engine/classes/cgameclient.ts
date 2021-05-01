import se from '../index'
import WrappedObject from './wrappedobject'

class CGameClient extends WrappedObject {
    constructor(ptr: NativePointer) {
        super(ptr);
        se.vtable.retsync_vtable(this.pointer, "IClient")
    }

    // Get a client by player index
    static GetClientByIndex(clientIndex: number) {

        // array of all clients in the singleton CBaseServer
        let m_Clients = se.util.require_symbol("CBaseServer::m_Clients").readPointer()
        if (m_Clients.isNull()) {
            return new CGameClient(new NativePointer(0x00))
        }

        // access the CUtlVector for the client pointer
        let client = m_Clients.add(clientIndex * Process.pointerSize).readPointer()

        // shift vtable this for the IClient vtable
        client = client.add(Process.pointerSize)

        // return the CGameClient object ready to be used
        return new CGameClient(client)
    }

    static vtable_max_index: number = 18;
    GetNetChannel = se.util.classfn_from_vtable(18, 'CNetChan', [])
}

export default CGameClient