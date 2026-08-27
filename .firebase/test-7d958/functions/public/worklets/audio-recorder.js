class AudioRecorderWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Int16Array(this.bufferSize);
    this.offset = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const channel = input[0];
      for (let i = 0; i < channel.length; i++) {
        // Convert Float32 to Int16
        let s = Math.max(-1, Math.min(1, channel[i]));
        this.buffer[this.offset] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        this.offset++;

        if (this.offset >= this.bufferSize) {
          this.port.postMessage(this.buffer);
          this.offset = 0;
          this.buffer = new Int16Array(this.bufferSize);
        }
      }
    }
    return true;
  }
}

registerProcessor('audio-recorder-worklet', AudioRecorderWorklet);
