(function () {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const WIDTH = (canvas.width = 256);
  const HEIGHT = (canvas.height = 224);
  const CPU_CLOCK_HZ = 2_000_000;
  const FPS = 60;
  const CYCLES_PER_FRAME = CPU_CLOCK_HZ / FPS;

  const romInput = document.getElementById("rom");
  const runner = document.getElementById("runner");
  const memory = new Memory(0x4000);
  const cpu = new Cpu({ memory });

  const video = memory.readVideoRAM();

  let prevTime = 0;
  let interruptFlip = 0;
  let cont = true;
  let debug = false;
  const r = document.getElementById("registers");
  const render = (ms) => {
    const dt = (ms - prevTime) / 1000;
    // console.log("FPS", 1 / dt);
    prevTime = ms;
    let cyclesThisFrame = 0;

    while (cont && cyclesThisFrame < CYCLES_PER_FRAME) {
      if (debug) {
        cont = !cont;
        const decoded = cpu.disassemble(cpu.memory.readByte(cpu.PC));
        console.log(decoded);
      }
      cyclesThisFrame += cpu.execute();

      if (
        (interruptFlip === 0 && cyclesThisFrame >= CYCLES_PER_FRAME / 2) ||
        (interruptFlip === 1 && cyclesThisFrame >= CYCLES_PER_FRAME)
      ) {
        interruptFlip === 0 ? cpu.rst1() : cpu.rst2();
        interruptFlip ^= 1;
      }
    }

    r.innerText =
      Object.entries(cpu.registers)
        .map(
          ([k, v]) =>
            `${k.padStart(2, " ")}: ${v
              .toString(16)
              .toUpperCase()
              .padStart(4, "0")}\t${v.toString(2).padStart(16, "0")}`
        )
        .join("\n") +
      ("\n" + cpu.io[0x01].toString(2).padStart(8, "0"));
    // paint screen
    const img = ctx.createImageData(WIDTH, HEIGHT);
    const data = img.data; // RGBA array
    for (let i = 0; i < video.length; i++) {
      const byte = video[i];
      const y = Math.floor(i / 32);
      const xBase = (i % 32) * 8;
      for (let b = 0; b < 8; b++) {
        const on = (byte >> b) & 1;
        const idx = (y * WIDTH + xBase + b) * 4;
        const val = on ? 0x00ff00 : 0x000000;
        data[idx] = (val >> 16) & 0xff;
        data[idx + 1] = (val >> 8) & 0xff;
        data[idx + 2] = val & 0xff;
        data[idx + 3] = 0xff;
      }
    }
    ctx.putImageData(img, 0, 0);

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
    if (debug) {
      cont = true;
    } else {
      cont = false;
    }
    debug = true;
  });

  const INT_1 = 0x01;
  const PLAYER_1_START_MASK = 0x04;
  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "d":
        cpu.io[INT_1] |= 0x01; // deposit credits 0b00000001 (mask)
        break;
    }
  });
  window.addEventListener("keyup", (e) => {});
  document.getElementById("startGame").addEventListener("click", () => {
    cpu.io[INT_1] |= PLAYER_1_START_MASK;
  });
})();
