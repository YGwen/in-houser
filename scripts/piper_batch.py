"""Synthesize a batch of announcer lines with Piper.

Reads a JSON list on stdin: [{"file": "lines/top.wav", "text": "Top lane!", "style": "call"}, ...]
and writes each WAV under --out. Called by scripts/generate-voice.mjs.
"""

import argparse
import json
import sys
import wave
from pathlib import Path

import numpy as np
from piper import PiperVoice, SynthesisConfig

# Slower speech sounds bigger and more dramatic; hype lines ("Duel!", "Fight!") are drawn out the most.
STYLES = {
    "call": SynthesisConfig(length_scale=1.15, noise_scale=0.6, noise_w_scale=0.7),
    "name": SynthesisConfig(length_scale=1.08, noise_scale=0.6, noise_w_scale=0.7),
    "hype": SynthesisConfig(length_scale=1.45, noise_scale=0.5, noise_w_scale=0.6),
}

# Piper rushes and clips the last sound of short sentences ("Greg!" ends mid-"g").
# Giving it a trailing pause to "say" lets the final sound finish and decay naturally.
END_PAD = [" ", "."]
SENTENCE_GAP_S = 0.12
TAIL_SILENCE_S = 0.25
FADE_OUT_S = 0.02
PEAK = 0.95


def synthesize(voice: PiperVoice, text: str, config: SynthesisConfig) -> np.ndarray:
    rate = voice.config.sample_rate
    parts = []
    for phonemes in voice.phonemize(text):
        audio = voice.phoneme_ids_to_audio(voice.phonemes_to_ids(phonemes + END_PAD), syn_config=config)
        parts.append(np.asarray(audio, dtype=np.float32).ravel())
        parts.append(np.zeros(int(rate * SENTENCE_GAP_S), dtype=np.float32))
    audio = np.concatenate(parts[:-1]) if parts else np.zeros(1, dtype=np.float32)

    fade = min(len(audio), int(rate * FADE_OUT_S))
    audio[len(audio) - fade:] *= np.linspace(1, 0, fade, dtype=np.float32)
    audio = np.concatenate([audio, np.zeros(int(rate * TAIL_SILENCE_S), dtype=np.float32)])

    peak = float(np.max(np.abs(audio))) or 1.0
    return audio * (PEAK / peak)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    items = json.load(sys.stdin)
    voice = PiperVoice.load(args.model)
    out = Path(args.out)

    for item in items:
        path = out / item["file"]
        path.parent.mkdir(parents=True, exist_ok=True)
        audio = synthesize(voice, item["text"], STYLES[item.get("style", "call")])
        with wave.open(str(path), "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(voice.config.sample_rate)
            wav.writeframes((audio * 32767).astype("<i2").tobytes())
        print(f"  {item['file']}  <-  {item['text']}")


if __name__ == "__main__":
    main()
