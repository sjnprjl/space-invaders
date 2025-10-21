(function () {
  const spaceInvadersROM =
    "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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const resetButton = document.getElementById("reset");

  const keyMaps = {
    1: onePlayerStart,
    2: twoPlayerStart,
    ArrowLeft: moveLeft,
    ArrowRight: moveRight,
    " ": shoot,
    Enter: depositCoin,
  };

  const _ = null;
  const SCALE = 2;
  const HEIGHT = 256;
  const WIDTH = 224;

  const CPU_CLOCK_HZ = 2_000_000;
  const FPS = 60;
  const CYCLES_PER_FRAME = CPU_CLOCK_HZ / FPS;

  canvas.width = WIDTH * SCALE;
  canvas.height = HEIGHT * SCALE;

  const memory = new Memory(0xffff);
  const rom = Uint8Array.fromBase64(spaceInvadersROM);
  memory.addData(rom);

  const shiftHardware = new ShiftHardware();

  const IN_PORT_0 = new IO(
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
    /*            */ 0b00001110
  );

  const IN_PORT_1 = new IO(
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
    /*            */ 0b00001000
  );

  const IN_PORT_2 = new IO(
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
    /*            */ 0b00000000
  );

  const OUT_PORT_0 = new IO(0b00000000);
  const OUT_PORT_1 = new IO(0b00000000);
  // port 3 (discrete sounds)
  const OUT_PORT_3 = new Sound(
    /**
     *                    +-------- NC (not wired)
     *                    |+------- NC (not wired)
     *                    ||+------ AMP enable
     *                    |||+----- Extended Play
     *                    ||||+---- Invader die
     *                    |||||+--- Flash (player die)
     *                    ||||||+-- Shot
     *                    |||||||+- UFO (repeats)
     */ //                ||||||||
    /**              */ 0b00000000
  );

  const OUT_PORT_5 = new Sound(
    /**
     *                    +-------- NC (not wired)
     *                    |+------- NC (not wired)
     *                    ||+------ NC (Cocktail mode control ... to flip screen)
     *                    |||+----- UFO Hit              SX10 8.raw
     *                    ||||+---- Fleet movement 4     SX9 7.raw
     *                    |||||+--- Fleet movement 3     SX8 6.raw
     *                    ||||||+-- Fleet movement 2     SX7 5.raw
     *                    |||||||+- Fleet movement 1     SX6 4.raw
     */ //                ||||||||
    /**              */ 0b00000000
  );

  const OUT_PORT_6 = new IO(0b00000000);

  const cpu = new Cpu({
    memory,
    inputs: [
      IN_PORT_0, // INPUTS
      IN_PORT_1, // INPUTS
      IN_PORT_2, // INPUTS
      shiftHardware, // bit shift register read
    ],
    outputs: [
      OUT_PORT_0,
      OUT_PORT_1,
      shiftHardware,
      OUT_PORT_3, // sound bits
      shiftHardware, // shift data
      OUT_PORT_5, // sound bits
      OUT_PORT_6, // watch-dog
    ],
  });
  globalThis.cpu = cpu;

  const video = memory.data;
  const RST_1 = 1;
  const RST_2 = 2;
  let int = RST_1;
  const renderFrame = () => {
    let cyclesThisFrame = 0;

    while (cyclesThisFrame < CYCLES_PER_FRAME) {
      cyclesThisFrame += cpu.execute();
      if (
        (int == RST_1 && cyclesThisFrame >= CYCLES_PER_FRAME / 2) ||
        (int == RST_2 && cyclesThisFrame >= CYCLES_PER_FRAME)
      ) {
        cpu.interrupt(int);
        int = int === RST_1 ? RST_2 : RST_1;
      }
    }

    // paint screen

    const img = ctx.createImageData(canvas.width, canvas.height);
    const data = img.data; // RGBA array
    for (let i = 0; i < 0x1c00; i++) {
      const byte = video[0x2400 + i];

      const y = HEIGHT * SCALE - 1 - (i % 32) * (8 * SCALE);
      const x = Math.floor(i / 32) * SCALE;
      for (let b = 0; b < 8; b++) {
        const tmpY = y - b * SCALE;

        for (let ys = 0; ys < SCALE; ys++) {
          for (let xs = 0; xs < SCALE; xs++) {
            const finalX = x + xs;
            const finalY = tmpY - ys;
            let color = 0x00ff00;

            if (finalY >= 0 && finalY < 32 * SCALE) {
              color = 0xffffff;
            } else if (finalY >= 32 * SCALE && finalY < 64 * SCALE) {
              color = 0xff0000;
            } else if (finalY >= 64 * SCALE && finalY < 184 * SCALE) {
              color = 0xffffff;
            } else if (finalY >= 184 * SCALE && finalY < 240 * SCALE) {
              color = 0x00ff00;
            } else if (
              finalY >= 240 * SCALE &&
              finalY < 256 * SCALE &&
              finalX >= 0 &&
              finalX < 16 * SCALE
            ) {
              color = 0xffffff;
            } else if (
              finalY >= 240 * SCALE &&
              finalY < 256 * SCALE &&
              finalX >= 16 * SCALE &&
              finalX < 134 * SCALE
            ) {
              color = 0x00ff00;
            } else if (
              finalY >= 240 * SCALE &&
              finalY < 256 * SCALE &&
              finalX >= 134 * SCALE &&
              finalX < 224 * SCALE
            ) {
              color = 0xffffff;
            }

            if (!(byte & (1 << b))) color = 0x000000;

            const px = finalY * canvas.width + finalX;
            const idx = px * 4;
            data[idx] = (color >> 16) & 0xff;
            data[idx + 1] = (color >> 8) & 0xff;
            data[idx + 2] = color & 0xff;
            data[idx + 3] = 0xff;
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);

    requestAnimationFrame(renderFrame);
  };

  const PLAYER_1_START_MASK = 0x04;
  const CREDIT_MASK = 0x01;
  function onePlayerStart() {
    IN_PORT_1.write(_, IN_PORT_1.bits | PLAYER_1_START_MASK);
  }

  function twoPlayerStart() {
    IN_PORT_1.write(_, IN_PORT_1.bits | 0x02);
  }

  function _moveLeft(inPort) {
    return (e) => {
      const mask = ~0x60 & 0xff; /** reset move */
      inPort.write(
        _,
        (inPort.bits & mask) |
          (0x20 &
            (e.type === "keydown"
              ? 0xff
              : 0x00)) /** Set Left move if keydown */
      );
    };
  }

  const moveLeftP1 = _moveLeft(IN_PORT_1);
  const moveLeftP2 = _moveLeft(IN_PORT_2);
  function moveLeft(e) {
    moveLeftP1(e);
    moveLeftP2(e);
  }

  function _moveRight(inPort) {
    return (e) => {
      const mask = ~0x60 & 0xff; /** reset move */
      inPort.write(
        _,
        (inPort.bits & mask) |
          (0x40 &
            (e.type === "keydown"
              ? 0xff
              : 0x00)) /** Set Right move if keydown */
      );
    };
  }

  const moveRightP1 = _moveRight(IN_PORT_1);
  const moveRightP2 = _moveRight(IN_PORT_2);

  function moveRight(e) {
    moveRightP1(e);
    moveRightP2(e);
  }
  function _shoot(inPort) {
    return (e) => {
      const mask = ~0x10 & 0xff; /** reset shoot */
      inPort.write(
        _,
        (inPort.bits & mask) |
          (0x10 &
            (e.type === "keydown" ? 0xff : 0x00)) /** Set shoot if keydown */
      );
    };
  }

  const shootP1 = _shoot(IN_PORT_1);
  const shootP2 = _shoot(IN_PORT_2);
  function shoot(e) {
    shootP1(e);
    shootP2(e);
  }

  function depositCoin(e) {
    if (e.type !== "keydown") return;
    IN_PORT_1.write(_, IN_PORT_1.bits | CREDIT_MASK);
    setTimeout(() => {
      IN_PORT_1.write(_, IN_PORT_1.bits & (~CREDIT_MASK & 0xff));
    }, 10);
  }

  window.addEventListener("DOMContentLoaded", () => {
    requestAnimationFrame(renderFrame);
  });

  // events
  window.addEventListener("keydown", (e) => {
    const event = keyMaps[e.key];
    event?.(e);
  });

  window.addEventListener("keyup", (e) => {
    const event = keyMaps[e.key];
    event?.(e);
  });

  resetButton.addEventListener("click", () => {
    cpu.reset();
  });
})();
