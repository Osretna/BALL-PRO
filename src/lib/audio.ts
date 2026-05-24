/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let audioCtx: AudioContext | null = null;
let soundVolume = 0.5;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function setSoundVolume(volume: number) {
  soundVolume = Math.max(0, Math.min(1, volume));
}

export function getSoundVolume(): number {
  return soundVolume;
}

/**
 * Play a high-quality "clack" sound of two balls colliding.
 * The intensity is determined by the collision velocity.
 */
export function playBallClack(velocity: number) {
  const ctx = getAudioContext();
  if (!ctx || soundVolume <= 0) return;

  const vol = Math.min(1.0, Math.max(0.1, velocity / 10)) * soundVolume;

  // First Osc: High frequency sharp wood strike
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(1400, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.08);

  gain1.gain.setValueAtTime(vol * 0.7, ctx.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

  // Filter to make it sound sharp and hollow
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1800;
  filter.Q.value = 3.0;

  // Second Osc: Slower hollow wood click
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(450, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.12);

  gain2.gain.setValueAtTime(vol * 0.5, ctx.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

  const compressor = ctx.createDynamicsCompressor();

  osc1.connect(filter);
  filter.connect(gain1);
  gain1.connect(compressor);

  osc2.connect(gain2);
  gain2.connect(compressor);

  compressor.connect(ctx.destination);

  osc1.start();
  osc1.stop(ctx.currentTime + 0.09);
  osc2.start();
  osc2.stop(ctx.currentTime + 0.13);
}

/**
 * Play a low dull "thud" for when a ball hits a table cushion.
 */
export function playCushionThud(velocity: number) {
  const ctx = getAudioContext();
  if (!ctx || soundVolume <= 0) return;

  const vol = Math.min(1.0, Math.max(0.1, velocity / 8)) * soundVolume;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = "sine";
  osc.frequency.setValueAtTime(110, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.15);

  filter.type = "lowpass";
  filter.frequency.value = 160;

  gain.gain.setValueAtTime(vol * 0.9, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.16);
}

/**
 * Play standard cuing whack sound.
 */
export function playCueHit(power: number) {
  const ctx = getAudioContext();
  if (!ctx || soundVolume <= 0) return;

  const vol = (power / 100) * soundVolume;

  // Wood slider friction (White noise burst)
  const bufferSize = ctx.sampleRate * 0.05; // 50ms
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noiseNode = ctx.createBufferSource();
  noiseNode.buffer = buffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 1200;
  noiseFilter.Q.value = 2;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(vol * 0.3, ctx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

  // Rigid Wood snap
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(320, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.07);

  gain.gain.setValueAtTime(vol * 0.8, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);

  noiseNode.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  osc.connect(gain);
  gain.connect(ctx.destination);

  noiseNode.start();
  noiseNode.stop(ctx.currentTime + 0.06);
  osc.start();
  osc.stop(ctx.currentTime + 0.08);
}

/**
 * Play plop of a ball falling into the pocket.
 */
export function playPocketPlop() {
  const ctx = getAudioContext();
  if (!ctx || soundVolume <= 0) return;

  const vol = 0.9 * soundVolume;

  // descending pitch for falling
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = "sine";
  osc.frequency.setValueAtTime(260, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.25);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(300, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.25);

  gain.gain.setValueAtTime(vol * 0.8, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.26);
}
