import sys
import frida
import os

import fastlog.styles.pwntools

# Is this the build that has no map leak built in?
BUILD_NO_LEAK = False
ENGINE_BASE = None

# from retsync_frida import RetSyncClient, add_retsync
# import msvc_vtables

if BUILD_NO_LEAK:
    import argparse

    aparse = argparse.ArgumentParser()
    aparse.add_argument(
        "--engine_base",
        type=lambda x: int(x, 16),
        required=True,
        help='Put the base of engine.dll in hl2.exe here in hex. Example: "0x7A7F0000". This argument simulates chaining an info leak bug.',
    )
    args = aparse.parse_args()

    ENGINE_BASE = args.engine_base

# set current directory to wherever our python module is location
abspath = os.path.abspath(__file__)
dname = os.path.dirname(abspath)
os.chdir(dname)


def on_message(message, data):
    if message.get("payload") and message.get("payload").get("!retsync"):
        return
    print("[%s] => %s" % (message, data))


def main():
    # print("Connecting to ret-sync...")

    # client = RetSyncClient()
    # client.connect("localhost", 9100)

    # print("Connected to ret-sync")

    # get the hl2 process
    session = frida.attach("srcds.exe")

    # use v8 instead of duktape js engine
    session.enable_jit()

    # read the script
    script = open("_agent.js").read()

    # prepare to inject
    # scriptSess = session.create_script(add_retsync(script))
    scriptSess = session.create_script(script)
    scriptSess.on("message", on_message)

    # if we get any messages back...
    # scriptSess.on("message", client.message_handler(scriptSess))

    """
        def vtable_resolve(message, data):
            if message.get("payload") and message.get("payload").get("type") == "vtable":

                # vtable database generated from:
                # python -m vtable_parse --generate ClassLayout-SourceEngine --db source_engine.sqlite3
                vtable_db = msvc_vtables.LayoutDb("2013_engine.sqlite3")

                name = message["payload"]["name"]
                result = vtable_db.find(name)

                if result is None:
                    payload = None
                else:
                    payload = result.entries

                scriptSess.post({"type": "vtable", "payload": payload})

        scriptSess.on("message", vtable_resolve)
    """

    # inject it into the session
    scriptSess.load()

    # If we're using the leakless PoC
    if BUILD_NO_LEAK:
        scriptSess.post({"type": "engine_base", "payload": ENGINE_BASE})

    print("[!] Ctrl+C to detach from instrumented program.\n\n")

    try:
        sys.stdin.read()
    except KeyboardInterrupt:
        pass

    # detach from the target process
    session.detach()

    # client.disconnect()


if __name__ == "__main__":
    main()
