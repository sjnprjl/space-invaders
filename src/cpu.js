/**
 * Intel 8080 CPU
 */
class Cpu {
  constructor({ memory }) {
    this.memory = memory;
    this._isHalted = false;

    /**
     * Registers
     */
    this.A = 0;
    this.B = 0;
    this.C = 0;
    this.D = 0;
    this.E = 0;
    this.H = 0;
    this.L = 0;
    this.SP = 0;
    this.PC = 0;

    /**
     * Flag
     */
    this.F = 0;

    this._isInterruptEnable = false;

    this._io = new Uint8Array(0x7);

    this._instructionsTable = this._buildInstructionsTable();

    // INPUTS
    // port 0
    /**
     *                 +-------- ? tied to demux port 7 ?
     *                 |+------- Right
     *                 ||+------ Left
     *                 |||+----- Fire
     *                 ||||+---- Always 1
     *                 |||||+--- Always 1
     *                 ||||||+-- Always 1
     *                 |||||||+- DIP4 (Seems to be self-test-request read at power up)
     */ //             ||||||||
    this._io[0x00] = 0b00001110;

    // port 1

    /**
     *                 +-------- Not Connected
     *                 |+------- 1P right (1 if pressed)
     *                 ||+------ 1P left (1 if pressed)
     *                 |||+----- 1P shot (1 if pressed)
     *                 ||||+---- Always 1
     *                 |||||+--- 1P start (1 if pressed)
     *                 ||||||+-- 2P start (1 if pressed)
     *                 |||||||+- Credit (1 if deposit)
     */ //             ||||||||
    this._io[0x01] = 0b00001000;

    // port 2
    /**
     *                 +-------- DIP7 Coin Info displayed in demo screen 0=ON
     *                 |+------- P2 Right (1 if pressed)
     *                 ||+------ P2 Left (1 if pressed)
     *                 |||+----- P2 Shot (1 if pressed)
     *                 ||||+---- DIP6 0 = extra shift at 1500, 1 = extra shift at 2000
     *                 |||||+--- Tilt
     *                 ||||||+-- DIP5 01 = 4 Ships 11 = 6 Ships
     *                 |||||||+- DIP3 00 = 3 Ships 10 = 5 Ships
     */ //             ||||||||
    this._io[0x02] = 0b00000000;

    // port 3
    this._io[0x3] = 0b00000000;

    // OUTPUTS
    // port 2 (bit 0,1, 2 Shift Amount)
    // port 3 (discrete sounds)
    /**
     *                 +-------- NC (not wired)
     *                 |+------- NC (not wired)
     *                 ||+------ AMP enable
     *                 |||+----- Extended Play
     *                 ||||+---- Invader die
     *                 |||||+--- Flash (player die)
     *                 ||||||+-- Shot
     *                 |||||||+- UFO (repeats)
     */ //             ||||||||
    // this._io[0x02] = 0b00000000;
  }

  get io() {
    return this._io;
  }

  get registers() {
    return {
      A: this.A,
      B: this.B,
      C: this.C,
      D: this.D,
      E: this.E,
      H: this.H,
      L: this.L,
      SP: this.SP,
      PC: this.PC,
      F: this.F,
    };
  }

  get SignFlag() {
    return this.F & 0x80;
  }

  set SignFlag(value) {
    if (value) {
      this.F |= 0x80;
    } else {
      this.F &= 0x7f;
    }
  }

  get ZeroFlag() {
    return this.F & 0x40;
  }

  set ZeroFlag(value) {
    if (value) {
      this.F |= 0x40;
    } else {
      this.F &= 0xbf;
    }
  }

  get AuxCarryFlag() {
    return this.F & 0x10;
  }

  set AuxCarryFlag(value) {
    if (value) {
      this.F |= 0x10;
    } else {
      this.F &= 0xef;
    }
  }

  get ParityFlag() {
    return this.F & 0x04;
  }

  set ParityFlag(value) {
    if (value) {
      this.F |= 0x04;
    } else {
      this.F &= 0xfb;
    }
  }

  get CarryFlag() {
    return this.F & 0x01;
  }

  set CarryFlag(value) {
    if (value) {
      this.F |= 0x01;
    } else {
      this.F &= 0xfe;
    }
  }

  get AF() {
    return (this.A << 8) | this.F;
  }

  set AF(value) {
    this.setPair("A", "F", value);
  }

  get HL() {
    return (this.H << 8) | this.L;
  }

  set HL(value) {
    this.setPair("H", "L", value);
  }

  get BC() {
    return (this.B << 8) | this.C;
  }

  set BC(value) {
    this.setPair("B", "C", value);
  }

  get DE() {
    return (this.D << 8) | this.E;
  }

  set DE(value) {
    this.setPair("D", "E", value);
  }

  setPair(r1, r2, value) {
    this[r1] = (value >> 8) & 0xff;
    this[r2] = value & 0xff;
  }

  get BC() {
    return (this.B << 8) | this.C;
  }

  get DE() {
    return (this.D << 8) | this.E;
  }

  testParity(byte) {
    byte ^= byte >> 4;
    byte ^= byte >> 2;
    byte ^= byte >> 1;
    return ~(byte & 1) & 1;
  }

  /**
   * Instructions
   */

  noop() {
    this.PC += 1;
    return 4;
  }

  /**
   * Move Immediate Data
   *
   * The byte of immediate data is stored in
   * the specified register or memory byte.
   *
   * @param {'A' | 'B' | 'C' | 'D' | 'E' | 'H' | 'L' | 'M'} dest
   * @returns
   */
  mvi(dest) {
    const value = this.memory.readByte(this.PC + 1);
    if (dest === "M") this.memory.writeByte(this.HL, value);
    else this[dest] = value;
    this.PC += 2;
    return 7;
  }

  movM() {
    const value = this.memory.readByte(this.PC + 1);
    this.memory.writeByte(this.HL, value);
    this.PC += 2;
    return 10;
  }

  movRR(dest, source) {
    this[dest] = this[source];
    this.PC += 1;
    return 5;
  }
  movRM(dest) {
    this[dest] = this.memory.readByte(this.HL);
    this.PC += 1;
    return 7;
  }
  movMR(source) {
    this.memory.writeByte(this.HL, this[source]);
    this.PC += 1;
    return 7;
  }

  _sub(a, b) {
    const bcomp2 = (~b & 0xff) + 1;
    let result = a + bcomp2;

    if (a < b) {
      this.CarryFlag = 1;
    } else {
      this.CarryFlag = 0;
    }

    if (a === b) {
      this.ZeroFlag = 1;
    } else this.ZeroFlag = 0;

    if ((a & 0xf) + (bcomp2 & 0xf) > 0x0f) {
      this.AuxCarryFlag = 1;
    } else {
      this.AuxCarryFlag = 0;
    }

    if (result & 0x80) this.SignFlag = 1;
    else this.SignFlag = 0;

    this.ParityFlag = this.testParity(result & 0xff);
    return result & 0xff;
  }

  _add2(a, b) {
    let result = a + b;
    if (result > 0xff) {
      this.CarryFlag = 1;
      result &= 0xff;
    } else {
      this.CarryFlag = 0;
    }

    if (result > 0x7f) {
      this.SignFlag = 1;
    } else this.SignFlag = 0;

    if (result === 0) {
      this.ZeroFlag = 1;
    } else this.ZeroFlag = 0;

    if ((a & 0xf) + (b & 0xf) > 0x0f) {
      this.AuxCarryFlag = 1;
    } else {
      this.AuxCarryFlag = 0;
    }

    this.ParityFlag = this.testParity(result);
    return result;
  }

  _add(value) {
    let a = this.A;
    this.A += value;

    if (this.A > 0xff) {
      this.CarryFlag = 1;
      this.A &= 0xff;
    } else {
      this.CarryFlag = 0;
    }

    if (this.A > 0x7f) {
      this.SignFlag = 1;
    } else this.SignFlag = 0;

    if (this.A === 0) {
      this.ZeroFlag = 1;
    } else this.ZeroFlag = 0;

    if ((a & 0xf) + (value & 0xf) > 9) {
      this.AuxCarryFlag = 1;
    } else {
      this.AuxCarryFlag = 0;
    }

    this.ParityFlag = this.testParity(this.A);
    this.A &= 0xff;
  }

  addR(reg) {
    this._add(this[reg]);

    this.PC += 1;
    return 4;
  }

  subR(reg) {
    const value = this[reg];
    this.A = this._sub(this.A, value);
    this.PC += 1;
    return 4;
  }

  addM() {
    const value = this.memory.readByte(this.HL);
    this._add(value);
    this.PC += 1;
    return 7;
  }

  subM() {
    const value = this.memory.readByte(this.HL);
    this.A = this._sub(this.A, value);
    this.PC += 1;
    return 7;
  }

  addCR(reg) {
    const value = this[reg];
    this._add(this.CarryFlag);
    this._add(value);
    this.PC += 1;
    return 4;
  }

