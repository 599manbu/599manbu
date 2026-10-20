type MusicMode = 'title' | 'town' | 'battle' | 'boss'
export type SfxName = 'slash' | 'magic' | 'hit' | 'jump' | 'double-jump' | 'hurt' | 'boss' | 'potion' | 'level' | 'defeat' | 'victory' | 'ui'

const STORE_KEY = 'adventure-audio-enabled'
let enabled = (() => { try { return localStorage.getItem(STORE_KEY) !== 'off' } catch { return true } })()
let ctx: AudioContext | null = null
let master: GainNode | null = null
let musicBus: GainNode | null = null
let sfxBus: GainNode | null = null
let musicTimer: number | null = null
let musicStep = 0
let musicMode: MusicMode = 'title'
let unlocked = false

function ensureContext(): AudioContext | null {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    // 轻量压缩器避免叠加的音符和音效削波，同时让整体响度更饱满。
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -16; compressor.knee.value = 24; compressor.ratio.value = 5
    compressor.attack.value = .003; compressor.release.value = .25
    compressor.connect(ctx.destination)
    master = ctx.createGain(); master.gain.value = enabled ? 1 : 0; master.connect(compressor)
    musicBus = ctx.createGain(); musicBus.gain.value = .5; musicBus.connect(master)
    sfxBus = ctx.createGain(); sfxBus.gain.value = .95; sfxBus.connect(master)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function audioEnabled() { return enabled }

export async function unlockAudio() {
  const context = ensureContext()
  if (context && context.state === 'suspended') { try { await context.resume() } catch { /* ignore */ } }
  unlocked = true
  if (enabled) startMusic()
}

export function setMusicMode(mode: MusicMode) {
  if (musicMode === mode) return
  musicMode = mode
  if (musicTimer !== null) { window.clearInterval(musicTimer); musicTimer = null }
  musicStep = 0
  if (enabled && unlocked) startMusic()
}

export function toggleAudio() {
  enabled = !enabled
  try { localStorage.setItem(STORE_KEY, enabled ? 'on' : 'off') } catch { /* ignore */ }
  const context = ensureContext()
  if (master && context) master.gain.setTargetAtTime(enabled ? 1 : 0, context.currentTime, .03)
  if (!enabled) stopMusic()
  else void unlockAudio()
  return enabled
}

function stopMusic() {
  if (musicTimer !== null) { window.clearInterval(musicTimer); musicTimer = null }
}

type MusicCfg = {
  root: number
  scale: number[]
  stepMs: number
  wave: OscillatorType
  volume: number
  leadOctave: number
  progression: number[]
  leadSteps: number[]
  bassSteps: number[]
  padSteps: number[]
  drums: boolean
}
// 16 步一小节：主旋律、低音、铺底和弦与鼓点分层，战斗与 Boss 曲更密集、更有推进感。
const MUSIC: Record<MusicMode, MusicCfg> = {
  title: {
    root: 196, scale: [0, 2, 3, 5, 7, 8, 10, 12], stepMs: 205, wave: 'triangle', volume: .085, leadOctave: 2,
    progression: [0, 5, 3, 7], leadSteps: [0, 2, 4, 6, 8, 10, 12, 14], bassSteps: [0, 8], padSteps: [0], drums: false,
  },
  town: {
    root: 262, scale: [0, 2, 4, 5, 7, 9, 11, 12], stepMs: 235, wave: 'triangle', volume: .075, leadOctave: 2,
    progression: [0, 4, 5, 3], leadSteps: [0, 3, 6, 8, 11, 14], bassSteps: [0, 8], padSteps: [0, 8], drums: false,
  },
  battle: {
    root: 165, scale: [0, 2, 3, 5, 7, 8, 10, 12], stepMs: 120, wave: 'sawtooth', volume: .08, leadOctave: 2,
    progression: [0, 5, 3, 7], leadSteps: [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14], bassSteps: [0, 2, 4, 6, 8, 10, 12, 14], padSteps: [0], drums: true,
  },
  boss: {
    root: 123.47, scale: [0, 1, 3, 5, 6, 8, 10, 12], stepMs: 102, wave: 'sawtooth', volume: .09, leadOctave: 2,
    progression: [0, 1, 5, 4], leadSteps: [0, 1, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15], bassSteps: [0, 2, 3, 4, 6, 8, 10, 11, 12, 14], padSteps: [0, 8], drums: true,
  },
}

function startMusic() {
  if (!enabled || !unlocked || musicTimer !== null) return
  const context = ensureContext()
  if (!context) return
  musicTimer = window.setInterval(() => {
    if (!ctx || !musicBus || !enabled) return
    const cfg = MUSIC[musicMode]
    const step = musicStep++
    const pos = step % 16
    const bar = Math.floor(step / 16)
    const chord = cfg.progression[bar % cfg.progression.length]
    const beat = cfg.stepMs / 1000
    if (cfg.leadSteps.includes(pos)) {
      const chordTones = [0, 3, 7, 10, 12, 7, 3]
      const degree = chord + chordTones[(Math.floor(pos / 2) + bar) % chordTones.length]
      note(cfg.root * cfg.leadOctave * 2 ** (degree / 12), beat * .82, cfg.wave, cfg.volume)
    }
    if (cfg.bassSteps.includes(pos)) {
      const octave = pos % 8 === 0 ? 1 : 2
      note((cfg.root / 2) * 2 ** (chord / 12) * octave, beat * .95, 'triangle', cfg.volume * .95)
    }
    if (cfg.padSteps.includes(pos)) {
      const padRoot = cfg.root * 2 ** (chord / 12)
      note(padRoot, beat * 7, 'sine', cfg.volume * .28)
      note(padRoot * 1.5, beat * 7, 'triangle', cfg.volume * .17)
      note(padRoot * 2, beat * 6, 'sine', cfg.volume * .11)
    }
    if (cfg.drums) {
      if (pos % 8 === 0) musicKick(cfg.volume * .9)
      if (pos === 4 || pos === 12) musicSnare(cfg.volume * .5)
      if (pos % 2 === 1) musicHat(cfg.volume * (pos % 4 === 3 ? .26 : .15))
    }
  }, MUSIC[musicMode].stepMs)
}

function musicKick(volume: number) {
  if (!ctx || !musicBus) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(170, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(42, ctx.currentTime + .13)
  gain.gain.setValueAtTime(Math.max(.0001, volume), ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .18)
  osc.connect(gain); gain.connect(musicBus)
  osc.start(); osc.stop(ctx.currentTime + .2)
}

function musicNoise(duration: number, volume: number, cutoff: number, highpass = false) {
  if (!ctx || !musicBus) return
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length)
  const source = ctx.createBufferSource()
  const filter = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  source.buffer = buffer
  filter.type = highpass ? 'highpass' : 'lowpass'
  filter.frequency.value = cutoff
  gain.gain.value = volume
  source.connect(filter); filter.connect(gain); gain.connect(musicBus)
  source.start()
}

function musicSnare(volume: number) { musicNoise(.11, volume, 2400, true) }
function musicHat(volume: number) { musicNoise(.035, volume, 7000, true) }

function note(frequency: number, duration: number, wave: OscillatorType, volume: number) {
  if (!ctx || !musicBus) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = wave
  osc.frequency.value = frequency
  gain.gain.setValueAtTime(.0001, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + .03)
  gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + duration)
  osc.connect(gain)
  gain.connect(musicBus)
  osc.start()
  osc.stop(ctx.currentTime + duration + .05)
}

