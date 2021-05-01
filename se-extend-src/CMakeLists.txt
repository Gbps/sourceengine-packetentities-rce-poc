cmake_minimum_required (VERSION 3.8)

project ("se-extend")

# Specify the location of hl2sdk-tf2
set( SOURCESDKDIR "E:\\e\\alliedmodders\\hl2sdk-tf2" )

# Specify the directory of srcds.exe
set( OUTPUTDIR "E:\\tf2srv\\srv")

# All the standard include directories one might need for a server-side plugin
include_directories( "${SOURCESDKDIR}/common" )
include_directories( "${SOURCESDKDIR}/public" )
include_directories( "${SOURCESDKDIR}/public/engine" )
include_directories( "${SOURCESDKDIR}/public/game/server" )
include_directories( "${SOURCESDKDIR}/public/toolframework" )
include_directories( "${SOURCESDKDIR}/public/mathlib" )
include_directories( "${SOURCESDKDIR}/public/tier0" )
include_directories( "${SOURCESDKDIR}/public/shared" )
include_directories( "${SOURCESDKDIR}/public/mathlib" )
include_directories( "${SOURCESDKDIR}/public/tier0" )
include_directories( "${SOURCESDKDIR}/public/tier1" )
include_directories( "${SOURCESDKDIR}/public/game/shared" )

# build the shared library
add_library (se-extend SHARED "se-extend.cpp")

# disable some default libraries from MSVC because valve has its own C runtime
set_target_properties(se-extend PROPERTIES LINK_FLAGS "/NODEFAULTLIB:LIBC /NODEFAULTLIB:LIBCD /NODEFAULTLIB:LIBCMTD /NODEFAULTLIB:LIBCMT")

# link together required libs given for the SE SDK
target_link_libraries(se-extend "${SOURCESDKDIR}/lib/public/tier0.lib")
target_link_libraries(se-extend "${SOURCESDKDIR}/lib/public/tier1.lib")
target_link_libraries(se-extend "${SOURCESDKDIR}/lib/public/vstdlib.lib")
target_link_libraries(se-extend "${SOURCESDKDIR}/lib/public/mathlib.lib")

set_target_properties(se-extend PROPERTIES RUNTIME_OUTPUT_DIRECTORY "${OUTPUTDIR}")