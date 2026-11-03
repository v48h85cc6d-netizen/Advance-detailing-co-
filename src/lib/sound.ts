/**
 * Interface sound engine — subtle mechanical "clack" on intentional clicks/taps.
 *
 * - One 39 KB MP3 sprite (scripts/generate-sounds.py), fetched on idle, decoded once with an
 *   OfflineAudioContext (no autoplay warnings), sliced into small AudioBuffers.
 * - Web Audio playback: no <audio> / Audio() objects; a cheap one-shot source node per click
 *   routed through a fixed 2-voice gain pool (voice stealing → never more than one audible clack).
 * - The AudioContext is created/resumed only inside a user gesture (iOS Safari / Android policy),
 *   uses the "ambient" audio session on iOS (respects the silent switch, never pauses the visitor's music),
 *   suspends itself when idle or when the tab is hidden.
 */
export type SoundKind = 'button' | 'nav' | 'card' | 'gallery' | 'switch' | 'ui';

// Sprite layout — must match scripts/generate-sounds.py
const KINDS: SoundKind[] = ['button', 'nav', 'card', 'gallery', 'switch', 'ui'];
const VARIANTS = 3;
const SLOT = 0.18;
const MAX_LEN = 0.11;
const SRC = '/assets/sounds/ui-clicks.mp3';

/** Subtle per-kind levels (linear gain). */
const LEVEL: Record<SoundKind, number> = { button: 0.32, nav: 0.26, card: 0.22, gallery: 0.28, switch: 0.3, ui: 0.24 };
const MIN_INTERVAL_MS = 55; // ignore bursts (double events, label → checkbox, fast repeats)
const IDLE_SUSPEND_MS = 15000;
export const SOUND_KEY = 'adc-sound';

type Listener = (enabled: boolean) => void;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private voices: GainNode[] = [];
  private active: (AudioBufferSourceNode | null)[] = [null, null];
  private voice = 0;
  private buffers: Record<SoundKind, AudioBuffer[]> | null = null;
  private loading: Promise<void> | null = null;
  private lastAt = 0;
  private lastVariant: Partial<Record<SoundKind, number>> = {};
  private idleTimer = 0;
  private listeners = new Set<Listener>();
  enabled = true;

  constructor() {
    if (typeof window === 'undefined') return;
    try {
      this.enabled = localStorage.getItem(SOUND_KEY) !== 'off';
    } catch {
      /* storage blocked → default on (still silent until a gesture) */
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.ctx?.state === 'running') this.ctx.suspend().catch(() => undefined);
    });
  }

  get supported() {
    return typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window);
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    try {
      localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
    } catch {
      /* ignore */
    }
    this.listeners.forEach((l) => l(on));
    if (on) this.preload();
    else this.silenceVoices();
  }

  /** Fetch + decode the sprite without needing a user gesture. Safe to call repeatedly. */
  preload(): Promise<void> {
    if (!this.supported) return Promise.resolve();
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const res = await fetch(SRC, { priority: 'low' } as RequestInit);
      if (!res.ok) throw new Error(`sound sprite ${res.status}`);
      const data = await res.arrayBuffer();
      const Offline = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
      const decoder = new Offline(1, 1, 44100);
      const sprite = await new Promise<AudioBuffer>((resolve, reject) => {
        const p = decoder.decodeAudioData(data, resolve, reject);
        if (p && typeof p.then === 'function') p.then(resolve, reject);
      });
      this.buffers = this.slice(sprite, decoder);
    })().catch((e) => {
      this.loading = null; // allow a retry on the next interaction
      if (import.meta.env.DEV) console.warn('[sound]', e);
    });
    return this.loading;
  }

  /** Cut the sprite into one buffer per variation, aligned on the detected onset (codec-delay proof). */
  private slice(sprite: AudioBuffer, factory: BaseAudioContext): Record<SoundKind, AudioBuffer[]> {
    const sr = sprite.sampleRate;
    const src = sprite.getChannelData(0);
    const out = {} as Record<SoundKind, AudioBuffer[]>;
    KINDS.forEach((kind, k) => {
      out[kind] = [];
      for (let v = 0; v < VARIANTS; v++) {
        const s0 = Math.floor((k * VARIANTS + v) * SLOT * sr);
        const s1 = Math.min(src.length, Math.floor((k * VARIANTS + v + 1) * SLOT * sr));
        let peak = 0;
        for (let i = s0; i < s1; i++) peak = Math.max(peak, Math.abs(src[i]));
        let on = s0;
        while (on < s1 && Math.abs(src[on]) < peak * 0.04) on++;
        on = Math.max(s0, on - Math.floor(0.0004 * sr));
        let end = Math.min(on + Math.floor(MAX_LEN * sr), s1);
        while (end > on && Math.abs(src[end - 1]) < peak * 0.003) end--; // trim the silent tail
        const len = Math.max(1, Math.min(end + Math.floor(0.004 * sr), s1) - on);
        const b = factory.createBuffer(1, len, sr);
        const ch = b.getChannelData(0);
        ch.set(src.subarray(on, on + len));
        const fade = Math.floor(0.006 * sr); // guarantee a click-free tail
        for (let i = 0; i < fade; i++) ch[len - 1 - i] *= i / fade;
        out[kind].push(b);
      }
    });
    return out;
  }

  /** Must be called from inside a user-gesture handler (click / keydown / touchend). */
  private ensureContext(): AudioContext | null {
    if (!this.supported) return null;
    if (!this.ctx) {
      // iOS 17+: "ambient" = obeys the silent switch and mixes with (never pauses) other audio
      const nav = navigator as Navigator & { audioSession?: { type: string } };
      try {
        if (nav.audioSession) nav.audioSession.type = 'ambient';
      } catch {
        /* ignore */
      }
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx({ latencyHint: 'interactive' });
      const master = this.ctx.createGain();
      master.gain.value = 1;
      // gentle top-end polish so even small phone speakers stay pleasant
      const shelf = this.ctx.createBiquadFilter();
      shelf.type = 'highshelf';
      shelf.frequency.value = 9000;
      shelf.gain.value = -3;
      master.connect(shelf).connect(this.ctx.destination);
      this.voices = [this.ctx.createGain(), this.ctx.createGain()];
      this.voices.forEach((g) => g.connect(master));
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => undefined);
    return this.ctx;
  }

  /** Click-free stop: ramp the voice down over ~3 ms, then stop the source. */
  private silenceVoices() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    this.active.forEach((src, i) => {
      if (!src) return;
      const g = this.voices[i].gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.setTargetAtTime(0, t, 0.003);
      try {
        src.stop(t + 0.02);
      } catch {
        /* already stopped */
      }
      this.active[i] = null;
    });
  }

  /** Play a clack. Call only from a trusted user-gesture handler. */
  play(kind: SoundKind) {
    if (!this.enabled || !this.supported) return;
    const now = performance.now();
    if (now - this.lastAt < MIN_INTERVAL_MS) return;
    this.lastAt = now;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (!this.buffers) {
      // first tap before preload finished: play it only if decoding is quick
      this.preload().then(() => {
        if (performance.now() - now < 350) this.start(kind);
      });
      return;
    }
    this.start(kind);
  }

  private start(kind: SoundKind) {
    const ctx = this.ctx;
    const list = this.buffers?.[kind];
    if (!ctx || !list?.length) return;
    // pick a variation different from the previous one
    let v = Math.floor(Math.random() * list.length);
    if (list.length > 1 && v === this.lastVariant[kind]) v = (v + 1) % list.length;
    this.lastVariant[kind] = v;

    // voice stealing: never two clacks at once — fade whatever still rings, play on the other voice
    this.silenceVoices();
    const vi = (this.voice = (this.voice + 1) % this.voices.length);
    const gain = this.voices[vi];
    const t = ctx.currentTime;
    const level = LEVEL[kind] * (1 + (Math.random() - 0.5) * 0.14); // ±0.6 dB humanisation
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(level, t);

    const src = ctx.createBufferSource();
    src.buffer = list[v];
    src.playbackRate.value = 1 + (Math.random() - 0.5) * 0.05; // ±2.5 % pitch → never identical twice
    src.connect(gain);
    src.onended = () => {
      src.disconnect();
      if (this.active[vi] === src) this.active[vi] = null;
    };
    src.start(t);
    this.active[vi] = src;
    window.dispatchEvent(new CustomEvent('adc:sound', { detail: { kind, variant: v } }));

    window.clearTimeout(this.idleTimer);
    this.idleTimer = window.setTimeout(() => {
      if (this.ctx?.state === 'running') this.ctx.suspend().catch(() => undefined);
    }, IDLE_SUSPEND_MS);
  }
}

