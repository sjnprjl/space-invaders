export class IO {
  constructor(bits = 0x0) {
    this._readonly = bits;
    this._bits = bits;
  }

  get bits() {
    return this._bits;
  }

  // IN
  read(_) {
    return this._bits | this._readonly;
  }
  // OUT
  write(_, data) {
    this._bits = data | this._readonly;
  }

  reset() {
    this._bits = this._readonly;
  }
}
