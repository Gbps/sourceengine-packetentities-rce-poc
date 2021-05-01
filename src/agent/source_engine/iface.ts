// CreateInterface implementation to grab interface pointers from modules

function CreateInterface(module: Module, iface: string) {
    // get the export
    let ci_ptr = module.getExportByName("CreateInterface")

    // create a native function for it to call it
    let ci = new NativeFunction(ci_ptr, 'pointer', ['pointer', 'pointer'], { abi: "sysv" })

    // allocate space for the interface string
    let strVal = Memory.allocAnsiString(iface)

    // call createinterface
    let result = ci(strVal, new NativePointer(0))

    return result as NativePointer;
}

export default { CreateInterface }