export const sound = new SoundEngine();

// ------------------------------------------------------------------------------------------------
// Click → sound mapping (event delegation; no changes to individual components needed)
// ------------------------------------------------------------------------------------------------
const INTERACTIVE =
  'a[href], button, [role="button"], [role="switch"], [role="tab"], [role="radio"], [role="menuitem"], summary, select, input[type="checkbox"], input[type="radio"], input[type="submit"], [data-sound]';

const RULES: [SoundKind, string][] = [
  ['switch', '[data-testid="theme-toggle"], [data-testid="lang-button"], a[hreflang], [role="switch"], [role="radio"], input[type="checkbox"], input[type="radio"]'],
  ['gallery', '[data-testid="lightbox"], [data-testid="gallery-slot"], [data-testid="project-slot"], [data-testid="gallery-featured"], [data-testid="spotlight-link"]'],
  ['nav', 'header nav, #mobile-menu, footer nav, [data-testid="menu-toggle"]'],
  ['card', '[data-testid^="project-card-"], [data-testid="service-card"], [data-testid^="social-"], [data-testid="contact-phone"], [data-testid="contact-email"], [data-testid="contact-directions"], [data-testid="certifications"] [aria-roledescription="carousel"] button'],
  ['button', 'button, .btn, [role="button"], input[type="submit"]'],
];

/** Decide which sound (if any) an intentional click on `target` should make. */
export function soundFor(target: Element | null): SoundKind | null {
  if (!target) return null;
  const el = target.closest(INTERACTIVE);
  // service cards are not links, but tapping them should still feel tactile
  if (!el) return target.closest('[data-testid="service-card"]') ? 'card' : null;
  const explicit = el.getAttribute('data-sound');
  if (explicit === 'none') return null;
  if (explicit && (KINDS as string[]).includes(explicit)) return explicit as SoundKind;
  if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return null;
  for (const [kind, sel] of RULES) if (el.matches(sel) || el.closest(sel)) return kind;
  return 'ui';
}

let installed = false;
/** Global, passive listener. Clicks are only fired for completed taps — never for scrolls, drags or typing. */
export function installInteractionSounds() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener(
    'click',
    (e) => {
      if (!e.isTrusted || !sound.enabled) return;
      const kind = soundFor(e.target as Element);
      if (kind) sound.play(kind);
    },
    { capture: true, passive: true },
  );
  // Warm up the sprite right after the page has loaded (39 KB, low priority, HTTP-cached), so even the
  // very first tap sounds immediately. Skipped on Data Saver until the first interaction.
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (sound.enabled && !saveData) {
    if (document.readyState === 'complete') sound.preload();
    else window.addEventListener('load', () => sound.preload(), { once: true });
  }
}
