# How to execute this PoC

1) Copy `se-extend.dll` into the same directory as `srcds.exe`. This is an extension library to help modify the server for the exploit.
2) Install `VC_redist.x86.exe` on the same machine as `srcds.exe`
3) Copy the file `out.bsp` to the `maps/` directory for the tf2 dedicated server.
4) Launch a `srcds.exe` LAN server for tf2 retail, version build `#5840528` using the map `out.bsp`
5) Launch hl2.exe for tf2 retail client, version build `#5840528`
6) Open a command prompt and execute `__main__.exe` in `exploit/__main__.exe` :

The following output should be displayed:

```
$ __main__.exe
[!] Ctrl+C to detach from instrumented program.
```

This means the script has attached to the dedicated server and is ready to exploit clients.

7) Connect to the server from tf2.

8) Your client will be exploited.