function tone(frequency: number, duration: number, wave: OscillatorType, volume: number, slideTo?: number) {
  if (!enabled) return
  const context = ensureContext()
  if (!context || !sfxBus) return
  const osc = context.createOscillator()
  const gain = context.createGain()
  osc.type = wave
  osc.frequency.setValueAtTime(frequency, context.currentTime)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), context.currentTime + duration)
  gain.gain.setValueAtTime(.0001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + .008)
  gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + duration)
  osc.connect(gain)
  gain.connect(sfxBus)
  osc.start()
  osc.stop(context.currentTime + duration + .03)
}

function noise(duration: number, volume: number, cutoff: number) {
  if (!enabled) return
  const context = ensureContext()
  if (!context || !sfxBus) return
  const length = Math.max(1, Math.floor(context.sampleRate * duration))
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length)
  const source = context.createBufferSource()
  const filter = context.createBiquadFilter()
  const gain = context.createGain()
  source.buffer = buffer
  filter.type = 'lowpass'
  filter.frequency.value = cutoff
  gain.gain.value = volume
  source.connect(filter)
  filter.connect(gain)
  gain.connect(sfxBus)
  source.start()
}

export function playSfx(name: SfxName) {
  if (!enabled) return
  if (name === 'slash') { noise(.16, .18, 1600); tone(520, .12, 'triangle', .12, 260) }
  else if (name === 'magic') { tone(620, .16, 'sine', .12, 980); tone(930, .18, 'triangle', .08, 1240) }
  else if (name === 'hit') { noise(.08, .16, 900); tone(180, .08, 'square', .08, 90) }
  else if (name === 'jump') tone(320, .12, 'triangle', .1, 620)
  else if (name === 'double-jump') { tone(480, .12, 'sine', .1, 900); noise(.08, .06, 1800) }
  else if (name === 'hurt') { tone(160, .18, 'sawtooth', .12, 80); noise(.12, .1, 500) }
  else if (name === 'boss') { tone(80, .32, 'sawtooth', .16, 45); noise(.2, .12, 300) }
  else if (name === 'potion') { tone(660, .08, 'sine', .1); tone(880, .12, 'sine', .09) }
  else if (name === 'level') { tone(523, .12, 'triangle', .1); tone(659, .12, 'triangle', .1); tone(784, .2, 'triangle', .1) }
  else if (name === 'defeat') { tone(220, .25, 'sawtooth', .1, 110); noise(.2, .08, 400) }
  else if (name === 'victory') {
    tone(523, .2, 'triangle', .11)
    setTimeout(() => tone(659, .2, 'triangle', .11), 90)
    setTimeout(() => tone(784, .24, 'triangle', .12), 180)
    setTimeout(() => { tone(1047, .55, 'sine', .14); noise(.4, .05, 1800) }, 290)
  }
  else if (name === 'ui') tone(520, .04, 'sine', .04)
}

export function playSkillSfx(role: 'warrior' | 'mage', index: number) {
  if (!enabled) return
  if (role === 'warrior') {
    if (index === 0) { noise(.2, .2, 2200); tone(600, .18, 'triangle', .12, 300) }
    else if (index === 1) { noise(.4, .16, 1200); tone(330, .35, 'sawtooth', .09, 660) }
    else if (index === 2) { noise(.12, .18, 2600); tone(900, .14, 'square', .08, 1400) }
    else { noise(.35, .2, 500); tone(110, .4, 'sawtooth', .16, 55) }
  } else {
    if (index === 0) { tone(440, .3, 'sine', .1, 880); tone(660, .35, 'triangle', .08, 990) }
    else if (index === 1) { noise(.5, .14, 1800); tone(220, .45, 'sawtooth', .1, 440) }
    else if (index === 2) { tone(880, .15, 'sine', .1, 1600); noise(.1, .08, 2400) }
    else { tone(120, .5, 'sawtooth', .12, 240); tone(240, .6, 'triangle', .08, 480) }
  }
}
