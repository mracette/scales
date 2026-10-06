/** Piano samples: 1.mp3 is C, each file a semitone higher. */
const SAMPLE_COUNT = 23;

type NoteListener = (pitch: number) => void;

let context: AudioContext | null = null;
let output: GainNode | null = null;
let samples: Promise<(AudioBuffer | null)[]> | null = null;
const listeners = new Set<NoteListener>();

const sampleFiles = Array.from({ length: SAMPLE_COUNT }, (_, i) =>
  fetch(`${import.meta.env.BASE_URL}audio/${i + 1}.mp3`).then((response) => response.arrayBuffer()),
);
// Swallow fetch failures here; they surface as silent notes rather than unhandled rejections.
sampleFiles.forEach((file) => file.catch(() => null));

function getContext() {
  if (!context) {
    context = new AudioContext();
    output = context.createGain();
    output.gain.value = 0.7;
    output.connect(context.destination);
  }
  return context;
}

function loadSamples() {
  if (!samples) {
    const ctx = getContext();
    samples = Promise.all(
      sampleFiles.map((file) =>
        file.then((data) => ctx.decodeAudioData(data)).catch(() => null),
      ),
    );
  }
  return samples;
}

/** Browsers only allow sound after a user gesture, so call this from one. */
export function unlockAudio() {
  const ctx = getContext();
  if (ctx.state === "suspended") void ctx.resume();
  void loadSamples();
}

export function onNotePlayed(listener: NoteListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Plays a pitch counted in semitones above the lowest C of the sample set. */
export function playPitch(pitch: number) {
  listeners.forEach((listener) => listener(pitch));
  unlockAudio();
  void loadSamples().then((buffers) => {
    const sampleIndex = Math.max(0, Math.min(pitch, SAMPLE_COUNT - 1));
    const buffer = buffers[sampleIndex];
    if (!buffer || !context || !output) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = 2 ** ((pitch - sampleIndex) / 12);
    source.connect(output);
    source.start();
  });
}
