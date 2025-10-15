(function () {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const WIDTH = (canvas.width = 256);
  const HEIGHT = (canvas.height = 224);
  const FPS = 60;
  const CYCLES_PER_FRAME = 33333;

  const romInput = document.getElementById("rom");
  const runner = document.getElementById("runner");
  const memory = new Memory(0x4000);
  const cpu = new Cpu({ memory });

  const video = memory.readVideoRAM();
  let cyclesInAFrame = 0;
  let run = true;
  let interruptCount = 0;
  let prevTime = 0;
  let time = 0;
  let breakpoint = 0x0a93;
  let debug = false;
  let step = false;
  const render = (ms) => {
    const delta = ms - prevTime;
    prevTime = ms;
    // time += delta;
    // if (time <= 1 / 60) {
    //   run = false;
    // } else {
    //   time = 0;
    //   run = true;
    // }

    while (
      step ||
      (run && !step) ||
      (debug && (cpu.registers.PC !== breakpoint || (run = false)))
    ) {
      step = false;
      let instr = cpu.disassemble();
      cyclesInAFrame += cpu.execute();
      if (Number.isNaN(cyclesInAFrame)) {
        console.log("NaN", instr);
        run = false;
        break;
      }
      if (cyclesInAFrame >= CYCLES_PER_FRAME / 2 && interruptCount === 0) {
        console.log("RST 1 signaled");
        interruptCount++;
        cpu.rst1();
        break;
      } else if (cyclesInAFrame >= CYCLES_PER_FRAME && interruptCount === 1) {
        console.log("RST 2 signaled");
        interruptCount++;
        cpu.rst2();
        break;
      }
    }

    let r;
    (r = document.getElementById("registers")).innerText = Object.entries(
      cpu.registers
    )
      .map(
        ([k, v]) =>
          `${k.padStart(2, " ")}: ${v
            .toString(16)
            .toUpperCase()
            .padStart(4, "0")}\t${v.toString(2).padStart(16, "0")}`
      )
      .join("\n");

    r.innerText = r.innerText + "\nisrDelay: " + memory.readByte(0x20c0);

    // paint screen
    for (let ii = 0; ii < video.length; ii++) {
      const byte = video[ii];
      const x = ii % 32;
      const y = Math.floor(ii / 32);
      let i = 0;
      while (i < 0x8) {
        const bit = (byte >> i) & 1;
        if (bit) {
          ctx.fillStyle = "green";
        } else ctx.fillStyle = "black";
        ctx.fillRect(x * 8 + i, y, 1, 1);
        i++;
      }
    }

    if (interruptCount == 2) {
      interruptCount = 0;
      cyclesInAFrame = 0;
    }

    requestAnimationFrame(render);
  };

  romInput.addEventListener("change", function () {
    const file = this.files[0];
    const reader = new FileReader();

    // read the file as a binary string
    reader.readAsArrayBuffer(file);

    // on load, create a Uint8Array from the binary string
    reader.onload = function () {
      const arrayBuffer = this.result;
      const uint8Array = new Uint8Array(arrayBuffer);
      memory.addROMData(uint8Array);
      requestAnimationFrame(render);
    };
  });

  runner.addEventListener("click", () => {
    step = true;
  });

  window.addEventListener("keydown", (e) => {});
  window.addEventListener("keyup", (e) => {});
})();