  subCR(reg) {
    const value = this[reg];
    const result = this._add2(this.CarryFlag, value);
    this.A = this._sub(this.A, result);
    this.PC += 1;
    return 4;
  }

  addCM() {
    const value = this.memory.readByte(this.HL);
    this._add(this.CarryFlag);
    this._add(value);
    this.PC += 1;
    return 7;
  }

  subCM() {
    const value = this.memory.readByte(this.HL);
    const result = this._add2(this.CarryFlag, value);
    this.A = this._sub(this.A, result);
    this.PC += 1;
    return 7;
  }

  _logicalGroupFlagChange(value) {
    this.ZeroFlag = value === 0 ? 1 : 0;
    this.SignFlag = value & 0x80 ? 1 : 0;
    this.CarryFlag = 0;
    this.AuxCarryFlag = 0;
    this.ParityFlag = this.testParity(value);
  }

  _ana(value) {
    const result = this.A & value;
    this._logicalGroupFlagChange(result);
    this.A = result;
  }

  anaR(reg) {
    this._ana(this[reg]);
    this.PC += 1;
    return 4;
  }

  anaM() {
    const result = this.A & this.memory.readByte(this.HL);
    this._ana(result);
    this.PC += 1;
    return 7;
  }

  _xra(value) {
    const result = this.A ^ value;
    this._logicalGroupFlagChange(result);
    this.A = result;
  }

  xraR(reg) {
    this._xra(this[reg]);
    this.PC += 1;
    return 4;
  }

  xraM() {
    this._xra(this.memory.readByte(this.HL));
    this.PC += 1;
    return 7;
  }

  /**
   * Exclusive-OR Immediate with Accumulator
   *
   * The byte of immediate data is EXCLUSIVE-ORed with the contents of the
   * accumulator. The carry bit is set to zero.
   * Condition bits affected: Carry, Zero, Sign, Parity
   */
  xri() {
    const imm = this.memory.readByte(this.PC + 1);
    const result = this.A ^ imm;
    this._logicalGroupFlagChange(result);
    this.A = result;
    this.PC += 2;
    return 7;
  }

  _or(a, b) {
    this.CarryFlag = false;
    const result = a | b;
    this._logicalGroupFlagChange(result);
    return result;
  }

  /**
   * Logical or Register or Memory With Accumulator
   *
   * The specified byte is logically ORed bit
   * by bit with the contents of the accumulator. The carry bit
   * is reset to zero.
   *
   * @param {'A' | 'B' | 'C' | 'D' | 'E' | 'H' | 'L' |  'F' | 'M'} regm
   */
  ora(regm) {
    let value;
    if (regm === "M") value = this.memory.readByte(this.HL);
    else value = this[regm];
    this.A = this._or(value, this.A);
    this.PC += 1;
    return 4;
  }

  /**
   * Or Immediate With Accumulator
   *
   * @description
   * The byte of immediate data is logically
   * ORed with the contents of the accumulator.
   *
   * The result is stored in the accumulator. The Carry bit
   * is reset to zero, while the Zero, Sign, and Parity bits are set
   * according to the result.
   *
   * Condition bits affected: Carry, Zero, Sign, Parity
   */
  ori() {
    const imm = this.memory.readByte(this.PC + 1);
    let aux = this.AuxCarryFlag;
    this.A = this._or(imm, this.A);
    this.AuxCarryFlag = aux;
    this.PC += 2;
    return 7;
  }

  /**
   * Compare Register or Memory With Accumulator
   *
   * @description
   * The specified byte is compared to the
   * contents of the accumulator. The comparison is performed by internally
   * subtracting the contents of REG from the accumulator (leaving both
   * unchanged) and setting the condition bits according to the result. In
   * particular, the Zero bit is set if the quantities are equal, and reset if
   * they are unequal.  Since a subtract operation is performed, the Carry bit
   * will be set if there is no carry out of bit 7, indicati ng that the contents
   * of REG are greater than the contents of the accumulator, and reset
   * otherwise.  NOTE: If the two quantities to be compared differ in sign, the
   * sense of the Carry bit is reversed.  Condition bits affected: Carry, Zero,
   * Sign, Parity, Auxiliary Carry
   *
   * @param {'A' | 'B' | 'C' | 'D' | 'E' | 'H' | 'L' | 'M'} regm
   */
  cmp(regm) {
    let value;
    if (regm === "M") value = this.memory.readByte(this.HL);
    else value = this[regm];
    this._sub(this.A, value);
    this.PC += 1;
    return 4;
  }

  /**
   * Subtract Immediate From Accumulator
   *
   * The byte of immediate data is subtracted
   * from the contents of the accumulator using two's complement arithmetic.
   *
   * Since this is a subtraction operation, the carry bit is
   * set, indicating a borrow, if there is no carry out of the highorder bit
   * position, and reset if there is a carry out.  Condition bits affected: Carry,
   * Sign, Zero, Parity, Auxiliary Carry
   */
  sui() {
    this.A = this._sub(this.A, this.memory.readByte(this.PC + 1));
    this.PC += 2;
    return 7;
  }

  halt() {
    this.PC += 1;
    this._isHalted = true;
    return 1;
  }

  jmp() {
    this.PC = this.memory.read16(this.PC + 1);
    return 10;
  }

  dcrM() {
    const value = this.memory.readByte(this.HL);
    const res = this._sub(value, 1);
    this.memory.writeByte(this.HL, res);
    this.PC += 1;
    return 7;
  }

  pushXX(r1, r2) {
    this.memory.writeByte(this.SP - 1, this[r1]);
    this.memory.writeByte(this.SP - 2, this[r2]);
    this.SP -= 2;
    this.PC += 1;
    return 11;
  }

  sta() {
    const addr = this.memory.read16(this.PC + 1);
    this.memory.writeByte(addr, this.A);
    this.PC += 3;
    return 13;
  }

  /**
   * Set Carry
   *
   * @description
   * The Carry bit is set to one
   */
  stc() {
    this.CarryFlag = true;
    this.PC += 1;
    return 4;
  }

  /**
   * @param {'BC' | 'DE' | 'HL' | 'SP'} rp
   */
  LXI(rp) {
    const value = this.memory.read16(this.PC + 1);
    this[rp] = value;
    this.PC += 3;
    return 10;
  }
  call() {
    const addr = this.memory.read16(this.PC + 1);
    const h = (this.PC + 3) >> 8;
    const l = (this.PC + 3) & 0xff;
    this.memory.writeByte(this.SP - 1, h);
    this.memory.writeByte(this.SP - 2, l);
    this.SP -= 2;
    this.PC = addr;
    return 17;
  }

  /**
   * Input d8
   * TODO: Maybe add some flags to notify that input is read?
   *
   * @description
   * An eight-bit data byte is read from input
   * device number exp and replaces the contents of the accumulator
   */
  in() {
    const descriptor = this.memory.readByte(this.PC + 1);
    this.A = this._io[descriptor];
    this.PC += 2;
    return 10;
  }

  /**
   * OUT
   *
   * @description
   * The contents of the accumulator are sent
   * to output device number expo
   */
  out() {
    this._io[this.memory.readByte(this.PC + 1)] = this.A;
    this.PC += 2;
    return 10;
  }

  /**
   * Rotate Accumulator Instructions
   */

  /**
   * Rotate Accumulator Right
   */
  rrc() {
    this.CarryFlag = this.A & 0x01;
    this.A = (this.A >> 1) | (this.CarryFlag << 7);
    this.PC += 1;
    return 4;
  }

  /**
   * Rotate Accumulator Left
   *
   * @description
   * The Carry bit is set equal to the high-
   * order bit of the accumulator. The contents of the accumulator
   * are rotated one bit position to the left, with the high-order bit
   * being transferred to the low-order bit position of
   * the accumulator
   *
   * @returns {number} Total cycles
   */
  rlc() {
    this.CarryFlag = this.A & 0x80;
    this.A = ((this.A << 1) | this.CarryFlag) & 0xff;
    this.PC += 1;
    return 4;
  }

  /**
   * Rotate Accumulator Right Through Carry
   *
   * The contents of the accumulator are rotated one bit position to the right.
   *
   * The low-order bit of the accumulator replaces the carry bit, while the
   * carry bit replaces the high-order bit of the accumulator.
   *
   * Condition bits affected: Carry
   */
  rar() {
    const lsb = this.A & 0x01;
    this.A = (this.A >> 1) | (this.CarryFlag << 7);
    this.CarryFlag = lsb;
    this.PC += 1;
    return 4;
  }

  /**
   * Rotate Left Through Carry
   *
   * The content of the accumulator is rotated left one
   * position through the CY flag. The low order bit is set
   * equal to the CY flag and the CY flag is set to the
   * value shifted out of the high order bit. Only the CY
   * flag is affected.
   */
  ral() {
    let msb = this.A & 0x80;
    this.A = ((this.A << 1) | this.CarryFlag) & 0xff;
    this.CarryFlag = msb;
    this.PC += 1;
    return 4;
  }

