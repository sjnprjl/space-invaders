/**
 * Intel 8080 CPU
 */
class Cpu {
  /**
   * Registers
   */
  A = 0;
  B = 0;
  C = 0;
  D = 0;
  E = 0;
  H = 0;
  L = 0;
  SP = 0;
  PC = 0;

  /**
   * Flag
   */
  F = 0;

  _isInterrupted = false;

  _devices = new Map();

  constructor({ memory }) {
    this.memory = memory;
    this._isHalted = false;
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
    let result = a + (~b & 0xff) + 1;

    if (result > 0xff) {
      this.CarryFlag = 1;
    } else {
      this.CarryFlag = 0;
    }

    if (result > 0x7f) {
      this.SignFlag = 1;
    } else this.SignFlag = 0;

    if (result === 0) {
      this.ZeroFlag = 1;
    } else this.ZeroFlag = 0;

    if ((result & 0x0f) > 9) {
      this.AuxCarryFlag = 1;
    } else {
      this.AuxCarryFlag = 0;
    }

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

    if ((result & 0x0f) > 9) {
      this.AuxCarryFlag = 1;
    } else {
      this.AuxCarryFlag = 0;
    }

    this.ParityFlag = this.testParity(result);
    return result;
  }

  _add(value) {
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

    if ((this.A & 0x0f) > 9) {
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
    let carry = this.CarryFlag;
    this.A = this._sub(this.A, value);
    this.A = this._sub(this.A, carry);
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
    let carry = this.CarryFlag;
    this.A = this._sub(this.A, value);
    this.A = this._sub(this.A, carry);
    this.PC += 1;
    return 7;
  }

  _logicalGroupFlagChange(value) {
    this.ZeroFlag = value === 0 ? 1 : 0;
    this.SignFlag = value > 0x7f ? 1 : 0;
    this.CarryFlag = 0;
    this.AuxCarryFlag = 0;
    this.ParityFlag = this.testParity(result);
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
    const result = this.A ^ this.memory.readByte(this.HL);
    this._xra(result);
    this.PC += 1;
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
  }

  sta() {
    const addr = this.memory.read16(this.PC + 1);
    this.memory.writeByte(addr, this.A);
    this.PC += 3;
    return 13;
  }

  /**
   * @param {'BC' | 'DE' | 'HL' | 'SP'} rp
   */
  LXI(rp) {
    const value = this.memory.read16(this.PC + 1);
    if (rp === "SP") this.SP = value;
    else this[rp] = value;
    this.PC += 3;
    return 10;
  }
  call() {
    const addr = this.memory.read16(this.PC + 1);
    const h = this.PC >> 8;
    const l = this.PC & 0xff;
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
    this.A = this._devices.get(descriptor);
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
    this._devices.set(this.memory.readByte(this.PC + 1), this.A);
    this.PC += 2;
    return 10;
  }

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
    if ((this.A & 0xf0) > 0x90 || this.CarryFlag) {
      this._add(0x60);
    }
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
    this._isInterrupted = true;
    this.PC += 1;
    return 4;
  }

