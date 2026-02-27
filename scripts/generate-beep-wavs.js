// Generate WAV beep files for the workout timer
// Run: node scripts/generate-beep-wavs.js
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;

function generateSineWave(frequency, durationSec, fadeOutStart) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Int16Array(numSamples);
  const fadeOutStartSample = Math.floor(SAMPLE_RATE * fadeOutStart);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    let amplitude = 0.4; // 40% to avoid any clipping

    // 5ms fade-in
    if (i < SAMPLE_RATE * 0.005) {
      amplitude *= i / (SAMPLE_RATE * 0.005);
    }

    // Fade-out from fadeOutStart to end
    if (i >= fadeOutStartSample) {
      const fadeProgress = (i - fadeOutStartSample) / (numSamples - fadeOutStartSample);
      amplitude *= 1 - fadeProgress;
    }

    samples[i] = Math.floor(Math.sin(2 * Math.PI * frequency * t) * amplitude * 32767);
  }

  return samples;
}

function createWavBuffer(samples) {
  const numSamples = samples.length;
  const byteRate = SAMPLE_RATE * 2; // 16-bit mono
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);       // chunk size
  buffer.writeUInt16LE(1, 20);        // PCM
  buffer.writeUInt16LE(1, 22);        // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(2, 32);        // block align
  buffer.writeUInt16LE(16, 34);       // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write samples
  for (let i = 0; i < numSamples; i++) {
    buffer.writeInt16LE(samples[i], 44 + i * 2);
  }

  return buffer;
}

const outDir = path.join(__dirname, '..', 'public', 'sounds');

const tones = [
  { name: 'countdown-beep', freq: 1100, duration: 0.5, fadeOutStart: 0.05 },
  { name: 'go-beep', freq: 880, duration: 1.0, fadeOutStart: 0.9 },
  { name: 'complete-beep', freq: 660, duration: 1.0, fadeOutStart: 0.9 },
];

for (const tone of tones) {
  const samples = generateSineWave(tone.freq, tone.duration, tone.fadeOutStart);
  const wav = createWavBuffer(samples);
  const filePath = path.join(outDir, `${tone.name}.wav`);
  fs.writeFileSync(filePath, wav);
  console.log(`Created: ${filePath} (${wav.length} bytes)`);
}

console.log('Done!');
