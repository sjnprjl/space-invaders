const Cpu = require("../src/cpu");
const Memory = require("../src/memory");
describe("CPU", () => {
  let memory;
  let cpu;
  beforeEach(() => {
    memory = new Memory(0x4000);
    cpu = new Cpu({ memory });
    cpu.PC = 0;
  });
  it("should correctly execute NOP instruction", () => {
    cpu._NOP();
    expect(cpu.PC).toBe(1);
  });
  it('should correctly execute "LXI B" instruction', () => {
    memory.writeByte(1, 0x34);
    memory.writeByte(2, 0x12);
    expect(cpu._LXI_B()).toBe(10); // 0x01
    expect(cpu.B).toBe(0x12);
    expect(cpu.C).toBe(0x34);
    expect(cpu.PC).toBe(3);
    expect(cpu.BC).toBe(0x1234);
  });
  it('should correctly execute "STAX B" instruction', () => {
    cpu.A = 0x0e;
    cpu.BC = 0xff;
    let tmpFlag = cpu.F;

    expect(cpu.B).toBe(0x00);
    expect(cpu.C).toBe(0xff);
    expect(cpu._STAX_B()).toBe(7);
    expect(memory.readByte(0xff)).toBe(0x0e);
    expect(cpu.PC).toBe(1);
    expect(cpu.F).toBe(tmpFlag);
  });
  it('should correctly execute "INX B" instruction', () => {
    cpu.BC = 0x1234;
    expect(cpu._INX_B()).toBe(5);
    expect(cpu.PC).toBe(1);
    expect(cpu.BC).toBe(0x1235);
  });
  it('should correctly execute "INR B" instruction', () => {
    cpu.B = 0xfe;
    cpu.SignFlag = 0;
    cpu.CarryFlag = 1;
    cpu.ParityFlag = 0;

    expect(cpu._INR_B()).toBe(5);
    expect(cpu.B).toBe(0xff);
    expect(cpu.PC).toBe(1);
    expect(cpu.B).toBe(0xff);
    expect(cpu.ZeroFlag).toBe(0);
    expect(cpu.SignFlag).toBe(0x80);
    expect(cpu.CarryFlag).toBe(1);
    expect(cpu.AuxCarryFlag).toBe(0x00);
    expect(cpu.ParityFlag).toBe(0x04);

    expect(cpu._INR_B()).toBe(5);
    expect(cpu.B).toBe(0x00);
    expect(cpu.PC).toBe(2);
    expect(cpu.ZeroFlag).toBe(0x40);
    expect(cpu.SignFlag).toBe(0);
    expect(cpu.CarryFlag).toBe(1);
    expect(cpu.AuxCarryFlag).toBe(0x10);
    expect(cpu.ParityFlag).toBe(0x04);

    cpu.B = 0x0f;
    expect(cpu._INR_B()).toBe(5);
    expect(cpu.B).toBe(0x10);
    expect(cpu.PC).toBe(3);
    expect(cpu.ZeroFlag).toBe(0);
    expect(cpu.SignFlag).toBe(0);
    expect(cpu.CarryFlag).toBe(1);
    expect(cpu.AuxCarryFlag).toBe(0x10);
    expect(cpu.ParityFlag).toBe(0);
  });

  it('should correctly execute "DCR B" instruction', () => {
    cpu.B = 0x01;
    cpu.CarryFlag = 1;
    expect(cpu._DCR_B()).toBe(5);
    expect(cpu.B).toBe(0x00);
    expect(cpu.PC).toBe(1);
    expect(cpu.CarryFlag).toBe(0x1);
    expect(cpu.ZeroFlag).toBe(0x40);
    expect(cpu.SignFlag).toBe(0);
    expect(cpu.ParityFlag).toBe(0x04);
    expect(cpu.AuxCarryFlag).toBe(0x10);

    expect(cpu._DCR_B()).toBe(5);
    expect(cpu.B).toBe(0xff);
    expect(cpu.PC).toBe(2);
    expect(cpu.ZeroFlag).toBe(0);
    expect(cpu.SignFlag).toBe(0x80);
    expect(cpu.ParityFlag).toBe(0x04);
    expect(cpu.AuxCarryFlag).toBe(0x0);
  });

  it('should correctly execute "MVI B," instruction', () => {
    memory.writeByte(1, 0x01);
    cpu.CarryFlag = 0;

    expect(cpu._MVI_B()).toBe(7);
    expect(cpu.B).toBe(0x01);
    expect(cpu.PC).toBe(2);

    expect(cpu._DCR_B()).toBe(5);
    expect(cpu.B).toBe(0x00);
    expect(cpu.PC).toBe(3);
    expect(cpu.CarryFlag).toBe(0x0);
    expect(cpu.ZeroFlag).toBe(0x40);
    expect(cpu.SignFlag).toBe(0);
    expect(cpu.ParityFlag).toBe(0x04);
    expect(cpu.AuxCarryFlag).toBe(0x10);
  });

  it('should correctly execute "RLC" instruction', () => {
    cpu.A = 0xf2;
    cpu.CarryFlag = 0;
    expect(cpu._RLC()).toBe(4);
    expect(cpu.CarryFlag).toBe(0x1);
    expect(cpu.A).toBe(0xe5);
  });
  it('should correctly execute "ANA" instruction', () => {
    cpu.A = 0xf2;
    cpu.B = 0xab;
    cpu.CarryFlag = 1;
    cpu.ZeroFlag = 1;
    cpu.SignFlag = 1;
    cpu.ParityFlag = 1;

    expect(cpu._ANA_B()).toBe(4);
    expect(cpu.A).toBe(0xf2 & 0xab);
    expect(cpu.PC).toBe(1);

    expect(cpu.CarryFlag).toBe(0);
    expect(cpu.ZeroFlag).toBe(0);
    expect(cpu.SignFlag).toBe(0x80);
    expect(cpu.ParityFlag).toBe(0);
    expect(cpu.AuxCarryFlag).toBe(0);
  });
  it('should correctly execute "CALL" instruction', () => {
    cpu.PC = 0x6e;
    cpu.SP = 0x100;
    memory.writeByte(0x6f, 0xf0);
    memory.writeByte(0x70, 0x00);

    expect(cpu._CALL()).toBe(17);
    expect(cpu.PC).toBe(0x00f0);
    expect(cpu.SP).toBe(0x100 - 2);
    expect(cpu.memory.read16(cpu.SP)).toBe(0x71);
    expect(cpu.memory.read16(cpu.SP + 1)).toBe(0x0);
  });
  it('should correctly execute "CPI" instruction', () => {
    cpu.A = 0xf2;
    cpu.CarryFlag = 0;
    cpu.ZeroFlag = 0;
    cpu.SignFlag = 0;
    cpu.ParityFlag = 0;
    memory.writeByte(0x0001, 0xf2);
    expect(cpu._CPI()).toBe(7);
    expect(cpu.PC).toBe(2);
    expect(cpu.ZeroFlag).toBe(0x40);
  });
  it('should correctly execute "RZ" instruction', () => {
    cpu.SP = 0x1000;
    memory.writeByte(cpu.SP - 2, 0x0000);
    memory.writeByte(cpu.SP - 1, 0x0001);
    cpu.SP -= 2;
    cpu.A = 0xf2;
    cpu.CarryFlag = 0;
    cpu.ZeroFlag = 0;
    cpu.SignFlag = 0;
    cpu.ParityFlag = 0;
    memory.writeByte(0x0001, 0xf2);
    expect(cpu._CPI()).toBe(7);
    expect(cpu.PC).toBe(2);
    expect(cpu.ZeroFlag).toBe(0x40);
    expect(cpu._RZ()).toBe(11);
    expect(cpu.SP).toBe(0x1000);
    expect(cpu.PC).toBe(0x100);
  });
});
