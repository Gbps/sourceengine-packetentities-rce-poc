import classes from './classes/index'
import WrappedObject from './classes/wrappedobject'
import HackerOne from './hackerone'

// utility functions

// create a NativeFunction object from a symbol
function classfn_from_symbol(symbol: string, retType: NativeType, argTypes: NativeType[]) {
    // resolve the address or throw an exception
    let address = DebugSymbol.getFunctionByName(symbol)

    // add 'this' to the beginning of the function
    argTypes.unshift('pointer')

    let fn = new NativeFunction(address, retType, argTypes, "thiscall");

    return function (this: any, ...args: any[]) { return fn(this.pointer, ...args); }
}

// create a NativeFunction object from a vtable index
function classfn_from_vtable(vtableIndex: number, retType: NativeType, argTypes: NativeType[]) {
    // add 'this' to the beginning of the function
    argTypes.unshift('pointer')

    // fake type for cstring to automatically read a cstring
    let convertToString = false;
    if (retType == "cstring") {
        retType = "pointer"
        convertToString = true;
    }

    let shouldConstructToWrapper = false;
    let wrapperName: string;
    // should we construct to one of our wrapper objects?
    // hack... just see if the first character is capital C
    if (retType[0] === "C") {
        shouldConstructToWrapper = true;
        wrapperName = retType as string;
        retType = "pointer";
    }

    // function wrapper which resolves the vtable lazily for the object
    let wrapped_fn = function (this: any, ...args: any[]) {
        // have we resolved this index in the vtable yet?
        let vtable_fn: Function = (this.constructor).vtable_functions[vtableIndex]
        if (vtable_fn === undefined) {
            // access the raw pointer of the vtable function
            let vtableEntry: NativePointer = (this.constructor).vtable_addresses[vtableIndex]

            // create a NativeFunction for this vtable function
            vtable_fn = new NativeFunction(vtableEntry, retType, argTypes, "thiscall");

            // save it to the vtable addresses
            (this.constructor).vtable_functions[vtableIndex] = vtable_fn
        }

        let val_result = vtable_fn(this.pointer, ...args);
        if (convertToString) {
            return val_result.readCString();
        } else {
            if (shouldConstructToWrapper) {
                // construct the object from the "classes" module
                // this can let us construct wrapper classes directly, like CGameClient
                return Reflect.construct((classes as any)[wrapperName as string], [val_result])
            }
            return val_result
        }
    };

    // store the index into the function object
    (wrapped_fn as any).index = vtableIndex;

    return wrapped_fn
}

// run without ret-sync
function get_known_symbol(symbol: string) {
    let res = HackerOne.KnownSymbols[symbol]
    if (res === undefined) {
        return null;
    }

    res.resolveActualAddress()

    return res;
}

// requires a symbol to be resolved, or throws an exception
// returns the absolute address to the symbol
function require_symbol(symbol: string) {
    let known = get_known_symbol(symbol)
    if (known !== null) {
        return known.address
    }

    let syminfo = DebugSymbol.fromName(symbol)
    if (syminfo.name === null) {
        throw new Error(`Symbol ${symbol} could not be found and was required by require_symbol!`)
    }

    return syminfo.address;
}

// requires a symbol to be resolved, or thows an exception
// returns the offset into the module
function require_offset(symbol: string) {
    let known = get_known_symbol(symbol)
    if (known !== null) {
        return known.relative_address
    }

    // get the address relative to this process
    let syminfo = DebugSymbol.fromName(symbol)
    if (syminfo.name === null || syminfo.moduleName == null) {
        throw new Error(`Symbol ${symbol} could not be found and was required by require_offset!`)
    }

    // Grab the local module base
    let modBase = Module.load(syminfo.moduleName).base;


    // Return the offset into that module
    return syminfo.address.sub(modBase)
}

export default { classfn_from_symbol, classfn_from_vtable, require_symbol, require_offset }