  jc() {
    const addr = this.memory.read16(this.PC + 1);
    if (this.CarryFlag) {
      this.PC = addr;
    } else {
      this.PC += 3;
    }
    return 10;
  }
  jnc() {
    const addr = this.memory.read16(this.PC + 1);
    if (!this.CarryFlag) {
      this.PC = addr;
    } else {
      this.PC += 3;
    }
    return 10;
  }

  jz() {
    const addr = this.memory.read16(this.PC + 1);
    if (this.ZeroFlag) {
      this.PC = addr;
    } else {
      this.PC += 3;
    }
    return 10;
  }

  jnz() {
    const addr = this.memory.read16(this.PC + 1);
    if (!this.ZeroFlag) {
      this.PC = addr;
    } else {
      this.PC += 3;
    }
    return 10;
  }

  lda() {
    const addr = this.memory.read16(this.PC + 1);
    this.A = this.memory.readByte(addr);
    this.PC += 3;
    return 13;
  }

  cpi() {
    this._sub(this.A, this.memory.readByte(this.PC + 1));
    this.PC += 2;
    return 7;
  }

  adi() {
    this._add(this.memory.readByte(this.PC + 1));
    this.PC += 2;
    return 7;
  }
  daa() {
    /**
     * If the least significant four bits of the accumulator
     * represents a number greater than 9, or if the Auxiliary
     * Carry bit is equal to one, the accumulator is incremented by six.
     * Otherwise, no incrementing occurs
     */
    let carry = this.CarryFlag;
    if (this.AuxCarryFlag || (this.A & 0x0f) > 9) {
      this._add(6);
    }
    /**
     * If the most significant four bits of the accumulator
     * now represent a number greater than 9, or if the normal carry
     * bit is equal to one, the most significant four
     * bits of the accumulator are incremented by six. Otherwise,
     * no incrementing occurs
     */
    if ((this.A & 0xf0) > 0x90 || carry) {
      this._add(0x60);
    }
    this.PC += 1;
    return 4;
  }

  /**
   *
   * The contents of the specified register pair
   * are restored from two bytes of memory indicated by the
   * stack pointer SP.
   * The byte of data at the memory address indicated by the stack pointer
   * is loaded into the second register of the register pair;
   * the byte of data at the address one greater than the address indicated
   * by the stack pointer is loaded into the first register of the pair.
   * If register pair PSW is specified,
   * the byte of data indicated by the contents of the stack pointer plus one
   * is used to restore the values of the five condition bits
   * (Carry, Zero, Sign, Parity, and Auxiliary Carry)
   *
   * In any case, after the data has been restored, the stack
   * pointer is incremented by two.
   *
   * @param {string} r High bits of the register pair
   * @param {string} p Low bits of the register pair
   */
  pop(r, p) {
    this[r] = this.memory.readByte(this.SP + 1);
    this[p] = this.memory.readByte(this.SP);
    this.SP += 2;
    this.PC += 1;
    return 10;
  }

  /**
   * Enable Interrupts
   */
  ei() {
    this._isInterruptEnable = true;
    this.PC += 1;
    return 4;
  }

  /**
   * Disable Interrupts
   */
  di() {
    this._isInterruptEnable = false;
    this.PC += 1;
    return 4;
  }

  /**
   *
   * A return operation is unconditionally performed.
   * Thus, execution proceeds with the instruction immediately
   * following the last call instruction.
   *
   * Condition bits affected: None
   */
  ret() {
    this.PC = this.memory.read16(this.SP);
    this.SP += 2;
    return 10;
  }

  /**
   * Increment register pair
   */
  inx(rp) {
    const value = (this[rp] + 1) & 0xffff;
    this[rp] = value;
    this.PC += 1;
    return 5;
  }

  /**
   * Decrement register pair
   *
   * @description
   * The 16-bit number held in the specified
   * register pair is decremented by one.
   * Condition bits affected: None
   */
  dcx(rp) {
    const value = (this[rp] - 1) & 0xffff;
    this[rp] = value;
    this.PC += 1;
    return 5;
  }

  /**
   * Store H and L Direct
   *
   * The contents of the L register are stored
   * at the memory address formed by concatenating HI ADDr
   * with LOW ADDr. The contents of the H register are stored at
   * the next higher memory address.
   */
  shld() {
    const addr = this.memory.read16(this.PC + 1);
    this.memory.writeByte(addr, this.L);
    this.memory.writeByte(addr + 1, this.H);
    this.PC += 3;
    return 16;
  }

  /**
   * Increment Register or Memory
   *
   * The specified register or memory byte is
   * incremented by one.
   *
   * Condition bits affected: Zero, Sign, Parity, Auxiliary
   * Carry
   */
  inr(reg) {
    let value;
    if (reg === "M") {
      value = this.memory.readByte(this.HL);
    } else value = this[reg];

    const carry = this.CarryFlag;
    const result = this._add2(value, 1);
    this.CarryFlag = carry; // restore carry
    if (reg === "M") {
      this.memory.writeByte(this.HL, result);
    } else {
      this[reg] = result;
    }
    this.PC += 1;
    return 5;
  }

  /**
   * Decrement Register or Memory
   * The specified register or memory byte is
   * decremented by one.
   *
   * Condition bits affected: Zero, Sign, Parity, Auxiliary
   * Carry
   * @param {'A' | 'B' | 'C' | 'D' | 'E' | 'H' | 'L' | 'M'} reg
   */
  dcr(reg) {
    let value;
    if (reg === "M") {
      value = this.memory.readByte(this.HL);
    } else {
      value = this[reg];
    }
    const carry = this.CarryFlag;
    let res = this._sub(value, 1);
    this.CarryFlag = carry; // restore carry
    if (reg === "M") {
      this.memory.writeByte(this.HL, res);
    } else {
      this[reg] = res;
    }

    this.PC += 1;
    return 5;
  }

  /**
   * Subtract Immediate from Accumulator With Borrow {@link https://altairclone.com/downloads/manuals/8080%20Programmers%20Manual.pdf#page=34&zoom=auto,-89,497}
   *
   * @description
   *
   * The Carry bit is internally added to the
   * byte of immediate data. This value is then subtracted from
   * the accumulator using two's complement arithmetic.
   * This instruction and the SBB instruction are most use-
   * ful when performing multibyte subtractions. For an ex-
   * ample of th is, see the section on Multibyte Addition and
   * Subtraction in Chapter 4.
   * Since this is a subtraction operation, the carry bit js
   * set if there is no carry out of the high-order position, and
   * reset if there is a carry out.
   * Condition bits affected: Carry, Sign, Zero, Parity,
   * Auxiliary Carry
   */
  sbi() {
    let imm = this.memory.readByte(this.PC + 1);
    imm = this._add2(imm, this.CarryFlag ? 1 : 0);

    this.A = this._sub(this.A, imm);

    this.PC += 2;
    return 7;
  }

  /**
   * And Immediate with Accumulator
   *
   * The byte of immediate data is logically
   * ANDed with the contents of the accumulator. The Carry bit
   * is reset to zero
   */
  ani() {
    this.A &= this.memory.readByte(this.PC + 1);
    if (this.A === 0) this.ZeroFlag = true;
    else this.ZeroFlag = false;

    if (this.A & 0x80) this.SignFlag = true;
    else this.SignFlag = false;

    this.ParityFlag = this.testParity(this.A);

    this.CarryFlag = false;

    this.PC += 2;
    return 7;
  }

  /**
   * Add Immediate with Carry
   *
   * The byte of immediate data is added to
   * the contents of the accumulator plus the contents of the
   * carry bit.
   * Condition bits affected: Carry, Sign, Zero, Parity,
   * Auxiliary Carry
   */
  aci() {
    const imm = this.memory.readByte(this.PC + 1);
    const res = this._add2(imm, this.CarryFlag ? 1 : 0);
    this._add(res);
    this.PC += 2;
    return 7;
  }

  /**
   * Double Add
   *
   * @description
   * The 16-bit number in the specified register
   * pair is added to the 16-bit number held in the H and L
   * registers using two's complement arithmetic. The result re-
   * places the contents of the Hand L registers.
   *
   * Condition bits affected: None
   *
   *
   * @param {'BC' | 'DE' | 'HL' | 'SP'} rp  Registers Pair
   *
   * @returns {number}
   */
  dad(rp) {
    const fromRegister = this[rp];
    const added = this.HL + fromRegister;
    if (added & 0x10000) {
      this.CarryFlag = true;
    } else {
      this.CarryFlag = false;
    }
    this.HL = added & 0xffff;
    this.PC += 1;
    return 10;
  }

