export class InputController {
  constructor() {
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      kick: false,
      hold: false,
      vent: false,
      report: false,
      use: false
    };

    this.mouse = {
      isDown: false,
      x: 0,
      y: 0
    };

    this.touchJoystick = {
      active: false,
      dx: 0,
      dy: 0
    };

    this.isChatting = false;
    this.setupListeners();
  }

  setupListeners() {
    // Prevent right click context menu on game canvas so right click can be used for hold skill
    window.addEventListener('contextmenu', (e) => {
      if (e.target.id === 'game-canvas') {
        e.preventDefault();
      }
    });

    // Keyboard Listeners
    window.addEventListener('keydown', (e) => {
      if (this.isChatting) return;

      const code = e.code;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(code)) {
        e.preventDefault();
      }

      if (code === 'KeyW' || code === 'ArrowUp') this.keys.up = true;
      if (code === 'KeyS' || code === 'ArrowDown') this.keys.down = true;
      if (code === 'KeyA' || code === 'ArrowLeft') this.keys.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') this.keys.right = true;
      if (code === 'Space' || code === 'KeyX' || code === 'KeyQ') this.keys.kick = true;
      if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyE' || code === 'KeyC' || code === 'KeyF') {
        this.keys.hold = true;
        this.keys.use = true;
      }
      if (code === 'KeyV') this.keys.vent = true;
      if (code === 'KeyR') this.keys.report = true;
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') this.keys.up = false;
      if (code === 'KeyS' || code === 'ArrowDown') this.keys.down = false;
      if (code === 'KeyA' || code === 'ArrowLeft') this.keys.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') this.keys.right = false;
      if (code === 'Space' || code === 'KeyX' || code === 'KeyQ') this.keys.kick = false;
      if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyE' || code === 'KeyC' || code === 'KeyF') {
        this.keys.hold = false;
        this.keys.use = false;
      }
      if (code === 'KeyV') this.keys.vent = false;
      if (code === 'KeyR') this.keys.report = false;
    });

    // Mouse Listeners
    window.addEventListener('mousedown', (e) => {
      if (this.isChatting || e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
      if (e.button === 0) { // Left click = Kick
        this.keys.kick = true;
      } else if (e.button === 2) { // Right click = Hold Ball Skill
        this.keys.hold = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.keys.kick = false;
      } else if (e.button === 2) {
        this.keys.hold = false;
      }
    });

    // Mobile Virtual Joystick Setup
    const joystickZone = document.getElementById('joystick-zone');
    const joystickKnob = document.getElementById('joystick-knob');
    const btnTouchAction = document.getElementById('btn-touch-action');
    const btnTouchHold = document.getElementById('btn-touch-hold');

    if (joystickZone && joystickKnob) {
      let touchId = null;
      let startX = 0;
      let startY = 0;
      const maxDist = 40;

      joystickZone.addEventListener('touchstart', (e) => {
        const touch = e.changedTouches[0];
        touchId = touch.identifier;
        const rect = joystickZone.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
        this.touchJoystick.active = true;
      }, { passive: false });

      window.addEventListener('touchmove', (e) => {
        if (!this.touchJoystick.active) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === touchId) {
            let dx = t.clientX - startX;
            let dy = t.clientY - startY;
            const dist = Math.hypot(dx, dy);
            if (dist > maxDist) {
              dx = (dx / dist) * maxDist;
              dy = (dy / dist) * maxDist;
            }
            joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;

            this.keys.left = dx < -15;
            this.keys.right = dx > 15;
            this.keys.up = dy < -15;
            this.keys.down = dy > 15;
          }
        }
      }, { passive: false });

      const resetJoystick = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchId) {
            this.touchJoystick.active = false;
            touchId = null;
            joystickKnob.style.transform = `translate(0px, 0px)`;
            this.keys.left = false;
            this.keys.right = false;
            this.keys.up = false;
            this.keys.down = false;
          }
        }
      };

      window.addEventListener('touchend', resetJoystick);
      window.addEventListener('touchcancel', resetJoystick);
    }

    const btnTouchVent = document.getElementById('btn-touch-vent');
    const btnTouchReport = document.getElementById('btn-touch-report');

    if (btnTouchAction) {
      btnTouchAction.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.keys.kick = true;
      });
      btnTouchAction.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.keys.kick = false;
      });
    }

    if (btnTouchHold) {
      btnTouchHold.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.keys.hold = true;
        this.keys.use = true;
      });
      btnTouchHold.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.keys.hold = false;
        this.keys.use = false;
      });
    }

    if (btnTouchVent) {
      btnTouchVent.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.keys.vent = true;
      });
      btnTouchVent.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.keys.vent = false;
      });
    }

    if (btnTouchReport) {
      btnTouchReport.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.keys.report = true;
      });
      btnTouchReport.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.keys.report = false;
      });
    }
  }

  setChatting(active) {
    this.isChatting = active;
    if (active) {
      this.keys.up = false;
      this.keys.down = false;
      this.keys.left = false;
      this.keys.right = false;
      this.keys.kick = false;
      this.keys.hold = false;
      this.keys.vent = false;
      this.keys.report = false;
      this.keys.use = false;
    }
  }

  getState() {
    return {
      up: this.keys.up,
      down: this.keys.down,
      left: this.keys.left,
      right: this.keys.right,
      kick: this.keys.kick,
      hold: this.keys.hold,
      vent: this.keys.vent,
      report: this.keys.report,
      use: this.keys.use
    };
  }
}
