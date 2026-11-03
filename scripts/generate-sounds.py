#!/usr/bin/env python3
"""
Generates the interface "clack" sounds for ADVANCE DETAILING CO.

    python3 scripts/generate-sounds.py          # needs numpy + ffmpeg

The sounds are synthesised with a small physical model of a precision mechanical
switch (no samples, no licences): a contact transient excites damped resonant
modes of the housing, a short low "body" thock gives weight, band-limited contact
noise adds texture, and a second, quieter latch/release transient follows a few
milliseconds later. Every variation is deterministic (fixed seeds).

Output: public/assets/sounds/ui-clicks.mp3 — a sprite with 6 kinds x 3 variations.
Layout (must match src/lib/sound.ts): kinds in KINDS order, SLOT seconds per
sound, each sound starting LEAD seconds into its slot. The runtime detects the
exact onset of each slot, so encoder delay does not matter.
"""
import os
import subprocess
import tempfile
import wave

import numpy as np

SR = 48000
SLOT = 0.18
LEAD = 0.02
VARIANTS = 3
KINDS = ['button', 'nav', 'card', 'gallery', 'switch', 'ui']
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'sounds', 'ui-clicks.mp3')


# --------------------------------------------------------------------------- DSP helpers
def biquad(x, kind, f, q=0.707):
    """RBJ cookbook biquad (direct form I)."""
    w0 = 2 * np.pi * f / SR
    cs, sn = np.cos(w0), np.sin(w0)
    alpha = sn / (2 * q)
    if kind == 'lp':
        b = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2]
    elif kind == 'hp':
        b = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2]
    elif kind == 'bp':
        b = [alpha, 0, -alpha]
    else:
        raise ValueError(kind)
    a = [1 + alpha, -2 * cs, 1 - alpha]
    b = [v / a[0] for v in b]
    a1, a2 = a[1] / a[0], a[2] / a[0]
    y = np.zeros_like(x)
    x1 = x2 = y1 = y2 = 0.0
    for i, xi in enumerate(x):
        yi = b[0] * xi + b[1] * x1 + b[2] * x2 - a1 * y1 - a2 * y2
        x2, x1, y2, y1 = x1, xi, y1, yi
        y[i] = yi
    return y


def env(t, tau):
    return np.exp(-t / tau)


def strike(n, rng, *, energy=1.0, modes=(), body=None, noise=None, pulse_ms=0.12):
    """One mechanical contact event: transient + modal ring + body thock + contact noise."""
    t = np.arange(n) / SR
    out = np.zeros(n)
    # sharp contact transient (half-sine pulse)
    pw = max(2, int(pulse_ms / 1000 * SR))
    out[:pw] += np.sin(np.linspace(0, np.pi, pw)) * 0.9
    # resonant modes of the housing / actuator
    for f, tau_ms, amp in modes:
        f *= 1 + rng.uniform(-0.05, 0.05)
        tau = tau_ms / 1000 * (1 + rng.uniform(-0.12, 0.12))
        out += amp * env(t, tau * 0.8) * np.sin(2 * np.pi * f * t + rng.uniform(0, 0.4))
    # dense cluster of short inharmonic modes: real plastic/metal housings are not "tonal",
    # this spreads the energy so the result reads as a dry "clack" instead of a "ping"
    for _ in range(7):
        f = rng.uniform(900, 9500)
        out += rng.uniform(0.10, 0.24) * env(t, rng.uniform(0.0012, 0.0045)) * np.sin(2 * np.pi * f * t + rng.uniform(0, np.pi))
    # low body "thock" with a slight downward pitch glide (gives weight)
    if body:
        f0, f1, tau_ms, amp = body
        f = f0 + (f1 - f0) * (1 - np.exp(-t / 0.006))
        phase = 2 * np.pi * np.cumsum(f) / SR
        out += amp * env(t, tau_ms / 1000) * np.sin(phase)
    # band-limited contact noise
    if noise:
        lo, hi, tau_ms, amp = noise
        nz = rng.standard_normal(n) * env(t, tau_ms / 1000)
        nz = biquad(biquad(nz, 'hp', lo), 'lp', hi)
        out += 1.25 * amp * nz / (np.max(np.abs(nz)) + 1e-9)
    return out * energy


def place(buf, sig, at_s):
    i = int(at_s * SR)
    end = min(len(buf), i + len(sig))
    buf[i:end] += sig[: end - i]


