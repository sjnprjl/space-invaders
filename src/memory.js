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
  addData(data, offset = 0x00) {
    this._data.set(data, offset);
  }

  get length() {
    return this._data.length;
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
    this._data[address] = value;
  }
  get data() {
    return this._data;
  }
}

if (typeof module !== "undefined") module.exports = Memory;
