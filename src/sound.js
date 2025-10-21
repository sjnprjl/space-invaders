import { IO } from "./io.js";
/**
 * Space Invaders Sounds
 */
export class Sound extends IO {
  constructor() {
    super(0x0);
  }

  write(port, data) {
    super.write(port, data);
    switch (port) {
      case 3:
        this._out_port_3(data);
        break;
      case 5:
        this._out_port_5(data);
        break;
    }
  }

  _out_port_3(data) {
    // TODO:
  }

  _out_port_5(data) {
    // TODO:
  }
}
