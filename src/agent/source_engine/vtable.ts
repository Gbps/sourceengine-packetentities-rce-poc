// functions to help with vtables


import HackerOne from './hackerone'

// create a NativeFunction from a virtual function table entry
function from_index(obj: NativePointer, vtableIndex: number, retType: NativeType, argTypes: NativeType[]) {
    let entry = get_index(obj, vtableIndex)

    // create a function for it
    return new NativeFunction(entry, retType, argTypes, { abi: "thiscall" })
}

// get a NativePointer object from an object for the given vtableIndex
function get_index(obj: NativePointer, vtableIndex: number) {
    // get vtable pointer
    let vtable = obj.readPointer()

    // offset into vtable, then get value there
    let entry = vtable.add(vtableIndex * Process.pointerSize).readPointer()

    return entry;
}

// log all valid vtable entries for a pointer
function dump_vtable(obj: NativePointer, class_name?: string) {
    if (HackerOne.IsHackerOneSubmission) { return; }

    // get vtable pointer
    let vtable = obj.readPointer()
    let names: string[] | null = [];

    // if a class name is supplied, try to resolve the names of the vtable
    if (class_name) {
        names = request_vtable(class_name)
        if (names == null) {
            throw new Error(`Could not find vtable for ${class_name}`)
        }
    }

    if (class_name) {
        console.log(`vtable for ${obj} (${class_name}) (vtable @ ${vtable}): `)
    } else {
        console.log(`vtable for ${obj} (vtable @ ${vtable}): `)
    }

    let index = 0;
    while (true) {
        let entry: NativePointer;
        try {
            // get the pointer value from the vtable
            entry = vtable.add(index * Process.pointerSize).readPointer()

            // try to read from it, if we fail we break
            entry.readPointer()
        } catch (e) {
            break;
        }

        if (names.length !== 0) {
            console.log(`\t [${index}] ${entry} (${names[index]})`)
        } else {
            console.log(`\t [${index}] ${entry}`)
        }

        index += 1;
    }
}

// if retsync is enabled, synchronizes the vtable names with ida pro to name the entries
function retsync_vtable(obj: NativePointer, class_name: string) {
    if (HackerOne.IsHackerOneSubmission) { return; }
    if (obj.isNull()) return;

    // get vtable pointer
    let vtable = obj.readPointer()
    // get all the vtable names
    let names: string[] | null = request_vtable(class_name)
    if (names == null) {
        throw new Error(`Could not find vtable for ${class_name}`)
    }

    let index = 0;
    while (true) {
        let entry: NativePointer;
        try {
            // get the pointer value from the vtable
            entry = vtable.add(index * Process.pointerSize).readPointer()

            // try to read from it, if we fail we break
            entry.readPointer()
        } catch (e) {
            break;
        }

        // if the name exists, name it in retsync
        if (names[index]) {
            // see if this name is already added, if so stop applying labels beause it's pretty slow
            let alreadyResolved = DebugSymbol.findFunctionsNamed(names[index]);
            if (alreadyResolved.length != 0) {
                return;
            }
            retsync_set_name(entry, names[index])
        }

        index += 1;
    }
}

// ask Python to respond with the vtable for a particular class
function request_vtable(class_name: string) {
    let vtable_out: string[] = [];

    send({ "type": "vtable", "name": class_name })

    let promise = recv("vtable", (o) => vtable_out = o.payload)
    promise.wait()

    return vtable_out as string[] | null;
}

export default { dump_vtable, get_index, from_index, request_vtable, retsync_vtable }