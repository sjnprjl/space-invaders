class ShiftHardware extends IO {
  constructor() {
    super(0x0);
    this._lsb = 0;
    this._msb = 0;
    this._shiftAmount = 0;
  }
  write(addr, data) {
    switch (addr) {
      case 0x02:
        // shift amount
        this._shiftAmount = data & 0x07;
        break;
      case 0x04:
        // shift data
        this._msb = this._lsb;
        this._lsb = data;
        break;
    }
  }
  read(addr) {
    switch (addr) {
      case 0x03:
        return ((this._msb << 8) | this._lsb) >> this._shiftAmount;
    }
  }
  reset() {
    this._lsb = 0;
    this._msb = 0;
    this._shiftAmount = 0;
  }
}
