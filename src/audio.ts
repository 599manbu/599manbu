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
let musicStage = 0
let unlocked = false

function ensureContext(): AudioContext | null {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    // 轻量压缩器避免叠加的音符和音效削波，同时让整体响度更饱满。
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -10; compressor.knee.value = 22; compressor.ratio.value = 4
    compressor.attack.value = .003; compressor.release.value = .25
    compressor.connect(ctx.destination)
    master = ctx.createGain(); master.gain.value = enabled ? 1.15 : 0; master.connect(compressor)
    // 整体音量提高，并让音乐总线明显高于音效总线（用户要求音乐比音效大声）。
    musicBus = ctx.createGain(); musicBus.gain.value = 1; musicBus.connect(master)
    sfxBus = ctx.createGain(); sfxBus.gain.value = .64; sfxBus.connect(master)
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

export function setMusicMode(mode: MusicMode, stage = 0) {
  const nextStage = mode === 'battle' || mode === 'boss' ? Math.max(0, Math.min(9, Math.floor(stage))) : 0
  if (musicMode === mode && musicStage === nextStage) return
  musicMode = mode
  musicStage = nextStage
  if (musicTimer !== null) { window.clearInterval(musicTimer); musicTimer = null }
  musicStep = 0
  if (enabled && unlocked) startMusic()
}

export function toggleAudio() {
  enabled = !enabled
  try { localStorage.setItem(STORE_KEY, enabled ? 'on' : 'off') } catch { /* ignore */ }
  const context = ensureContext()
  if (master && context) master.gain.setTargetAtTime(enabled ? 1.15 : 0, context.currentTime, .03)
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
  // 每个关卡独立的主旋律音级（相对 root 的半音），让 10 关听起来各不相同。
  leadLine?: number[]
  // 可选的琶音层，增加流动感。
  arpSteps?: number[]
  arpWave?: OscillatorType
  // 对位旋律与稀疏节奏，进一步减少单调感。
  counterLine?: number[]
  counterSteps?: number[]
}
// 16 步一小节：主旋律、低音、铺底和弦与鼓点分层，战斗与 Boss 曲更密集、更有推进感。
const TITLE_MUSIC: MusicCfg = {
  root: 196, scale: [0, 2, 3, 5, 7, 8, 10, 12], stepMs: 205, wave: 'triangle', volume: .16, leadOctave: 2,
  progression: [0, 5, 3, 7], leadSteps: [0, 2, 4, 6, 8, 10, 12, 14], bassSteps: [0, 8], padSteps: [0], drums: false,
  leadLine: [0, 2, 3, 5, 7, 5, 3, 2, 0, 3, 5, 7, 8, 7, 5, 3],
  arpSteps: [2, 6, 10, 14],
}
// 小镇：温暖、明亮、慢速的旋律。
const TOWN_MUSIC: MusicCfg = {
  root: 262, scale: [0, 2, 4, 5, 7, 9, 11, 12], stepMs: 250, wave: 'sine', volume: .15, leadOctave: 2,
  progression: [0, 5, 3, 4], leadSteps: [0, 2, 4, 6, 8, 10, 12, 14], bassSteps: [0, 8], padSteps: [0, 8], drums: false,
  leadLine: [0, 4, 7, 4, 9, 7, 4, 2, 5, 7, 9, 7, 4, 2, 0, -1],
  arpSteps: [2, 6, 10, 14], arpWave: 'triangle',
}
// 生成至少 192 步（约 32~39 秒）不重复的战斗旋律，避免短循环带来的单调。
const MELODY_MOTIFS: number[][] = [
  [0, 1, 2, 1, 3, 2, 1, 0, 2, 3, 4, 3, 2, 1, 0, 1],
  [0, 2, 1, 3, 2, 4, 3, 2, 1, 2, 0, 1, 3, 2, 1, 0],
  [0, 3, 2, 4, 3, 5, 4, 3, 2, 1, 2, 3, 4, 3, 2, 1],
  [0, 1, 3, 2, 4, 5, 4, 3, 2, 3, 1, 2, 0, 1, 2, 0],
  [0, 4, 3, 2, 1, 3, 2, 1, 0, 2, 4, 3, 2, 1, 0, 2],
]
function buildLongLeadLine(seed: number, scale: number[]): number[] {
  const line: number[] = []
  const phraseCount = 12
  const transposes = [0, 2, 4, 1, 5, 3, 6, 4, 2, 7, 5, 3, 1, 6, 4, 2]
  for (let phrase = 0; phrase < phraseCount; phrase += 1) {
    const motif = MELODY_MOTIFS[(seed + phrase * 2) % MELODY_MOTIFS.length]
    const transpose = transposes[(seed + phrase) % transposes.length]
    for (let i = 0; i < 16; i += 1) {
      const index = ((motif[i] + transpose) % scale.length + scale.length) % scale.length
      line.push(scale[index])
    }
  }
  return line
}
const BATTLE_TEMPOS = [220, 212, 204, 228, 238, 200, 208, 196, 224, 192]
const LONG_PROGRESSIONS: number[][] = [
  [0, 3, 5, 4, 0, 5, 3, 4, 2, 4],
  [0, 5, 3, 4, 2, 5, 3, 0, 4, 5],
  [0, 1, 4, 5, 3, 1, 4, 2, 5, 0],
  [0, 3, 5, 2, 4, 3, 5, 0, 2, 4],
  [0, 5, 2, 4, 3, 5, 2, 0, 4, 3],
  [0, 2, 5, 4, 3, 2, 5, 4, 0, 3],
  [0, 5, 3, 4, 2, 3, 5, 0, 4, 2],
  [0, 1, 5, 4, 2, 1, 5, 3, 4, 0],
  [0, 3, 5, 4, 2, 5, 3, 0, 4, 2],
  [0, 5, 3, 4, 2, 0, 5, 3, 4, 2],
]
// 十个关卡各自的主旋律：不同调式、速度、和弦走向与节奏型。
const STAGE_MUSIC: MusicCfg[] = [
  {
    root: 146.83, scale: [0, 2, 3, 5, 7, 8, 10, 12], stepMs: 150, wave: 'triangle', volume: .17, leadOctave: 2,
    progression: [0, 3, 5, 4], leadSteps: [0, 2, 3, 4, 6, 8, 10, 12, 14], bassSteps: [0, 4, 8, 12], padSteps: [0, 8], drums: true,
    leadLine: [0, 2, 3, 5, 7, 5, 3, 2, 0, 3, 5, 8, 7, 5, 3, 2],
    arpSteps: [1, 5, 9, 13],
  },
  {
    root: 130.81, scale: [0, 2, 3, 5, 7, 8, 10, 12], stepMs: 162, wave: 'triangle', volume: .17, leadOctave: 2,
    progression: [0, 5, 3, 4], leadSteps: [0, 4, 6, 8, 12, 14], bassSteps: [0, 2, 4, 6, 8, 10, 12, 14], padSteps: [0], drums: true,
    leadLine: [0, 3, 5, 3, 0, -2, 0, 3, 5, 7, 8, 7, 5, 3, 2, 0],
  },
  {
    root: 155.56, scale: [0, 1, 4, 5, 7, 8, 11, 12], stepMs: 118, wave: 'sawtooth', volume: .16, leadOctave: 2,
    progression: [0, 1, 4, 5], leadSteps: [0, 1, 2, 4, 5, 6, 8, 10, 12, 13, 14], bassSteps: [0, 2, 4, 6, 8, 10, 12, 14], padSteps: [0], drums: true,
    leadLine: [0, 4, 5, 7, 8, 7, 5, 4, 1, 4, 5, 8, 7, 5, 4, 1],
  },
  {
    root: 174.61, scale: [0, 2, 3, 5, 7, 9, 10, 12], stepMs: 128, wave: 'triangle', volume: .15, leadOctave: 2,
    progression: [0, 3, 5, 2], leadSteps: [0, 2, 4, 6, 8, 10, 12, 14], bassSteps: [0, 8], padSteps: [0, 8], drums: false,
    leadLine: [0, 3, 5, 7, 9, 7, 5, 3, 2, 5, 7, 10, 9, 7, 5, 3],
    arpSteps: [1, 3, 5, 7, 9, 11, 13, 15],
  },
  {
    root: 123.47, scale: [0, 2, 3, 5, 7, 8, 10, 12], stepMs: 196, wave: 'sine', volume: .16, leadOctave: 2,
    progression: [0, 5, 2, 4], leadSteps: [0, 3, 6, 8, 11, 14], bassSteps: [0, 8], padSteps: [0], drums: false,
    leadLine: [0, 3, 5, 3, 2, 0, -2, 0, 5, 7, 8, 7, 5, 3, 2, 0],
  },
  {
    root: 164.81, scale: [0, 2, 4, 6, 7, 9, 11, 12], stepMs: 120, wave: 'triangle', volume: .16, leadOctave: 2,
    progression: [0, 2, 5, 4], leadSteps: [0, 2, 4, 6, 8, 10, 12, 14], bassSteps: [0, 4, 8, 12], padSteps: [0, 8], drums: true,
    leadLine: [0, 4, 6, 9, 11, 9, 6, 4, 2, 6, 7, 11, 9, 7, 6, 2],
    arpSteps: [1, 5, 9, 13],
  },
  {
    root: 138.59, scale: [0, 2, 3, 5, 7, 8, 11, 12], stepMs: 138, wave: 'sawtooth', volume: .17, leadOctave: 2,
    progression: [0, 5, 3, 4], leadSteps: [0, 2, 4, 6, 8, 10, 12, 14], bassSteps: [0, 2, 4, 6, 8, 10, 12, 14], padSteps: [0, 8], drums: true,
    leadLine: [0, 3, 5, 7, 8, 7, 5, 3, 0, 3, 5, 8, 11, 8, 5, 3],
  },
  {
    root: 116.54, scale: [0, 1, 3, 5, 6, 8, 10, 12], stepMs: 108, wave: 'sawtooth', volume: .18, leadOctave: 2,
    progression: [0, 1, 5, 4], leadSteps: [0, 1, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14], bassSteps: [0, 2, 3, 4, 6, 8, 10, 11, 12, 14], padSteps: [0], drums: true,
    leadLine: [0, 1, 3, 6, 8, 6, 3, 1, 5, 6, 8, 10, 8, 6, 5, 3],
  },
  {
    root: 155.56, scale: [0, 2, 4, 5, 7, 9, 11, 12], stepMs: 144, wave: 'sine', volume: .16, leadOctave: 2,
    progression: [0, 3, 5, 4], leadSteps: [0, 2, 4, 6, 8, 10, 12, 14], bassSteps: [0, 8], padSteps: [0, 8], drums: false,
    leadLine: [0, 4, 7, 4, 5, 7, 9, 7, 4, 5, 7, 11, 9, 7, 5, 4],
    arpSteps: [2, 6, 10, 14],
  },
  {
    root: 110, scale: [0, 2, 3, 5, 7, 8, 10, 12], stepMs: 112, wave: 'sawtooth', volume: .19, leadOctave: 2,
    progression: [0, 5, 3, 4], leadSteps: [0, 1, 2, 3, 4, 6, 8, 10, 11, 12, 14, 15], bassSteps: [0, 2, 4, 6, 8, 10, 12, 14], padSteps: [0, 8], drums: true,
    leadLine: [0, 3, 5, 8, 10, 8, 5, 3, 0, 3, 7, 10, 12, 10, 7, 3],
  },
]
// 战斗曲统一放慢并换成 192 步长旋律；Boss 曲稍快但仍保证 30 秒内旋律不重复。
STAGE_MUSIC.forEach((cfg, index) => {
  cfg.stepMs = BATTLE_TEMPOS[index] ?? 210
  cfg.leadLine = buildLongLeadLine(index + 1, cfg.scale)
  cfg.counterLine = buildLongLeadLine(index + 21, cfg.scale)
  cfg.counterSteps = [4, 12]
  cfg.leadSteps = [0, 2, 3, 5, 6, 8, 10, 11, 12, 14]
  cfg.progression = LONG_PROGRESSIONS[index % LONG_PROGRESSIONS.length]
  cfg.padSteps = [0, 8]
  cfg.drums = true
})
// Boss 战沿用各关主旋律，但速度更快、音色更硬、鼓点更密。
const BOSS_MUSIC: MusicCfg[] = STAGE_MUSIC.map((cfg) => ({
  ...cfg,
  stepMs: Math.max(168, cfg.stepMs - 24),
  wave: 'sawtooth',
  volume: Math.min(.2, cfg.volume + .015),
  drums: true,
}))
function currentMusicCfg(): MusicCfg {
  if (musicMode === 'town') return TOWN_MUSIC
  if (musicMode === 'title') return TITLE_MUSIC
  if (musicMode === 'boss') return BOSS_MUSIC[musicStage] ?? BOSS_MUSIC[0]
  return STAGE_MUSIC[musicStage] ?? STAGE_MUSIC[0]
}

function startMusic() {
  if (!enabled || !unlocked || musicTimer !== null) return
  const context = ensureContext()
  if (!context) return
  musicTimer = window.setInterval(() => {
    if (!ctx || !musicBus || !enabled) return
    const cfg = currentMusicCfg()
    const step = musicStep++
    const pos = step % 16
    const bar = Math.floor(step / 16)
    const chord = cfg.progression[bar % cfg.progression.length]
    const beat = cfg.stepMs / 1000
    if (cfg.leadSteps.includes(pos)) {
      // 每关有自己的旋律线；没有旋律线时退回和弦音即兴。
      const degree = cfg.leadLine && cfg.leadLine.length
        ? cfg.leadLine[step % cfg.leadLine.length]
        : chord + [0, 3, 7, 10, 12, 7, 3][(Math.floor(pos / 2) + bar) % 7]
      note(cfg.root * cfg.leadOctave * 2 ** (degree / 12), beat * .82, cfg.wave, cfg.volume)
    }
    if (cfg.counterSteps?.includes(pos) && cfg.counterLine?.length) {
      const degree = cfg.counterLine[step % cfg.counterLine.length]
      note(cfg.root * cfg.leadOctave * 3 * 2 ** (degree / 12), beat * .7, 'sine', cfg.volume * .18)
    }
    if (cfg.arpSteps?.includes(pos)) {
      const arp = [0, 3, 7, 12][(step + bar) % 4]
      note(cfg.root * 2 ** ((chord + arp) / 12), beat * .55, cfg.arpWave ?? 'triangle', cfg.volume * .3)
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
  }, currentMusicCfg().stepMs)
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
