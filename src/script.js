function decisionWheel() {
  // normalize to [0, 360)
  const norm = (deg) => ((deg % 360) + 360) % 360;

  return {
    rotation: 0,
    spinning: false,
    result: '',
    showGlow: false,
    showShake: false,

    // Pointer is at the top (12 o'clock)
    pointerAt: -90,         // degrees
    calibrateDeg: 0,        // tweak this if your art is a hair off (e.g., 2 or -3)

    // Define segments in clockwise order starting from the pointer (12 o'clock)
    segments: [
      'Absolutely Yes',
      'Definitely Not',
      'Probably Yes',
      'Most Likely No',
      'Without a Doubt',
      'Not a Chance',
      'Yes, Definitely',
      'No Way',
      "It's Possible",
      'Better Not'
    ],

    // --- AUDIO ---
    _audioCtx: null,
    _gain: null,
    _resumeAudio() {
      // Initialize on first user gesture
      if (!this._audioCtx) {
        this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this._gain = this._audioCtx.createGain();
        this._gain.gain.value = 0.15; // master volume
        this._gain.connect(this._audioCtx.destination);
      }
      if (this._audioCtx.state === 'suspended') this._audioCtx.resume();
    },
    _beep(f = 1200, ms = 60) {
      if (!this._audioCtx) return;
      const t0 = this._audioCtx.currentTime;
      const osc = this._audioCtx.createOscillator();
      const g = this._audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(1.0, t0 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
      osc.connect(g).connect(this._gain);
      osc.start(t0);
      osc.stop(t0 + ms / 1000 + 0.02);
    },
    _tick() {
      // slightly randomized tick pitch for feel
      const f = 900 + Math.random() * 300;
      this._beep(f, 40);
    },
    _winJingle() {
      // quick arpeggio (C5,E5,G5,C6)
      if (!this._audioCtx) return;
      const t0 = this._audioCtx.currentTime + 0.02;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => {
        const delay = i * 0.08;
        const osc = this._audioCtx.createOscillator();
        const g = this._audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t0 + delay);
        g.gain.setValueAtTime(0.0001, t0 + delay);
        g.gain.exponentialRampToValueAtTime(0.6, t0 + delay + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + 0.22);
        osc.connect(g).connect(this._gain);
        osc.start(t0 + delay);
        osc.stop(t0 + delay + 0.25);
      });
    },

    // --- CONFETTI ---
    _confettiBurst() {
      if (typeof confetti !== 'function') return;
      // fire two mirrored jets from top-center (where your arrow is)
      confetti({
        particleCount: 80,
        angle: 270,            // downwards
        spread: 60,
        startVelocity: 55,
        origin: { x: 0.5, y: 0.12 }, // near arrow area
        scalar: 0.9,
        ticks: 200
      });
      confetti({
        particleCount: 80,
        angle: 270,
        spread: 80,
        startVelocity: 45,
        origin: { x: 0.5, y: 0.12 },
        scalar: 0.9,
        ticks: 220
      });
    },

    // --- CORE ---
    spinWheel() {
      if (this.spinning) return;

      this._resumeAudio(); // ensure audio context is ready

      this.spinning = true;
      this.result = '';
      this.showGlow = false;
      this.showShake = false;

      const segmentSize = 360 / this.segments.length;
      const idx = Math.floor(Math.random() * this.segments.length);
      const targetAngle = idx * segmentSize + segmentSize / 2; // segment midpoint from +X (right)

      // base: where the wheel must end so that the target midpoint sits under the pointer
      const base = norm(this.pointerAt - targetAngle - this.calibrateDeg);

      // how far we still need to rotate from *current* rotation to reach base (clockwise)
      const current = norm(this.rotation);
      let delta = norm(base - current);

      // add whole spins for style
      const spins = 5;
      delta += spins * 360;

      // tick-on-boundary: track last visible index and tick whenever it changes during spin
      let lastIndex = this.selectedIndexFromRotation();

      gsap.to(this, {
        rotation: this.rotation + delta,
        duration: 4,
        ease: "power4.out",
        onUpdate: () => {
          const curIdx = this.selectedIndexFromRotation();
          if (curIdx !== lastIndex) {
            lastIndex = curIdx;
            this._tick();
          }
        },
        onComplete: () => {
          this.spinning = false;
          this.result = this.segments[idx];
          this.showGlow = true;
          this._confettiBurst();
          this._winJingle();

          setTimeout(() => {
            this.showShake = true;
            setTimeout(() => (this.showShake = false), 600);
          }, 300);
        }
      });
    },

    // Handy for testing a specific index
    debugSpin(segmentIndex) {
      if (this.spinning) return;

      this._resumeAudio();

      this.spinning = true;
      this.result = '';
      this.showGlow = false;
      this.showShake = false;

      const segmentSize = 360 / this.segments.length;
      const targetAngle = segmentIndex * segmentSize + segmentSize / 2;
      const base = norm(this.pointerAt - targetAngle - this.calibrateDeg);
      const current = norm(this.rotation);
      let delta = norm(base - current);
      delta += 2 * 360; // fewer spins for quick tests

      let lastIndex = this.selectedIndexFromRotation();

      gsap.to(this, {
        rotation: this.rotation + delta,
        duration: 2,
        ease: "power3.out",
        onUpdate: () => {
          const curIdx = this.selectedIndexFromRotation();
          if (curIdx !== lastIndex) {
            lastIndex = curIdx;
            this._tick();
          }
        },
        onComplete: () => {
          this.spinning = false;
          this.result = this.segments[segmentIndex];
          this.showGlow = true;
          this._confettiBurst();
          this._winJingle();
        }
      });
    },

    // If you want to verify what index is currently under the pointer
    selectedIndexFromRotation() {
      const segmentSize = 360 / this.segments.length;
      const a = norm(this.pointerAt - norm(this.rotation) - this.calibrateDeg);
      return Math.floor(a / segmentSize) % this.segments.length;
    }
  };
}