  /**
   * Exchange Register
   *
   * @description
   *
   * The 16 bits of data held in the H and L
   * registers are exchanged with the 16 bits of data held in the
   * D and E registers.
   *
   * Condition bits affected: None
   *
   */
  xchg() {
    const tempHL = this.HL;
    this.HL = this.DE;
    this.DE = tempHL;
    this.PC += 1;
    return 5;
  }

  /**
   * Exchange Stack
   *
   *
   * @description
   * The contents of the L register are exchanged with the contents of the
   * memory byte whose address is held in the stack pointer SP. The contents of
   * the H register are exchanged with the contents of the memory byte whose
   * address is one greater than that held in the stack pointer.
   * Condition bits affected: None
   */
  xthl() {
    const forL = this.memory.readByte(this.SP);
    const forH = this.memory.readByte(this.SP + 1);

    this.memory.writeByte(this.SP, this.L);
    this.memory.writeByte(this.SP + 1, this.H);

    this.L = forL;
    this.H = forH;

    this.PC += 1;
    return 18;
  }

  sphl() {
    this.SP = this.HL;
    this.PC += 1;
    return 5;
  }
  /**
   * Load Program Counter
   *
   * @description
   * The contents of the H register replace the
   * most significant 8 bits of the program counter, and the contents of the L
   * register replace the least significant 8 bits of the program counter. This
   * causes program execution to continue at the address contained in the Hand L
   * registers.
   */
  pchl() {
    this.PC = this.HL;
    return 5;
  }

  /**
   * Load H And L Direct
   *
   * @description
   * The byte at the memory address formed
   * by concatenating HI ADD with LOW ADD
   * replaces the contents of the L register.
   * The byte at the next higher memory
   * address replaces the contents of the H register.
   *
   * Condition bits affected: None
   */
  lhld() {
    this.HL = this.memory.read16(this.memory.read16(this.PC + 1));
    this.PC += 3;
    return 16;
  }

  /**
   * Call if zero
   *
   * @description
   * If the Zero bit is zero, a call operation is
   * performed to subroutine sub
   */
  cz() {
    if (this.ZeroFlag) return this.call();
    this.PC += 3;
    return 11;
  }

  /**
   * Call if not zero
   *
   * @description
   * If the Zero bit is one, a call operation is
   * performed to subroutine sub
   */
  cnz() {
    if (!this.ZeroFlag) return this.call();
    this.PC += 3;
    return 11;
  }

  /**
   * Call if not carry
   *
   * @description
   * If the Carry bit is zero, a call operation is
   * performed to subroutine sub
   */
  cnc() {
    if (!this.CarryFlag) return this.call();
    this.PC += 3;
    return 11;
  }
  /**
   * Call If Carry
   */
  cc() {
    if (this.CarryFlag) return this.call();
    this.PC += 3;
    return 11;
  }

  /**
   * Call if minus
   *
   * @description
   * If the Sign bit is one (indicating a minus result), a call operation is
   * performed to subroutine sub.
   *
   * Condition bits affected: None
   */
  cm() {
    if (this.SignFlag) return this.call();
    this.PC += 3;
    return 11;
  }

  /**
   * Call if plus
   *
   * @description
   * If the Sign bit is zero (indicating a plus result), a call operation is
   * performed to subroutine sub.
   *
   * Condition bits affected: None
   */
  cp() {
    if (!this.SignFlag) return this.call();
    this.PC += 3;
    return 11;
  }

  /**
   *
   * Call if Parity Odd
   *
   * @description
   *
   * If the Parity bit is zero (indicating odd parity), a call operation is
   * performed to subroutine sub.
   *
   * Condition bits affected: None
   *
   */
  cpo() {
    if (!this.ParityFlag) return this.call();
    this.PC += 3;
    return 11;
  }

  /**
   *
   * Call if Parity Even
   *
   * @description
   *
   * If the Parity bit is one (indicating even parity), a call operation is
   * performed to subroutine sub.
   *
   * Condition bits affected: None
   *
   */
  cpe() {
    if (this.ParityFlag) return this.call();
    this.PC += 3;
    return 11;
  }

  /**
   * Return if Zero (OP: 0xC9)
   *
   * @description
   * If the Zero bit is one, a return operation
   * is performed.
   */
  rz() {
    if (this.ZeroFlag) return this.ret(), 11;
    this.PC += 1;
    return 5;
  }

  /**
   * Return if not Zero
   *
   * @description
   * If the Zero bit is zero, a return operation
   * is performed.
   *
   */
  rnz() {
    if (!this.ZeroFlag) return this.ret(), 11;
    this.PC += 1;
    return 5;
  }

  /**
   * Return If No Carry
   *
   * @description
   * If the carry bit is zero, a return operation is performed.
   */
  rnc() {
    if (!this.CarryFlag) return this.ret(), 11;
    this.PC += 1;
    return 5;
  }

  /**
   * Return If Carry
   *
   * @description
   * If the carry bit is one, a return operation is performed.
   */
  rc() {
    if (this.CarryFlag) return this.ret(), 11;
    this.PC += 1;
    return 5;
  }

  /**
   * Return If Minus
   *
   * @description
   * If the Sign bit is one (indicating a minus result), a return operation is
   * performed.
   */
  rm() {
    if (this.SignFlag) return this.ret(), 11;
    this.PC += 1;
    return 5;
  }

  /**
   * Return if Plus
   *
   * If the Sign bit is zero (indicating a plus result), a return operation is
   * performed.
   */
  rp() {
    if (!this.SignFlag) return this.ret(), 11;
    this.PC += 1;
    return 5;
  }
  /**
   * Jump if minus
   *
   * @description
   * If the Sign bit is one (indicating a negative result),
   * program execution continues at the memory address adr.
   * Condition bits affected: None
   */
  jm() {
    if (this.SignFlag) this.PC = this.memory.read16(this.PC + 1);
    else this.PC += 3;
    return 10;
  }

  /**
   * Jump if positive
   *
   * @description
   * If the Sign bit is zero (indicating a positive result),
   * program execution continues at the memory address adr.
   * Condition bits affected: None
   */
  jp() {
    if (!this.SignFlag) this.PC = this.memory.read16(this.PC + 1);
    else this.PC += 3;
    return 10;
  }

  /**
   * Jump If Parity Odd
   *
   * @description
   * If the Parity bit is zero (indicating a result with odd parity), program
   * execution continues at the memory address adr.
   */
  jpo() {
    if (!this.ParityFlag) this.PC = this.memory.read16(this.PC + 1);
    else this.PC += 3;
    return 10;
  }

  /**
   * Jump If Parity Even
   *
   * @description
   * If the Parity bit is one (indicating a result with even parity), program
   * execution continues at the memory address adr.
   */
  jpe() {
    if (this.ParityFlag) this.PC = this.memory.read16(this.PC + 1);
    else this.PC += 3;
    return 10;
  }

  /**
   * Store Accumulator
   *
   * @description
   *
   * The contents of the accumulator are
   * stored in the memory location addressed by registers Band
   * C, or by registers 0 and E.
   *
   * Condition bits affected: None
   *
   * @param {'BC' | 'DE'} rp
   */
  stax(rp) {
    this.memory.writeByte(this[rp], this.A);
    this.PC += 1;
    return 7;
  }

  /**
   * Return If Parity Odd
   *
   * @description
   * If the Parity bit is zero (indicating odd parity),
   *  a return operation is performed.
   */
  rpo() {
    if (!this.ParityFlag) return this.ret(), 11;
    this.PC += 1;
    return 5;
  }

  /**
   * Return If Parity Even
   *
   * @description
   * If the Parity bit is one (indicating even parity),
   *  a return operation is performed.
   */
  rpe() {
    if (this.ParityFlag) return this.ret(), 11;
    this.PC += 1;
    return 5;
  }

  /**
   * Load Accumulator
   *
   * @description
   * The contents of the memory location
   * addressed by registers B and C, or by registers D and E,
   * replace the contents of the accumulator
   *
   * @param {'BC' | 'DE'} rp
   */
  ldax(rp) {
    this.A = this.memory.readByte(this[rp]);
    this.PC += 1;
    return 7;
  }

  /**
   * Complement Accumulator
   * Each bit of the contents of the accumulator
   * is complemented (producing the one's complement).
   *
   *  Condition bits affected: None
   */
  cma() {
    this.A = ~this.A & 0xff;
    this.PC += 1;
    return 4;
  }

  /**
   * Complement Carry
   *
   * @description
   * If the Carry bit = 0, it is set to 1. If the Carry bit = 1, it is reset to
   * O.
   *
   * Carry Condition bits affected: Carry
   */
  cmc() {
    this.CarryFlag = !this.CarryFlag;
    this.PC += 1;
    return 4;
  }

