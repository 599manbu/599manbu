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
    master = ctx.createGain(); master.gain.value = enabled ? .7 : 0; master.connect(ctx.destination)
    musicBus = ctx.createGain(); musicBus.gain.value = .16; musicBus.connect(master)
    sfxBus = ctx.createGain(); sfxBus.gain.value = .55; sfxBus.connect(master)
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
  if (enabled && unlocked) startMusic()
}

export function toggleAudio() {
  enabled = !enabled
  try { localStorage.setItem(STORE_KEY, enabled ? 'on' : 'off') } catch { /* ignore */ }
  const context = ensureContext()
  if (master && context) master.gain.setTargetAtTime(enabled ? .7 : 0, context.currentTime, .03)
  if (!enabled) stopMusic()
  else void unlockAudio()
  return enabled
}

function stopMusic() {
  if (musicTimer !== null) { window.clearInterval(musicTimer); musicTimer = null }
}

const MUSIC: Record<MusicMode, { root: number; scale: number[]; tempo: number; wave: OscillatorType; volume: number }> = {
  title: { root: 196, scale: [0, 3, 5, 7, 10, 12], tempo: 900, wave: 'sine', volume: .12 },
  town: { root: 262, scale: [0, 2, 4, 7, 9, 12], tempo: 760, wave: 'triangle', volume: .1 },
  battle: { root: 165, scale: [0, 3, 5, 7, 10, 12], tempo: 480, wave: 'triangle', volume: .08 },
  boss: { root: 110, scale: [0, 3, 5, 6, 10, 12], tempo: 360, wave: 'sawtooth', volume: .06 },
}

function startMusic() {
  if (!enabled || !unlocked || musicTimer !== null) return
  const context = ensureContext()
  if (!context) return
  musicTimer = window.setInterval(() => {
    if (!ctx || !musicBus || !enabled) return
    const cfg = MUSIC[musicMode]
    const step = musicStep++
    const degree = cfg.scale[step % cfg.scale.length]
    const frequency = cfg.root * 2 ** (degree / 12) * (step % 8 === 0 ? .5 : 1)
    note(frequency, (cfg.tempo / 1000) * .85, cfg.wave, cfg.volume)
    if (step % 4 === 0) note(cfg.root / 2, (cfg.tempo / 1000) * 1.7, 'sine', cfg.volume * .9)
  }, MUSIC[musicMode].tempo)
}

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
