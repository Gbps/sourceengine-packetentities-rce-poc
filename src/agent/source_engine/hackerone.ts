// Allows specification of specific offets in game files without using ret-sync

class KnownSymbol {
    relative_address: NativePointer;
    module: string;
    address: NativePointer = new NativePointer(0x00)

    constructor(relative_address: number, module: string) {
        this.module = module;
        this.relative_address = new NativePointer(relative_address);
    }

    resolveActualAddress() {
        if (this.address.isNull()) {
            let mod = Module.load(this.module);
            this.address = mod.base.add(this.relative_address)
        }
    }
}

// Symbols added specifically for TF2 build #5840528
let KnownSymbols: { [key: string]: KnownSymbol } = {
    "g_ClientGlobalVariables": new KnownSymbol(0x3ACB78, "engine.dll"),
    "sv_downloadurl": new KnownSymbol(0x605198, "engine.dll"),
    "CBaseServer::m_Clients": new KnownSymbol(0x5DAC20, "engine.dll"),
    "CNetChan::ReadSubChannelData": new KnownSymbol(0x1A0D70, "engine.dll"),
    "bf_read::ReadBytes": new KnownSymbol(0x239790, "engine.dll"),
    "Engine_Leak": new KnownSymbol(0x1A2797, "engine.dll"),
    "Engine_Leak2": new KnownSymbol(0x23AB8D, "engine.dll"),
    "CGameClient::ProcessSignonStateMsg": new KnownSymbol(0x120670, "engine.dll"),
}

// If this is true, will NOT run local analysis code.
let IsHackerOneSubmission = true;

export default { KnownSymbols, IsHackerOneSubmission };