def finish(x, length_s):
    n = int(length_s * SR)
    x = x[:n].copy()
    # tiny "chassis" early reflections for realism (not reverb)
    for d_ms, g in ((3.1, 0.10), (7.3, 0.05)):
        d = int(d_ms / 1000 * SR)
        refl = np.zeros_like(x)
        refl[d:] = x[:-d]
        x += g * biquad(refl, 'lp', 3500)
    x = biquad(x, 'hp', 110)
    x = np.tanh(1.4 * x / (np.max(np.abs(x)) + 1e-9))  # gentle saturation = mechanical grit
    # micro fade-in (0.15 ms) and smooth fade-out (last 10 ms)
    fi = int(0.00015 * SR)
    x[:fi] *= np.linspace(0, 1, fi)
    fo = int(0.010 * SR)
    x[-fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
    return x / np.max(np.abs(x))


# --------------------------------------------------------------------------- the sound kinds
def make(kind, rng):
    n = int(0.12 * SR)
    buf = np.zeros(n)
    j = lambda v, r=0.1: v * (1 + rng.uniform(-r, r))  # noqa: E731
    if kind == 'button':  # short premium mechanical click: press + latch
        place(buf, strike(n, rng, modes=[(2350, 6, .9), (4200, 4, .6), (6900, 2.5, .35), (1150, 9, .5)], body=(250, 190, 14, .55), noise=(3000, 9000, 1.2, .5)), 0)
        place(buf, strike(n, rng, energy=j(.28), modes=[(2700, 4, .8), (4800, 3, .5), (7600, 2, .3)], body=(290, 230, 8, .25), noise=(4000, 10000, .8, .4)), j(0.028, .1))
        return finish(buf, 0.075)
    if kind == 'nav':  # refined, slightly lower clack
        place(buf, strike(n, rng, energy=.85, modes=[(1650, 7, .9), (3100, 5, .55), (5200, 3, .3)], body=(215, 170, 12, .5), noise=(2000, 7000, 1.0, .35)), 0)
        place(buf, strike(n, rng, energy=j(.18), modes=[(1900, 4, .7), (3500, 3, .4)], noise=(3000, 8000, .6, .3)), j(0.024, .1))
        return finish(buf, 0.062)
    if kind == 'card':  # subtle, damped tactile click
        place(buf, strike(n, rng, energy=.7, pulse_ms=.18, modes=[(980, 8, .8), (2100, 5, .5), (3800, 3, .25)], body=(165, 130, 16, .65), noise=(1500, 5000, 1.0, .25)), 0)
        return finish(buf, 0.055)
    if kind == 'gallery':  # soft camera shutter: first + second curtain
        place(buf, strike(n, rng, modes=[(3300, 9, .7), (5600, 5, .45), (1900, 10, .5)], body=(290, 240, 10, .3), noise=(2000, 10000, 2.0, .6)), 0)
        second = strike(n, rng, energy=j(.8), modes=[(3000, 8, .6), (4400, 18, .25), (1700, 9, .45)], body=(240, 200, 12, .35), noise=(800, 3000, 2.5, .5))
        place(buf, second, j(0.034, .08))
        return finish(buf, 0.095)
    if kind == 'switch':  # precise toggle: crisp tick + spring detent thunk
        place(buf, strike(n, rng, modes=[(4800, 2.5, .7), (7200, 1.6, .45), (2600, 4, .5)], noise=(4000, 12000, .7, .6), pulse_ms=.08), 0)
        place(buf, strike(n, rng, energy=j(.7), modes=[(1250, 7, .6), (2700, 4, .4)], body=(330, 260, 11, .7), noise=(1500, 6000, .8, .3)), j(0.009, .1))
        return finish(buf, 0.07)
    if kind == 'ui':  # consistent subtle click for other controls
        place(buf, strike(n, rng, energy=.8, modes=[(2000, 5, .8), (3700, 3.5, .5), (6200, 2, .3)], body=(230, 185, 11, .4), noise=(2500, 8000, 1.0, .4)), 0)
        place(buf, strike(n, rng, energy=j(.2), modes=[(2300, 3, .6), (4200, 2.5, .35)], noise=(3500, 9000, .6, .3)), j(0.026, .1))
        return finish(buf, 0.065)
    raise ValueError(kind)


def main():
    total = np.zeros(int(SLOT * SR * len(KINDS) * VARIANTS))
    for k, kind in enumerate(KINDS):
        for v in range(VARIANTS):
            rng = np.random.default_rng(1000 + k * 17 + v)
            sig = make(kind, rng)
            assert len(sig) <= (SLOT - LEAD - 0.045) * SR, f'{kind} too long for its slot'
            start = int(((k * VARIANTS + v) * SLOT + LEAD) * SR)
            total[start : start + len(sig)] += sig * 0.89  # -1 dBFS peak, levels are set at runtime
    pcm = (np.clip(total, -1, 1) * 32767).astype('<i2')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, 'ui-clicks.wav')
        with wave.open(wav, 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '96k', OUT], check=True)
    print(f'wrote {os.path.relpath(OUT)} ({os.path.getsize(OUT) / 1024:.1f} KB, {len(KINDS)} kinds x {VARIANTS} variations)')


if __name__ == '__main__':
    main()