  /**
   * Disable Interrupts
   */
  di() {
    this._isInterrupted = false;
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
    this._sub(value, 1);
    this.CarryFlag = carry; // restore carry
    if (reg === "M") {
      this.memory.writeByte(this.HL, value);
    } else {
      this[reg] = value;
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
    imm += this.CarryFlag ? 1 : 0;
    imm &= 0xff;
    // two's complement
    imm = imm ^ 0xff;
    imm += 1;
    imm &= 0xff;

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
    const tempSP = this.SP;
    this.SP = this.HL;
    this.HL = tempSP;
    this.PC += 1;
    return 18;
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
    this.PC += 1;
    return 5;
  }

  /**
   * Call if zero
   *
   * @description
   * If the Zero bit is zero, a call operation is
   * performed to subroutine sub
   */
  cz() {
    if (!this.ZeroFlag) return this.call();
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
    if (this.ZeroFlag) return this.call();
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
    if (this.ZeroFlag === 0) return this.ret(), 11;
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
    this.memory.writeByte(rp, this.A);
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

  execute() {
    const opcode = this.memory.readByte(this.PC);
    console.log(`Current Address: ${this.PC.toString(16).padStart(4, "0")}`);
    const h = (opcode >> 4) & 0x0f;
    const l = opcode & 0x0f;
    const op = this.__instructions[h][l];
    if (!op) {
      throw new Error(`Invalid opcode: ${opcode.toString(16)}`);
    }

    console.log(
      `Executing: ${typeof op.op === "string" ? op.op : op.op.bind(this)()}`
    );
    return op.action.call(this);
  }

  /**
   * Opcodes Table
   */

  __instructions = [
    /** 0x0 */ [
      /** 0x0 */ { instr: "NOP", action: this.noop, len: 1 },
      /** 0x1 */ {
        instr: "LXI B",
        action: () => this.LXI.call(this, "BC"),
        len: 3,
      },
      /** 0x2 */ {
        instr: "STAX B",
        action: () => this.stax.call(this, "BC"),
        len: 1,
      },
      /** 0x3 */ null,
      /** 0x4 */ {
        instr: "INR B",
        action: () => this.inr.call(this, "B"),
        len: 1,
      },
      /** 0x5 */ {
        instr: "DCR B",
        action: () => this.dcr.call(this, "B"),
        len: 1,
      },
      /** 0x6 */ {
        instr: "MVI B,",
        action: () => this.mvi.call(this, "B"),
        len: 2,
      },
      /** 0x7 */ { instr: "RLC", action: this.rlc, len: 1 },
      /** 0x8 */ null,
      /** 0x9 */ {
        instr: "DAD BC",
        action: () => this.dad.call(this, "BC"),
        len: 1,
      },
      /** 0xa */ {
        instr: "LDAX B",
        action: () => this.ldax.call(this, "BC"),
        len: 1,
      },
      /** 0xb */ {
        instr: "DCX BC",
        action: () => this.dcx.call(this, "BC"),
        len: 1,
      },
      /** 0xc */ {
        instr: "INR C",
        action: () => this.inr.call(this, "C"),
        len: 1,
      },
      /** 0xd */ {
        instr: "DCR C",
        action: () => this.dcr.call(this, "C"),
        len: 1,
      },
      /** 0xe */ {
        instr: "MVI C,",
        action: () => this.mvi.call(this, "C"),
        len: 2,
      },
      /** 0xf */ { instr: "RRC", action: this.rrc, len: 1 },
    ],
    /** 0x1 */ [
      /** 0x0 */ { instr: "NOP", action: this.noop, len: 1 },
      /** 0x1 */ {
        instr: "LXI D",
        action: () => this.LXI.call(this, "DE"),
        len: 3,
      },
      /** 0x2 */ {
        instr: "STAX DE",
        action: () => this.stax.call(this, "DE"),
        len: 1,
      },
      /** 0x3 */ null,
      /** 0x4 */ {
        instr: "INR D",
        action: () => this.inr.call(this, "D"),
        len: 1,
      },
      /** 0x5 */ {
        instr: "DCR D",
        action: () => this.dcr.call(this, "D"),
        len: 1,
      },
      /** 0x6 */ {
        instr: "MVI D,",
        action: () => this.mvi.call(this, "D"),
        len: 2,
      },
      /** 0x7 */ null,
      /** 0x8 */ null,
      /** 0x9 */ {
        instr: "DAD DE",
        action: () => this.dad.call(this, "DE"),
        len: 1,
      },
      /** 0xa */ {
        instr: "LDAX DE",
        action: () => this.ldax.call(this, "DE"),
        len: 1,
      },
      /** 0xb */ {
        instr: "DCX DE",
        action: () => this.dcx.call(this, "DE"),
        len: 1,
      },
      /** 0xc */ null,
      /** 0xd */ {
        instr: "DCR E",
        action: () => this.dcr.call(this, "E"),
        len: 1,
      },
      /** 0xe */ null,
      /** 0xf */ null,
    ],
    /** 0x2 */ [
      /** 0x0 */ { instr: "NOP", action: this.noop, len: 1 },
      /** 0x1 */ {
        instr: "LXI H",
        action: () => this.LXI.call(this, "HL"),
        len: 3,
      },
      /** 0x2 */ { instr: "SHLD", action: this.shld, len: 3 },
      /** 0x3 */ {
        instr: "INX HL",
        action: () => this.inx.call(this, "HL"),
        len: 1,
      },
      /** 0x4 */ null,
      /** 0x5 */ null,
      /** 0x6 */ null,
      /** 0x7 */ { instr: "DAA", action: this.daa, len: 1 },
      /** 0x8 */ null,
      /** 0x9 */ null,
      /** 0xa */ {
        instr: "DAD HL",
        action: () => this.dad.call(this, "HL"),
        len: 2,
      },
      /** 0xb */ {
        instr: "DCX HL",
        action: () => this.dcx.call(this, "HL"),
        len: 1,
      },
      /** 0xc */ {
        instr: "INR L",
        action: () => this.inr.call(this, "L"),
        len: 1,
      },
      /** 0xd */ null,
      /** 0xe */ {
        instr: "MVI L,",
        action: () => this.mvi.call(this, "L"),
        len: 2,
      },
      /** 0xf */ null,
    ],
    /** 0x3 */ [
      /** 0x0*/ { instr: "NOP", action: this.noop, len: 1 },
      /** 0x1*/ {
        instr: "LXI SP,",
        action: () => this.LXI.call(this, "SP"),
        len: 3,
      },
      /** 0x2*/ {
        instr: "STA",
        len: 3,
        action: this.sta,
      },
      /** 0x3*/ null,
      /** 0x4*/ {
        instr: "INR (HL)",
        len: 1,
        action: () => this.inr.call(this, "M"),
      },
      /** 0x5*/ { instr: "DCR (HL)", len: 1, action: this.dcrM },
      { instr: "MVI (HL)", len: 2, action: () => this.mvi.call(this, "M") },
      null,
      null,
      { instr: "DAD SP", action: () => this.dad.call(this, "SP"), len: 1 },
      {
        instr: "LDA",
        len: 3,
        action: this.lda,
      },
      null,
      { instr: "INR A", action: () => this.inr("A"), len: 1 },
      { instr: "DCR A", action: () => this.dcr("A"), len: 1 },
      {
        instr: "MVI A",
        action: () => this.mvi.call(this),
        len: 2,
      },
      null,
    ],
    /** 0x4 */ [
      {
        instr: "MOV B, B",
        action: () => this.movRR.call(this, "B", "B"),
        len: 1,
      },
      {
        instr: "MOV B, C",
        action: () => this.movRR.call(this, "B", "C"),
        len: 1,
      },
      {
        instr: "MOV B, D",
        action: () => this.movRR.call(this, "B", "D"),
        len: 1,
      },
      {
        instr: "MOV B, E",
        action: () => this.movRR.call(this, "B", "E"),
        len: 1,
      },
      {
        instr: "MOV B, H",
        action: () => this.movRR.call(this, "B", "H"),
        len: 1,
      },
      {
        instr: "MOV B, L",
        action: () => this.movRR.call(this, "B", "L"),
        len: 1,
      },
      {
        instr: "MOV B, (HL)",
        action: () => this.movRM.call(this, "B"),
        len: 1,
      },
      {
        instr: "MOV B, A",
        action: () => this.movRR.call(this, "B", "A"),
        len: 1,
      },
      {
        instr: "MOV C, B",
        action: () => this.movRR.call(this, "C", "B"),
        len: 1,
      },
      {
        instr: "MOV C, C",
        action: () => this.movRR.call(this, "C", "C"),
        len: 1,
      },
      {
        instr: "MOV C, D",
        action: () => this.movRR.call(this, "C", "D"),
        len: 1,
      },
      {
        instr: "MOV C, E",
        action: () => this.movRR.call(this, "C", "E"),
        len: 1,
      },
      {
        instr: "MOV C, H",
        action: () => this.movRR.call(this, "C", "H"),
        len: 1,
      },
      {
        instr: "MOV C, L",
        action: () => this.movRR.call(this, "C", "L"),
        len: 1,
      },
      {
        instr: "MOV C, (HL)",
        action: () => this.movRM.call(this, "C"),
        len: 1,
      },
      {
        instr: "MOV C, A",
        action: () => this.movRR.call(this, "C", "A"),
        len: 1,
      },
    ],
    /** 0x5 */ [
      {
        instr: "MOV D, B",
        action: () => this.movRR.call(this, "D", "B"),
        len: 1,
      },
      {
        instr: "MOV D, C",
        action: () => this.movRR.call(this, "D", "C"),
        len: 1,
      },
      {
        instr: "MOV D, D",
        action: () => this.movRR.call(this, "D", "D"),
        len: 1,
      },
      {
        instr: "MOV D, E",
        action: () => this.movRR.call(this, "D", "E"),
        len: 1,
      },
      {
        instr: "MOV D, H",
        action: () => this.movRR.call(this, "D", "H"),
        len: 1,
      },
      {
        instr: "MOV D, L",
        action: () => this.movRR.call(this, "D", "L"),
        len: 1,
      },
      {
        instr: "MOV D, (HL)",
        action: () => this.movRM.call(this, "D"),
        len: 1,
      },
      {
        instr: "MOV D, A",
        action: () => this.movRR.call(this, "D", "A"),
        len: 1,
      },
      {
        instr: "MOV E, B",
        action: () => this.movRR.call(this, "E", "B"),
        len: 1,
      },
      {
        instr: "MOV E, C",
        action: () => this.movRR.call(this, "E", "C"),
        len: 1,
      },
      {
        instr: "MOV E, D",
        action: () => this.movRR.call(this, "E", "D"),
        len: 1,
      },
      {
        instr: "MOV E, E",
        action: () => this.movRR.call(this, "E", "E"),
        len: 1,
      },
      {
        instr: "MOV E, H",
        action: () => this.movRR.call(this, "E", "H"),
        len: 1,
      },
      {
        instr: "MOV E, L",
        action: () => this.movRR.call(this, "E", "L"),
        len: 1,
      },
      {
        instr: "MOV E, (HL)",
        action: () => this.movRM.call(this, "E"),
        len: 1,
      },
      {
        instr: "MOV E, A",
        action: () => this.movRR.call(this, "E", "A"),
        len: 1,
      },
    ], //
    /** 0x6 */ [
      {
        instr: "MOV H, B",
        action: () => this.movRR.call(this, "H", "B"),
        len: 1,
      },
      {
        instr: "MOV H, C",
        action: () => this.movRR.call(this, "H", "C"),
        len: 1,
      },
      {
        instr: "MOV H, D",
        action: () => this.movRR.call(this, "H", "D"),
        len: 1,
      },
      {
        instr: "MOV H, E",
        action: () => this.movRR.call(this, "H", "E"),
        len: 1,
      },
      {
        instr: "MOV H, H",
        action: () => this.movRR.call(this, "H", "H"),
        len: 1,
      },
      {
        instr: "MOV H, L",
        action: () => this.movRR.call(this, "H", "L"),
        len: 1,
      },
      {
        instr: "MOV H, (HL)",
        action: () => this.movRM.call(this, "H"),
        len: 1,
      },
      {
        instr: "MOV H, A",
        action: () => this.movRR.call(this, "H", "A"),
        len: 1,
      },

      {
        instr: "MOV L, B",
        action: () => this.movRR.call(this, "L", "B"),
        len: 1,
      },
      {
        instr: "MOV L, C",
        action: () => this.movRR.call(this, "L", "C"),
        len: 1,
      },
      {
        instr: "MOV L, D",
        action: () => this.movRR.call(this, "L", "D"),
        len: 1,
      },
      {
        instr: "MOV L, E",
        action: () => this.movRR.call(this, "L", "E"),
        len: 1,
      },
      {
        instr: "MOV L, H",
        action: () => this.movRR.call(this, "L", "H"),
        len: 1,
      },
      {
        instr: "MOV L, L",
        action: () => this.movRR.call(this, "L", "L"),
        len: 1,
      },
      {
        instr: "MOV L, (HL)",
        action: () => this.movRM.call(this, "L"),
        len: 1,
      },
      {
        instr: "MOV L, A",
        action: () => this.movRR.call(this, "L", "A"),
        len: 1,
      },
    ],
    /** 0x7 */ [
      {
        instr: "MOV (HL), B",
        action: () => this.movMR.call(this, "B"),
        len: 1,
      },
      {
        instr: "MOV (HL), C",
        action: () => this.movMR.call(this, "C"),
        len: 1,
      },
      {
        instr: "MOV (HL), D",
        action: () => this.movMR.call(this, "D"),
        len: 1,
      },
      {
        instr: "MOV (HL), E",
        action: () => this.movMR.call(this, "E"),
        len: 1,
      },
      {
        instr: "MOV (HL), H",
        action: () => this.movMR.call(this, "H"),
        len: 1,
      },
      {
        instr: "MOV (HL), L",
        action: () => this.movMR.call(this, "L"),
        len: 1,
      },
      { instr: "HLT", action: this.halt, len: 1 },
      {
        instr: "MOV (HL), A",
        action: () => this.movMR.call(this, "A"),
        len: 1,
      },

      {
        instr: "MOV A, B",
        action: () => this.movRR.call(this, "A", "B"),
        len: 1,
      },
      {
        instr: "MOV A, C",
        action: () => this.movRR.call(this, "A", "C"),
        len: 1,
      },
      {
        instr: "MOV A, D",
        action: () => this.movRR.call(this, "A", "D"),
        len: 1,
      },
      {
        instr: "MOV A, E",
        action: () => this.movRR.call(this, "A", "E"),
        len: 1,
      },
      {
        instr: "MOV A, H",
        action: () => this.movRR.call(this, "A", "H"),
        len: 1,
      },
      {
        instr: "MOV A, L",
        action: () => this.movRR.call(this, "A", "L"),
        len: 1,
      },
      {
        instr: "MOV A, (HL)",
        action: () => this.movRM.call(this, "A"),
        len: 1,
      },
      {
        instr: "MOV A, A",
        action: () => this.movRR.call(this, "A", "A"),
        len: 1,
      },
    ],
    /** 0x8 */ [
      { instr: "ADD B", action: () => this.addR.call(this, "B"), len: 1 },
      { instr: "ADD C", action: () => this.addR.call(this, "C"), len: 1 },
      { instr: "ADD D", action: () => this.addR.call(this, "D"), len: 1 },
      { instr: "ADD E", action: () => this.addR.call(this, "E"), len: 1 },
      { instr: "ADD H", action: () => this.addR.call(this, "H"), len: 1 },
      { instr: "ADD L", action: () => this.addR.call(this, "L"), len: 1 },
      { instr: "ADD (HL)", action: () => this.addM.call(this), len: 1 },
      { instr: "ADD A", action: () => this.addR.call(this, "A"), len: 1 },

      { instr: "ADDC B", action: () => this.addCR.call(this, "B"), len: 1 },
      { instr: "ADDC C", action: () => this.addCR.call(this, "C"), len: 1 },
      { instr: "ADDC D", action: () => this.addCR.call(this, "D"), len: 1 },
      { instr: "ADDC E", action: () => this.addCR.call(this, "E"), len: 1 },
      { instr: "ADDC H", action: () => this.addCR.call(this, "H"), len: 1 },
      { instr: "ADDC L", action: () => this.addCR.call(this, "L"), len: 1 },
      { instr: "ADDC (HL)", action: () => this.addCM.call(this), len: 1 },
      { instr: "ADDC A", action: () => this.addCR.call(this, "A"), len: 1 },
    ],
    /** 0x9 */ [
      { instr: "SUB B", action: () => this.subR.call(this, "B"), len: 1 },
      { instr: "SUB C", action: () => this.subR.call(this, "C"), len: 1 },
      { instr: "SUB D", action: () => this.subR.call(this, "D"), len: 1 },
      { instr: "SUB E", action: () => this.subR.call(this, "E"), len: 1 },
      { instr: "SUB H", action: () => this.subR.call(this, "H"), len: 1 },
      { instr: "SUB L", action: () => this.subR.call(this, "L"), len: 1 },
      { instr: "SUB (HL)", action: () => this.subM.call(this), len: 1 },
      { instr: "SUB A", action: () => this.subR.call(this, "A"), len: 1 },

      { instr: "SBB B", action: () => this.subCR.call(this, "B"), len: 1 },
      { instr: "SBB C", action: () => this.subCR.call(this, "C"), len: 1 },
      { instr: "SBB D", action: () => this.subCR.call(this, "D"), len: 1 },
      { instr: "SBB E", action: () => this.subCR.call(this, "E"), len: 1 },
      { instr: "SBB H", action: () => this.subCR.call(this, "H"), len: 1 },
      { instr: "SBB L", action: () => this.subCR.call(this, "L"), len: 1 },
      { instr: "SBB (HL)", action: () => this.subCM.call(this), len: 1 },
      { instr: "SBB A", action: () => this.subCR.call(this, "A"), len: 1 },
    ],
    /** 0xa */ [
      { instr: "ANA B", action: () => this.anaR.call(this, "B"), len: 1 },
      { instr: "ANA C", action: () => this.anaR.call(this, "C"), len: 1 },
      { instr: "ANA D", action: () => this.anaR.call(this, "D"), len: 1 },
      { instr: "ANA E", action: () => this.anaR.call(this, "E"), len: 1 },
      { instr: "ANA H", action: () => this.anaR.call(this, "H"), len: 1 },
      { instr: "ANA L", action: () => this.anaR.call(this, "L"), len: 1 },
      { instr: "ANA (HL)", action: () => this.anaM.call(this), len: 1 },
      { instr: "ANA A", action: () => this.anaR.call(this, "A"), len: 1 },

      { instr: "XRA B", action: () => this.xraR.call(this, "B"), len: 1 },
      { instr: "XRA C", action: () => this.xraR.call(this, "C"), len: 1 },
      { instr: "XRA D", action: () => this.xraR.call(this, "D"), len: 1 },
      { instr: "XRA E", action: () => this.xraR.call(this, "E"), len: 1 },
      { instr: "XRA H", action: () => this.xraR.call(this, "H"), len: 1 },
      { instr: "XRA L", action: () => this.xraR.call(this, "L"), len: 1 },
      { instr: "XRA (HL)", action: () => this.xraM.call(this), len: 1 },
      { instr: "XRA A", action: () => this.xraR.call(this, "A"), len: 1 },
    ],
    /** 0xb */ [
      { instr: "ORA B", action: () => this.ora.call(this, "B"), len: 1 },
      { instr: "ORA C", action: () => this.ora.call(this, "C"), len: 1 },
      { instr: "ORA D", action: () => this.ora.call(this, "D"), len: 1 },
      { instr: "ORA E", action: () => this.ora.call(this, "E"), len: 1 },
      { instr: "ORA H", action: () => this.ora.call(this, "H"), len: 1 },
      { instr: "ORA L", action: () => this.ora.call(this, "L"), len: 1 },
      { instr: "ORA (HL)", action: () => this.ora.call(this, "M"), len: 1 },
      { instr: "ORA A", action: () => this.ora.call(this, "A"), len: 1 },

      { instr: "CMP B", action: () => this.cmp.call(this, "B"), len: 1 },
      { instr: "CMP C", action: () => this.cmp.call(this, "C"), len: 1 },
      { instr: "CMP D", action: () => this.cmp.call(this, "D"), len: 1 },
      { instr: "CMP E", action: () => this.cmp.call(this, "E"), len: 1 },
      { instr: "CMP H", action: () => this.cmp.call(this, "H"), len: 1 },
      { instr: "CMP L", action: () => this.cmp.call(this, "L"), len: 1 },
      { instr: "CMP (HL)", action: () => this.cmp.call(this, "M"), len: 1 },
      { instr: "CMP A", action: () => this.cmp.call(this, "A"), len: 1 },
    ],
    /** 0xc */ [
      { instr: "RNZ", action: this.rnz, len: 1 },
      { instr: "POP BC", action: () => this.pop.call(this, "B", "C"), len: 1 },
      {
        instr: "JNZ",
        action: this.jnz,
        len: 3,
      },
      {
        instr: "JMP",
        action: this.jmp,
        len: 3,
      },
      { instr: "CNZ", action: this.cnz, len: 3 },
      {
        instr: "PUSH BC",
        action: () => this.pushXX.call(this, "B", "C"),
        len: 1,
      },
      {
        instr: "ADI",
        action: this.adi,
        len: 2,
      },
      null,
      { instr: "RZ", action: this.rz, len: 1 },
      { instr: "RET", action: this.ret, len: 1 },
      {
        instr: "JZ",
        action: this.jz,
        len: 3,
      },
      /** 0xb */ null,
      /** 0xc */ { instr: "CZ", action: this.cz, len: 3 },
      /** 0xd */ {
        instr: "CALL",
        action: this.call,
        len: 3,
      },
      /** 0xe */ null,
      /** 0xf */ null,
    ],
    /** 0xd */ [
      /** 0x0 */ { instr: "RNC", action: this.rnc, len: 1 },
      /** 0x1 */ {
        instr: "POP DE",
        action: () => this.pop.call(this, "D", "E"),
        len: 1,
      },
      /** 0x2 */ {
        instr: "JNC",
        action: this.jnc,
        len: 3,
      },
      /** 0x3 */ { instr: "OUT", action: this.out, len: 2 },
      null,
      /** 0x5 */ {
        instr: "PUSH DE",
        action: () => this.pushXX.call(this, "D", "E"),
        len: 1,
      },
      /** 0x6 */ { instr: "SUI", action: this.sui, len: 2 },
      /** 0x7 */ null,
      /** 0x8 */ null,
      /** 0x9 */ { instr: "RC", action: this.rc, len: 1 },
      /** 0xa */ {
        instr: "JC",
        action: this.jc,
        len: 3,
      },
      /** 0xb */ {
        instr: "IN",
        action: this.in,
        len: 2,
      },
      /**0xc */ null,
      /**0xd */ null,
      /**0xe */ { instr: "SBI", action: this.sbi, len: 2 },
      /**0xf */ null,
    ],
    /** 0xe */ [
      { instr: "RPO", action: this.rpo, len: 1 },
      /** 0x1 */ {
        instr: "POP HL",
        action: () => this.pop.call(this, "H", "L"),
        len: 1,
      },
      null,
      { instr: "XTHL", action: this.xthl, len: 1 },
      null,
      {
        instr: "PUSH HL",
        action: () => this.pushXX.call(this, "H", "L"),
        len: 1,
      },
      { instr: "ANI", action: this.ani, len: 2 },
      null,
      { instr: "RPE", action: this.rpe, len: 1 },
      { instr: "PCHL", action: this.pchl, len: 1 },
      null,
      { instr: "XCHG", action: this.xchg, len: 1 },
      null,
      null,
      null,
      null,
    ],
    /** 0xf */ [
      null,
      { instr: "POP AF", action: () => this.pop.call(this, "A", "F"), len: 1 },
      null,
      null,
      null,
      {
        instr: "PUSH AF",
        action: () => this.pushXX.call(this, "A", "F"),
        len: 1,
      },
      null,
      null,
      null,
      null,
      { instr: "JM", action: this.jm, len: 3 }, // 0xfa
      { instr: "EI", action: this.ei, len: 1 },
      null,
      null,
      {
        instr: "CPI",
        action: this.cpi,
        len: 2,
      },
      null,
    ],
  ];
}
