class Disassembler extends Cpu {
  _codes = [];

  disAssemble() {
    while (this.PC < this.memory.length) {
      const opcode = this.memory.readByte(this.PC);
      const h = (opcode >> 4) & 0x0f;
      const l = opcode & 0x0f;
      const op = this.__instructions[h][l];
      if (!op) {
        throw new Error(`Invalid opcode: ${opcode.toString(16)}`);
      }

      // __IFDEF DEBUG
      if (!op.len)
        throw new Error(
          `Expected len property for INSTR: ${op.instr.toString()}`
        );
      // __ENDIF

      const argsLen = op?.len ? op.len - 1 : 0;
      let args = [];

      let mnemonic = (function (that, instr, argsLen) {
        let arg;
        switch (argsLen) {
          case 1:
            arg = that.memory.readByte(that.PC + 1);
            break;
          case 2:
            arg = that.memory.read16(that.PC + 1);
            break;
          default:
            break;
        }

        if (arg !== undefined) {
          arg =
            "$" +
            arg
              .toString(16)
              .padStart(argsLen * 2, "0")
              .toUpperCase();
        } else arg = "";

        return instr + " " + arg;
      })(this, op.instr, argsLen);

      if (argsLen) {
        args = this.memory.readBytes(this.PC + 1, argsLen);
        args = args.map((arg) =>
          arg.toString(16).padStart(2, "0").toUpperCase()
        );
      }

      const line = `${this.PC.toString(16).padStart(4, "0")}: ${opcode
        .toString(16)
        .padStart(2, "0")
        .toUpperCase()} ${args.join(" ").padEnd(8, " ")} ${mnemonic}`;

      console.log(line);

      this.PC += op?.len || 1;
    }
  }

  getCodes() {
    return this._codes;
  }
}
