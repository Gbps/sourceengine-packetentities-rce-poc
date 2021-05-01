#include <bitbuf.h>


DLL_EXPORT bf_write* bfwrite_New(char* buffer, int numBytes)
{
	memset(buffer, 0, numBytes);
	return new bf_write(buffer, numBytes);
}

DLL_EXPORT void bfwrite_WriteOneBit(bf_write* _this, int bit)
{
	_this->WriteOneBit(bit);
}

DLL_EXPORT void bfwrite_WriteOneByte(bf_write* _this, int byte)
{
	_this->WriteByte(byte);
}

DLL_EXPORT void bfwrite_WriteUBitVar(bf_write* _this, int value)
{
	_this->WriteUBitVar(value);
}

DLL_EXPORT void bfwrite_Reset(bf_write* _this)
{
	_this->Reset();
}

DLL_EXPORT void bfwrite_WriteUBitLong(bf_write* _this, int value, int size)
{
	_this->WriteUBitLong(value, size);
}

DLL_EXPORT void bfwrite_WriteString(bf_write* _this, const char* str)
{
	_this->WriteString(str);
}

DLL_EXPORT void bfwrite_WriteLong(bf_write* _this, long value)
{
	_this->WriteLong(value);
}

DLL_EXPORT void bfwrite_Destroy(bf_write* _this)
{
	delete _this;
}
