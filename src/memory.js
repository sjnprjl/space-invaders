class Memory {
  /**
   * @param {Uint8Array} data
   */
  constructor(size) {
    /**
     * 0x0000 - 0x1FFF 8K ROM
     * 0x2000 - 0x23FF 1K RAM
     * 0x2400 - 0x3FFF 7K Video RAM
     * 0x4000 - 0x43FF RAM Mirror
     */
    this._data = new Uint8Array(size);
  }

  /**
   *
   * @param {Uint8Array} data
   */
  addROMData(data) {
    this._data.set(data, 0x0000);
  }

  get length() {
    return this._data.length;
  }

  readVideoRAM() {
    return this._data.subarray(0x2400, 0x3fff);
  }

  readByte(address) {
    return this._data.at(address);
  }

  readBytes(address, length) {
    return [...this._data.slice(address, address + length)];
  }

  read16(address) {
    return this._data.at(address) | (this._data.at(address + 1) << 8);
  }
  writeByte(address, value) {
    // __DEBUG__ {
    // if (address < 0x2000) {
    //   throw new Error(`Writing to ROM: ${address.toString(16)}`);
    // }
    // __DEBUG__ }
    this._data[address] = value;
  }
}

if (typeof module !== "undefined") module.exports = Memory;
