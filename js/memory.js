class Memory {
  /**
   *
   * @param {Uint8Array} data
   */
  constructor(data) {
    this._data = data;
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
}