  /**
   * RST Instruction
   *
   * @description
   *
   * The contents of the program counter
   * are pushed onto the stack, providing a return address for
   * later use by a RETURN instruction
   *
   *
   * @param {number} exp RST Vector
   */
  rst(exp) {
    this.memory.writeByte(this.SP - 1, (this.PC >> 8) & 0xff);
    this.memory.writeByte(this.SP - 2, this.PC & 0xff);
    this.SP -= 2;
    this.PC = exp;
    return 11;
  }

  interrupt(op) {
    if (!this._isInterruptEnable) {
      this.PC += 1;
    }
    switch (op) {
      case 0:
        return this.rst1();
      case 1:
        return this.rst2();
    }
  }

  rst1() {
    return this._RST_1();
  }
  rst2() {
    return this._RST_2();
  }

  execute() {
    const opcode = this.memory.readByte(this.PC);
    const op = this._instructionsTable[opcode];
    if (!op) {
      throw new Error(`Invalid opcode: ${opcode.toString(16)}`);
    }
    return op.action();
  }

  /**
   * Opcodes Table
   */

  _NOP() {
    return this.noop();
  }
  _LXI_B() {
    return this.LXI("BC");
  }
  _STAX_B() {
    return this.stax("BC");
  }
  _INX_B() {
    return this.inx("BC");
  }
  _INR_B() {
    return this.inr("B");
  }
  _DCR_B() {
    return this.dcr("B");
  }
  _MVI_B() {
    return this.mvi("B");
  }
  _RLC() {
    return this.rlc();
  }
  _DAD_BC() {
    return this.dad("BC");
  }
  _LDAX_B() {
    return this.ldax("BC");
  }
  _DCX_BC() {
    return this.dcx("BC");
  }
  _INR_C() {
    return this.inr("C");
  }
  _DCR_C() {
    return this.dcr("C");
  }
  _MVI_C() {
    return this.mvi("C");
  }
  _RRC() {
    return this.rrc();
  }
  _LXI_D() {
    return this.LXI("DE");
  }
  _STAX_DE() {
    return this.stax("DE");
  }
  _INX_D() {
    return this.inx("DE");
  }
  _INR_D() {
    return this.inr("D");
  }
  _DCR_D() {
    return this.dcr("D");
  }
  _MVI_D() {
    return this.mvi("D");
  }
  _RAL() {
    return this.ral();
  }
  _DAD_DE() {
    return this.dad("DE");
  }
  _LDAX_DE() {
    return this.ldax("DE");
  }
  _DCX_DE() {
    return this.dcx("DE");
  }
  _INR_E() {
    return this.inr("E");
  }
  _DCR_E() {
    return this.dcr("E");
  }
  _MVI_E() {
    return this.mvi("E");
  }
  _RAR() {
    return this.rar();
  }
  _LXI_H() {
    return this.LXI("HL");
  }
  _SHLD() {
    return this.shld();
  }
  _INX_HL() {
    return this.inx("HL");
  }
  _INR_H() {
    return this.inr("H");
  }
  _DCR_H() {
    return this.dcr("H");
  }
  _MVI_H() {
    return this.mvi("H");
  }
  _DAA() {
    return this.daa();
  }
  _DAD_HL() {
    return this.dad("HL");
  }
  _LHLD() {
    return this.lhld();
  }
  _DCX_HL() {
    return this.dcx("HL");
  }
  _INR_L() {
    return this.inr("L");
  }

  _DCR_L() {
    return this.dcr("L");
  }
  _MVI_L() {
    return this.mvi("L");
  }
  _CMA() {
    return this.cma();
  }
  _LXI_SP() {
    return this.LXI("SP");
  }
  _STA() {
    return this.sta();
  }
  _INX_SP() {
    return this.inx("SP");
  }
  _INR_HL() {
    return this.inr("M");
  }
  _DCR_HL() {
    return this.dcrM();
  }
  _MVI_HL() {
    return this.mvi("M");
  }
  _STC() {
    return this.stc();
  }
  _DAD_SP() {
    return this.dad("SP");
  }
  _LDA() {
    return this.lda();
  }
  _DCX_SP() {
    return this.dcx("SP");
  }
  _INR_A() {
    return this.inr("A");
  }
  _DCR_A() {
    return this.dcr("A");
  }
  _MVI_A() {
    return this.mvi("A");
  }
  _CMC() {
    return this.cmc();
  }
  _MOV_B_B() {
    return this.movRR("B", "B");
  }
  _MOV_B_C() {
    return this.movRR("B", "C");
  }
  _MOV_B_D() {
    return this.movRR("B", "D");
  }
  _MOV_B_E() {
    return this.movRR("B", "E");
  }
  _MOV_B_H() {
    return this.movRR("B", "H");
  }
  _MOV_B_L() {
    return this.movRR("B", "L");
  }
  _MOV_B_HL() {
    return this.movRM("B");
  }
  _MOV_B_A() {
    return this.movRR("B", "A");
  }
  _MOV_C_B() {
    return this.movRR("C", "B");
  }
  _MOV_C_C() {
    return this.movRR("C", "C");
  }
  _MOV_C_D() {
    return this.movRR("C", "D");
  }
  _MOV_C_E() {
    return this.movRR("C", "E");
  }
  _MOV_C_H() {
    return this.movRR("C", "H");
  }
  _MOV_C_L() {
    return this.movRR("C", "L");
  }
  _MOV_C_HL() {
    return this.movRM("C");
  }
  _MOV_C_A() {
    return this.movRR("C", "A");
  }
  _MOV_D_B() {
    return this.movRR("D", "B");
  }
  _MOV_D_C() {
    return this.movRR("D", "C");
  }
  _MOV_D_D() {
    return this.movRR("D", "D");
  }
  _MOV_D_E() {
    return this.movRR("D", "E");
  }
  _MOV_D_H() {
    return this.movRR("D", "H");
  }
  _MOV_D_L() {
    return this.movRR("D", "L");
  }
  _MOV_D_HL() {
    return this.movRM("D");
  }
  _MOV_D_A() {
    return this.movRR("D", "A");
  }
  _MOV_E_B() {
    return this.movRR("E", "B");
  }
  _MOV_E_C() {
    return this.movRR("E", "C");
  }
  _MOV_E_D() {
    return this.movRR("E", "D");
  }
  _MOV_E_E() {
    return this.movRR("E", "E");
  }
  _MOV_E_H() {
    return this.movRR("E", "H");
  }
  _MOV_E_L() {
    return this.movRR("E", "L");
  }
  _MOV_E_HL() {
    return this.movRM("E");
  }
  _MOV_E_A() {
    return this.movRR("E", "A");
  }
  _MOV_H_B() {
    return this.movRR("H", "B");
  }
  _MOV_H_C() {
    return this.movRR("H", "C");
  }
  _MOV_H_D() {
    return this.movRR("H", "D");
  }
  _MOV_H_E() {
    return this.movRR("H", "E");
  }
  _MOV_H_H() {
    return this.movRR("H", "H");
  }
  _MOV_H_L() {
    return this.movRR("H", "L");
  }
  _MOV_H_HL() {
    return this.movRM("H");
  }
  _MOV_H_A() {
    return this.movRR("H", "A");
  }
  _MOV_L_B() {
    return this.movRR("L", "B");
  }
  _MOV_L_C() {
    return this.movRR("L", "C");
  }
  _MOV_L_D() {
    return this.movRR("L", "D");
  }
  _MOV_L_E() {
    return this.movRR("L", "E");
  }
  _MOV_L_H() {
    return this.movRR("L", "H");
  }
  _MOV_L_L() {
    return this.movRR("L", "L");
  }
  _MOV_L_HL() {
    return this.movRM("L");
  }
  _MOV_L_A() {
    return this.movRR("L", "A");
  }
  _MOV_HL_B() {
    return this.movMR("B");
  }
  _MOV_HL_C() {
    return this.movMR("C");
  }
  _MOV_HL_D() {
    return this.movMR("D");
  }
  _MOV_HL_E() {
    return this.movMR("E");
  }
  _MOV_HL_H() {
    return this.movMR("H");
  }
  _MOV_HL_L() {
    return this.movMR("L");
  }
  _HLT() {
    return this.halt();
  }
  _MOV_HL_A() {
    return this.movMR("A");
  }
  _MOV_A_B() {
    return this.movRR("A", "B");
  }
  _MOV_A_C() {
    return this.movRR("A", "C");
  }
  _MOV_A_D() {
    return this.movRR("A", "D");
  }
  _MOV_A_E() {
    return this.movRR("A", "E");
  }
  _MOV_A_H() {
    return this.movRR("A", "H");
  }
  _MOV_A_L() {
    return this.movRR("A", "L");
  }
  _MOV_A_HL() {
    return this.movRM("A");
  }
  _MOV_A_A() {
    return this.movRR("A", "A");
  }
  _ADD_B() {
    return this.addR("B");
  }
  _ADD_C() {
    return this.addR("C");
  }
  _ADD_D() {
    return this.addR("D");
  }
  _ADD_E() {
    return this.addR("E");
  }
  _ADD_H() {
    return this.addR("H");
  }
  _ADD_L() {
    return this.addR("L");
  }
  _ADD_HL() {
    return this.addM.call(this);
  }
  _ADD_A() {
    return this.addR("A");
  }
  _ADDC_B() {
    return this.addCR("B");
  }
  _ADDC_C() {
    return this.addCR("C");
  }
  _ADDC_D() {
    return this.addCR("D");
  }
  _ADDC_E() {
    return this.addCR("E");
  }
  _ADDC_H() {
    return this.addCR("H");
  }
  _ADDC_L() {
    return this.addCR("L");
  }
  _ADDC_HL() {
    return this.addCM.call(this);
  }
  _ADDC_A() {
    return this.addCR("A");
  }
  _SUB_B() {
    return this.subR("B");
  }
  _SUB_C() {
    return this.subR("C");
  }
  _SUB_D() {
    return this.subR("D");
  }
  _SUB_E() {
    return this.subR("E");
  }
  _SUB_H() {
    return this.subR("H");
  }
  _SUB_L() {
    return this.subR("L");
  }
  _SUB_HL() {
    return this.subM();
  }
  _SUB_A() {
    return this.subR("A");
  }
  _SBB_B() {
    return this.subCR("B");
  }
  _SBB_C() {
    return this.subCR("C");
  }
  _SBB_D() {
    return this.subCR("D");
  }
  _SBB_E() {
    return this.subCR("E");
  }
  _SBB_H() {
    return this.subCR("H");
  }
  _SBB_L() {
    return this.subCR("L");
  }
  _SBB_HL() {
    return this.subCM();
  }
  _SBB_A() {
    return this.subCR("A");
  }
  _ANA_B() {
    return this.anaR("B");
  }
  _ANA_C() {
    return this.anaR("C");
  }
  _ANA_D() {
    return this.anaR("D");
  }
  _ANA_E() {
    return this.anaR("E");
  }
  _ANA_H() {
    return this.anaR("H");
  }
  _ANA_L() {
    return this.anaR("L");
  }
  _ANA_HL() {
    return this.anaM();
  }
  _ANA_A() {
    return this.anaR("A");
  }
  _XRA_B() {
    return this.xraR("B");
  }
  _XRA_C() {
    return this.xraR("C");
  }
  _XRA_D() {
    return this.xraR("D");
  }
  _XRA_E() {
    return this.xraR("E");
  }
  _XRA_H() {
    return this.xraR("H");
  }
  _XRA_L() {
    return this.xraR("L");
  }
  _XRA_HL() {
    return this.xraM();
  }
  _XRA_A() {
    return this.xraR("A");
  }
  _ORA_B() {
    return this.ora("B");
  }
  _ORA_C() {
    return this.ora("C");
  }
  _ORA_D() {
    return this.ora("D");
  }
  _ORA_E() {
    return this.ora("E");
  }
  _ORA_H() {
    return this.ora("H");
  }
  _ORA_L() {
    return this.ora("L");
  }
  _ORA_HL() {
    return this.ora("M");
  }
  _ORA_A() {
    return this.ora("A");
  }
  _CMP_B() {
    return this.cmp("B");
  }
  _CMP_C() {
    return this.cmp("C");
  }
  _CMP_D() {
    return this.cmp("D");
  }
  _CMP_E() {
    return this.cmp("E");
  }
  _CMP_H() {
    return this.cmp("H");
  }
  _CMP_L() {
    return this.cmp("L");
  }
  _CMP_HL() {
    return this.cmp("M");
  }
  _CMP_A() {
    return this.cmp("A");
  }
  _RNZ() {
    return this.rnz();
  }
  _POP_BC() {
    return this.pop("B", "C");
  }
  _JNZ() {
    return this.jnz();
  }
  _JMP() {
    return this.jmp();
  }
  _CNZ() {
    return this.cnz();
  }
  _PUSH_BC() {
    return this.pushXX("B", "C");
  }
  _ADI() {
    return this.adi();
  }
  _RST_0() {
    return this.rst(0x00);
  }
  _RZ() {
    return this.rz();
  }
  _RET() {
    return this.ret();
  }
  _JZ() {
    return this.jz();
  }
  _CZ() {
    return this.cz();
  }
  _CALL() {
    return this.call();
  }
  _ACI() {
    return this.aci();
  }
  _RST_1() {
    return this.rst(0x08);
  }
  _RNC() {
    return this.rnc();
  }
  _POP_DE() {
    return this.pop("D", "E");
  }
  _JNC() {
    return this.jnc();
  }
  _OUT() {
    return this.out();
  }
  _CNC() {
    return this.cnc();
  }
  _PUSH_DE() {
    return this.pushXX("D", "E");
  }
  _SUI() {
    return this.sui();
  }
  _RST_2() {
    return this.rst(0x10);
  }
  _RC() {
    return this.rc();
  }
  _JC() {
    return this.jc();
  }
  _IN() {
    return this.in();
  }

