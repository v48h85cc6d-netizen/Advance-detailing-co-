#!/usr/bin/env python3
"""
Generates the interface "clack" sounds for ADVANCE DETAILING CO.  (sound design v2)

    python3 scripts/generate-sounds.py          # needs numpy + ffmpeg

Physical model of precision automotive switchgear (no samples, no licences):

  contact   a band-limited, controlled contact transient (short shaped noise burst + soft pulse),
            so the attack is crisp without a digital "spike"
  housing   resonant modes rendered as clusters of slightly detuned partials with frequency-dependent
            damping (high partials die fastest, as in damped polymer/alloy parts) → a dry "clack",
            never a pitched "ping" or metallic ring
  body      two low modes with a ~1 ms soft onset → felt depth/weight instead of a boom
  latch     a smaller secondary transient a few ms later (detent / latch / second curtain)

Loudness: the variations of each kind are matched (A-weighted), each kind is peak-normalised as a group
(best MP3 quality), then the encoded sprite is measured and the script prints the runtime LEVEL values for
src/lib/sound.ts that hit TARGET_DBA — so the category hierarchy is designed and verified, not guessed.

Output: public/assets/sounds/ui-clicks.mp3 — a sprite with 6 kinds x 3 variations.
Layout (must match src/lib/sound.ts): kinds in KINDS order, SLOT seconds per sound, each sound
starting LEAD seconds into its slot. The runtime detects the exact onset, so encoder delay does not matter.
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

# Target perceived loudness at runtime (dB, A-weighted). v1 measured: button -32.6, nav -32.9,
# card -34.4, gallery -30.6, switch -33.6, ui -35.1 → v2 keeps buttons/cards, softens the rest, never louder.
TARGET_DBA = {'button': -33.0, 'nav': -34.6, 'card': -34.4, 'gallery': -33.4, 'switch': -34.0, 'ui': -36.0}
VARIATION_DB = (0.0, -0.3, 0.25)  # natural level differences between the 3 variations


# --------------------------------------------------------------------------- DSP helpers
def biquad(x, kind, f, q=0.707, gain_db=0.0):
    """RBJ cookbook biquad (direct form I)."""
    w0 = 2 * np.pi * f / SR
    cs, sn = np.cos(w0), np.sin(w0)
    alpha = sn / (2 * q)
    A = 10 ** (gain_db / 40)
    if kind == 'lp':
        b = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2]
        a = [1 + alpha, -2 * cs, 1 - alpha]
    elif kind == 'hp':
        b = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2]
        a = [1 + alpha, -2 * cs, 1 - alpha]
    elif kind == 'bp':
        b = [alpha, 0, -alpha]
        a = [1 + alpha, -2 * cs, 1 - alpha]
    elif kind == 'hshelf':
        sq = 2 * np.sqrt(A) * alpha
        b = [A * ((A + 1) + (A - 1) * cs + sq), -2 * A * ((A - 1) + (A + 1) * cs), A * ((A + 1) + (A - 1) * cs - sq)]
        a = [(A + 1) - (A - 1) * cs + sq, 2 * ((A - 1) - (A + 1) * cs), (A + 1) - (A - 1) * cs - sq]
    else:
        raise ValueError(kind)
    b = [v / a[0] for v in b]
    a1, a2 = a[1] / a[0], a[2] / a[0]
    y = np.zeros_like(x)
    x1 = x2 = y1 = y2 = 0.0
    for i, xi in enumerate(x):
        yi = b[0] * xi + b[1] * x1 + b[2] * x2 - a1 * y1 - a2 * y2
        x2, x1, y2, y1 = x1, xi, y1, yi
        y[i] = yi
    return y


def a_weighted_db(x, sr=SR):
    """A-weighted energy in dB of a 110 ms window starting at the onset (scale used for all comparisons)."""
    x = np.pad(x, (0, max(0, int(0.11 * sr) - len(x))))[: int(0.11 * sr)]
    X = np.abs(np.fft.rfft(x, 8192)) ** 2
    f = np.maximum(np.fft.rfftfreq(8192, 1 / sr), 1)
    f2 = f ** 2
    ra = (12194 ** 2 * f2 ** 2) / ((f2 + 20.6 ** 2) * np.sqrt((f2 + 107.7 ** 2) * (f2 + 737.9 ** 2)) * (f2 + 12194 ** 2)) / 0.794
    return 10 * np.log10((X * ra ** 2).sum() / 8192 / len(x) + 1e-15) + 3


def place(buf, sig, at_s):
    i = int(at_s * SR)
    end = min(len(buf), i + len(sig))
    buf[i:end] += sig[: end - i]


# --------------------------------------------------------------------------- physical building blocks
def contact(n, rng, *, width_ms=0.3, bright=8000, amp=1.0):
    """Controlled contact transient: shaped noise burst + soft pulse, band-limited (no digital spike)."""
    w = max(4, int(width_ms / 1000 * SR))
    burst = np.zeros(n)
    win = np.hanning(2 * w)[w:] ** 1.5  # instant rise, smooth fall
    burst[:w] = rng.standard_normal(w) * win
    pw = max(3, int(0.18 / 1000 * SR))
    burst[:pw] += np.hanning(pw) * 1.4
    burst = biquad(biquad(burst, 'lp', bright, 0.6), 'hp', 700)
    return amp * burst / (np.max(np.abs(burst)) + 1e-9)


def housing(n, rng, modes, *, damping=0.45, cluster=5):
    """Resonant modes as detuned clusters with frequency-dependent damping (dry, never pitched)."""
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f0, tau_ms, amp in modes:
        f0 *= 1 + rng.uniform(-0.03, 0.03)
        tau = 0.75 * tau_ms / 1000 * (2000 / f0) ** damping  # higher modes decay faster (material damping)
        for c in range(cluster):
            det = 1 + (c - (cluster - 1) / 2) * rng.uniform(0.012, 0.026)
            out += amp / cluster * np.exp(-t / (tau * rng.uniform(0.85, 1.1))) * np.sin(2 * np.pi * f0 * det * t + rng.uniform(0, 2 * np.pi))
    return out


def texture(n, rng, *, count=11, lo=900, hi=7000, amp=0.15, tau_ms=(0.8, 2.4)):
    """Dense short inharmonic micro-resonances: the 'material' of the part."""
    t = np.arange(n) / SR
    out = np.zeros(n)
    for _ in range(count):
        f = np.exp(rng.uniform(np.log(lo), np.log(hi)))
        out += rng.uniform(0.5, 1.0) * amp * np.exp(-t / (rng.uniform(*tau_ms) / 1000)) * np.sin(2 * np.pi * f * t + rng.uniform(0, 2 * np.pi))
    return out


def body(n, rng, f, *, tau_ms=14, amp=0.6, attack_ms=0.9):
    """Low mechanical body: two low modes with a soft onset and a slight downward glide."""
    t = np.arange(n) / SR
    f = f * (1 + rng.uniform(-0.04, 0.04))
    glide = f * (1 - 0.12 * (1 - np.exp(-t / 0.008)))
    ph = 2 * np.pi * np.cumsum(glide) / SR
    att = 1 - np.exp(-t / (attack_ms / 1000))
    sig = np.sin(ph) + 0.45 * np.sin(1.52 * ph + 0.7)
    return amp * att * np.exp(-t / (tau_ms / 1000)) * sig


def thud(n, rng, *, lo=180, hi=900, tau_ms=3.0, amp=0.35):
    """Plunger/actuator thud: low-passed noise, gives the impression of mass."""
    t = np.arange(n) / SR
    nz = rng.standard_normal(n) * np.exp(-t / (tau_ms / 1000))
    nz = biquad(biquad(nz, 'hp', lo), 'lp', hi)
    return amp * nz / (np.max(np.abs(nz)) + 1e-9)


def event(n, rng, *, contact_amp=1.0, bright=8000, width_ms=0.3, modes=(), body_f=None, body_amp=0.6, body_tau=14, body_attack=0.9, thud_amp=0.3, tex_amp=0.16, tex_hi=7000):
    sig = contact(n, rng, width_ms=width_ms, bright=bright, amp=contact_amp)
    sig += housing(n, rng, modes)
    sig += texture(n, rng, amp=tex_amp, hi=tex_hi)
    if body_f:
        sig += body(n, rng, body_f, tau_ms=body_tau, amp=body_amp, attack_ms=body_attack)
    if thud_amp:
        sig += thud(n, rng, amp=thud_amp)
    return sig


def finish(x, length_s, *, top_cut_db=-4.0, shelf_f=6500, crest_db=13.0):
    n = int(length_s * SR)
    x = x[:n].copy()
    # tiny chassis reflections (realism, not reverb)
    for d_ms, g in ((2.7, 0.06), (6.1, 0.03)):
        d = int(d_ms / 1000 * SR)
        refl = np.zeros_like(x)
        refl[d:] = x[:-d]
        x += g * biquad(refl, 'lp', 2500)
    x = biquad(x, 'hp', 70)  # keep the felt body, remove sub rumble
    x = biquad(x, 'hshelf', shelf_f, 0.7, top_cut_db)  # smooth, expensive-sounding top end
    # transient control: soft-knee the attack so it is crisp but never spiky (consistent across variations)
    head = x[: int(0.010 * SR)]
    thr = np.sqrt((head ** 2).mean()) * 10 ** (crest_db / 20)
    over = np.abs(x) > thr
    x[over] = np.sign(x[over]) * (thr + (thr * 0.12) * np.tanh((np.abs(x[over]) - thr) / (thr * 0.12)))
    fi = int(0.0002 * SR)
    x[:fi] *= np.linspace(0, 1, fi)
    fo = int(0.012 * SR)
    x[-fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
    return x


# --------------------------------------------------------------------------- the six kinds
def make(kind, rng, v):
    n = int(0.12 * SR)
    buf = np.zeros(n)
    pitch = (1.0, 0.975, 1.03)[v]  # deliberate per-variation character (runtime adds ±2.5 % more)
    latch_dt = (1.0, 1.08, 0.93)[v]
    P = lambda modes: [(f * pitch, tau, a) for f, tau, a in modes]  # noqa: E731

    if kind == 'button':  # A — crisp contact, subtle low body, refined secondary latch
        place(buf, event(n, rng, bright=9500, modes=P([(2300, 5.0, .55), (3900, 3.5, .32), (1250, 6.0, .32)]),
                         body_f=240 * pitch, body_amp=.30, body_tau=11, thud_amp=.22), 0)
        place(buf, event(n, rng, contact_amp=.55, bright=9000, width_ms=.2, modes=P([(2800, 3.0, .35), (4600, 2.2, .2)]),
                         body_f=300 * pitch, body_amp=.14, body_tau=7, thud_amp=0, tex_amp=.08) * .30, 0.026 * latch_dt)
        return finish(buf, 0.072, top_cut_db=-2.5, shelf_f=7500, crest_db=11.5)
    if kind == 'nav':  # B — softer, lighter, elegant
        place(buf, event(n, rng, contact_amp=.8, bright=6500, width_ms=.35, modes=P([(1700, 5.0, .45), (2900, 3.5, .25)]),
                         body_f=270 * pitch, body_amp=.2, body_tau=11, thud_amp=.12, tex_amp=.12, tex_hi=6000), 0)
        place(buf, event(n, rng, contact_amp=.45, bright=7000, width_ms=.25, modes=P([(2100, 2.8, .25)]),
                         body_f=None, thud_amp=0, tex_amp=.06, tex_hi=5000) * .27, 0.023 * latch_dt)
        return finish(buf, 0.064, top_cut_db=-4.5, shelf_f=6500, crest_db=10.5)
    if kind == 'card':  # C — satisfying tactile click with more depth and weight
        place(buf, event(n, rng, contact_amp=.75, bright=6000, width_ms=.4, modes=P([(1050, 4.5, .45), (2100, 3.5, .3), (3400, 2.5, .16)]),
                         body_f=170 * pitch, body_amp=.42, body_tau=14, body_attack=1.6, thud_amp=.30, tex_amp=.13, tex_hi=5500), 0)
        place(buf, event(n, rng, contact_amp=.35, bright=6500, width_ms=.3, modes=P([(1500, 3.0, .2)]),
                         body_f=210 * pitch, body_amp=.2, body_tau=8, thud_amp=.1, tex_amp=.05) * .22, 0.019 * latch_dt)
        return finish(buf, 0.066, top_cut_db=-4, shelf_f=5500, crest_db=10.5)
    if kind == 'gallery':  # D — precision camera mechanism: first + second curtain, short and damped
        place(buf, event(n, rng, contact_amp=.62, bright=7000, width_ms=.5, modes=P([(2600, 4.5, .35), (4100, 3.0, .2), (1500, 6.0, .3)]),
                         body_f=260 * pitch, body_amp=.24, body_tau=8, thud_amp=.2, tex_amp=.14, tex_hi=7000), 0)
        place(buf, event(n, rng, contact_amp=.55, bright=6500, width_ms=.55, modes=P([(2300, 5.0, .32), (3600, 3.5, .18), (1300, 6.5, .28)]),
                         body_f=225 * pitch, body_amp=.26, body_tau=9, thud_amp=.22, tex_amp=.12, tex_hi=6500) * .72, 0.024 * latch_dt)
        return finish(buf, 0.084, top_cut_db=-4, shelf_f=6500, crest_db=10.5)
    if kind == 'switch':  # E — clean precise switch: subtle crisp tick + spring detent
        place(buf, event(n, rng, contact_amp=.9, bright=11000, width_ms=.16, modes=P([(4300, 1.8, .3), (2500, 2.6, .22)]),
                         body_f=None, thud_amp=0, tex_amp=.1, tex_hi=8000) * .42, 0)
        place(buf, event(n, rng, contact_amp=.8, bright=6500, width_ms=.35, modes=P([(1350, 5.5, .4), (2600, 3.5, .22)]),
                         body_f=300 * pitch, body_amp=.34, body_tau=9, thud_amp=.22, tex_amp=.1, tex_hi=6000), 0.0085 * latch_dt)
        return finish(buf, 0.064, top_cut_db=-3, shelf_f=7500, crest_db=12.5)
    if kind == 'ui':  # F — quiet, refined, unobtrusive
        place(buf, event(n, rng, contact_amp=.75, bright=6500, width_ms=.3, modes=P([(2000, 4.0, .38), (3300, 3.0, .2)]),
                         body_f=255 * pitch, body_amp=.19, body_tau=11, thud_amp=.12, tex_amp=.1, tex_hi=6000), 0)
        place(buf, event(n, rng, contact_amp=.4, bright=7000, width_ms=.2, modes=P([(2400, 2.5, .2)]),
                         body_f=None, thud_amp=0, tex_amp=.05) * .27, 0.024 * latch_dt)
        return finish(buf, 0.062, top_cut_db=-4.5, shelf_f=6500, crest_db=10.5)
    raise ValueError(kind)


def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', '44100', '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, '<i2').astype(float) / 32768


def main():
    total = np.zeros(int(SLOT * SR * len(KINDS) * VARIANTS))
    for k, kind in enumerate(KINDS):
        group = []
        for v in range(VARIANTS):
            rng = np.random.default_rng(2000 + k * 31 + v)
            sig = make(kind, rng, v)
            assert len(sig) <= (SLOT - LEAD - 0.045) * SR, f'{kind} too long for its slot'
            group.append(sig * 10 ** ((VARIATION_DB[v] - a_weighted_db(sig)) / 20))  # equal loudness (+ natural spread)
        g = 0.84 / max(np.max(np.abs(x)) for x in group)  # whole kind peaks at -1.5 dBFS
        for v, sig in enumerate(group):
            start = int(((k * VARIANTS + v) * SLOT + LEAD) * SR)
            total[start : start + len(sig)] += sig * g
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
    # calibrate runtime gains on the encoded file (exactly what browsers decode)
    x, sr = decode(OUT), 44100
    level = {}
    for k, kind in enumerate(KINDS):
        louds = []
        for v in range(VARIANTS):
            sl = x[int((k * VARIANTS + v) * SLOT * sr) : int((k * VARIANTS + v + 1) * SLOT * sr)]
            on = int(np.argmax(np.abs(sl) > 0.04 * np.abs(sl).max()))
            louds.append(a_weighted_db(sl[on:], sr))
        level[kind] = round(10 ** ((TARGET_DBA[kind] - float(np.mean(louds))) / 20), 3)
    print(f'wrote {os.path.relpath(OUT)} ({os.path.getsize(OUT) / 1024:.1f} KB, {len(KINDS)} kinds x {VARIANTS} variations)')
    print('runtime levels for src/lib/sound.ts →  const LEVEL: Record<SoundKind, number> = { ' + ', '.join(f'{k}: {v}' for k, v in level.items()) + ' };')


if __name__ == '__main__':
    main()