  /**
   * Call If Carry
   */
  _CC() {
    return this.cc();
  }
  _SBI() {
    return this.sbi();
  }
  _RST_3() {
    return this.rst(0x18);
  }
  _RPO() {
    return this.rpo();
  }
  _POP_HL() {
    return this.pop("H", "L");
  }
  _JPO() {
    return this.jpo();
  }
  _XTHL() {
    return this.xthl();
  }

  _CPO() {
    return this.cpo();
  }
  _PUSH_HL() {
    return this.pushXX("H", "L");
  }
  _ANI() {
    return this.ani();
  }
  _RST_4() {
    return this.rst(0x20);
  }
  _RPE() {
    return this.rpe();
  }
  _PCHL() {
    return this.pchl();
  }

  _JPE() {
    return this.jpe();
  }
  _XCHG() {
    return this.xchg();
  }
  _CPE() {
    return this.cpe();
  }
  _XRI() {
    return this.xri();
  }
  _RST_5() {
    return this.rst(0x28);
  }
  _RP() {
    return this.rp();
  }
  _POP_AF() {
    return this.pop("A", "F");
  }
  _JP() {
    return this.jp();
  }
  _DI() {
    return this.di();
  }
  _CP() {
    return this.cp();
  }
  _PUSH_AF() {
    return this.pushXX("A", "F");
  }
  _ORI() {
    return this.ori();
  }
  _RST_6() {
    return this.rst(0x30);
  }
  _RM() {
    return this.rm();
  }
  _SPHL() {
    return this.sphl();
  }
  _JM() {
    return this.jm();
  }
  _EI() {
    return this.ei();
  }
  _CM() {
    return this.cm();
  }
  _CPI() {
    return this.cpi();
  }
  _RST_7() {
    return this.rst(0x38);
  }
  _buildInstructionsTable() {
    const I = [];
    const op = (instr, action, len) => ({
      instr,
      action: action.bind(this),
      len,
    });

    I[0x00] = op("NOP", this._NOP, 1);
    I[0x01] = op("LXI B", this._LXI_B, 3);
    I[0x02] = op("STAX B", this._STAX_B, 1);
    I[0x03] = op("INX B", this._INX_B, 1);
    I[0x04] = op("INR B", this._INR_B, 1);
    I[0x05] = op("DCR B", this._DCR_B, 1);
    I[0x06] = op("MVI B,", this._MVI_B, 2);
    I[0x07] = op("RLC", this._RLC, 1);
    I[0x08] = op("NOP", this._NOP, 1);
    I[0x09] = op("DAD BC", this._DAD_BC, 1);
    I[0x0a] = op("LDAX B", this._LDAX_B, 1);
    I[0x0b] = op("DCX BC", this._DCX_BC, 1);
    I[0x0c] = op("INR C", this._INR_C, 1);
    I[0x0d] = op("DCR C", this._DCR_C, 1);
    I[0x0e] = op("MVI C,", this._MVI_C, 2);
    I[0x0f] = op("RRC", this._RRC, 1);
    I[0x10] = op("NOP", this._NOP, 1);
    I[0x11] = op("LXI D", this._LXI_D, 3);
    I[0x12] = op("STAX DE", this._STAX_DE, 1);
    I[0x13] = op("INX D", this._INX_D, 1);
    I[0x14] = op("INR D", this._INR_D, 1);
    I[0x15] = op("DCR D", this._DCR_D, 1);
    I[0x16] = op("MVI D,", this._MVI_D, 2);
    I[0x17] = op("RAL", this._RAL, 1);
    I[0x18] = op("NOP", this._NOP, 1);
    I[0x19] = op("DAD DE", this._DAD_DE, 1);
    I[0x1a] = op("LDAX DE", this._LDAX_DE, 1);
    I[0x1b] = op("DCX DE", this._DCX_DE, 1);
    I[0x1c] = op("INR E", this._INR_E, 1);
    I[0x1d] = op("DCR E", this._DCR_E, 1);
    I[0x1e] = op("MVI E,", this._MVI_E, 2);
    I[0x1f] = op("RAR", this._RAR, 1);
    I[0x20] = op("NOP", this._NOP, 1);
    I[0x21] = op("LXI H", this._LXI_H, 3);
    I[0x22] = op("SHLD", this._SHLD, 3);
    I[0x23] = op("INX HL", this._INX_HL, 1);
    I[0x24] = op("INR H", this._INR_H, 1);
    I[0x25] = op("DCR H", this._DCR_H, 1);
    I[0x26] = op("MVI H,", this._MVI_H, 2);
    I[0x27] = op("DAA", this._DAA, 1);
    I[0x28] = op("NOP", this._NOP, 1);
    I[0x29] = op("DAD HL", this._DAD_HL, 2);
    I[0x2a] = op("LHLD", this._LHLD, 3);
    I[0x2b] = op("DCX HL", this._DCX_HL, 1);
    I[0x2c] = op("INR L", this._INR_L, 1);
    I[0x2d] = op("DCR L", this._DCR_L, 1);
    I[0x2e] = op("MVI L,", this._MVI_L, 2);
    I[0x2f] = op("CMA", this._CMA, 1);
    I[0x30] = op("NOP", this._NOP, 1);
    I[0x31] = op("LXI SP,", this._LXI_SP, 3);
    I[0x32] = op("STA", this._STA, 3);
    I[0x33] = op("INX SP", this._INX_SP, 1);
    I[0x34] = op("INR (HL)", this._INR_HL, 1);
    I[0x35] = op("DCR (HL)", this._DCR_HL, 1);
    I[0x36] = op("MVI (HL)", this._MVI_HL, 2);
    I[0x37] = op("STC", this._STC, 1);
    I[0x38] = op("NOP", this._NOP, 1);
    I[0x39] = op("DAD SP", this._DAD_SP, 1);
    I[0x3a] = op("LDA", this._LDA, 3);
    I[0x3b] = op("DCX SP", this._DCX_SP, 1);
    I[0x3c] = op("INR A", this._INR_A, 1);
    I[0x3d] = op("DCR A", this._DCR_A, 1);
    I[0x3e] = op("MVI A", this._MVI_A, 2);
    I[0x3f] = op("CMC", this._CMC, 1);
    I[0x40] = op("MOV B, B", this._MOV_B_B, 1);
    I[0x41] = op("MOV B, C", this._MOV_B_C, 1);
    I[0x42] = op("MOV B, D", this._MOV_B_D, 1);
    I[0x43] = op("MOV B, E", this._MOV_B_E, 1);
    I[0x44] = op("MOV B, H", this._MOV_B_H, 1);
    I[0x45] = op("MOV B, L", this._MOV_B_L, 1);
    I[0x46] = op("MOV B, (HL)", this._MOV_B_HL, 1);
    I[0x47] = op("MOV B, A", this._MOV_B_A, 1);
    I[0x48] = op("MOV C, B", this._MOV_C_B, 1);
    I[0x49] = op("MOV C, C", this._MOV_C_C, 1);
    I[0x4a] = op("MOV C, D", this._MOV_C_D, 1);
    I[0x4b] = op("MOV C, E", this._MOV_C_E, 1);
    I[0x4c] = op("MOV C, H", this._MOV_C_H, 1);
    I[0x4d] = op("MOV C, L", this._MOV_C_L, 1);
    I[0x4e] = op("MOV C, (HL)", this._MOV_C_HL, 1);
    I[0x4f] = op("MOV C, A", this._MOV_C_A, 1);
    I[0x50] = op("MOV D, B", this._MOV_D_B, 1);
    I[0x51] = op("MOV D, C", this._MOV_D_C, 1);
    I[0x52] = op("MOV D, D", this._MOV_D_D, 1);
    I[0x53] = op("MOV D, E", this._MOV_D_E, 1);
    I[0x54] = op("MOV D, H", this._MOV_D_H, 1);
    I[0x55] = op("MOV D, L", this._MOV_D_L, 1);
    I[0x56] = op("MOV D, (HL)", this._MOV_D_HL, 1);
    I[0x57] = op("MOV D, A", this._MOV_D_A, 1);
    I[0x58] = op("MOV E, B", this._MOV_E_B, 1);
    I[0x59] = op("MOV E, C", this._MOV_E_C, 1);
    I[0x5a] = op("MOV E, D", this._MOV_E_D, 1);
    I[0x5b] = op("MOV E, E", this._MOV_E_E, 1);
    I[0x5c] = op("MOV E, H", this._MOV_E_H, 1);
    I[0x5d] = op("MOV E, L", this._MOV_E_L, 1);
    I[0x5e] = op("MOV E, (HL)", this._MOV_E_HL, 1);
    I[0x5f] = op("MOV E, A", this._MOV_E_A, 1);
    I[0x60] = op("MOV H, B", this._MOV_H_B, 1);
    I[0x61] = op("MOV H, C", this._MOV_H_C, 1);
    I[0x62] = op("MOV H, D", this._MOV_H_D, 1);
    I[0x63] = op("MOV H, E", this._MOV_H_E, 1);
    I[0x64] = op("MOV H, H", this._MOV_H_H, 1);
    I[0x65] = op("MOV H, L", this._MOV_H_L, 1);
    I[0x66] = op("MOV H, (HL)", this._MOV_H_HL, 1);
    I[0x67] = op("MOV H, A", this._MOV_H_A, 1);
    I[0x68] = op("MOV L, B", this._MOV_L_B, 1);
    I[0x69] = op("MOV L, C", this._MOV_L_C, 1);
    I[0x6a] = op("MOV L, D", this._MOV_L_D, 1);
    I[0x6b] = op("MOV L, E", this._MOV_L_E, 1);
    I[0x6c] = op("MOV L, H", this._MOV_L_H, 1);
    I[0x6d] = op("MOV L, L", this._MOV_L_L, 1);
    I[0x6e] = op("MOV L, (HL)", this._MOV_L_HL, 1);
    I[0x6f] = op("MOV L, A", this._MOV_L_A, 1);
    I[0x70] = op("MOV (HL), B", this._MOV_HL_B, 1);
    I[0x71] = op("MOV (HL), C", this._MOV_HL_C, 1);
    I[0x72] = op("MOV (HL), D", this._MOV_HL_D, 1);
    I[0x73] = op("MOV (HL), E", this._MOV_HL_E, 1);
    I[0x74] = op("MOV (HL), H", this._MOV_HL_H, 1);
    I[0x75] = op("MOV (HL), L", this._MOV_HL_L, 1);
    I[0x76] = op("HLT", this._HLT, 1);
    I[0x77] = op("MOV (HL), A", this._MOV_HL_A, 1);
    I[0x78] = op("MOV A, B", this._MOV_A_B, 1);
    I[0x79] = op("MOV A, C", this._MOV_A_C, 1);
    I[0x7a] = op("MOV A, D", this._MOV_A_D, 1);
    I[0x7b] = op("MOV A, E", this._MOV_A_E, 1);
    I[0x7c] = op("MOV A, H", this._MOV_A_H, 1);
    I[0x7d] = op("MOV A, L", this._MOV_A_L, 1);
    I[0x7e] = op("MOV A, (HL)", this._MOV_A_HL, 1);
    I[0x7f] = op("MOV A, A", this._MOV_A_A, 1);
    I[0x80] = op("ADD B", this._ADD_B, 1);
    I[0x81] = op("ADD C", this._ADD_C, 1);
    I[0x82] = op("ADD D", this._ADD_D, 1);
    I[0x83] = op("ADD E", this._ADD_E, 1);
    I[0x84] = op("ADD H", this._ADD_H, 1);
    I[0x85] = op("ADD L", this._ADD_L, 1);
    I[0x86] = op("ADD (HL)", this._ADD_HL, 1);
    I[0x87] = op("ADD A", this._ADD_A, 1);
    I[0x88] = op("ADDC B", this._ADDC_B, 1);
    I[0x89] = op("ADDC C", this._ADDC_C, 1);
    I[0x8a] = op("ADDC D", this._ADDC_D, 1);
    I[0x8b] = op("ADDC E", this._ADDC_E, 1);
    I[0x8c] = op("ADDC H", this._ADDC_H, 1);
    I[0x8d] = op("ADDC L", this._ADDC_L, 1);
    I[0x8e] = op("ADDC (HL)", this._ADDC_HL, 1);
    I[0x8f] = op("ADDC A", this._ADDC_A, 1);
    I[0x90] = op("SUB B", this._SUB_B, 1);
    I[0x91] = op("SUB C", this._SUB_C, 1);
    I[0x92] = op("SUB D", this._SUB_D, 1);
    I[0x93] = op("SUB E", this._SUB_E, 1);
    I[0x94] = op("SUB H", this._SUB_H, 1);
    I[0x95] = op("SUB L", this._SUB_L, 1);
    I[0x96] = op("SUB (HL)", this._SUB_HL, 1);
    I[0x97] = op("SUB A", this._SUB_A, 1);
    I[0x98] = op("SBB B", this._SBB_B, 1);
    I[0x99] = op("SBB C", this._SBB_C, 1);
    I[0x9a] = op("SBB D", this._SBB_D, 1);
    I[0x9b] = op("SBB E", this._SBB_E, 1);
    I[0x9c] = op("SBB H", this._SBB_H, 1);
    I[0x9d] = op("SBB L", this._SBB_L, 1);
    I[0x9e] = op("SBB (HL)", this._SBB_HL, 1);
    I[0x9f] = op("SBB A", this._SBB_A, 1);
    I[0xa0] = op("ANA B", this._ANA_B, 1);
    I[0xa1] = op("ANA C", this._ANA_C, 1);
    I[0xa2] = op("ANA D", this._ANA_D, 1);
    I[0xa3] = op("ANA E", this._ANA_E, 1);
    I[0xa4] = op("ANA H", this._ANA_H, 1);
    I[0xa5] = op("ANA L", this._ANA_L, 1);
    I[0xa6] = op("ANA (HL)", this._ANA_HL, 1);
    I[0xa7] = op("ANA A", this._ANA_A, 1);
    I[0xa8] = op("XRA B", this._XRA_B, 1);
    I[0xa9] = op("XRA C", this._XRA_C, 1);
    I[0xaa] = op("XRA D", this._XRA_D, 1);
    I[0xab] = op("XRA E", this._XRA_E, 1);
    I[0xac] = op("XRA H", this._XRA_H, 1);
    I[0xad] = op("XRA L", this._XRA_L, 1);
    I[0xae] = op("XRA (HL)", this._XRA_HL, 1);
    I[0xaf] = op("XRA A", this._XRA_A, 1);
    I[0xb0] = op("ORA B", this._ORA_B, 1);
    I[0xb1] = op("ORA C", this._ORA_C, 1);
    I[0xb2] = op("ORA D", this._ORA_D, 1);
    I[0xb3] = op("ORA E", this._ORA_E, 1);
    I[0xb4] = op("ORA H", this._ORA_H, 1);
    I[0xb5] = op("ORA L", this._ORA_L, 1);
    I[0xb6] = op("ORA (HL)", this._ORA_HL, 1);
    I[0xb7] = op("ORA A", this._ORA_A, 1);
    I[0xb8] = op("CMP B", this._CMP_B, 1);
    I[0xb9] = op("CMP C", this._CMP_C, 1);
    I[0xba] = op("CMP D", this._CMP_D, 1);
    I[0xbb] = op("CMP E", this._CMP_E, 1);
    I[0xbc] = op("CMP H", this._CMP_H, 1);
    I[0xbd] = op("CMP L", this._CMP_L, 1);
    I[0xbe] = op("CMP (HL)", this._CMP_HL, 1);
    I[0xbf] = op("CMP A", this._CMP_A, 1);
    I[0xc0] = op("RNZ", this._RNZ, 1);
    I[0xc1] = op("POP BC", this._POP_BC, 1);
    I[0xc2] = op("JNZ", this._JNZ, 3);
    I[0xc3] = op("JMP", this._JMP, 3);
    I[0xc4] = op("CNZ", this._CNZ, 3);
    I[0xc5] = op("PUSH BC", this._PUSH_BC, 1);
    I[0xc6] = op("ADI", this._ADI, 2);
    I[0xc7] = op("RST 0", this._RST_0, 1);
    I[0xc8] = op("RZ", this._RZ, 1);
    I[0xc9] = op("RET", this._RET, 1);
    I[0xca] = op("JZ", this._JZ, 3);
    I[0xcb] = op("JMP", this._JMP, 3);
    I[0xcc] = op("CZ", this._CZ, 3);
    I[0xcd] = op("CALL", this._CALL, 3);
    I[0xce] = op("ACI", this._ACI, 2);
    I[0xcf] = op("RST 1", this._RST_1, 1);
    I[0xd0] = op("RNC", this._RNC, 1);
    I[0xd1] = op("POP DE", this._POP_DE, 1);
    I[0xd2] = op("JNC", this._JNC, 3);
    I[0xd3] = op("OUT", this._OUT, 2);
    I[0xd4] = op("CNC", this._CNC, 3);
    I[0xd5] = op("PUSH DE", this._PUSH_DE, 1);
    I[0xd6] = op("SUI", this._SUI, 2);
    I[0xd7] = op("RST 2", this._RST_2, 1);
    I[0xd8] = op("RC", this._RC, 1);
    I[0xd9] = op("RET", this._RET, 1);
    I[0xda] = op("JC", this._JC, 3);
    I[0xdb] = op("IN", this._IN, 2);
    I[0xdc] = op("CC", this._CC, 3);
    I[0xdd] = op("CALL", this._CALL, 3);
    I[0xde] = op("SBI", this._SBI, 2);
    I[0xdf] = op("RST 3", this._RST_3, 1);
    I[0xe0] = op("RPO", this._RPO, 1);
    I[0xe1] = op("POP HL", this._POP_HL, 1);
    I[0xe2] = op("JPO", this._JPO, 3);
    I[0xe3] = op("XTHL", this._XTHL, 1);
    I[0xe4] = op("CPO", this._CPO, 3);
    I[0xe5] = op("PUSH HL", this._PUSH_HL, 1);
    I[0xe6] = op("ANI", this._ANI, 2);
    I[0xe7] = op("RST 4", this._RST_4, 1);
    I[0xe8] = op("RPE", this._RPE, 1);
    I[0xe9] = op("PCHL", this._PCHL, 1);
    I[0xea] = op("JPE", this._JPE, 3);
    I[0xeb] = op("XCHG", this._XCHG, 1);
    I[0xec] = op("CPE", this._CPE, 3);
    I[0xed] = op("CALL", this._CALL, 3);
    I[0xee] = op("XRI", this._XRI, 2);
    I[0xef] = op("RST 5", this._RST_5, 1);
    I[0xf0] = op("RP", this._RP, 1);
    I[0xf1] = op("POP AF", this._POP_AF, 1);
    I[0xf2] = op("JP", this._JP, 3);
    I[0xf3] = op("DI", this._DI, 1);
    I[0xf4] = op("CP", this._CP, 3);
    I[0xf5] = op("PUSH AF", this._PUSH_AF, 1);
    I[0xf6] = op("ORI", this._ORI, 2);
    I[0xf7] = op("RST 6", this._RST_6, 1);
    I[0xf8] = op("RM", this._RM, 1);
    I[0xf9] = op("SPHL", this._SPHL, 1);
    I[0xfa] = op("JM", this._JM, 3);
    I[0xfb] = op("EI", this._EI, 1);
    I[0xfc] = op("CM", this._CM, 3);
    I[0xfd] = op("CALL", this._CALL, 3);
    I[0xfe] = op("CPI", this._CPI, 2);
    I[0xff] = op("RST 7", this._RST_7, 1);
    return I;
  }

  disassemble(opcode) {
    if (opcode === undefined) {
      throw new Error(
        `Opcode undefined @ PC=${this.PC.toString(16).padStart(4, "0")}`
      );
    }

    const op = this._instructionsTable[opcode];
    if (!op) {
      throw new Error(`Invalid opcode ${opcode.toString(16).toUpperCase()}`);
    }

    const argsLen = op.len ? op.len - 1 : 0;
    let argValue = 0;

    // 🔹 read once
    if (argsLen === 1) {
      argValue = this.memory.readByte(this.PC + 1);
    } else if (argsLen === 2) {
      argValue = this.memory.read16(this.PC + 1);
    }

    // 🔹 precompute hex strings (avoid repeated toString/padStart)
    const pcHex = this.PC.toString(16).padStart(4, "0").toUpperCase();
    const opcodeHex = opcode.toString(16).padStart(2, "0").toUpperCase();

    let argsHex = "";
    if (argsLen > 0) {
      const bytes = this.memory.readBytes(this.PC + 1, argsLen);
      if (argsLen === 1) {
        argsHex = bytes[0].toString(16).padStart(2, "0").toUpperCase();
      } else {
        argsHex =
          bytes[0].toString(16).padStart(2, "0").toUpperCase() +
          " " +
          bytes[1].toString(16).padStart(2, "0").toUpperCase();
      }
    }

    // 🔹 build mnemonic fast
    let mnemonic = op.instr;
    if (argsLen > 0) {
      mnemonic +=
        " $" +
        argValue
          .toString(16)
          .padStart(argsLen * 2, "0")
          .toUpperCase();
    }

    // 🔹 preallocate and build line (no nested template overhead)
    return (
      pcHex + ": " + opcodeHex + " " + argsHex.padEnd(8, " ") + " " + mnemonic
    );
  }
}

if (typeof module !== "undefined") module.exports = Cpu;
