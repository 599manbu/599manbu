import './game.css'
import { cloudAvailable, currentCloudUser, fetchCloudProfile, loginCloudUser, logoutCloudUser, registerCloudUser, resetCloudPassword, saveCloudProfile } from './cloud'
import type { CloudProfile, CloudUser } from './cloud'
import { audioEnabled, playSfx, playSkillSfx, setMusicMode, toggleAudio, unlockAudio } from './audio'

type Role = 'warrior' | 'mage'
type Scene = 'title' | 'town' | 'battle' | 'defeat' | 'ending'
type GearType = 'weapon' | 'armor'
type Gear = { id: string; name: string; level: number; type?: GearType; hp: number; mp?: number; attack: number; defense: number }
type WorldDrop = { id: string; type: 'hp-potion' | 'mp-potion'; x: number }
type AttributeStat = 'hp' | 'attack' | 'mp' | 'defense'
type AttributeAllocation = Record<AttributeStat, number>
type StageProgress = { kills: number; bossDefeated: boolean; pointsClaimed?: number }
type Save = { role: Role; stage: number; unlockedStage: number; kills: number; stageProgress?: Record<string, StageProgress>; hp: number; mp: number; gear: Gear[]; equipped: string | null; weaponId?: string | null; armorId?: string | null; level?: number; exp?: number; drops?: WorldDrop[]; bossDefeated?: boolean; attributePoints?: number; attributeAllocation?: AttributeAllocation; town: boolean; completed: boolean; dead: boolean }
type SaveSlot = { id: string; label: string; data: Save; updatedAt: number }
type Foe = { id: number; x: number; hp: number; maxHp: number; boss: boolean; timer: number; skillTimer: number; rangedTimer: number; flash: number; attackAnim: number; flying?: boolean; flyHeight?: number; dashWindup?: number; dashDirection?: number; rangedWindup?: number; stunTimer?: number }
type Fx = { x: number; y: number; life: number; kind: string; direction?: number; text?: string; damage?: number; duration?: number; vx?: number; vy?: number; color?: string; radius?: number }
type Projectile = { x: number; y: number; vx: number; life: number; damage: number; targetId: number }
type FoeShot = { x: number; y: number; vx: number; vy: number; damage: number; radius: number; color: string; life: number }

const SAVE_KEY = 'elemental-expedition-save-v2'
const GAME_VERSION = '1.58'
const stageNames = ['苔痕边境', '沉钟矿道', '赤岩峡谷', '风蚀高原', '幽蓝沼泽', '断星回廊', '灰烬王庭', '深渊裂谷', '苍白圣所', '终焉之门']
const roleLabels: Record<Role, string> = { warrior: '战士', mage: '法师' }
const skillLabels: Record<Role, string[]> = { warrior: ['前斩', '旋风斩', '突刺', '蓄力重斩'], mage: ['奥术强化', '双生火柱', '闪现', '能量禁锢'] }
const gearNames: Record<GearType, string[]> = { weapon: ['巡林者长剑', '碎岩战斧', '星火法杖', '守誓者之刃'], armor: ['苔纹护甲', '沉钟胸甲', '赤岩重铠', '星辉法袍'] }
const xpThresholds = [200, 500, 1200, 2700]

// ── 可调数值集中区 ─────────────────────────────────────────────
const ROLE_BASE: Record<Role, { hp: number; mp: number; attack: number; defense: number }> = {
  warrior: { hp: 1000, mp: 500, attack: 100, defense: 10 },
  mage: { hp: 800, mp: 450, attack: 120, defense: 8 },
}
const MAGE_GROWTH_RATE = 0.8
const SKILL_COSTS: Record<Role, number[]> = { warrior: [20, 30, 20, 50], mage: [40, 30, 10, 50] }
const SKILL_MULTIPLIERS: Record<Role, number[]> = { warrior: [1.5, 1.5, 1, 2], mage: [0, 1.6, 0, 0] }
const SKILL_COOLDOWNS = [0, 0, 0, 0]
const STAGE_CONFIG = [
  { mobHp: 500, mobAtk: 50, bossHp: 1000, bossAtk: 150 },
  { mobHp: 700, mobAtk: 70, bossHp: 4000, bossAtk: 200 },
  { mobHp: 1000, mobAtk: 100, bossHp: 9000, bossAtk: 300 },
  { mobHp: 1400, mobAtk: 140, bossHp: 13000, bossAtk: 450 },
  { mobHp: 1900, mobAtk: 190, bossHp: 22000, bossAtk: 650 },
  { mobHp: 2500, mobAtk: 250, bossHp: 33000, bossAtk: 900 },
  { mobHp: 3200, mobAtk: 320, bossHp: 46000, bossAtk: 1200 },
  { mobHp: 4000, mobAtk: 400, bossHp: 61000, bossAtk: 1550 },
  { mobHp: 4900, mobAtk: 490, bossHp: 78000, bossAtk: 1950 },
  { mobHp: 5900, mobAtk: 590, bossHp: 97000, bossAtk: 2400 },
]
const ATTRIBUTE_STEP: Record<AttributeStat, number> = { hp: 10, attack: 1, mp: 1, defense: 1 }
const ATTRIBUTE_POINT_CAP_PER_STAGE = 20
const MAX_SMALL_KILLS = 50
const POTION_DROP_CHANCE = .20
const MAP_LEFT = 40
const TOWN_LEFT = 150
const TOWN_RIGHT = 810
const BASE_MAP_WIDTH = 1280
const MAP_SEGMENT = 480
const WAVE_SIZE = 5
const BOSS_ARENA_WIDTH = 640
// 第 4 关起部分小怪会飞行；第 8 关（血牙蛮兵）保持地面。
const FLYING_CHANCES = [0, 0, 0, .35, .3, .45, .35, 0, .3, .45]

type BossRangedConfig = { count: number; spread: number; interval: number; speed: number; damageScale: number }
// 第 1~3 关只有近战/冲刺；第 4 关起依次加入单发、双发、三连、扇形、八方向弹幕。
const BOSS_RANGED: Array<BossRangedConfig | null> = [
  null,
  null,
  null,
  { count: 1, spread: 0, interval: 3.4, speed: 300, damageScale: .8 },
  { count: 2, spread: .18, interval: 3.2, speed: 310, damageScale: .8 },
  { count: 3, spread: .32, interval: 3.0, speed: 320, damageScale: .82 },
  { count: 3, spread: .38, interval: 2.8, speed: 340, damageScale: .85 },
  { count: 5, spread: .55, interval: 2.6, speed: 350, damageScale: .85 },
  { count: 5, spread: .68, interval: 2.5, speed: 365, damageScale: .9 },
  { count: 8, spread: Math.PI * 2, interval: 2.3, speed: 330, damageScale: .9 },
]
// 与十关名称对应的主题顺序：苔痕、沉钟、赤岩、风蚀、幽蓝、断星、灰烬、深渊、苍白、终焉。
const BOSS_THEMES = ['moss', 'frost', 'ember', 'storm', 'tide', 'void', 'ash', 'blood', 'sun', 'star']
const BOSS_THEME_COLORS: Record<string, string> = { ember: '#f49b58', frost: '#a9e2e5', storm: '#f2dc79', void: '#d78fb4', moss: '#a7cf77', sun: '#ffe28a', blood: '#ec6464', tide: '#69c7d2', ash: '#c9c2b0', star: '#b8a4f4' }
type EnemyTheme = { body: string; dark: string; light: string; accent: string; eye: string; glow: string }
const STAGE_THEMES: EnemyTheme[] = [
  { body: '#5f7a4a', dark: '#33452c', light: '#a4c070', accent: '#d6e39a', eye: '#ffe58a', glow: '#a7cf77' },
  { body: '#5d7f93', dark: '#2f4a5c', light: '#b7e0e8', accent: '#e6fbff', eye: '#9ff0ff', glow: '#a9e2e5' },
  { body: '#8a4a38', dark: '#4a241c', light: '#e58a55', accent: '#ffd08a', eye: '#fff0a0', glow: '#f49b58' },
  { body: '#6a6f86', dark: '#3a3e52', light: '#d6cf7a', accent: '#f4e98e', eye: '#fff6a8', glow: '#f2dc79' },
  { body: '#3f6f78', dark: '#24444c', light: '#86d4dc', accent: '#c9f5f7', eye: '#b8fbff', glow: '#69c7d2' },
  { body: '#5a3a63', dark: '#2e1c36', light: '#b47ac0', accent: '#e3a9ea', eye: '#ffd6ff', glow: '#d78fb4' },
  { body: '#5c5a52', dark: '#302f2b', light: '#a9a492', accent: '#d8d2c0', eye: '#ffcf8a', glow: '#c9c2b0' },
  { body: '#7a3a3a', dark: '#421d1d', light: '#c96a6a', accent: '#f0a0a0', eye: '#ffb0a0', glow: '#ec6464' },
  { body: '#8a7538', dark: '#4a3c1c', light: '#e6cb72', accent: '#fff1b0', eye: '#fff8c0', glow: '#ffe28a' },
  { body: '#4f3f78', dark: '#281f40', light: '#a697e8', accent: '#dcd2ff', eye: '#e8ddff', glow: '#b8a4f4' },
]
type BackgroundTheme = { skyTop: string; skyMid: string; skyLow: string; far: string; near: string; ground: string; line: string; orb: string; accent: string }
const TOWN_BACKGROUND: BackgroundTheme = { skyTop: '#243b3a', skyMid: '#4c6756', skyLow: '#8a9467', far: '#2c443a', near: '#3f5b47', ground: '#4a3a2b', line: '#9b8a5f', orb: '#f4d28d', accent: '#d4b876' }
const STAGE_BACKGROUNDS: BackgroundTheme[] = [
  { skyTop: '#1b342f', skyMid: '#3b5a4b', skyLow: '#73875d', far: '#27443a', near: '#3c5a48', ground: '#2b3c2e', line: '#7d8a5a', orb: '#d9d7a0', accent: '#a7cf77' },
  { skyTop: '#172a36', skyMid: '#34515f', skyLow: '#6f8c92', far: '#2a4352', near: '#3c5a66', ground: '#293b40', line: '#8aa5a4', orb: '#d9f2f4', accent: '#a9e2e5' },
  { skyTop: '#2b1715', skyMid: '#5a2b22', skyLow: '#a5613d', far: '#40241d', near: '#5d3627', ground: '#2f211c', line: '#b27a4c', orb: '#ffd28a', accent: '#f49b58' },
  { skyTop: '#20262f', skyMid: '#4a5261', skyLow: '#8a8a6a', far: '#333a48', near: '#4a525e', ground: '#2b3034', line: '#a7a372', orb: '#f4e98e', accent: '#f2dc79' },
  { skyTop: '#102a32', skyMid: '#1f4d55', skyLow: '#3f7f80', far: '#1d3c44', near: '#2f565c', ground: '#1e3338', line: '#5f9b99', orb: '#c9f5f7', accent: '#69c7d2' },
  { skyTop: '#1b1425', skyMid: '#3a2448', skyLow: '#6a4a7a', far: '#2a1c36', near: '#3e2a50', ground: '#211a2a', line: '#7f5f96', orb: '#e3a9ea', accent: '#d78fb4' },
  { skyTop: '#262521', skyMid: '#4a4740', skyLow: '#7a7466', far: '#33312c', near: '#4a463e', ground: '#2a2824', line: '#8a8270', orb: '#d8d2c0', accent: '#c9c2b0' },
  { skyTop: '#251516', skyMid: '#4a2225', skyLow: '#7f3a3c', far: '#351b1e', near: '#4e2629', ground: '#2a1a1b', line: '#9d5a55', orb: '#f0a0a0', accent: '#ec6464' },
  { skyTop: '#2b2a1e', skyMid: '#5f5a3c', skyLow: '#b4a06a', far: '#433d2b', near: '#5d563a', ground: '#2f2c21', line: '#c9b273', orb: '#fff1b0', accent: '#ffe28a' },
  { skyTop: '#0f1020', skyMid: '#24274a', skyLow: '#4a4f80', far: '#1b1d38', near: '#292d56', ground: '#171a2a', line: '#6f76b8', orb: '#dcd2ff', accent: '#b8a4f4' },
]
function bossDashConfig(stage: number) { return { cooldown: Math.max(2.7, 4.7 - stage * .18), speed: 300 + stage * 18 } }
const app = document.querySelector<HTMLDivElement>('#app')!
const world = { width: 960, height: 480, floor: 390 }
let game: Save | null = null
let currentSaveKey = SAVE_KEY
let saveSlots: SaveSlot[] = readSaves()
let activeSlotId: string | null = null
let authState: 'loading' | 'auth' | 'game' = cloudAvailable() ? 'loading' : 'game'
let authView: 'login' | 'register' | 'forgot' = 'login'
let authMessage = ''
let authBusy = false
let cloudUser: CloudUser | null = null
let cloudProfileId: string | null = null
let cloudSyncTimer: number | null = null
let offlineMode = !cloudAvailable()
let pendingRole: Role | null = null
let pendingDeleteId: string | null = null
let scene: Scene = 'title'
let paused = false
let foes: Foe[] = []
let projectiles: Projectile[] = []
let foeShots: FoeShot[] = []
let cameraX = 0
let unlockedWidth = BASE_MAP_WIDTH
let waveReady = false
let waveTriggerX = 0
let bossPending = false
let jumpCount = 0
let nextFoeId = 1
let heroX = 180
let heroY = 0
let velocityY = 0
let grounded = true
let facing = 1
let attackWait = 0
let skillWait = [0, 0, 0, 0]
let attackSwing = 0
let buffTime = 0
let burst = 0
let burstWait = 0
let burstTargetId: number | null = null
let shake = 0
let bagOpen = false
let craftingOpen = false
let attributesOpen = false
let effects: Fx[] = []
let keys = new Set<string>()
let logText = '小镇的篝火仍亮着，选择一片已开放的遗迹。'
let notice = ''
let noticeTime = 0
let lastTime = performance.now()
let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null

function readSaves(key = currentSaveKey): SaveSlot[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? 'null') as unknown
    if (Array.isArray(parsed)) return parsed.filter((slot): slot is SaveSlot => Boolean(slot && typeof slot.id === 'string' && slot.data && ['warrior', 'mage'].includes(slot.data.role) && Array.isArray(slot.data.gear))).slice(0, 3).map((slot) => ({ ...slot, data: normalizeSave(slot.data) }))
    if (parsed && typeof parsed === 'object' && ['warrior', 'mage'].includes((parsed as Save).role) && Array.isArray((parsed as Save).gear)) {
      const data = normalizeSave(parsed as Save)
      data.unlockedStage ??= data.stage
      data.town ??= false
      data.completed ??= false
      data.dead ??= false
      return [{ id: 'legacy-slot-1', label: '远征档案 1', data, updatedAt: Date.now() }]
    }
    return []
  } catch { return [] }
}
function normalizeSave(data: Save): Save {
  data.level ??= 1
  data.exp ??= 0
  data.drops ??= []
  data.bossDefeated ??= false
  data.attributePoints ??= 0
  data.attributeAllocation = {
    hp: data.attributeAllocation?.hp ?? 0,
    attack: data.attributeAllocation?.attack ?? 0,
    mp: data.attributeAllocation?.mp ?? 0,
    defense: data.attributeAllocation?.defense ?? 0,
  }
  data.stageProgress ??= {}
  data.stageProgress[String(data.stage)] ??= { kills: data.kills, bossDefeated: data.bossDefeated }
  for (const progress of Object.values(data.stageProgress)) progress.pointsClaimed ??= 0
  if (data.weaponId === undefined) data.weaponId = data.gear.find((gear) => gear.type === 'weapon' || (!gear.type && gear.id === data.equipped))?.id ?? null
  if (data.armorId === undefined) data.armorId = data.gear.find((gear) => gear.type === 'armor')?.id ?? null
  for (const gear of data.gear) {
    if (!gear.type) continue
    const values = gearStats(gear.level)
    gear.hp = gear.type === 'armor' ? values.hp : 0
    gear.defense = gear.type === 'armor' ? values.defense : 0
    gear.attack = gear.type === 'weapon' ? values.attack : 0
    gear.mp = gear.type === 'weapon' ? values.mp : 0
  }
  while (data.exp >= xpToNext(data.level)) { data.exp -= xpToNext(data.level); data.level += 1 }
  return data
}
function xpToNext(level: number) { return level <= xpThresholds.length ? xpThresholds[level - 1] : xpThresholds[xpThresholds.length - 1] * 2 ** (level - xpThresholds.length) }
function item(): Gear | undefined {
  return game?.gear.find((gear) => gear.id === game?.weaponId)
    ?? game?.gear.find((gear) => gear.id === game?.armorId)
    ?? game?.gear.find((gear) => gear.id === game?.equipped)
}
function equippedGear() {
  if (!game) return []
  return game.gear.filter((gear) => gear.id === game?.weaponId || gear.id === game?.armorId || (!gear.type && gear.id === game?.equipped))
}
function levelGrowth(level: number) {
  const m = Math.max(0, level - 1)
  const triangle = (m * (m + 1) * (m - 1)) / 6
  const hpCoefficient = m + triangle
  const attackCoefficient = m + triangle / 2
  return { hp: 100 * hpCoefficient, mp: 10 * hpCoefficient, attack: 10 * attackCoefficient, defense: 10 * attackCoefficient }
}
function roleLevelGrowth(role: Role, level: number) {
  const growth = levelGrowth(level)
  if (role !== 'mage') return growth
  return { hp: Math.round(growth.hp * MAGE_GROWTH_RATE), mp: Math.round(growth.mp * MAGE_GROWTH_RATE), attack: Math.round(growth.attack * MAGE_GROWTH_RATE), defense: Math.round(growth.defense * MAGE_GROWTH_RATE) }
}
function gearStats(level: number) {
  const triangle = level * (level - 1) / 2
  // 武器蓝量按用户给定值 10 / 40 / 70 线性增长，与等级成长曲线不同。
  return { hp: 100 * (1 + triangle), mp: 10 + 30 * (level - 1), attack: 10 + 5 * triangle, defense: 10 + 5 * triangle }
}
function roleGearMultiplier(role: Role) { return role === 'mage' ? MAGE_GROWTH_RATE : 1 }
function foeDamage(foe: Foe, dash = false) {
  if (!game) return 0
  const config = STAGE_CONFIG[Math.max(0, Math.min(9, game.stage - 1))]
  const base = foe.boss ? config.bossAtk * (dash ? 1.5 : 1) : config.mobAtk
  return Math.max(3, Math.round(base - stats().defense))
}
function stats() {
  const role = game?.role ?? 'warrior'
  const base = ROLE_BASE[role]
  const growth = roleLevelGrowth(role, game?.level ?? 1)
  const gear = equippedGear()
  const legacy = gear.find((entry) => !entry.type)
  const weapon = gear.find((entry) => entry.type === 'weapon')
  const armor = gear.find((entry) => entry.type === 'armor')
  const gearMultiplier = roleGearMultiplier(role)
  const allocation = game?.attributeAllocation ?? { hp: 0, attack: 0, mp: 0, defense: 0 }
  const buffMultiplier = role === 'mage' && buffTime > 0 ? 1.1 : 1
  return {
    hp: base.hp + growth.hp + Math.round((armor?.hp ?? legacy?.hp ?? 0) * gearMultiplier) + allocation.hp * ATTRIBUTE_STEP.hp,
    mp: base.mp + growth.mp + Math.round((weapon?.mp ?? 0) * gearMultiplier) + allocation.mp * ATTRIBUTE_STEP.mp,
    attack: Math.round((base.attack + growth.attack + Math.round((weapon?.attack ?? legacy?.attack ?? 0) * gearMultiplier) + allocation.attack * ATTRIBUTE_STEP.attack) * buffMultiplier),
    defense: base.defense + growth.defense + Math.round((armor?.defense ?? legacy?.defense ?? 0) * gearMultiplier) + allocation.defense * ATTRIBUTE_STEP.defense,
  }
}
function save() {
  if (!game || !activeSlotId) return
  game.stageProgress ??= {}
  const previous = game.stageProgress[String(game.stage)]
  // 保留“曾经通关”状态：重打已通关关卡时不会把已通关标记降级。
  game.stageProgress[String(game.stage)] = { kills: game.kills, bossDefeated: previous?.bossDefeated || (game.bossDefeated ?? false), pointsClaimed: previous?.pointsClaimed ?? 0 }
  const slot = saveSlots.find((entry) => entry.id === activeSlotId)
  if (!slot) return
  slot.data = structuredClone(game)
  slot.updatedAt = Date.now()
  try { localStorage.setItem(currentSaveKey, JSON.stringify(saveSlots)) }
  catch { toast('无法保存，请检查浏览器存储空间。') }
  scheduleCloudSync()
}
function toast(message: string) { notice = message; noticeTime = 2.2 }
function setLog(message: string) {
  logText = message
  const line = document.querySelector<HTMLElement>('.combat-log span:last-child')
  if (line) line.textContent = message
}
function addFx(kind: string, x = heroX, y = world.floor - 80, direction = 1, life = .56) { effects.push({ kind, x, y, direction, life }) }
function addDamageText(foe: Foe, damage: number) {
  effects.push({ kind: 'damage-number', x: foe.x, y: world.floor - (foe.boss ? 205 : 104), life: .95, duration: .95, text: `-${damage}`, damage })
}
function addSparks(x: number, y: number, count: number, colors: string[], speed = 150) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const velocity = speed * (.35 + Math.random())
    effects.push({ kind: 'spark', x, y, life: .35 + Math.random() * .35, duration: .7, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity - 40, color: colors[i % colors.length], radius: 1.5 + Math.random() * 2.5 })
  }
}
function addShake(amount: number) { shake = Math.max(shake, amount) }
function stageIndexNow() { return Math.max(0, Math.min(9, (game?.stage ?? 1) - 1)) }
function computeUnlockedWidth() {
  if (!game) return BASE_MAP_WIDTH
  if (game.kills >= MAX_SMALL_KILLS) return BASE_MAP_WIDTH + (MAX_SMALL_KILLS / WAVE_SIZE) * MAP_SEGMENT + BOSS_ARENA_WIDTH
  return BASE_MAP_WIDTH + Math.floor(game.kills / WAVE_SIZE) * MAP_SEGMENT
}
function refreshMap() { unlockedWidth = computeUnlockedWidth() }
function clampHeroX(x: number) { return Math.max(MAP_LEFT, Math.min(Math.max(MAP_LEFT, unlockedWidth - 55), x)) }
function updateCamera() {
  cameraX = Math.max(0, Math.min(Math.max(0, unlockedWidth - world.width), heroX - world.width * .42))
}
function foeWorldY(foe: Foe) { return world.floor - (foe.flying ? (foe.flyHeight ?? 0) : 0) }
function foeScreenLeft(foe: Foe) { return `${((foe.x - cameraX) / world.width) * 100}%` }
function spawnFoe(x: number, boss = false, flying = false): Foe {
  const config = STAGE_CONFIG[stageIndexNow()]
  const hp = boss ? config.bossHp : config.mobHp
  const clampedX = Math.max(MAP_LEFT + 20, Math.min(unlockedWidth - 40, x))
  return { id: nextFoeId++, x: clampedX, hp, maxHp: hp, boss, timer: .7 + Math.random() * 1.2, skillTimer: 3.2, rangedTimer: 3.4 + Math.random() * 1.2, flash: 0, attackAnim: 0, flying: boss ? false : flying, flyHeight: !boss && flying ? 70 + Math.random() * 55 : 0, stunTimer: 0 }
}
function bossFx(action: 'charge' | 'dash' | 'melee' | 'ranged') {
  return `boss-${action}-${BOSS_THEMES[Math.max(0, Math.min(9, (game?.stage ?? 1) - 1))]}`
}
function fireBossVolley(foe: Foe, config: BossRangedConfig) {
  if (!game) return
  const stageIndex = Math.max(0, Math.min(9, game.stage - 1))
  const stageValues = STAGE_CONFIG[stageIndex]
  const originX = foe.x
  const originY = world.floor - (foe.boss ? 120 : 60)
  const targetY = world.floor - 55
  const baseAngle = Math.atan2(targetY - originY, heroX - originX)
  const color = BOSS_THEME_COLORS[BOSS_THEMES[stageIndex]] ?? '#d78fb4'
  const damage = Math.max(3, Math.round(stageValues.bossAtk * config.damageScale - stats().defense))
  for (let i = 0; i < config.count; i++) {
    const offset = config.count === 1
      ? 0
      : config.spread >= Math.PI * 2 - .01
        ? (Math.PI * 2 * i) / config.count
        : -config.spread / 2 + (config.spread * i) / (config.count - 1)
    const angle = baseAngle + offset
    foeShots.push({ x: originX, y: originY, vx: Math.cos(angle) * config.speed, vy: Math.sin(angle) * config.speed, damage, radius: config.count > 4 ? 7 : 9, color, life: 4 })
  }
  addFx(bossFx('ranged'), foe.x, world.floor - 110, Math.sign(heroX - foe.x) || 1, .5)
  addSparks(originX, originY, 10, [color, '#fff0c2'], 140)
  addShake(4)
  playSfx('boss')
  setLog('守关者释放远程攻击 · 跳跃或走位躲避！')
}
function spawnCurrentWave() {
  if (!game) return
  foes = []
  const flyingChance = FLYING_CHANCES[stageIndexNow()] ?? 0
  const leftCount = Math.floor(WAVE_SIZE / 2)
  const rightCount = WAVE_SIZE - leftCount
  for (let i = 0; i < leftCount; i++) {
    const flying = Math.random() < flyingChance
    foes.push(spawnFoe(Math.max(MAP_LEFT + 30, heroX - 180 - i * 78), false, flying))
  }
  for (let i = 0; i < rightCount; i++) {
    const flying = Math.random() < flyingChance
    foes.push(spawnFoe(Math.min(unlockedWidth - 40, heroX + 180 + i * 78), false, flying))
  }
  waveReady = false
  setLog(`第 ${Math.floor(game.kills / WAVE_SIZE) + 1} 波守卫从两侧出现，继续向右推进。`)
  updateCamera()
}
function armNextWave() {
  if (!game) return
  const oldWidth = unlockedWidth
  refreshMap()
  waveReady = true
  bossPending = game.kills >= MAX_SMALL_KILLS
  waveTriggerX = Math.max(MAP_LEFT + 160, oldWidth - 180)
  if (bossPending) setLog('前方就是守关者的领域 · 继续向右前进。')
  else setLog('本波已清除 · 继续向右解锁新的区域。')
  updateCamera()
}
function enterBattlefield() {
  if (!game) return
  refreshMap()
  foes = []
  waveReady = false
  bossPending = false
  jumpCount = 0
  heroY = 0; velocityY = 0; grounded = true
  if (game.kills >= MAX_SMALL_KILLS) {
    heroX = clampHeroX(unlockedWidth - BOSS_ARENA_WIDTH + 120)
    foes = [spawnFoe(Math.min(unlockedWidth - 120, heroX + 340), true)]
    setLog('守关者就在前方。')
  } else {
    heroX = game.kills > 0 ? clampHeroX(unlockedWidth - 340) : 480
    spawnCurrentWave()
  }
  updateCamera()
}
function getStageProgress(stage: number): StageProgress {
  return game?.stageProgress?.[String(stage)] ?? (stage === game?.stage ? { kills: game.kills, bossDefeated: game.bossDefeated ?? false, pointsClaimed: 0 } : { kills: 0, bossDefeated: false, pointsClaimed: 0 })
}
function beginStage(stage: number, mode: 'continue' | 'restart' | 'boss' = 'continue') {
  if (!game) return
  const progress = getStageProgress(stage)
  game.stage = stage
  game.kills = mode === 'restart' ? 0 : mode === 'boss' ? MAX_SMALL_KILLS : progress.kills
  game.bossDefeated = false
  game.town = false; game.dead = false; game.bossDefeated = false
  game.drops = []
  game.hp = stats().hp
  game.mp = stats().mp
  scene = 'battle'
  paused = false
  heroX = 480
  heroY = 0
  velocityY = 0
  grounded = true
  projectiles = []; foeShots = []
  effects = []
  burst = 0; burstTargetId = null; shake = 0
  bagOpen = false; craftingOpen = false; attributesOpen = false
  enterBattlefield()
  save()
  renderGame()
}
function start(role: Role, previous?: Save) {
  game = previous ? structuredClone(previous) : freshSave(role)
  game.unlockedStage = Math.min(10, Math.max(game.unlockedStage ?? 1, game.stage))
  scene = game.completed ? 'ending' : game.dead ? 'defeat' : game.town ? 'town' : 'battle'
  paused = false
  heroX = 480; heroY = 0; velocityY = 0; grounded = true; buffTime = 0; burst = 0; burstTargetId = null; shake = 0; jumpCount = 0; cameraX = 0
  skillWait = [0, 0, 0, 0]; effects = []; projectiles = []; foeShots = []; bagOpen = false; craftingOpen = false; attributesOpen = false
  const caps = stats()
  game.hp = Math.min(Math.max(1, game.hp), caps.hp)
  game.mp = Math.min(Math.max(0, game.mp), caps.mp)
  if (scene === 'battle') enterBattlefield()
  save(); render()
}
function freshSave(role: Role): Save {
  const base = ROLE_BASE[role]
  return { role, stage: 1, unlockedStage: 1, kills: 0, hp: base.hp, mp: base.mp, gear: [], equipped: null, weaponId: null, armorId: null, level: 1, exp: 0, drops: [], bossDefeated: false, attributePoints: 0, attributeAllocation: { hp: 0, attack: 0, mp: 0, defense: 0 }, town: true, completed: false, dead: false }
}
function awardExperience(amount: number) {
  if (!game) return
  game.exp = (game.exp ?? 0) + amount
  let levelsGained = 0
  let hpGained = 0
  let mpGained = 0
  let attackGained = 0
  let defenseGained = 0
  while (game.exp >= xpToNext(game.level ?? 1)) {
    game.exp -= xpToNext(game.level ?? 1)
    const previousLevel = game.level ?? 1
    const before = roleLevelGrowth(game.role, previousLevel)
    const after = roleLevelGrowth(game.role, previousLevel + 1)
    game.level = previousLevel + 1
    const hpIncrease = after.hp - before.hp
    const mpIncrease = after.mp - before.mp
    const attackIncrease = after.attack - before.attack
    const defenseIncrease = after.defense - before.defense
    game.hp += hpIncrease
    game.mp += mpIncrease
    levelsGained += 1
    hpGained += hpIncrease
    mpGained += mpIncrease
    attackGained += attackIncrease
    defenseGained += defenseIncrease
  }
  if (levelsGained) { playSfx('level'); toast(`升级至 ${game.level} 级：生命 +${hpGained}，攻击 +${attackGained}，防御 +${defenseGained}，法力 +${mpGained}。`) }
}
function deleteSaveSlot(id: string) {
  const slot = saveSlots.find((entry) => entry.id === id)
  if (!slot) return
  pendingDeleteId = id
  const dialog = document.createElement('div')
  dialog.className = 'slot-scrim delete-confirm'
  dialog.innerHTML = `<section class="slot-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title"><small>存档管理 · ${slot.label}</small><h2 id="delete-confirm-title">是否删除？</h2><p>「${slot.label}」及其角色进度、装备将被永久删除，无法撤销。</p><div class="delete-confirm-actions"><button class="slot-cancel" data-action="cancel-delete">取消</button><button class="delete-confirm-button" data-action="confirm-delete">删除存档</button></div></section>`
  app.append(dialog)
  dialog.querySelector<HTMLButtonElement>('[data-action="cancel-delete"]')?.focus()
}
function confirmDeleteSave() {
  const id = pendingDeleteId
  const slot = saveSlots.find((entry) => entry.id === id)
  if (!id || !slot) return
  const remaining = saveSlots.filter((entry) => entry.id !== id)
  try { localStorage.setItem(currentSaveKey, JSON.stringify(remaining)) }
  catch { toast('删除失败，存档未更改。'); return }
  scheduleCloudSync()
  pendingDeleteId = null
  saveSlots = remaining
  document.querySelector('.delete-confirm')?.remove()
  if (activeSlotId === id) { activeSlotId = null; game = null; foes = []; projectiles = []; foeShots = [] }
  renderTitle()
}
function createRole(role: Role, overwriteId?: string) {
  let slot = overwriteId ? saveSlots.find((entry) => entry.id === overwriteId) : undefined
  if (overwriteId && !slot) return
  if (slot) {
    const confirmed = window.confirm(`即将覆盖「${slot.label}」（${roleLabels[slot.data.role]}，第 ${slot.data.stage} 关）。此操作无法撤销，确定继续吗？`)
    if (!confirmed) { pendingRole = null; renderTitle(); return }
    slot.data = freshSave(role)
    slot.updatedAt = Date.now()
  } else {
    if (saveSlots.length >= 3) { pendingRole = role; renderTitle(); return }
    slot = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, label: `远征档案 ${saveSlots.length + 1}`, data: freshSave(role), updatedAt: Date.now() }
    saveSlots.push(slot)
  }
  activeSlotId = slot.id
  pendingRole = null
  start(role, slot.data)
}
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char))
}
function errorMessage(error: unknown) {
  const value = error as { error?: string; message?: string; code?: number }
  return value?.error || value?.message || String(error)
}
function writeSavesToLocal(slots: SaveSlot[]) {
  try { localStorage.setItem(currentSaveKey, JSON.stringify(slots)) } catch { /* ignore */ }
}
function parseCloudSlots(raw: string): SaveSlot[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((slot): slot is SaveSlot => Boolean(slot && typeof slot.id === 'string' && slot.data && ['warrior', 'mage'].includes(slot.data.role) && Array.isArray(slot.data.gear)))
      .slice(0, 3)
      .map((slot) => ({ ...slot, data: normalizeSave(slot.data) }))
  } catch { return [] }
}
function scheduleCloudSync() {
  if (!cloudUser || offlineMode) return
  if (cloudSyncTimer !== null) window.clearTimeout(cloudSyncTimer)
  cloudSyncTimer = window.setTimeout(() => { cloudSyncTimer = null; void pushCloud() }, 800)
}
async function pushCloud() {
  if (!cloudUser || offlineMode) return
  try {
    const id = await saveCloudProfile(cloudUser, JSON.stringify(saveSlots), cloudProfileId ?? undefined)
    if (id) cloudProfileId = id
  } catch (error) {
    toast(`云端同步失败：${errorMessage(error)}`)
  }
}
function authSubmitLabel() {
  return authView === 'register' ? '注册并登录' : authView === 'forgot' ? '发送重置邮件' : '登录'
}
function setAuthFeedback(message: string, busy: boolean) {
  authMessage = message
  authBusy = busy
  const messageNode = document.querySelector<HTMLElement>('#auth-message')
  if (messageNode) messageNode.textContent = message
  const button = document.querySelector<HTMLButtonElement>('#auth-submit')
  if (button) {
    button.disabled = busy
    button.textContent = busy ? '处理中…' : authSubmitLabel()
  }
}
function renderAuthLoading() {
  setMusicMode('title')
  app.innerHTML = `<main class="auth-screen"><section class="auth-card auth-loading"><div class="auth-brand"><b>A</b><span><strong>冒险王</strong><small>元素远征 · 云端存档</small></span></div><p>正在连接云端存档…</p></section></main>`
}
function renderAuth() {
  setMusicMode('title')
  const isRegister = authView === 'register'
  const isForgot = authView === 'forgot'
  const firstInput = isForgot ? 'auth-email' : 'auth-username'
  app.innerHTML = `<main class="auth-screen"><section class="auth-card">
    <div class="auth-brand"><b>A</b><span><strong>冒险王</strong><small>元素远征 · 云端远征档案</small></span></div>
    <div class="auth-tabs">
      <button class="${!isRegister && !isForgot ? 'active' : ''}" data-action="auth-tab" data-tab="login" type="button">登录</button>
      <button class="${isRegister ? 'active' : ''}" data-action="auth-tab" data-tab="register" type="button">注册</button>
    </div>
    <form id="auth-form" class="auth-form" novalidate>
      ${isForgot ? '<p class="auth-hint">输入注册时使用的邮箱，我们会发送重置密码邮件。</p>' : ''}
      ${!isForgot ? `<label>用户名<input id="auth-username" name="username" autocomplete="username" maxlength="32" spellcheck="false" ${firstInput === 'auth-username' ? 'autofocus' : ''} required></label>` : ''}
      ${isRegister || isForgot ? `<label>邮箱<input id="auth-email" name="email" type="email" autocomplete="email" spellcheck="false" ${firstInput === 'auth-email' ? 'autofocus' : ''} required></label>` : ''}
      ${!isForgot ? `<label>密码<input id="auth-password" name="password" type="password" autocomplete="${isRegister ? 'new-password' : 'current-password'}" required></label>` : ''}
      ${isRegister ? '<label>确认密码<input id="auth-confirm" name="confirm" type="password" autocomplete="new-password" required></label>' : ''}
      <button id="auth-submit" class="primary auth-submit" type="submit" ${authBusy ? 'disabled' : ''}>${authBusy ? '处理中…' : authSubmitLabel()}</button>
    </form>
    <div id="auth-message" class="auth-message">${escapeHtml(authMessage)}</div>
    <div class="auth-links">
      ${isForgot ? '<button data-action="auth-tab" data-tab="login" type="button">返回登录</button>' : '<button data-action="auth-forgot" type="button">忘记密码？</button>'}
      <button data-action="offline-play" type="button">离线试玩</button>
      <button data-action="toggle-audio" data-audio-label type="button">${audioEnabled() ? '音效：开' : '音效：关'}</button>
    </div>
    <p class="auth-note">云端存档需要联网。离线试玩只保存在当前设备，不会同步。</p>
  </section></main>`
}
async function submitAuth() {
  if (authBusy) return
  const username = document.querySelector<HTMLInputElement>('#auth-username')?.value.trim() ?? ''
  const email = document.querySelector<HTMLInputElement>('#auth-email')?.value.trim() ?? ''
  const password = document.querySelector<HTMLInputElement>('#auth-password')?.value ?? ''
  const confirm = document.querySelector<HTMLInputElement>('#auth-confirm')?.value ?? ''
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (authView === 'forgot') {
    if (!emailPattern.test(email)) { setAuthFeedback('请输入有效邮箱。', false); return }
    setAuthFeedback('正在发送重置邮件…', true)
    try {
      await resetCloudPassword(email)
      setAuthFeedback('重置邮件已发送，请检查邮箱。', false)
    } catch (error) { setAuthFeedback(errorMessage(error), false) }
    return
  }
  if (username.length < 3 || username.length > 32) { setAuthFeedback('用户名长度为 3-32 个字符。', false); return }
  if (password.length < 6) { setAuthFeedback('密码至少需要 6 位。', false); return }
  if (authView === 'register') {
    if (!emailPattern.test(email)) { setAuthFeedback('请填写有效邮箱。', false); return }
    if (password !== confirm) { setAuthFeedback('两次输入的密码不一致。', false); return }
  }
  setAuthFeedback('正在连接…', true)
  try {
    if (authView === 'register') {
      await registerCloudUser(username, password, email)
      setAuthFeedback('注册成功，正在登录…', true)
    }
    const user = await loginCloudUser(username, password)
    if (!user) throw new Error('登录失败，请重试。')
    await enterAccount(user)
  } catch (error) {
    setAuthFeedback(errorMessage(error), false)
  }
}
async function enterAccount(user: CloudUser) {
  cloudUser = user
  offlineMode = false
  authBusy = false
  authMessage = ''
  currentSaveKey = `${SAVE_KEY}:${user.objectId}`
  const localSlots = readSaves(currentSaveKey)
  const guestSlots = readSaves(SAVE_KEY)
  let profile: CloudProfile | null = null
  try { profile = await fetchCloudProfile(user) } catch (error) { toast(`云端存档读取失败：${errorMessage(error)}`) }
  if (profile) {
    cloudProfileId = profile.objectId ?? null
    const cloudSlots = parseCloudSlots(profile.slots)
    const localTime = Math.max(0, ...localSlots.map((slot) => slot.updatedAt || 0))
    const cloudTime = profile.savedAt ? Date.parse(profile.savedAt) || 0 : 0
    saveSlots = localSlots.length > 0 && localTime > cloudTime ? localSlots : cloudSlots
    writeSavesToLocal(saveSlots)
    if (saveSlots === localSlots) void pushCloud()
  } else {
    saveSlots = localSlots.length > 0 ? localSlots : guestSlots
    writeSavesToLocal(saveSlots)
    try {
      const id = await saveCloudProfile(user, JSON.stringify(saveSlots))
      if (id) cloudProfileId = id
    } catch (error) {
      toast(`云端存档初始化失败：${errorMessage(error)}`)
    }
  }
  activeSlotId = null
  game = null
  foes = []
  projectiles = []
  foeShots = []
  scene = 'title'
  paused = false
  bagOpen = false
  craftingOpen = false
  attributesOpen = false
  authState = 'game'
  renderTitle()
}
function logoutAccount() {
  if (cloudSyncTimer !== null) { window.clearTimeout(cloudSyncTimer); cloudSyncTimer = null }
  try { if (cloudUser) localStorage.removeItem(`${SAVE_KEY}:${cloudUser.objectId}`) } catch { /* ignore */ }
  try { logoutCloudUser() } catch { /* ignore */ }
  cloudUser = null
  cloudProfileId = null
  offlineMode = false
  authState = 'auth'
  authView = 'login'
  authMessage = ''
  authBusy = false
  currentSaveKey = SAVE_KEY
  saveSlots = []
  activeSlotId = null
  game = null
  foes = []
  projectiles = []
  foeShots = []
  scene = 'title'
  paused = false
  bagOpen = false
  craftingOpen = false
  attributesOpen = false
  renderAuth()
}
function playOffline() {
  offlineMode = true
  cloudUser = null
  cloudProfileId = null
  authState = 'game'
  authView = 'login'
  authMessage = ''
  authBusy = false
  currentSaveKey = SAVE_KEY
  saveSlots = readSaves(SAVE_KEY)
  activeSlotId = null
  game = null
  scene = 'title'
  renderTitle()
}
async function boot() {
  if (!cloudAvailable()) {
    authState = 'game'
    offlineMode = true
    currentSaveKey = SAVE_KEY
    saveSlots = readSaves(SAVE_KEY)
    render()
    return
  }
  authState = 'loading'
  render()
  try {
    const user = await currentCloudUser()
    if (!user) { authState = 'auth'; render(); return }
    await enterAccount(user)
  } catch (error) {
    authState = 'auth'
    authMessage = errorMessage(error)
    render()
  }
}
function renderTitle() {
  setMusicMode('title')
  const audioButton = `<button class="audio-button" data-action="toggle-audio" title="音效与音乐开关" type="button">${audioEnabled() ? '♪' : '×'}</button>`
  const accountBar = cloudUser
    ? `<div class="account-bar"><span><i></i>云端账号 · ${escapeHtml(cloudUser.username)}</span><span class="account-actions">${audioButton}<button data-action="logout" type="button">退出登录</button></span></div>`
    : `<div class="account-bar offline"><span><i></i>离线模式 · 进度仅保存在本机</span><span class="account-actions">${audioButton}${cloudAvailable() ? '<button data-action="login" type="button">登录 / 注册</button>' : ''}</span></div>`
  const slots = saveSlots.map((slot) => `<article class="save-slot"><span class="save-slot-info"><b>${slot.label}</b><small>${roleLabels[slot.data.role]} · ${slot.data.level ?? 1} 级 · ${slot.data.town ? '小镇' : `第 ${slot.data.stage} 关`} · 击败 ${slot.data.kills}</small></span><button class="save-resume" data-action="resume" data-slot="${slot.id}">继续　↗</button><button class="save-delete" data-action="delete-slot" data-slot="${slot.id}" aria-label="删除${slot.label}" title="删除存档">×</button></article>`).join('')
  const overwriteDialog = pendingRole ? `<div class="slot-scrim"><section class="slot-dialog"><small>存档槽已满 · 3 / 3</small><h2>新建${roleLabels[pendingRole]}存档</h2><p>请选择一个存档槽。覆盖前会再次确认，取消不会改动任何存档。</p>${saveSlots.map((slot) => `<button data-action="overwrite-slot" data-slot="${slot.id}"><span><b>${slot.label}</b><small>${roleLabels[slot.data.role]} · ${slot.data.town ? '小镇' : `第 ${slot.data.stage} 关`}</small></span><i>选择覆盖</i></button>`).join('')}<button class="slot-cancel" data-action="cancel-new">取消</button></section></div>` : ''
  app.innerHTML = `<main class="title-screen"><section class="title-copy"><div class="eyebrow"><i></i> 单机动作 RPG · 十章远征</div><h1>冒险王<span>：元素远征</span></h1><p class="intro">古老遗迹再度苏醒。选择你的职业，穿越十片失落之地，直面守关者。</p>${accountBar}${saveSlots.length ? `<section class="saved-slots"><div class="slots-heading"><span>远征存档</span><small>${saveSlots.length} / 3</small></div>${slots}</section>` : ''}<div class="rule"></div><div class="class-picks"><button class="class-card" data-action="role" data-role="warrior"><b class="role-mark">刃</b><span><strong>新建战士</strong><small>剑刃近战 · 创建独立存档</small></span><i>↗</i></button><button class="class-card" data-action="role" data-role="mage"><b class="role-mark mage-mark">✦</b><span><strong>新建法师</strong><small>法杖远程 · 创建独立存档</small></span><i>↗</i></button></div><footer><span>存档最多 3 个 · 覆盖前确认</span><span class="game-version">版本 ${GAME_VERSION}</span><span>01 — 10</span></footer></section><div class="title-art" aria-hidden="true"><div class="sun"></div><div class="mountains"></div><div class="ruins"><i></i><i></i><i></i></div><div class="silhouette"><b></b><i></i><span></span></div><small>THE LOST FRONTIER <span>遗迹之外，仍有远方</span></small></div></main>${overwriteDialog}`
}
function gearMarkup(canEquip: boolean) {
  if (!game?.gear.length) return '<div class="empty-gear">背包里还没有武器<small>击败遗迹守卫，寻找装备</small></div>'
  const worn = new Set([game.weaponId, game.armorId])
  const multiplier = roleGearMultiplier(game.role)
  const scaled = (value: number | undefined) => Math.round((value ?? 0) * multiplier)
  return game.gear.map((gear) => {
    const equipped = worn.has(gear.id) || (!gear.type && game!.equipped === gear.id)
    const type = gear.type ?? '旧装备'
    const details = gear.type === 'weapon' ? `蓝量 +${scaled(gear.mp)} · 攻击 +${scaled(gear.attack)}` : gear.type === 'armor' ? `生命 +${scaled(gear.hp)} · 防御 +${scaled(gear.defense)}` : `生命 +${scaled(gear.hp)} · 攻击 +${scaled(gear.attack)} · 防御 +${scaled(gear.defense)}`
    return `<article class="gear-row ${equipped ? 'active-gear' : ''}"><span class="gear-glyph">${gear.type === 'armor' ? '▰' : '✦'}</span><span class="gear-copy"><b>${gear.name}</b><small>${type} · ${gear.level} 级 · ${details}</small></span><span class="gear-actions">${equipped ? '<i class="equipped">已装备</i>' : `<button data-action="equip" data-id="${gear.id}" ${canEquip ? '' : 'disabled'}>${canEquip ? '穿戴' : '小镇可穿'}</button>`}</span></article>`
  }).join('')
}
function craftMarkup() {
  if (!game) return '<div class="empty-gear">没有可合成的装备</div>'
  const worn = new Set([game.weaponId, game.armorId])
  const groups = new Map<string, { type: GearType; level: number; count: number }>()
  for (const gear of game.gear) {
    if (!gear.type || worn.has(gear.id)) continue
    const key = `${gear.type}:${gear.level}`
    const group = groups.get(key) ?? { type: gear.type, level: gear.level, count: 0 }
    group.count += 1
    groups.set(key, group)
  }
  if (!groups.size) return '<div class="empty-gear">没有未穿戴的武器或护甲<small>同品类、同等级装备满 5 件后可合成</small></div>'
  return [...groups.values()].sort((a, b) => a.level - b.level || a.type.localeCompare(b.type)).map((group) => `<article class="craft-row"><span class="gear-glyph">${group.type === 'armor' ? '▰' : '✦'}</span><span class="gear-copy"><b>${group.type === 'weapon' ? '武器' : '护甲'} · ${group.level} 级</b><small>${group.count} / 5 件未穿戴材料 · 合成后为 ${group.level + 1} 级</small></span><button data-action="synthesize-group" data-type="${group.type}" data-level="${group.level}" ${group.count >= 5 ? '' : 'disabled'}>合成</button></article>`).join('')
}
function attributeMarkup() {
  if (!game) return ''
  const allocation = game.attributeAllocation ?? { hp: 0, attack: 0, mp: 0, defense: 0 }
  const points = game.attributePoints ?? 0
  const progress = getStageProgress(game.stage)
  const rows: Array<{ stat: AttributeStat; label: string; hint: string; count: number }> = [
    { stat: 'hp', label: '生命', hint: '每点 +10 生命', count: allocation.hp },
    { stat: 'attack', label: '攻击', hint: '每点 +1 攻击', count: allocation.attack },
    { stat: 'mp', label: '法力', hint: '每点 +1 法力', count: allocation.mp },
    { stat: 'defense', label: '防御', hint: '每点 +1 防御', count: allocation.defense },
  ]
  return `<div class="bag-scrim attr-scrim"><section class="bag-dialog attr-dialog"><header><div><small>ATTRIBUTES · 剩余 ${points} 点</small><h2>属性分配</h2></div><button data-action="close-attributes" aria-label="关闭属性面板">×</button></header><p>击杀小怪每满 10 只获得本关关卡数等量的属性点，单关最多 20 点。分配后立即生效。</p><div class="attr-summary"><span>可用属性点 <b>${points}</b></span><small>本关已获得 ${progress.pointsClaimed ?? 0} / ${ATTRIBUTE_POINT_CAP_PER_STAGE}</small></div><div class="attr-list">${rows.map((row) => `<article class="attr-row"><span class="attr-copy"><b>${row.label}</b><small>${row.hint} · 已投入 ${row.count} 点</small></span><b class="attr-total">+${row.count * ATTRIBUTE_STEP[row.stat]}</b><button data-action="allocate-attr" data-stat="${row.stat}" ${points > 0 ? '' : 'disabled'}>+</button></article>`).join('')}</div></section></div>`
}
function townPanelMarkup() {
  if (!game) return ''
  const current = game
  const options = Array.from({ length: current.unlockedStage }, (_, i) => `<option value="${i + 1}" ${current.stage === i + 1 ? 'selected' : ''}>第 ${String(i + 1).padStart(2, '0')} 关 · ${stageNames[i]}</option>`).join('')
  return `<section class="panel town-panel"><header><span>冒险者小镇</span><small>SAFE HAVEN</small></header><p>在镇内自由走动整备，准备好后选择关卡进入遗迹。</p><div class="town-shortcuts"><button class="secondary" data-action="open-crafting">合成台</button><button class="secondary" data-action="open-attributes">属性分配 · ${current.attributePoints ?? 0} 点</button></div>${current.completed ? `<p class="stage-progress-copy">十片遗迹皆已沉寂</p><button class="primary" data-action="role-select">返回角色选择</button>` : `<label class="stage-picker"><span>选择关卡</span><select id="stage-select">${options}</select></label><button class="primary" data-action="enter-stage">进入遗迹　→</button>`}</section>`
}
function renderGame() {
  if (!game) return renderTitle()
  const s = stats()
  const isTown = scene === 'town'
  if (isTown) { heroX = Math.max(TOWN_LEFT, Math.min(TOWN_RIGHT, heroX)); cameraX = 0 }
  const boss = foes.some((foe) => foe.boss)
  setMusicMode(isTown ? 'town' : boss ? 'boss' : 'battle')
  const countText = boss ? '守关者' : `${game.kills} / ${MAX_SMALL_KILLS}`
  const townOverlay = ''
  const deathOverlay = scene === 'defeat' ? '<div class="overlay death-overlay"><small>EXPEDITION PAUSED</small><h2>你倒在了遗迹深处</h2><p>已获得的装备和关卡进度都会保留。</p><div class="death-actions"><button data-action="respawn-town" class="primary">重生到小镇</button><button data-action="respawn-fight" class="secondary">继续战斗</button></div></div>' : ''
  const endingOverlay = scene === 'ending' ? '<div class="overlay"><small>THE FRONTIER IS YOURS</small><h2>十片遗迹，皆已沉寂</h2><p>你完成了元素远征。</p><button data-action="town" class="primary">返回小镇　↗</button></div>' : ''
  app.innerHTML = `<main class="game-shell ${isTown ? 'town-mode' : ''}"><header class="game-header"><a data-action="town" class="wordmark"><b>A</b> 冒险王 <i>／</i> ${isTown ? '冒险者小镇' : '元素远征'}</a><span class="save-state"><i></i>${isTown ? '小镇安全区' : '进度已自动保存'}</span><button class="bag-button" data-action="bag">背包 <span>${game.gear.length}</span></button><button class="save-button" data-action="save" title="保存进度">▣</button></header><section class="overview"><div><small>${isTown ? '冒险者小镇' : `第 ${String(game.stage).padStart(2, '0')} 章`}</small><h1>${isTown ? '营火集市' : stageNames[game.stage - 1]}</h1><p>${isTown ? '缓冲区 · 整备装备与选择关卡' : `遗迹入口 · 击败 ${MAX_SMALL_KILLS} 只守卫后迎战 Boss`}</p></div><div class="metrics"><div><small>职业</small><b>${roleLabels[game.role]}</b></div><div><small>已击杀</small><b>${isTown ? `开放至第 ${game.unlockedStage} 关` : countText}</b></div><div><small>当前装备</small><b>${item()?.name ?? '无'}</b></div></div></section><section class="game-grid"><div class="battle-column"><div class="arena-label"><span>◆ ${isTown ? '冒险者小镇 · 补给站' : `${stageNames[game.stage - 1]} · 深层区域`}</span><b id="enemy-name">${isTown ? '安全区域' : boss ? '守关者冲刺准备中' : `${foes.length} 只守卫正在逼近`}</b></div><div class="arena"><canvas id="arena" aria-label="横版战斗场景"></canvas><div class="coords"><span>${isTown ? 'TOWN · SAFE ZONE' : `遗迹远征 · ${String(game.stage).padStart(2, '0')}`}</span><span>${boss ? 'BOSS ENCOUNTER' : isTown ? 'REST & PREPARE' : 'WAVE ENCOUNTER'}</span></div>${townOverlay}${deathOverlay}${endingOverlay}</div><div class="foe-health"><div><span>${isTown ? '冒险者状态' : boss ? '守关者' : '本批守卫'}</span><b id="foe-hp">${isTown ? '安全休整' : boss ? `${Math.ceil(foes[0]?.hp ?? 0)} / ${foes[0]?.maxHp ?? 0}` : `${foes.length} 名敌人 · 已击败 ${game.kills} / ${MAX_SMALL_KILLS}`}</b></div><div><i id="foe-fill" style="width:${boss ? `${Math.max(0, foes[0].hp / foes[0].maxHp * 100)}%` : '100%'}"></i></div></div><div class="combat-bar"><button data-action="attack" class="attack" ${scene === 'battle' ? '' : 'disabled'}><b>${game.role === 'warrior' ? '⚔' : '✦'}</b><span><strong>${game.role === 'warrior' ? '剑刃斩击' : '法杖射击'}</strong><small>J · ${game.role === 'warrior' ? '近战' : '远程'}</small></span></button><button data-action="jump" ${scene === 'battle' ? '' : 'disabled'}><b>↟</b><span><strong>跳跃</strong><small>K ×2</small></span></button>${skillLabels[game.role].map((label, i) => `<button data-action="skill" data-index="${i}" ${scene === 'battle' ? '' : 'disabled'}><i>${i + 1}</i><span><strong>${label}</strong><small>${skillSummary(game!.role, i)}</small></span></button>`).join('')}</div><div class="mobile-move"><button data-move="left" aria-label="向左移动">←</button><button data-move="right" aria-label="向右移动">→</button></div><div class="combat-log"><b>✦</b><span>${logText}</span></div></div><aside class="side-column">${isTown ? townPanelMarkup() : ''}<section class="panel status-panel"><header><span>角色状态</span><small>${String(game.stage).padStart(2, '0')}</small></header><div class="hero-card"><b class="avatar ${game.role}">${game.role === 'warrior' ? '刃' : '✦'}</b><span><strong>${roleLabels[game.role]}</strong><small>${game.role === 'warrior' ? '钢铁誓约 · 剑士' : '星辉学派 · 法杖'}</small></span></div><div class="resource-label"><span>生命</span><b id="hp-text">${Math.ceil(game.hp)} <i>/ ${s.hp}</i></b><em>♥</em></div><div class="resource"><i id="hp-fill" style="width:${game.hp / s.hp * 100}%"></i></div><div class="resource-label mana-label"><span>法力</span><b id="mp-text">${Math.ceil(game.mp)} <i>/ ${s.mp}</i></b><em>✦</em></div><div class="resource"><i id="mp-fill" style="width:${game.mp / s.mp * 100}%"></i></div><div class="stats"><div><small>攻击</small><b>${s.attack}</b></div><div><small>防御</small><b>${s.defense}</b></div><div><small>增益</small><b id="buff-stat">${buffTime > 0 ? `${buffTime.toFixed(1)}s` : '—'}</b></div></div></section><section class="panel gear-panel"><header><span>装备栏</span><small>${item()?.name ?? '未装备'}</small></header><div class="gear-summary">${item() ? `生命 +${item()!.hp}　攻击 +${item()!.attack}　防御 +${item()!.defense}` : '装备不会自动穿戴，请在小镇打开背包手动更换。'}</div><button class="open-bag" data-action="bag">打开背包　↗</button><div class="camp-hint">⌂　${isTown ? '安全区内可自由更换装备' : '击败 Boss 后回到小镇整备'}</div></section></aside></section><footer class="game-footer"><span>WASD / ← → 移动　·　J 攻击　·　K 跳跃 / 二段跳　·　1–4 技能</span><b>LOCAL SAVE　●</b></footer>${bagOpen ? `<div class="bag-scrim"><section class="bag-dialog"><header><div><small>INVENTORY · ${game.gear.length} ITEMS</small><h2>远征背包</h2></div><button data-action="close-bag" aria-label="关闭背包">×</button></header><p>${isTown ? '选择要装备的武器，属性会立即更新。' : '装备已安全保存。返回小镇后即可更换。'}</p><div class="bag-list">${gearMarkup(isTown)}</div></section></div>` : ''}</main>`
  if (craftingOpen && isTown) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', `<div class="bag-scrim craft-scrim"><section class="bag-dialog craft-dialog"><header><div><small>FORGE · 冒险者小镇</small><h2>合成台</h2></div><button data-action="close-crafting" aria-label="关闭合成台">×</button></header><p>只消耗未穿戴的材料：5 件同类同等级装备合成 1 件高一级装备。</p><div class="bag-list craft-list">${craftMarkup()}</div></section></div>`)
  if (attributesOpen && isTown) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', attributeMarkup())
  mountBattleHud()
  mountLevelHud()
  mountEquipmentHud()
  if (isTown) {
    const bagHint = document.querySelector<HTMLElement>('.bag-dialog > p')
    if (bagHint) bagHint.textContent = '选择装备穿戴；武器和护甲分别使用独立槽位。'
  }
  if (isTown && !game.completed) mountTownStageActions()
  const header = document.querySelector<HTMLElement>('.game-header')
  header?.insertAdjacentHTML('beforeend', '<button class="role-select-button" data-action="role-select">角色选择</button>')
  header?.insertAdjacentHTML('beforeend', '<button class="landscape-button" data-action="landscape" title="进入横屏全屏">横屏</button>')
  header?.insertAdjacentHTML('beforeend', `<button class="audio-button" data-action="toggle-audio" title="音效与音乐开关">${audioEnabled() ? '♪' : '×'}</button>`)
  if (scene === 'battle' && header) header.insertAdjacentHTML('beforeend', `<button class="pause-button" data-action="pause" title="按 P 暂停或继续">${paused ? '继续' : '暂停'} <span>P</span></button>`)
  if (paused) document.querySelector('.arena')?.insertAdjacentHTML('beforeend', '<div class="overlay pause-overlay"><small>PAUSED · P</small><h2>远征暂停</h2><p>战斗已冻结，敌人与计时器不会继续行动。</p><button class="primary" data-action="pause">继续战斗　▶</button></div>')
  const skillButtons = document.querySelectorAll<HTMLButtonElement>('.combat-bar button[data-action="skill"]')
  skillButtons.forEach((button, index) => {
    if (paused) button.disabled = true
    const detail = button.querySelector('small')
    if (detail) detail.textContent = `${skillSummary(game!.role, index)} · ${index + 1}`
  })
  if (paused) document.querySelector<HTMLButtonElement>('.combat-bar button[data-action="attack"]')!.disabled = true
  if (paused) document.querySelector<HTMLButtonElement>('.combat-bar button[data-action="jump"]')!.disabled = true
  const controls = document.querySelector<HTMLElement>('.game-footer span')
  if (controls) controls.textContent = 'WASD / ← → 移动　·　J 攻击　·　K 跳跃 / 二段跳　·　1–4 技能　·　S 拾取药水　·　P 暂停'
  setupCanvas()
  syncHud()
}
function render() {
  if (authState === 'auth') return renderAuth()
  if (authState === 'loading') return renderAuthLoading()
  scene === 'title' ? renderTitle() : renderGame()
}
function foeHeadTop(foe: Foe) {
  const offset = (foe.boss ? 242 : 90) + (foe.flying ? (foe.flyHeight ?? 0) : 0)
  return `${((world.floor - offset) / world.height) * 100}%`
}
function mountBattleHud() {
  const statusPanel = document.querySelector('.status-panel')
  statusPanel?.querySelectorAll('.resource-label, .resource').forEach((element) => element.remove())
  const battleColumn = document.querySelector('.battle-column')
  const foeHealth = document.querySelector('.foe-health')
  if (battleColumn && foeHealth && game) {
    const s = stats()
    const bars = document.createElement('div')
    bars.className = 'player-resource-bars'
    bars.innerHTML = `<div class="player-resource"><div><span>生命</span><b id="hp-text">${Math.ceil(game.hp)} / ${s.hp}</b></div><div class="resource"><i id="hp-fill" style="width:${game.hp / s.hp * 100}%"></i></div></div><div class="player-resource mana-resource"><div><span>法力</span><b id="mp-text">${Math.ceil(game.mp)} / ${s.mp}</b></div><div class="resource"><i id="mp-fill" style="width:${game.mp / s.mp * 100}%"></i></div></div>`
    battleColumn.insertBefore(bars, foeHealth)
  }
  const arena = document.querySelector<HTMLElement>('.arena')
  if (!arena || scene !== 'battle') return
  for (const foe of foes) {
    const head = document.createElement('div')
    head.className = `foe-head ${foe.boss ? 'boss-head' : ''}`
    head.dataset.foeId = String(foe.id)
    head.style.left = foeScreenLeft(foe)
    head.style.top = foeHeadTop(foe)
    head.innerHTML = `<span>${foe.boss ? '守关者' : '遗迹守卫'} <b>${Math.ceil(foe.hp)}</b></span><div><i class="foe-head-fill" style="width:${Math.max(0, foe.hp / foe.maxHp * 100)}%"></i></div>`
    arena.append(head)
  }
}
function mountLevelHud() {
  if (!game) return
  const heroCard = document.querySelector('.hero-card')
  if (!heroCard) return
  const level = game.level ?? 1
  const exp = game.exp ?? 0
  const needed = xpToNext(level)
  const progress = document.createElement('div')
  progress.className = 'level-progress'
  progress.innerHTML = `<div><b id="level-label">角色等级 ${level}</b><span id="xp-label">经验 ${exp} / ${needed}</span></div><div class="xp-track"><i id="xp-fill" style="width:${Math.min(100, exp / needed * 100)}%"></i></div>`
  heroCard.insertAdjacentElement('afterend', progress)
}
function mountEquipmentHud() {
  if (!game) return
  const weapon = game.gear.find((gear) => gear.id === game?.weaponId)
  const armor = game.gear.find((gear) => gear.id === game?.armorId)
  const multiplier = roleGearMultiplier(game.role)
  const scaled = (value: number | undefined) => Math.round((value ?? 0) * multiplier)
  const header = document.querySelector<HTMLElement>('.gear-panel header small')
  const summary = document.querySelector<HTMLElement>('.gear-summary')
  if (header) header.textContent = `武器：${weapon?.name ?? '未装备'} · 护甲：${armor?.name ?? '未装备'}${game.role === 'mage' ? ' · 法师收益 80%' : ''}`
  if (summary) summary.innerHTML = `<span>武器　蓝量 +${scaled(weapon?.mp)}　攻击 +${scaled(weapon?.attack)}</span><span>护甲　生命 +${scaled(armor?.hp)}　防御 +${scaled(armor?.defense)}</span>`
  const metric = document.querySelector<HTMLElement>('.metrics div:last-child b')
  if (metric) metric.textContent = `${weapon?.name ?? '无武器'} / ${armor?.name ?? '无护甲'}`
}
function mountTownStageActions() {
  if (!game || scene !== 'town' || game.completed) return
  const select = document.querySelector<HTMLSelectElement>('#stage-select')
  const existingButton = document.querySelector('[data-action="enter-stage"]')
  if (!select || !existingButton) return
  const progress = getStageProgress(game.stage)
  const actionHtml = progress.bossDefeated
    ? `<p class="stage-progress-copy">本关 Boss 已击败</p><div class="town-stage-choices"><button class="secondary" data-action="restart-stage">重新开始</button><button class="primary" data-action="challenge-boss">直接挑战 Boss</button></div>`
    : `<p class="stage-progress-copy">未通关 · 必须从第一波开始</p><button class="primary town-continue-stage" data-action="restart-stage">从第一波开始</button>`
  const choices = document.createElement('div')
  choices.className = 'town-stage-actions'
  choices.innerHTML = actionHtml
  existingButton.replaceWith(choices)
  for (const option of select.options) {
    const stage = Number(option.value)
    const stageProgress = getStageProgress(stage)
    option.textContent = `第 ${String(stage).padStart(2, '0')} 关 · ${stageNames[stage - 1]} · ${stageProgress.bossDefeated ? 'Boss 已击败' : '未通关'}`
  }
}
function syncHud() {
  if (!game) return
  syncFoeHeads()
  const s = stats()
  const levelLabel = document.querySelector<HTMLElement>('#level-label')
  const xpLabel = document.querySelector<HTMLElement>('#xp-label')
  const xpFill = document.querySelector<HTMLElement>('#xp-fill')
  const level = game.level ?? 1
  const exp = game.exp ?? 0
  const needed = xpToNext(level)
  if (levelLabel) levelLabel.textContent = `角色等级 ${level}`
  if (xpLabel) xpLabel.textContent = `经验 ${exp} / ${needed}`
  if (xpFill) xpFill.style.width = `${Math.min(100, exp / needed * 100)}%`
  const setWidth = (selector: string, percent: number) => { const el = document.querySelector<HTMLElement>(selector); if (el) el.style.width = `${Math.max(0, Math.min(100, percent))}%` }
  setWidth('#hp-fill', game.hp / s.hp * 100); setWidth('#mp-fill', game.mp / s.mp * 100)
  if (foes[0]?.boss) setWidth('#foe-fill', foes[0].hp / foes[0].maxHp * 100)
  for (const foe of foes) {
    const head = document.querySelector<HTMLElement>(`[data-foe-id="${foe.id}"]`)
    const fill = head?.querySelector<HTMLElement>('.foe-head-fill')
    const label = head?.querySelector<HTMLElement>('span b')
    if (head) { head.style.left = foeScreenLeft(foe); head.style.top = foeHeadTop(foe) }
    if (fill) fill.style.width = `${Math.max(0, foe.hp / foe.maxHp * 100)}%`
    if (label) label.textContent = String(Math.ceil(foe.hp))
  }
  const hp = document.querySelector<HTMLElement>('#hp-text'); if (hp) hp.innerHTML = `${Math.ceil(game.hp)} <i>/ ${s.hp}</i>`
  const mp = document.querySelector<HTMLElement>('#mp-text'); if (mp) mp.innerHTML = `${Math.ceil(game.mp)} <i>/ ${s.mp}</i>`
  const coreStats = document.querySelectorAll<HTMLElement>('.stats div b')
  if (coreStats[0]) coreStats[0].textContent = String(s.attack)
  if (coreStats[1]) coreStats[1].textContent = String(s.defense)
  const killMetric = document.querySelector<HTMLElement>('.metrics div:nth-child(2) b')
  if (killMetric && scene === 'battle') killMetric.textContent = foes.some((foe) => foe.boss) ? '守关者' : `${game.kills} / ${MAX_SMALL_KILLS}`
  const foeHp = document.querySelector<HTMLElement>('#foe-hp')
  if (foeHp && scene === 'battle') foeHp.textContent = foes[0]?.boss ? `${Math.ceil(foes[0].hp)} / ${foes[0].maxHp}` : `${foes.length} 名敌人 · 已击败 ${game.kills} / ${MAX_SMALL_KILLS}`
  const buff = document.querySelector<HTMLElement>('#buff-stat'); if (buff) buff.textContent = buffTime > 0 ? `${buffTime.toFixed(1)}s` : '—'
  const enemyName = document.querySelector<HTMLElement>('#enemy-name')
  if (enemyName && scene === 'battle') enemyName.textContent = foes[0]?.boss ? '守关者冲刺准备中' : foes.length ? `${foes.length} 只守卫正在逼近` : waveReady ? '继续向右推进，解锁新的区域' : '区域已清空'
}
function syncFoeHeads() {
  const arena = document.querySelector<HTMLElement>('.arena')
  if (!arena || scene !== 'battle') return
  const activeIds = new Set(foes.map((foe) => String(foe.id)))
  arena.querySelectorAll<HTMLElement>('.foe-head').forEach((head) => {
    if (!activeIds.has(head.dataset.foeId ?? '')) head.remove()
  })
  for (const foe of foes) {
    let head = arena.querySelector<HTMLElement>(`.foe-head[data-foe-id="${foe.id}"]`)
    if (!head) {
      head = document.createElement('div')
      head.className = `foe-head ${foe.boss ? 'boss-head' : ''}`
      head.dataset.foeId = String(foe.id)
      head.innerHTML = `<span>${foe.boss ? '守关者' : '遗迹守卫'} <b></b></span><div><i class="foe-head-fill"></i></div>`
      arena.append(head)
    }
    head.style.left = foeScreenLeft(foe)
    head.style.top = foeHeadTop(foe)
    const label = head.querySelector<HTMLElement>('span b')
    const fill = head.querySelector<HTMLElement>('.foe-head-fill')
    if (label) label.textContent = String(Math.ceil(foe.hp))
    if (fill) fill.style.width = `${Math.max(0, foe.hp / foe.maxHp * 100)}%`
  }
}
function skillPower(index: number) { return Math.round(stats().attack * SKILL_MULTIPLIERS[game?.role ?? 'warrior'][index]) }
function skillSummary(role: Role, index: number) {
  if (role === 'mage' && index === 0) return `+10% 攻速/攻击 · 10s · ${SKILL_COSTS.mage[0]} MP`
  if (role === 'mage' && index === 2) return `无伤害位移 · ${SKILL_COSTS.mage[2]} MP`
  if (role === 'mage' && index === 3) return `眩晕 1s · 5 连击 · ${SKILL_COSTS.mage[3]} MP`
  return `${Math.round(SKILL_MULTIPLIERS[role][index] * 100)}% 攻击 · ${SKILL_COSTS[role][index]} MP`
}
function spend(cost: number) { if (!game || game.mp < cost) { toast('法力不足，无法释放技能。'); return false } game.mp -= cost; return true }
function targetForFacing(range: number): Foe | undefined {
  return foes.filter((foe) => Math.abs(foe.x - heroX) <= range).sort((a, b) => {
    const distance = Math.abs(a.x - heroX) - Math.abs(b.x - heroX)
    if (Math.abs(distance) > 1) return distance
    return (b.x - heroX) * facing - (a.x - heroX) * facing
  })[0]
}
function strike(target: Foe, damage: number, label: string) {
  if (!game || !foes.includes(target)) return
  playSfx('hit')
  const dealt = Math.max(1, Math.round(damage))
  target.hp -= dealt; target.flash = .18
  addDamageText(target, dealt)
  addFx('impact', target.x, world.floor - (target.boss ? 120 : 72), -1, .22)
  addSparks(target.x, world.floor - (target.boss ? 110 : 62), 4, ['#ffe6a8', '#e8b56f'], 110)
  if (target.hp <= 0) defeatFoe(target)
  else syncHud()
  setLog(`${label} · 命中${target.boss ? '守关者' : '守卫'}`)
}
function strikeNearby(damage: number, label: string, range: number, all = false) {
  const targets = all ? foes.filter((foe) => Math.abs(foe.x - heroX) <= range) : [targetForFacing(range)].filter((foe): foe is Foe => Boolean(foe))
  if (!targets.length) { setLog(foes.length ? '距离太远，攻击没有命中。' : '剑气划过空气。'); return }
  targets.forEach((target) => strike(target, damage, label))
}
function attack() {
  if (scene !== 'battle' || paused || !game || attackWait > 0) return
  const hasted = game.role === 'mage' && buffTime > 0
  attackWait = hasted ? .42 / 1.1 : .42; attackSwing = .32
  const nearest = [...foes].sort((a, b) => Math.abs(a.x - heroX) - Math.abs(b.x - heroX))[0]
  if (nearest) facing = Math.sign(nearest.x - heroX) || facing
  if (game.role === 'warrior') {
    addFx('sword', heroX + facing * 50, world.floor - 75, facing, .35)
    if (!foes.length) addFx('slash-crescent', heroX + facing * 58, world.floor - 78, facing, .5)
    addSparks(heroX + facing * 68, world.floor - 70, 5, ['#ffe3a1', '#d8b86a'], 90)
    strikeNearby(stats().attack, '剑刃斩击', 138)
  } else {
    const target = targetForFacing(unlockedWidth - MAP_LEFT)
    const projectileDirection = target ? Math.sign(target.x - heroX) || facing : facing
    projectiles.push({ x: heroX + projectileDirection * 25, y: world.floor - 68 + heroY, vx: projectileDirection * 620, life: 1.3, damage: stats().attack, targetId: target?.id ?? -1 })
    addFx('muzzle', heroX + projectileDirection * 25, world.floor - 68 + heroY, projectileDirection, .16)
    if (!target) setLog('法杖光弹向空地上射出。')
  }
  playSfx(game.role === 'warrior' ? 'slash' : 'magic')
}
function jump() {
  if (scene !== 'battle' || paused) return
  if (grounded) {
    grounded = false; velocityY = -570; jumpCount = 1
    addFx('dust', heroX, world.floor - 2, 1, .3)
    playSfx('jump')
  } else if (jumpCount < 2) {
    jumpCount = 2; velocityY = -480
    addFx('double-jump', heroX, world.floor + heroY, facing, .36)
    addSparks(heroX, world.floor + heroY, 10, ['#cfe6d8', '#e8dcb0'], 130)
    playSfx('double-jump')
  }
}
function cast(index: number) {
  if (scene !== 'battle' || paused || !game || index < 0 || index > 3) return
  if (skillWait[index] > 0) { toast('技能还在冷却中。'); return }
  if (!spend(SKILL_COSTS[game.role][index])) return
  skillWait[index] = SKILL_COOLDOWNS[index]
  attackSwing = .32
  playSkillSfx(game.role, index)
  const power = skillPower(index)
  // 技能 3：按 A + 3 向左、D + 3 向右；没按方向键时沿当前视角方向。
  if (index === 2) {
    const left = keys.has('a') || keys.has('arrowleft')
    const right = keys.has('d') || keys.has('arrowright')
    if (left !== right) facing = right ? 1 : -1
  } else {
    const nearest = [...foes].sort((a, b) => Math.abs(a.x - heroX) - Math.abs(b.x - heroX))[0]
    if (nearest) facing = Math.sign(nearest.x - heroX) || facing
  }
  if (game.role === 'warrior') {
    if (index === 0) {
      addFx('slash-crescent', heroX + facing * 46, world.floor - 82, facing, .5)
      addSparks(heroX + facing * 70, world.floor - 70, 8, ['#ffe3a1', '#f2c46d'])
      strikeNearby(power, '前斩', 165)
    } else if (index === 1) {
      addFx('whirlwind-storm', heroX, world.floor - 82, facing, .8)
      addSparks(heroX, world.floor - 70, 14, ['#e9d797', '#cfae6a'], 210)
      addShake(5)
      strikeNearby(power, '旋风斩', 205, true)
    } else if (index === 2) {
      addFx('thrust-dash', heroX + facing * 88, world.floor - 82, facing, .42)
      const startX = heroX
      const endX = Math.max(38, Math.min(922, heroX + facing * 150))
      const targets = foes.filter((foe) => foe.x >= Math.min(startX, endX) - 38 && foe.x <= Math.max(startX, endX) + 38)
      heroX = endX
      addSparks(heroX, world.floor - 70, 6, ['#f3efd6', '#d8c07a'], 120)
      if (targets.length) targets.forEach((foe) => strike(foe, power, '突刺'))
      else setLog('突刺穿过前方，未命中目标。')
    } else {
      addFx('ground-break', heroX + facing * 60, world.floor - 70, facing, .75)
      addSparks(heroX + facing * 60, world.floor - 8, 16, ['#d8b96c', '#a98d55'], 240)
      addShake(12)
      strikeNearby(power, '蓄力重斩', 175, true)
    }
  } else if (index === 0) {
    buffTime = 10
    addFx('arcane-blessing', heroX, world.floor - 88, facing, 1)
    addSparks(heroX, world.floor - 70, 12, ['#b9e0d2', '#e6ddb0'], 90)
    setLog('奥术强化：10 秒内攻击与攻速提升 10%。')
  } else if (index === 1) {
    addFx('twin-fire-pillars', heroX + facing * 150, world.floor - 2, facing, .9)
    addSparks(heroX + facing * 120, world.floor - 40, 16, ['#ff9a5c', '#ffd27a'], 170)
    addShake(4)
    strikeNearby(power, '双生火柱', 320, true)
  } else if (index === 2) {
    addFx('blink-rift', heroX, world.floor - 65, facing, .35)
    heroX = Math.max(38, Math.min(922, heroX + facing * 210))
    addFx('blink-rift', heroX, world.floor - 65, -facing, .45)
    addSparks(heroX, world.floor - 65, 10, ['#b7d9cb', '#8fc4b4'], 130)
    setLog('闪现穿过前方，未造成伤害。')
  } else {
    const target = foes.slice().sort((a, b) => Number(b.boss) - Number(a.boss) || Math.abs(a.x - heroX) - Math.abs(b.x - heroX))[0]
    if (!target) {
      addFx('energy-prison', heroX + facing * 140, world.floor - 80, facing, 1)
      addSparks(heroX + facing * 140, world.floor - 60, 8, ['#a8e0d0', '#e8ffe8'], 100)
      setLog('能量禁锢在空地上展开。')
      syncHud(); save(); return
    }
    target.stunTimer = 1
    target.dashWindup = undefined
    burst = 5; burstWait = .06; burstTargetId = target.id
    addFx('energy-prison', target.x, world.floor - (target.boss ? 130 : 83), facing, 1.2)
    addSparks(target.x, world.floor - 80, 18, ['#a8e0d0', '#d7f4ea'], 120)
    setLog('能量禁锢展开 · 控制目标 1 秒并瞬发 5 次普攻。')
  }
  syncHud(); save()
}
function defeatFoe(target: Foe) {
  if (!game) return
  playSfx('defeat')
  const wasBoss = target.boss
  foes = foes.filter((foe) => foe.id !== target.id)
  awardExperience((wasBoss ? 100 : 10) * 2 ** (game.stage - 1))
  dropGear(wasBoss)
  if (!wasBoss) dropPotions(target.x)
  if (wasBoss) {
    const clearedStage = game.stage
    game.bossDefeated = true
    game.unlockedStage = Math.max(game.unlockedStage, Math.min(10, clearedStage + 1))
    game.stageProgress ??= {}
    const clearedProgress = game.stageProgress[String(clearedStage)]
    game.stageProgress[String(clearedStage)] = { kills: game.kills, bossDefeated: true, pointsClaimed: clearedProgress?.pointsClaimed ?? 0 }
    foeShots = []
    if (clearedStage >= 10) {
      game.completed = true; scene = 'ending'; game.town = false
    } else {
      // 下一关从第一波开始，不能直接挑战 Boss。
      game.stage = clearedStage + 1
      game.kills = 0
      game.bossDefeated = false
      scene = 'town'; game.town = true; heroX = 480; cameraX = 0
      game.hp = Math.min(stats().hp, game.hp + Math.round(stats().hp * .35))
      game.mp = Math.min(stats().mp, game.mp + 180)
    }
    save(); renderGame(); return
  }
  game.kills += 1
  awardKillPoints()
  if (foes.length === 0) armNextWave()
  save(); syncHud()
}
function awardKillPoints() {
  if (!game) return
  game.stageProgress ??= {}
  const key = String(game.stage)
  const progress = game.stageProgress[key] ?? { kills: game.kills, bossDefeated: game.bossDefeated ?? false, pointsClaimed: 0 }
  game.stageProgress[key] = progress
  const claimed = progress.pointsClaimed ?? 0
  const target = Math.min(ATTRIBUTE_POINT_CAP_PER_STAGE, Math.floor(game.kills / 10) * game.stage)
  const gain = Math.max(0, target - claimed)
  if (!gain) return
  progress.pointsClaimed = target
  game.attributePoints = (game.attributePoints ?? 0) + gain
  toast(`获得 ${gain} 点属性点 · 本关 ${target} / ${ATTRIBUTE_POINT_CAP_PER_STAGE}`)
}
function makeGear(type: GearType, level: number): Gear {
  const values = gearStats(level)
  const names = gearNames[type]
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: names[Math.floor(Math.random() * names.length)],
    level,
    type,
    hp: type === 'armor' ? values.hp : 0,
    mp: type === 'weapon' ? values.mp : 0,
    attack: type === 'weapon' ? values.attack : 0,
    defense: type === 'armor' ? values.defense : 0,
  }
}
function gearDropLevel(): number {
  if (!game) return 0
  for (let candidate = game.stage; candidate >= 1; candidate -= 1) {
    const chance = Math.max(0, .06 - candidate * .01)
    if (Math.random() < chance) return candidate
  }
  return 0
}
function dropGear(boss: boolean) {
  if (!game) return
  const drops: GearType[] = []
  if (boss) {
    if (Math.random() < .7) drops.push(Math.random() < .5 ? 'weapon' : 'armor')
  } else {
    // 小怪：武器 5%、护甲 5%，两者独立判定。
    if (Math.random() < .05) drops.push('weapon')
    if (Math.random() < .05) drops.push('armor')
  }
  for (const type of drops) {
    const level = boss ? game.stage : gearDropLevel()
    if (!level) continue
    const gear = makeGear(type, level)
    game.gear.unshift(gear)
    toast(`${boss ? 'Boss' : '小怪'}掉落：${level} 级${type === 'weapon' ? '武器' : '护甲'}「${gear.name}」`)
    setLog(`${gear.name}已放入背包，穿戴后生效。`)
  }
}
function dropPotions(x: number) {
  if (!game) return
  for (const type of ['hp-potion', 'mp-potion'] as const) {
    if (Math.random() < POTION_DROP_CHANCE) game.drops!.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, x: Math.max(MAP_LEFT, Math.min(unlockedWidth - 35, x)) })
  }
}
function pickupDrop() {
  if (!game || scene !== 'battle') return
  const nearest = game.drops?.map((drop) => ({ drop, distance: Math.abs(drop.x - heroX) })).filter((entry) => entry.distance <= 105).sort((a, b) => a.distance - b.distance)[0]
  if (!nearest) { toast('附近没有可拾取的药水。'); return }
  game.drops = game.drops!.filter((drop) => drop.id !== nearest.drop.id)
  if (nearest.drop.type === 'hp-potion') {
    const recovered = Math.min(stats().hp - game.hp, Math.ceil(stats().hp * .35))
    game.hp = Math.min(stats().hp, game.hp + recovered)
    setLog(`拾取并使用血瓶，恢复 ${recovered} 点生命。`)
  } else {
    const recovered = Math.min(stats().mp - game.mp, Math.ceil(stats().mp * .35))
    game.mp = Math.min(stats().mp, game.mp + recovered)
    setLog(`拾取并使用蓝瓶，恢复 ${recovered} 点法力。`)
  }
  playSfx('potion')
  syncHud(); save()
}
function allocateAttribute(stat: AttributeStat) {
  if (!game || scene !== 'town') { toast('只能在冒险者小镇分配属性点。'); return }
  if ((game.attributePoints ?? 0) <= 0) { toast('没有可用的属性点。'); return }
  const before = stats()
  game.attributeAllocation ??= { hp: 0, attack: 0, mp: 0, defense: 0 }
  game.attributeAllocation[stat] += 1
  game.attributePoints = (game.attributePoints ?? 0) - 1
  const after = stats()
  if (stat === 'hp') game.hp = Math.min(after.hp, game.hp + after.hp - before.hp)
  if (stat === 'mp') game.mp = Math.min(after.mp, game.mp + after.mp - before.mp)
  save(); attributesOpen = true; renderGame()
}
function equip(id: string) {
  if (!game || scene !== 'town') { toast('请回到小镇后更换装备。'); return }
  const gear = game.gear.find((entry) => entry.id === id)
  if (!gear) return
  const before = stats()
  game.equipped = id
  if (gear.type === 'weapon') game.weaponId = id
  if (gear.type === 'armor') game.armorId = id
  if (!gear.type) { game.weaponId = null; game.armorId = null }
  const after = stats()
  game.hp = Math.min(after.hp, game.hp + after.hp - before.hp)
  game.mp = Math.min(after.mp, game.mp + after.mp - before.mp)
  save(); renderGame(); bagOpen = true; renderGame(); toast(`已装备 ${gear.name}`)
}
function synthesizeGear(type: GearType, level: number) {
  if (!game || scene !== 'town') { toast('请回到小镇后合成装备。'); return }
  const worn = new Set([game.weaponId, game.armorId])
  const matches = game.gear.filter((entry) => entry.type === type && entry.level === level && !worn.has(entry.id))
  if (matches.length < 5) { toast('合成需要 5 件同品类、同等级且未穿戴的装备。'); return }
  const consumed = new Set(matches.slice(0, 5).map((entry) => entry.id))
  game.gear = game.gear.filter((entry) => !consumed.has(entry.id))
  const result = makeGear(type, level + 1)
  game.gear.unshift(result)
  save(); renderGame(); craftingOpen = true; renderGame()
  toast(`合成成功：${result.name} · ${result.level} 级`)
}
function continueCurrentProgress() {
  if (!game || scene !== 'town' || game.kills <= 0 || game.bossDefeated) return
  scene = 'battle'; game.town = false; game.dead = false; paused = false
  heroX = 480; heroY = 0; velocityY = 0; grounded = true
  projectiles = []; foeShots = []; effects = []; burst = 0; burstTargetId = null; enterBattlefield(); save(); renderGame()
}
function retreatToTown() {
  if (!game) return
  paused = false
  scene = 'town'; game.town = true; game.dead = false; game.hp = Math.max(1, Math.round(stats().hp * .55)); game.mp = stats().mp
  heroX = 480; cameraX = 0
  foes = []; projectiles = []; foeShots = []; burst = 0; burstTargetId = null; bagOpen = false; save(); renderGame()
}
function resumeBattle() {
  if (!game) return
  paused = false
  scene = 'battle'; game.town = false; game.dead = false; game.hp = Math.max(1, Math.round(stats().hp * .5)); game.mp = Math.min(stats().mp, game.mp)
  heroX = 480; heroY = 0; velocityY = 0; grounded = true; projectiles = []; foeShots = []; burst = 0; burstTargetId = null; enterBattlefield(); save(); renderGame()
}
async function enterLandscape() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.()
  } catch { /* 部分浏览器不支持全屏 */ }
  try {
    const orientation = (screen as Screen & { orientation?: { lock?: (value: string) => Promise<void> } }).orientation
    await orientation?.lock?.('landscape')
    toast('已进入横屏模式。')
  } catch {
    toast('请把手机横过来，并关闭竖屏锁定。')
  }
}
function performAction(name: string, target: HTMLElement) {
  if (name === 'landscape') { void enterLandscape(); return }
  if (name === 'toggle-audio') {
    const on = toggleAudio()
    toast(on ? '音效与音乐已开启。' : '音效与音乐已关闭。')
    document.querySelectorAll<HTMLElement>('[data-action="toggle-audio"]').forEach((button) => {
      if (button.dataset.audioLabel !== undefined) button.textContent = on ? '音效：开' : '音效：关'
      else button.textContent = on ? '♪' : '×'
    })
    return
  }
  if (name === 'auth-tab' && target.dataset.tab) {
    authView = target.dataset.tab === 'register' ? 'register' : 'login'
    authMessage = ''
    renderAuth()
    return
  }
  if (name === 'auth-forgot') { authView = 'forgot'; authMessage = ''; renderAuth(); return }
  if (name === 'offline-play') { playOffline(); return }
  if (name === 'login') { authState = 'auth'; authView = 'login'; authMessage = ''; renderAuth(); return }
  if (name === 'logout') { logoutAccount(); return }
  if (name === 'role') createRole(target.dataset.role as Role)
  if (name === 'resume' && target.dataset.slot) {
    const slot = saveSlots.find((entry) => entry.id === target.dataset.slot)
    if (slot) { activeSlotId = slot.id; start(slot.data.role, slot.data) }
  }
  if (name === 'role-select' && game) {
    save()
    scene = 'title'; paused = false; pendingRole = null; foes = []; projectiles = []; foeShots = []; bagOpen = false; craftingOpen = false; attributesOpen = false
    saveSlots = readSaves()
    renderTitle()
  }
  if (name === 'delete-slot' && target.dataset.slot) deleteSaveSlot(target.dataset.slot)
  if (name === 'cancel-delete') { pendingDeleteId = null; document.querySelector('.delete-confirm')?.remove() }
  if (name === 'confirm-delete') confirmDeleteSave()
  if (name === 'overwrite-slot' && pendingRole && target.dataset.slot) createRole(pendingRole, target.dataset.slot)
  if (name === 'cancel-new') { pendingRole = null; renderTitle() }
  if (name === 'open-crafting' && scene === 'town') { bagOpen = false; attributesOpen = false; craftingOpen = true; renderGame() }
  if (name === 'close-crafting') { craftingOpen = false; renderGame() }
  if (name === 'open-attributes' && game && scene === 'town') { bagOpen = false; craftingOpen = false; attributesOpen = true; renderGame() }
  if (name === 'close-attributes') { attributesOpen = false; renderGame() }
  if (name === 'allocate-attr' && target.dataset.stat) {
    const stat = target.dataset.stat
    if (stat === 'hp' || stat === 'attack' || stat === 'mp' || stat === 'defense') allocateAttribute(stat)
  }
  if (name === 'continue-progress' && game && scene === 'town') continueCurrentProgress()
  if (name === 'continue-stage' && game && scene === 'town') beginStage(game.stage, 'continue')
  if (name === 'restart-stage' && game && scene === 'town') beginStage(game.stage, 'restart')
  if (name === 'challenge-boss' && game && scene === 'town') beginStage(game.stage, 'boss')
  if (name === 'attack') attack()
  if (name === 'jump') jump()
  if (name === 'skill') cast(Number(target.dataset.index))
  if (name === 'pause' && scene === 'battle') { paused = !paused; keys.clear(); renderGame() }
  if (name === 'bag') { bagOpen = true; craftingOpen = false; attributesOpen = false; renderGame() }
  if (name === 'close-bag') { bagOpen = false; renderGame() }
  if (name === 'equip' && target.dataset.id) equip(target.dataset.id)
  if (name === 'synthesize-group' && target.dataset.type && target.dataset.level) synthesizeGear(target.dataset.type as GearType, Number(target.dataset.level))
  if (name === 'enter-stage' && game) {
    const selected = Number(document.querySelector<HTMLSelectElement>('#stage-select')?.value ?? game.stage)
    beginStage(Math.max(1, Math.min(game.unlockedStage, selected)))
  }
  if (name === 'respawn-town') retreatToTown()
  if (name === 'respawn-fight') resumeBattle()
  if (name === 'town' && game) { scene = 'town'; game.town = true; heroX = 480; cameraX = 0; foes = []; save(); renderGame() }
  if (name === 'save') { save(); toast('远征进度已保存。') }
}
app.addEventListener('click', (event) => {
  const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-action]') : null
  if (target && !target.hasAttribute('disabled')) {
    playSfx('ui')
    performAction(target.dataset.action ?? '', target)
  }
})
window.addEventListener('pointerdown', () => { void unlockAudio() }, { once: true })
window.addEventListener('keydown', () => { void unlockAudio() }, { once: true })
app.addEventListener('submit', (event) => {
  if ((event.target as HTMLElement | null)?.id !== 'auth-form') return
  event.preventDefault()
  void submitAuth()
})
app.addEventListener('pointerdown', (event) => {
  const button = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-move]') : null
  if (button?.dataset.move) keys.add(button.dataset.move === 'left' ? 'arrowleft' : 'arrowright')
})
app.addEventListener('change', (event) => {
  if ((event.target as HTMLElement).id === 'stage-select' && game) {
    game.stage = Number((event.target as HTMLSelectElement).value)
    const progress = getStageProgress(game.stage)
    game.kills = progress.kills
    game.bossDefeated = progress.bossDefeated
    save(); renderGame()
  }
})
window.addEventListener('pointerup', () => { keys.delete('arrowleft'); keys.delete('arrowright') })
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase()
  if (attributesOpen && key === 'escape') { attributesOpen = false; renderGame(); return }
  if (craftingOpen && key === 'escape') { craftingOpen = false; renderGame(); return }
  if (pendingDeleteId && key === 'escape') { pendingDeleteId = null; document.querySelector('.delete-confirm')?.remove(); return }
  if ([' ', 'arrowleft', 'arrowright', 'arrowup'].includes(key)) event.preventDefault()
  if (key === 'p' && scene === 'battle') { paused = !paused; keys.clear(); renderGame(); return }
  if (paused) return
  keys.add(key)
  if (event.repeat) return
  if (key === 'j') attack()
  if (key === 's') pickupDrop()
  if (key === 'k') jump()
  const index = ['1', '2', '3', '4'].indexOf(key); if (index >= 0) cast(index)
})
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()))
window.addEventListener('blur', () => keys.clear())
function setupCanvas() {
  canvas = document.querySelector<HTMLCanvasElement>('#arena')
  if (!canvas) return
  canvas.width = world.width; canvas.height = world.height; ctx = canvas.getContext('2d')
}
function update(dt: number) {
  shake = Math.max(0, shake - dt * 30)
  if (paused) return
  if (scene !== 'battle') cameraX = 0
  if (scene === 'town' && game) {
    const left = keys.has('a') || keys.has('arrowleft')
    const right = keys.has('d') || keys.has('arrowright')
    if (left !== right) {
      const direction = right ? 1 : -1
      heroX = Math.max(TOWN_LEFT, Math.min(TOWN_RIGHT, heroX + direction * 220 * dt))
      facing = direction
    }
    heroY = 0; velocityY = 0; grounded = true; jumpCount = 0
    cameraX = 0
  }
  if (scene === 'battle' && game) {
    attackWait = Math.max(0, attackWait - dt); attackSwing = Math.max(0, attackSwing - dt); buffTime = Math.max(0, buffTime - dt)
    skillWait = skillWait.map((time) => Math.max(0, time - dt)); game.mp = Math.min(stats().mp, game.mp + dt * 4)
    const left = keys.has('a') || keys.has('arrowleft'); const right = keys.has('d') || keys.has('arrowright')
    if (left !== right) { const d = right ? 1 : -1; heroX = clampHeroX(heroX + d * 245 * dt); facing = d }
    if (keys.has('j') && attackWait <= 0) attack()
    if (!grounded) {
      heroY += velocityY * dt; velocityY += 1450 * dt
      if (heroY >= 0) { heroY = 0; velocityY = 0; grounded = true; jumpCount = 0 }
    }
    const stageIndex = Math.max(0, Math.min(9, game.stage - 1))
    const rangedConfig = BOSS_RANGED[stageIndex]
    const dashConfig = bossDashConfig(game.stage)
    for (const foe of [...foes]) {
      foe.flash = Math.max(0, foe.flash - dt)
      foe.attackAnim = Math.max(0, foe.attackAnim - dt)
      if ((foe.stunTimer ?? 0) > 0) {
        foe.stunTimer = Math.max(0, (foe.stunTimer ?? 0) - dt)
        if (foe.stunTimer === 0) foe.skillTimer = Math.max(foe.skillTimer, .5)
        continue
      }
      const distance = heroX - foe.x
      const directionToHero = Math.sign(distance) || 1
      if (foe.boss && foe.dashWindup !== undefined) {
        foe.dashWindup -= dt
        if (foe.dashWindup <= 0) {
          const startX = foe.x
          foe.x = Math.max(MAP_LEFT, Math.min(unlockedWidth - 30, foe.x + (foe.dashDirection ?? directionToHero) * dashConfig.speed))
          foe.dashWindup = undefined
          foe.attackAnim = .35
          addFx(bossFx('dash'), (startX + foe.x) / 2, world.floor - 70, foe.dashDirection ?? directionToHero, .55)
          if (Math.abs(heroX - foe.x) < 105 && (grounded || heroY > -35)) {
            game.hp = Math.max(0, game.hp - foeDamage(foe, true))
            addFx('hurt', heroX, world.floor - 68, 1, .32)
            addShake(9)
            playSfx('hurt')
            setLog('守关者冲刺命中 · 提前后退或跳跃可躲避。')
          } else setLog('守关者冲刺落空！')
        }
      } else if (foe.boss && foe.rangedWindup !== undefined) {
        foe.rangedWindup -= dt
        if (foe.rangedWindup <= 0) {
          foe.rangedWindup = undefined
          if (rangedConfig) fireBossVolley(foe, rangedConfig)
          foe.rangedTimer = rangedConfig?.interval ?? 3.5
          foe.attackAnim = .35
        }
      } else if (foe.boss && rangedConfig && foe.rangedTimer <= 0) {
        foe.rangedWindup = .62; foe.rangedTimer = rangedConfig.interval + .62; foe.flash = .18; foe.attackAnim = .5
        playSfx('boss')
        addFx(bossFx('ranged'), foe.x, world.floor - 110, directionToHero, .62)
        addSparks(foe.x, world.floor - 120, 8, [BOSS_THEME_COLORS[BOSS_THEMES[stageIndex]] ?? '#d78fb4'], 100)
        setLog('守关者正在凝聚远程攻击，准备跳跃或走位！')
      } else if (foe.boss && foe.skillTimer <= 0 && Math.abs(distance) < 470) {
        foe.dashWindup = .72; foe.dashDirection = directionToHero; foe.skillTimer = dashConfig.cooldown; foe.flash = .18; foe.attackAnim = .5
        playSfx('boss')
        addFx(bossFx('charge'), foe.x, world.floor - 72, directionToHero, .72)
        setLog('守关者正在蓄力冲刺，拉开距离或跳跃躲避！')
      } else {
        foe.skillTimer -= dt
        foe.rangedTimer = Math.max(0, foe.rangedTimer - dt)
        if (Math.abs(distance) > 78) foe.x = Math.max(MAP_LEFT, Math.min(unlockedWidth - 30, foe.x + directionToHero * Math.min(Math.abs(distance) - 78, (foe.boss ? 44 : 82) * dt)))
        foe.timer -= dt
        if (Math.abs(distance) < (foe.boss ? 138 : 112) && foe.timer <= 0 && (grounded || heroY > -36)) {
          const damage = foeDamage(foe)
          game.hp = Math.max(0, game.hp - damage); foe.timer = foe.boss ? Math.max(1, 1.5 - game.stage * .035) : 1.7 + Math.random() * .5
          foe.attackAnim = .35
          playSfx(foe.boss ? 'boss' : 'slash')
          playSfx('hurt')
          const theme = STAGE_THEMES[stageIndex]
          addFx(foe.boss ? bossFx('melee') : 'enemy-swipe', heroX, world.floor - 65, -directionToHero, .38)
          addSparks(heroX, world.floor - 60, foe.boss ? 8 : 5, [theme.accent, theme.glow], foe.boss ? 150 : 110)
          if (foe.flying) addSparks(foe.x, foeWorldY(foe), 6, [theme.light, theme.accent], 100)
          effects.push({ kind: 'damage-number', x: heroX, y: world.floor - 112, life: .82, duration: .82, text: `-${damage}` })
          addShake(foe.boss ? 8 : 3)
          if (game.hp <= 0) { scene = 'defeat'; paused = false; game.dead = true; save(); renderGame(); break }
        }
      }
    }
    if (scene === 'battle' && waveReady && foes.length === 0 && heroX >= waveTriggerX) {
      waveReady = false
      if (bossPending) {
        bossPending = false
        foes = [spawnFoe(Math.min(unlockedWidth - 100, heroX + 360), true)]
        setLog('守关者出现！')
        addShake(6)
      } else {
        spawnCurrentWave()
      }
    }
    for (const projectile of [...projectiles]) {
      const target = foes.find((foe) => foe.id === projectile.targetId)
      if (target) {
        const distance = target.x - projectile.x
        projectile.x += Math.sign(distance) * Math.min(Math.abs(distance), Math.abs(projectile.vx) * dt)
      } else projectile.x += projectile.vx * dt
      projectile.life -= dt
      if (!target || projectile.life <= 0 || Math.abs(target.x - projectile.x) < 22 || projectile.x < MAP_LEFT - 100 || projectile.x > unlockedWidth + 100) {
        if (target) strike(target, projectile.damage, '法杖光弹')
        projectiles = projectiles.filter((entry) => entry !== projectile)
      }
    }
    for (const shot of [...foeShots]) {
      shot.x += shot.vx * dt
      shot.y += shot.vy * dt
      shot.life -= dt
      const heroBottom = world.floor + heroY
      const heroTop = heroBottom - 70
      if (Math.abs(shot.x - heroX) < 24 && shot.y > heroTop && shot.y < heroBottom + 6) {
        game.hp = Math.max(0, game.hp - shot.damage)
        effects.push({ kind: 'damage-number', x: heroX, y: world.floor - 112, life: .82, duration: .82, text: `-${shot.damage}`, damage: shot.damage })
        addFx('hurt', heroX, world.floor - 68, 1, .32)
        addShake(7)
        playSfx('hurt')
        foeShots = foeShots.filter((entry) => entry !== shot)
        if (game.hp <= 0) { scene = 'defeat'; paused = false; game.dead = true; save(); renderGame(); break }
      } else if (shot.life <= 0 || shot.x < MAP_LEFT - 60 || shot.x > unlockedWidth + 60 || shot.y < -40 || shot.y > world.height + 40) {
        foeShots = foeShots.filter((entry) => entry !== shot)
      }
    }
    if (burst > 0) {
      burstWait -= dt
      if (burstWait <= 0) {
        burstWait = .08
        const target = foes.find((foe) => foe.id === burstTargetId)
        if (target) {
          burst -= 1
          strike(target, stats().attack, `能量禁锢 ${5 - burst} / 5`)
          addFx('energy-prison-hit', target.x, world.floor - (target.boss ? 120 : 72), 1, .32)
          addSparks(target.x, world.floor - (target.boss ? 110 : 62), 5, ['#a8e0d0', '#e8ffe8'], 130)
          if (burst <= 0) burstTargetId = null
        } else { burst = 0; burstTargetId = null }
      }
    }
    updateCamera()
    syncHud()
  }
  for (const fx of effects) {
    if (fx.kind !== 'spark') continue
    fx.x += (fx.vx ?? 0) * dt
    fx.y += (fx.vy ?? 0) * dt
    fx.vy = (fx.vy ?? 0) + 420 * dt
  }
  effects = effects.filter((fx) => (fx.life -= dt) > 0)
  noticeTime = Math.max(0, noticeTime - dt)
}
function drawBackground(c: CanvasRenderingContext2D) {
  const town = scene === 'town'
  const stageIndex = Math.max(0, Math.min(9, (game?.stage ?? 1) - 1))
  const bg = town ? TOWN_BACKGROUND : STAGE_BACKGROUNDS[stageIndex]
  const gradient = c.createLinearGradient(0, 0, 0, world.height)
  gradient.addColorStop(0, bg.skyTop); gradient.addColorStop(.58, bg.skyMid); gradient.addColorStop(1, bg.skyLow)
  c.fillStyle = gradient; c.fillRect(0, 0, world.width, world.height)
  const orbX = town ? 760 : 760 - ((cameraX * .04) % 600)
  c.save(); c.shadowColor = bg.orb; c.shadowBlur = 24; c.globalAlpha = .82; c.fillStyle = bg.orb
  c.beginPath(); c.arc(orbX, 116, town ? 34 : 39, 0, Math.PI * 2); c.fill(); c.restore()
  if (!town && stageIndex === 9) {
    c.fillStyle = 'rgba(220, 210, 255, .55)'
    for (let i = 0; i < 70; i++) {
      const x = ((((i * 137 + 53) - cameraX * .12) % world.width) + world.width) % world.width
      c.fillRect(x, 18 + ((i * 73) % 180), 2, 2)
    }
  }
  const drawHillLayer = (parallax: number, color: string, points: Array<[number, number]>) => {
    const offset = -((cameraX * parallax) % world.width)
    c.fillStyle = color
    for (let copy = -1; copy <= 1; copy++) {
      c.save(); c.translate(offset + copy * world.width, 0)
      c.beginPath(); c.moveTo(points[0][0], points[0][1])
      for (let i = 1; i < points.length; i++) c.lineTo(points[i][0], points[i][1])
      c.lineTo(world.width, 404); c.lineTo(0, 404); c.closePath(); c.fill()
      c.restore()
    }
  }
  drawHillLayer(.18, bg.far, [[0, 320], [125, 201], [240, 279], [388, 166], [548, 294], [692, 215], [830, 296], [960, 320]])
  drawHillLayer(.45, bg.near, [[0, 345], [145, 270], [273, 333], [425, 251], [573, 342], [722, 267], [865, 334], [960, 345]])
  c.fillStyle = bg.ground; c.fillRect(0, world.floor, world.width, 90)
  c.fillStyle = bg.line; c.fillRect(0, world.floor, world.width, 6)
  c.fillStyle = 'rgba(201, 189, 129, .28)'
  const pebbleOffset = -((cameraX * .5) % world.width)
  for (let n = 0; n < 48; n++) {
    const x = (((n * 87 + 13 + pebbleOffset) % world.width) + world.width) % world.width
    c.fillRect(x, 411 + (n * 37) % 63, 3, 2)
  }
  if (town) drawTownBackdrop(c, bg)
  else drawStageBackdrop(c, stageIndex, bg)
}
function drawStageBackdrop(c: CanvasRenderingContext2D, stageIndex: number, bg: BackgroundTheme) {
  const offset = -((cameraX * .28) % world.width)
  const layer = (draw: (x: number) => void) => { for (const copy of [-1, 0, 1]) { c.save(); c.translate(offset + copy * world.width, 0); draw(0); c.restore() } }
  if (stageIndex === 0) {
    layer(() => {
      c.fillStyle = bg.far
      for (const x of [90, 310, 720]) { c.fillRect(x, 300, 8, 90); c.beginPath(); c.arc(x + 4, 292, 30, 0, Math.PI * 2); c.fill() }
      c.globalAlpha = .55; c.fillStyle = bg.accent
      for (let i = 0; i < 24; i++) { const x = (i * 211 + 37) % 960; const y = 180 + (i * 53) % 150; c.beginPath(); c.arc(x, y, 1.5, 0, Math.PI * 2); c.fill() }
      c.globalAlpha = 1
    })
  } else if (stageIndex === 1) {
    layer(() => {
      c.fillStyle = bg.line
      for (const [x, h] of [[120, 70], [380, 110], [760, 85]]) { c.beginPath(); c.moveTo(x - 24, 360); c.lineTo(x, 360 - h); c.lineTo(x + 24, 360); c.closePath(); c.fill() }
      c.fillStyle = 'rgba(230, 251, 255, .45)'
      for (let i = 0; i < 30; i++) c.fillRect((i * 157 + 20) % 960, 120 + (i * 41) % 220, 2, 2)
    })
  } else if (stageIndex === 2) {
    layer(() => {
      c.fillStyle = bg.far; c.beginPath(); c.moveTo(620, 372); c.lineTo(760, 218); c.lineTo(824, 282); c.lineTo(920, 372); c.closePath(); c.fill()
      c.fillStyle = bg.accent; c.globalAlpha = .55
      for (let i = 0; i < 26; i++) { const x = (i * 173 + 60) % 960; const y = 150 + (i * 67) % 200; c.beginPath(); c.arc(x, y, 1.6, 0, Math.PI * 2); c.fill() }
      c.globalAlpha = 1
    })
  } else if (stageIndex === 3) {
    layer(() => {
      c.strokeStyle = bg.line; c.lineWidth = 2; c.globalAlpha = .4
      for (let i = 0; i < 8; i++) { const y = 150 + i * 24; c.beginPath(); c.moveTo(40 + i * 30, y); c.lineTo(220 + i * 30, y - 10); c.stroke() }
      c.strokeStyle = bg.accent; c.globalAlpha = .6; c.lineWidth = 2.5
      c.beginPath(); c.moveTo(640, 150); c.lineTo(690, 210); c.lineTo(665, 218); c.lineTo(720, 280); c.stroke()
      c.globalAlpha = 1
    })
  } else if (stageIndex === 4) {
    layer(() => {
      c.strokeStyle = bg.line; c.lineWidth = 2; c.globalAlpha = .45
      for (let i = 0; i < 4; i++) { const y = 320 + i * 16; c.beginPath(); c.moveTo(620 - i * 30, y); c.quadraticCurveTo(700, y - 8, 800 + i * 20, y); c.stroke() }
      c.fillStyle = bg.far
      for (const x of [80, 900]) { c.fillRect(x, 250, 5, 140); c.beginPath(); c.ellipse(x + 4, 250, 12, 34, .25, 0, Math.PI * 2); c.fill() }
      c.globalAlpha = 1
    })
  } else if (stageIndex === 5) {
    layer(() => {
      c.fillStyle = bg.accent; c.globalAlpha = .35
      for (const [x, y, s] of [[150, 180, 12], [470, 240, 8], [790, 160, 15]]) { c.save(); c.translate(x, y); c.rotate(.6); c.beginPath(); c.moveTo(0, -s); c.lineTo(s * .6, 0); c.lineTo(0, s); c.lineTo(-s * .6, 0); c.closePath(); c.fill(); c.restore() }
      c.globalAlpha = 1
    })
  } else if (stageIndex === 6) {
    layer(() => {
      c.strokeStyle = bg.line; c.lineWidth = 3; c.globalAlpha = .5
      for (const x of [130, 760]) { c.beginPath(); c.moveTo(x, 372); c.lineTo(x + 4, 260); c.lineTo(x - 24, 220); c.moveTo(x + 4, 280); c.lineTo(x + 34, 240); c.stroke() }
      c.fillStyle = 'rgba(216, 210, 192, .4)'
      for (let i = 0; i < 26; i++) c.fillRect((i * 191 + 30) % 960, 120 + (i * 47) % 230, 2, 2)
      c.globalAlpha = 1
    })
  } else if (stageIndex === 7) {
    layer(() => {
      c.fillStyle = bg.far
      for (const [x, h] of [[160, 95], [540, 140], [840, 110]]) { c.beginPath(); c.moveTo(x - 30, 372); c.lineTo(x, 372 - h); c.lineTo(x + 20, 300); c.lineTo(x + 34, 372); c.closePath(); c.fill() }
      c.fillStyle = 'rgba(236, 100, 100, .22)'; c.beginPath(); c.ellipse(740, 320, 170, 30, 0, 0, Math.PI * 2); c.fill()
    })
  } else if (stageIndex === 8) {
    layer(() => {
      c.strokeStyle = bg.accent; c.lineWidth = 2; c.globalAlpha = .35
      for (let i = 0; i < 7; i++) { const x = 620 + i * 40; c.beginPath(); c.moveTo(x, 150); c.lineTo(x - 80, 372); c.stroke() }
      c.fillStyle = bg.far
      for (const x of [180, 420, 860]) { c.fillRect(x, 240, 18, 150); c.fillRect(x - 8, 232, 34, 10) }
      c.globalAlpha = 1
    })
  } else {
    layer(() => {
      c.strokeStyle = bg.accent; c.globalAlpha = .28; c.lineWidth = 2
      for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(300 + i * 220, 210 + i * 30, 130, 36, .5, 0, Math.PI * 2); c.stroke() }
      c.fillStyle = bg.accent
      for (let i = 0; i < 22; i++) { const a = performance.now() / 3200 + (i * Math.PI * 2) / 22; c.beginPath(); c.arc(480 + Math.cos(a) * 300, 200 + Math.sin(a) * 70, 2, 0, Math.PI * 2); c.fill() }
      c.globalAlpha = 1
    })
  }
}
function drawTownBackdrop(c: CanvasRenderingContext2D, bg: BackgroundTheme) {
  // 房屋
  c.fillStyle = bg.far; c.fillRect(48, 286, 150, 104)
  c.fillStyle = bg.near; c.beginPath(); c.moveTo(34, 288); c.lineTo(123, 232); c.lineTo(212, 288); c.closePath(); c.fill()
  c.fillStyle = bg.accent; c.globalAlpha = .55; c.fillRect(76, 316, 24, 26); c.fillRect(130, 316, 24, 26); c.globalAlpha = 1
  // 属性祭坛
  c.fillStyle = bg.far; c.fillRect(252, 342, 74, 14); c.fillRect(274, 316, 30, 30)
  c.save(); c.shadowColor = bg.accent; c.shadowBlur = 16; c.fillStyle = bg.accent; c.beginPath(); c.moveTo(289, 286); c.lineTo(300, 312); c.lineTo(289, 334); c.lineTo(278, 312); c.closePath(); c.fill(); c.restore()
  // 合成台与熔炉
  c.fillStyle = '#3d3328'; c.fillRect(648, 320, 116, 54); c.fillStyle = '#6b5a40'; c.fillRect(660, 332, 92, 12); c.fillRect(676, 344, 60, 10)
  const glow = c.createRadialGradient(704, 352, 4, 704, 352, 56); glow.addColorStop(0, 'rgba(244, 198, 112, .35)'); glow.addColorStop(1, 'rgba(244, 198, 112, 0)')
  c.fillStyle = glow; c.beginPath(); c.arc(704, 352, 56, 0, Math.PI * 2); c.fill()
  c.fillStyle = bg.accent; c.fillRect(694, 352, 20, 10)
  // 关卡传送门
  c.fillStyle = bg.far; c.fillRect(812, 246, 14, 144); c.fillRect(894, 246, 14, 144); c.fillRect(812, 238, 96, 12)
  c.save(); c.shadowColor = bg.accent; c.shadowBlur = 18; c.strokeStyle = bg.accent; c.globalAlpha = .55; c.lineWidth = 4
  c.beginPath(); c.ellipse(860, 322, 28, 58, 0, 0, Math.PI * 2); c.stroke(); c.restore()
  // 灯笼
  c.strokeStyle = bg.line; c.lineWidth = 1.5
  for (const x of [232, 470, 624]) { c.beginPath(); c.moveTo(x, 250); c.lineTo(x, 292); c.stroke(); c.save(); c.shadowColor = bg.accent; c.shadowBlur = 12; c.fillStyle = bg.accent; c.beginPath(); c.arc(x, 300, 5, 0, Math.PI * 2); c.fill(); c.restore() }
  // 树
  c.fillStyle = bg.far
  for (const x of [250, 930]) { c.fillRect(x, 300, 7, 90); c.beginPath(); c.arc(x + 3, 292, 26, 0, Math.PI * 2); c.fill() }
}
function currentStageTheme(): EnemyTheme {
  return STAGE_THEMES[Math.max(0, Math.min(9, (game?.stage ?? 1) - 1))]
}
function bodyGradient(c: CanvasRenderingContext2D, theme: EnemyTheme, top: number, bottom: number) {
  const gradient = c.createLinearGradient(0, top, 0, bottom)
  gradient.addColorStop(0, theme.light)
  gradient.addColorStop(.45, theme.body)
  gradient.addColorStop(1, theme.dark)
  return gradient
}
function glint(c: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  c.save(); c.shadowColor = color; c.shadowBlur = 10; c.fillStyle = color
  c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.fill(); c.restore()
}
function strokeShape(c: CanvasRenderingContext2D) {
  c.strokeStyle = 'rgba(9, 18, 16, .62)'; c.lineWidth = 1.4; c.stroke()
}
function drawHero(c: CanvasRenderingContext2D) {
  if (!game) return
  const jumpHeight = Math.max(0, Math.min(175, -heroY))
  const now = performance.now()
  const sway = Math.sin(now / 150) * (grounded ? 1.2 : 0)
  const walking = grounded && (keys.has('a') || keys.has('d') || keys.has('arrowleft') || keys.has('arrowright'))
  const walk = walking ? Math.sin(now / 90) : 0
  c.fillStyle = 'rgba(8, 17, 17, .36)'; c.beginPath(); c.ellipse(heroX, world.floor + 2, Math.max(14, 30 - jumpHeight * .045), 7, 0, 0, Math.PI * 2); c.fill()
  c.save(); c.translate(heroX, world.floor - jumpHeight + sway); c.scale(facing, 1); c.rotate(walk * .022)
  if (game.role === 'warrior') drawWarriorHero(c, now, walk)
  else drawMageHero(c, now, walk)
  c.restore()
}
function drawWarriorHero(c: CanvasRenderingContext2D, now: number, walk: number) {
  const capeWave = Math.sin(now / 260) * 3
  // 背后的圆盾
  c.fillStyle = '#6b4a2f'; c.strokeStyle = '#c6a967'; c.lineWidth = 2
  c.beginPath(); c.arc(-17, -46, 12, 0, Math.PI * 2); c.fill(); c.stroke()
  c.fillStyle = '#c6a967'; c.beginPath(); c.arc(-17, -46, 4, 0, Math.PI * 2); c.fill()
  // 披风
  const cape = c.createLinearGradient(0, -64, 0, -6); cape.addColorStop(0, '#a9433a'); cape.addColorStop(1, '#5f211f')
  c.fillStyle = cape; c.beginPath(); c.moveTo(-12, -62); c.quadraticCurveTo(-36, -40, -30 + capeWave, -6); c.lineTo(-10, -12); c.lineTo(8, -8); c.lineTo(12, -60); c.closePath(); c.fill()
  // 腿与靴子
  const legSwing = walk * 3
  c.fillStyle = '#263531'; c.fillRect(-13, -28, 10, 24 + legSwing); c.fillRect(3, -28, 10, 24 - legSwing)
  c.fillStyle = '#c3b893'; c.fillRect(-16, -6 + legSwing, 16, 6); c.fillRect(1, -6 - legSwing, 16, 6)
  // 胸甲
  const armor = c.createLinearGradient(0, -64, 0, -28); armor.addColorStop(0, '#9aa89b'); armor.addColorStop(.55, '#66786d'); armor.addColorStop(1, '#3c4d45')
  c.fillStyle = armor; c.beginPath(); c.moveTo(-15, -62); c.lineTo(15, -62); c.lineTo(13, -30); c.lineTo(-13, -30); c.closePath(); c.fill()
  c.strokeStyle = 'rgba(12, 22, 20, .55)'; c.lineWidth = 1.2; c.stroke()
  c.fillStyle = 'rgba(232, 236, 211, .22)'; c.beginPath(); c.moveTo(-9, -59); c.lineTo(2, -59); c.lineTo(-1, -34); c.lineTo(-10, -38); c.closePath(); c.fill()
  // 腰带
  c.fillStyle = '#5a3f2a'; c.fillRect(-14, -34, 28, 6); c.fillStyle = '#d0b16a'; c.fillRect(-3, -35, 6, 8)
  // 肩甲
  c.fillStyle = '#7f9085'; c.beginPath(); c.ellipse(-15, -58, 8, 6, -.25, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(15, -58, 8, 6, .25, 0, Math.PI * 2); c.fill()
  c.strokeStyle = 'rgba(12, 22, 20, .5)'; c.lineWidth = 1.2; c.stroke()
  // 手臂
  c.fillStyle = '#5a6a61'; c.fillRect(-21, -54, 7, 22); c.fillRect(14, -54, 7, 20)
  // 头部与头盔
  c.fillStyle = '#d8b48a'; c.fillRect(-10, -82, 20, 22)
  const helm = c.createLinearGradient(0, -92, 0, -72); helm.addColorStop(0, '#8d9c90'); helm.addColorStop(1, '#55665d')
  c.fillStyle = helm; c.beginPath(); c.moveTo(-13, -72); c.lineTo(-13, -86); c.quadraticCurveTo(0, -96, 13, -86); c.lineTo(13, -72); c.lineTo(8, -72); c.lineTo(8, -80); c.lineTo(-8, -80); c.lineTo(-8, -72); c.closePath(); c.fill()
  c.strokeStyle = 'rgba(12, 22, 20, .55)'; c.lineWidth = 1.2; c.stroke()
  c.fillStyle = '#6d7d72'; c.fillRect(-2, -84, 4, 12)
  c.fillStyle = '#26332e'; c.fillRect(-7, -78, 4, 2); c.fillRect(3, -78, 4, 2)
  c.fillStyle = '#a9433a'; c.beginPath(); c.moveTo(-4, -94); c.quadraticCurveTo(0, -104, 6, -95); c.quadraticCurveTo(2, -99, -4, -94); c.fill()
  // 剑
  c.save(); c.translate(15, -54); if (attackSwing > 0) c.rotate(-.8)
  c.fillStyle = '#d1b06a'; c.fillRect(-2, -4, 5, 12)
  c.fillStyle = '#c6a967'; c.fillRect(-7, -6, 14, 4)
  const blade = c.createLinearGradient(0, -8, 48, -8); blade.addColorStop(0, '#f3f5e8'); blade.addColorStop(.5, '#c9d2c4'); blade.addColorStop(1, '#eef2df')
  c.fillStyle = blade; c.beginPath(); c.moveTo(2, -5); c.lineTo(44, -2); c.lineTo(49, 0); c.lineTo(44, 3); c.lineTo(2, 4); c.closePath(); c.fill()
  c.fillStyle = 'rgba(255, 255, 255, .65)'; c.fillRect(6, -2, 32, 1.5)
  c.restore()
}
function drawMageHero(c: CanvasRenderingContext2D, now: number, walk: number) {
  const pulse = .7 + Math.sin(now / 260) * .3
  const wave = Math.sin(now / 220) * 2
  // 披风
  const cape = c.createLinearGradient(0, -64, 0, -4); cape.addColorStop(0, '#2f6b60'); cape.addColorStop(1, '#183a35')
  c.fillStyle = cape; c.beginPath(); c.moveTo(-12, -62); c.quadraticCurveTo(-30, -36, -26 + wave, -6); c.lineTo(-4, -12); c.lineTo(10, -8); c.lineTo(12, -60); c.closePath(); c.fill()
  // 长袍
  const robe = c.createLinearGradient(0, -66, 0, -4); robe.addColorStop(0, '#5a9c8c'); robe.addColorStop(.55, '#3d7a6c'); robe.addColorStop(1, '#244d45')
  c.fillStyle = robe; c.beginPath(); c.moveTo(-14, -60); c.lineTo(14, -60); c.lineTo(22, -6); c.lineTo(-22, -6); c.closePath(); c.fill()
  c.strokeStyle = 'rgba(10, 24, 21, .55)'; c.lineWidth = 1.2; c.stroke()
  c.strokeStyle = '#c9b273'; c.lineWidth = 2; c.beginPath(); c.moveTo(-18, -10); c.lineTo(18, -10); c.stroke()
  c.fillStyle = 'rgba(201, 229, 213, .18)'; c.beginPath(); c.moveTo(-5, -58); c.lineTo(6, -58); c.lineTo(10, -14); c.lineTo(-8, -14); c.closePath(); c.fill()
  c.fillStyle = '#c9b273'; c.fillRect(-14, -38, 28, 4)
  // 脚
  c.fillStyle = '#2a2f2a'; c.fillRect(-12 + walk * 2, -6, 10, 6); c.fillRect(3 - walk * 2, -6, 10, 6)
  // 兜帽
  const hood = c.createLinearGradient(0, -94, 0, -62); hood.addColorStop(0, '#4f8a7c'); hood.addColorStop(1, '#2b5a50')
  c.fillStyle = hood; c.beginPath(); c.moveTo(-14, -62); c.quadraticCurveTo(-16, -88, 0, -96); c.quadraticCurveTo(16, -88, 14, -62); c.closePath(); c.fill()
  c.strokeStyle = 'rgba(10, 24, 21, .55)'; c.lineWidth = 1.2; c.stroke()
  c.fillStyle = '#162925'; c.beginPath(); c.ellipse(0, -73, 9, 11, 0, 0, Math.PI * 2); c.fill()
  glint(c, -4, -74, 1.8, '#bff2df'); glint(c, 4, -74, 1.8, '#bff2df')
  c.fillStyle = '#b9e0d2'; c.beginPath(); c.moveTo(0, -63); c.lineTo(3, -58); c.lineTo(0, -53); c.lineTo(-3, -58); c.closePath(); c.fill()
  // 法杖（攻击/施法时整体挥动）
  c.save(); c.translate(18, -8)
  if (attackSwing > 0) c.rotate(-.42)
  c.strokeStyle = '#7a5a35'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(5, -54); c.stroke()
  c.fillStyle = '#c9b273'; c.fillRect(1, -22, 6, 3); c.fillRect(3, -42, 6, 3)
  const orbX = 6; const orbY = -60
  c.save(); c.shadowColor = '#b9e0d2'; c.shadowBlur = 12 + (buffTime > 0 ? 10 : 0) + pulse * 4
  c.fillStyle = buffTime > 0 ? '#d9fff0' : '#b9e0d2'; c.beginPath(); c.arc(orbX, orbY, 6 + pulse, 0, Math.PI * 2); c.fill()
  c.fillStyle = 'rgba(255, 255, 255, .8)'; c.beginPath(); c.arc(orbX - 2, orbY - 2, 2, 0, Math.PI * 2); c.fill(); c.restore()
  c.fillStyle = 'rgba(201, 229, 213, .55)'
  for (let i = 0; i < 3; i++) { const angle = now / 900 + (i * Math.PI * 2) / 3; c.beginPath(); c.arc(orbX + Math.cos(angle) * 13, orbY + Math.sin(angle) * 8, 1.6, 0, Math.PI * 2); c.fill() }
  c.restore()
}
function drawFoe(c: CanvasRenderingContext2D, foe: Foe) {
  const theme = currentStageTheme()
  const index = Math.max(0, Math.min(9, (game?.stage ?? 1) - 1))
  const scale = foe.boss ? 2.25 : 1
  const dir = heroX <= foe.x ? -1 : 1
  const now = performance.now()
  const flyHeight = foe.flying ? (foe.flyHeight ?? 0) : 0
  const attackPhase = foe.attackAnim > 0 ? Math.min(1, 1 - foe.attackAnim / .5) : 0
  const lunge = Math.sin(attackPhase * Math.PI) * (foe.boss ? 12 : 6)
  const bob = Math.sin(now / (foe.flying ? 240 : 420) + foe.id * 1.7) * (foe.flying ? 4 : foe.boss ? 2 : 1.2)
  const sway = Math.sin(now / (foe.boss ? 520 : 300) + foe.id) * (foe.boss ? .022 : .045) * dir
  c.save(); c.fillStyle = 'rgba(8, 17, 17, .32)'; c.beginPath(); c.ellipse(foe.x, world.floor + 2, foe.flying ? 14 : foe.boss ? 48 : 24, foe.flying ? 4 : foe.boss ? 10 : 6, 0, 0, Math.PI * 2); c.fill(); c.restore()
  if (foe.flying) {
    c.save(); c.strokeStyle = `${theme.glow}66`; c.lineWidth = 1.6
    for (let i = 0; i < 2; i++) { c.beginPath(); c.ellipse(foe.x - 10 + i * 20, world.floor - flyHeight + 18, 10, 3, 0, 0, Math.PI * 2); c.stroke() }
    c.restore()
  }
  if (foe.boss) {
    const aura = c.createRadialGradient(foe.x, world.floor - 52, 10, foe.x, world.floor - 52, 92)
    aura.addColorStop(0, 'rgba(255, 255, 255, 0)'); aura.addColorStop(.7, `${theme.glow}22`); aura.addColorStop(1, 'rgba(255, 255, 255, 0)')
    c.save(); c.fillStyle = aura; c.beginPath(); c.arc(foe.x, world.floor - 52, 92, 0, Math.PI * 2); c.fill(); c.restore()
  }
  c.save(); c.translate(foe.x + lunge * dir, world.floor - flyHeight + bob); c.rotate(sway); c.scale(scale * dir, scale)
  if (foe.flash > 0) c.filter = 'brightness(2)'
  if (foe.boss) drawBossModel(c, index, theme)
  else drawMobModel(c, index, theme)
  c.restore()
  if ((foe.stunTimer ?? 0) > 0) {
    const orbitY = world.floor - (foe.boss ? 214 : 104) - flyHeight
    c.save(); c.strokeStyle = '#c7f0de'; c.lineWidth = 2
    for (let i = 0; i < 3; i++) {
      const angle = now / 260 + (i * Math.PI * 2) / 3
      c.beginPath(); c.arc(foe.x + Math.cos(angle) * 20, orbitY + Math.sin(angle) * 7, 3, 0, Math.PI * 2); c.stroke()
    }
    c.restore()
  }
}
function drawMobModel(c: CanvasRenderingContext2D, index: number, theme: EnemyTheme) {
  c.lineJoin = 'round'; c.lineCap = 'round'
  if (index === 0) {
    // 苔痕边境：苔藓小妖
    c.fillStyle = theme.dark; c.fillRect(-15, -16, 10, 15); c.fillRect(5, -16, 10, 15)
    c.fillStyle = bodyGradient(c, theme, -64, -6); c.beginPath(); c.moveTo(-23, -6); c.lineTo(-20, -42); c.quadraticCurveTo(-12, -62, 0, -64); c.quadraticCurveTo(12, -62, 20, -42); c.lineTo(23, -6); c.closePath(); c.fill(); strokeShape(c)
    c.fillStyle = theme.light; c.globalAlpha = .5; c.beginPath(); c.ellipse(0, -26, 13, 9, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1
    c.fillStyle = theme.accent
    for (const side of [-1, 1]) { c.beginPath(); c.moveTo(side * 17, -50); c.quadraticCurveTo(side * 31, -66, side * 25, -36); c.quadraticCurveTo(side * 19, -43, side * 17, -50); c.fill() }
    glint(c, -8, -42, 3, theme.eye); glint(c, 8, -42, 3, theme.eye)
    c.strokeStyle = theme.dark; c.lineWidth = 2; c.beginPath(); c.moveTo(-7, -31); c.lineTo(7, -31); c.stroke()
    c.fillStyle = theme.accent; c.beginPath(); c.ellipse(0, -64, 5, 8, 0, 0, Math.PI * 2); c.fill()
  } else if (index === 1) {
    // 沉钟矿道：寒晶爬虫
    c.fillStyle = theme.dark; c.fillRect(-19, -14, 8, 13); c.fillRect(-4, -12, 8, 11); c.fillRect(9, -14, 8, 13)
    c.fillStyle = bodyGradient(c, theme, -58, -8); c.beginPath(); c.moveTo(-27, -8); c.lineTo(-22, -38); c.lineTo(-6, -56); c.lineTo(13, -48); c.lineTo(25, -22); c.lineTo(18, -8); c.closePath(); c.fill(); strokeShape(c)
    c.fillStyle = theme.accent
    for (const [x, h] of [[-14, 18], [-2, 24], [10, 16]]) { c.beginPath(); c.moveTo(x - 5, -46); c.lineTo(x, -46 - h); c.lineTo(x + 5, -46); c.closePath(); c.fill() }
    glint(c, 0, -30, 5, theme.glow)
    glint(c, -10, -41, 2.6, theme.eye); glint(c, 6, -41, 2.6, theme.eye)
    c.strokeStyle = 'rgba(230, 251, 255, .45)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-26, -4); c.quadraticCurveTo(0, 3, 27, -4); c.stroke()
  } else if (index === 2) {
    // 赤岩峡谷：熔岩蜥蜴
    c.strokeStyle = theme.body; c.lineWidth = 9; c.beginPath(); c.moveTo(-18, -24); c.quadraticCurveTo(-40, -14, -32, -3); c.stroke()
    c.fillStyle = bodyGradient(c, theme, -42, -6); c.beginPath(); c.ellipse(-2, -24, 26, 16, 0, 0, Math.PI * 2); c.fill(); strokeShape(c)
    c.fillStyle = theme.accent
    for (const [x, h] of [[-16, 12], [-4, 17], [8, 12]]) { c.beginPath(); c.moveTo(x - 5, -34); c.lineTo(x, -34 - h); c.lineTo(x + 5, -34); c.closePath(); c.fill() }
    c.fillStyle = theme.light; c.beginPath(); c.ellipse(22, -30, 13, 10, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(9, 18, 16, .5)'; c.lineWidth = 1.2; c.stroke()
    c.fillStyle = theme.dark; c.fillRect(29, -34, 3, 3)
    glint(c, 24, -34, 2.8, theme.eye)
    c.fillStyle = theme.dark; c.fillRect(-14, -12, 8, 10); c.fillRect(2, -12, 8, 10)
    c.strokeStyle = theme.glow; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-12, -28); c.lineTo(-4, -21); c.lineTo(4, -28); c.stroke()
  } else if (index === 3) {
    // 风蚀高原：风暴隼
    for (const side of [-1, 1]) { c.fillStyle = side < 0 ? theme.light : theme.accent; c.beginPath(); c.moveTo(side * 6, -44); c.lineTo(side * 35, -64); c.lineTo(side * 29, -28); c.lineTo(side * 10, -36); c.closePath(); c.globalAlpha = .95; c.fill(); c.globalAlpha = 1 }
    c.fillStyle = bodyGradient(c, theme, -54, -8); c.beginPath(); c.ellipse(0, -30, 18, 21, 0, 0, Math.PI * 2); c.fill(); strokeShape(c)
    c.fillStyle = theme.body; c.beginPath(); c.arc(8, -52, 12, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(9, 18, 16, .5)'; c.lineWidth = 1.2; c.stroke()
    c.fillStyle = theme.accent; c.beginPath(); c.moveTo(18, -54); c.lineTo(31, -49); c.lineTo(18, -45); c.closePath(); c.fill()
    c.strokeStyle = theme.light; c.lineWidth = 3
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(4 - i * 4, -61); c.lineTo(-2 - i * 6, -72); c.stroke() }
    glint(c, 11, -55, 2.6, theme.eye)
    c.strokeStyle = theme.accent; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-4, -11); c.lineTo(-8, -2); c.moveTo(6, -11); c.lineTo(10, -2); c.stroke()
    c.strokeStyle = 'rgba(244, 233, 142, .4)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-34, -22); c.lineTo(-22, -22); c.moveTo(-36, -16); c.lineTo(-26, -16); c.stroke()
  } else if (index === 4) {
    // 幽蓝沼泽：潮汐鳗
    const bodyStroke = c.createLinearGradient(-30, -60, 30, -10); bodyStroke.addColorStop(0, theme.light); bodyStroke.addColorStop(.5, theme.body); bodyStroke.addColorStop(1, theme.dark)
    c.strokeStyle = bodyStroke; c.lineWidth = 15; c.beginPath(); c.moveTo(-28, -6); c.bezierCurveTo(-36, -34, -10, -52, 4, -34); c.bezierCurveTo(18, -16, 34, -40, 28, -58); c.stroke()
    c.strokeStyle = theme.light; c.lineWidth = 5; c.beginPath(); c.moveTo(-24, -10); c.bezierCurveTo(-30, -32, -8, -46, 4, -32); c.stroke()
    c.fillStyle = theme.accent
    for (const [x, y, r] of [[-14, -28, -.6], [2, -42, .4], [18, -28, .8]]) { c.save(); c.translate(x, y); c.rotate(r); c.beginPath(); c.moveTo(0, 0); c.lineTo(-4, -12); c.lineTo(6, -3); c.closePath(); c.fill(); c.restore() }
    c.fillStyle = theme.light; c.beginPath(); c.arc(28, -58, 10, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(9, 18, 16, .5)'; c.lineWidth = 1.2; c.stroke()
    glint(c, 32, -61, 2.8, theme.eye)
    c.strokeStyle = 'rgba(201, 245, 247, .5)'; c.lineWidth = 1.2
    for (const [x, y, r] of [[36, -70, 3], [42, -62, 2], [34, -50, 1.6]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke() }
  } else if (index === 5) {
    // 断星回廊：虚空之眼
    c.strokeStyle = theme.dark; c.lineWidth = 4
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; c.beginPath(); c.moveTo(Math.cos(a) * 13, -38 + Math.sin(a) * 11); c.quadraticCurveTo(Math.cos(a) * 27, -18, Math.cos(a) * 20 + 4, -3); c.stroke() }
    c.fillStyle = bodyGradient(c, theme, -60, -16); c.beginPath(); c.arc(0, -38, 22, 0, Math.PI * 2); c.fill(); strokeShape(c)
    c.fillStyle = theme.light; c.beginPath(); c.ellipse(0, -38, 12, 9, 0, 0, Math.PI * 2); c.fill()
    glint(c, 0, -38, 5, theme.glow); c.fillStyle = '#1a1020'; c.beginPath(); c.arc(0, -38, 2.6, 0, Math.PI * 2); c.fill()
    c.fillStyle = theme.accent
    for (let i = 0; i < 3; i++) { const a = performance.now() / 700 + (i * Math.PI * 2) / 3; c.save(); c.translate(Math.cos(a) * 30, -38 + Math.sin(a) * 16); c.rotate(a); c.beginPath(); c.moveTo(0, -4); c.lineTo(3, 0); c.lineTo(0, 4); c.lineTo(-3, 0); c.closePath(); c.fill(); c.restore() }
  } else if (index === 6) {
    // 灰烬王庭：灰烬幽魂
    c.fillStyle = bodyGradient(c, theme, -68, -2); c.beginPath(); c.moveTo(-22, -2); c.lineTo(-15, -52); c.quadraticCurveTo(0, -70, 15, -52); c.lineTo(22, -2); c.closePath(); c.fill(); strokeShape(c)
    c.fillStyle = theme.dark
    for (const x of [-18, -8, 2, 12]) { c.beginPath(); c.moveTo(x, -5); c.lineTo(x + 4, 2); c.lineTo(x + 8, -5); c.closePath(); c.fill() }
    c.fillStyle = '#151312'; c.beginPath(); c.ellipse(0, -50, 9, 12, 0, 0, Math.PI * 2); c.fill()
    glint(c, -4, -51, 2.6, theme.eye); glint(c, 4, -51, 2.6, theme.eye)
    c.fillStyle = theme.glow
    for (const [x, y] of [[-14, -28], [12, -20], [0, -36]]) { c.beginPath(); c.arc(x, y, 1.8, 0, Math.PI * 2); c.fill() }
  } else if (index === 7) {
    // 深渊裂谷：血牙蛮兵
    c.fillStyle = theme.dark; c.fillRect(-17, -16, 12, 14); c.fillRect(5, -16, 12, 14)
    c.fillStyle = bodyGradient(c, theme, -58, -10); c.beginPath(); c.moveTo(-25, -10); c.lineTo(-21, -46); c.lineTo(-8, -58); c.lineTo(10, -56); c.lineTo(23, -44); c.lineTo(25, -10); c.closePath(); c.fill(); strokeShape(c)
    c.fillStyle = theme.accent
    for (const side of [-1, 1]) { c.beginPath(); c.moveTo(side * 18, -52); c.lineTo(side * 29, -64); c.lineTo(side * 23, -42); c.closePath(); c.fill() }
    c.fillStyle = theme.light; c.beginPath(); c.arc(2, -52, 11, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(9, 18, 16, .5)'; c.lineWidth = 1.2; c.stroke()
    c.strokeStyle = theme.accent; c.lineWidth = 3; c.beginPath(); c.moveTo(-6, -60); c.lineTo(-15, -72); c.moveTo(10, -60); c.lineTo(19, -72); c.stroke()
    c.fillStyle = '#f1e5c1'; c.beginPath(); c.moveTo(-2, -44); c.lineTo(-6, -34); c.lineTo(1, -43); c.fill(); c.beginPath(); c.moveTo(6, -44); c.lineTo(10, -34); c.lineTo(3, -43); c.fill()
    glint(c, -4, -55, 2.4, theme.eye); glint(c, 8, -55, 2.4, theme.eye)
    c.strokeStyle = theme.dark; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-16, -36); c.lineTo(-5, -28); c.stroke()
  } else if (index === 8) {
    // 苍白圣所：日轮祭司
    c.strokeStyle = theme.glow; c.globalAlpha = .5; c.lineWidth = 3; c.beginPath(); c.arc(0, -68, 18, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1
    c.fillStyle = bodyGradient(c, theme, -64, -3); c.beginPath(); c.moveTo(-19, -3); c.lineTo(-12, -50); c.quadraticCurveTo(0, -64, 12, -50); c.lineTo(19, -3); c.closePath(); c.fill(); strokeShape(c)
    c.strokeStyle = theme.accent; c.lineWidth = 2; c.beginPath(); c.moveTo(-17, -8); c.lineTo(17, -8); c.stroke()
    c.fillStyle = theme.accent; c.beginPath(); c.ellipse(0, -52, 9, 12, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = theme.dark; c.lineWidth = 1.5; c.stroke()
    c.fillStyle = theme.dark; c.fillRect(-5, -55, 3, 2); c.fillRect(2, -55, 3, 2)
    c.strokeStyle = '#7a5a2a'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(17, -5); c.lineTo(22, -60); c.stroke()
    glint(c, 23, -64, 6, theme.glow)
  } else {
    // 终焉之门：星辰哨兵
    c.fillStyle = theme.accent
    for (let i = 0; i < 5; i++) { const a = performance.now() / 1100 + (i * Math.PI * 2) / 5; c.save(); c.translate(Math.cos(a) * 25, -38 + Math.sin(a) * 14); c.rotate(a); c.beginPath(); c.moveTo(0, -5); c.lineTo(3.5, 0); c.lineTo(0, 5); c.lineTo(-3.5, 0); c.closePath(); c.fill(); c.restore() }
    c.fillStyle = bodyGradient(c, theme, -64, -10); c.beginPath(); c.moveTo(0, -64); c.lineTo(18, -38); c.lineTo(10, -10); c.lineTo(-10, -10); c.lineTo(-18, -38); c.closePath(); c.fill(); strokeShape(c)
    glint(c, 0, -36, 6, theme.glow)
    glint(c, -6, -44, 2.2, theme.eye); glint(c, 6, -44, 2.2, theme.eye)
    c.fillStyle = theme.dark; c.beginPath(); c.ellipse(0, -8, 10, 4, 0, 0, Math.PI * 2); c.fill()
  }
}
function drawBossModel(c: CanvasRenderingContext2D, index: number, theme: EnemyTheme) {
  c.lineJoin = 'round'; c.lineCap = 'round'
  if (index === 0) {
    // 苔痕边境 Boss：古木树王
    c.fillStyle = bodyGradient(c, theme, -78, -4); c.beginPath(); c.moveTo(-28, -4); c.lineTo(-24, -48); c.lineTo(-14, -70); c.lineTo(12, -72); c.lineTo(25, -48); c.lineTo(29, -4); c.closePath(); c.fill(); strokeShape(c)
    c.strokeStyle = theme.dark; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-14, -14); c.lineTo(-10, -52); c.moveTo(8, -10); c.lineTo(12, -56); c.moveTo(-22, -30); c.lineTo(14, -34); c.stroke()
    c.fillStyle = theme.dark; c.beginPath(); c.moveTo(-28, -2); c.lineTo(-38, 2); c.lineTo(-24, 4); c.closePath(); c.fill(); c.beginPath(); c.moveTo(28, -2); c.lineTo(38, 2); c.lineTo(24, 4); c.closePath(); c.fill()
    c.strokeStyle = theme.accent; c.lineWidth = 4.5; c.beginPath(); c.moveTo(-14, -66); c.lineTo(-28, -90); c.moveTo(-24, -82); c.lineTo(-36, -86); c.moveTo(14, -66); c.lineTo(28, -90); c.moveTo(24, -82); c.lineTo(36, -86); c.stroke()
    c.fillStyle = theme.light
    for (const [x, y, r] of [[-16, -72, -.7], [-4, -78, -.3], [8, -76, .3], [18, -70, .7]]) { c.save(); c.translate(x, y); c.rotate(r); c.beginPath(); c.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2); c.fill(); c.restore() }
    c.fillStyle = theme.dark; c.beginPath(); c.ellipse(0, -50, 14, 10, 0, 0, Math.PI * 2); c.fill()
    glint(c, -7, -52, 3.4, theme.eye); glint(c, 7, -52, 3.4, theme.eye)
    c.strokeStyle = theme.accent; c.lineWidth = 2; c.beginPath(); c.moveTo(-8, -40); c.lineTo(8, -40); c.stroke()
    c.strokeStyle = theme.body; c.lineWidth = 8; c.beginPath(); c.moveTo(-24, -42); c.lineTo(-42, -22); c.moveTo(24, -42); c.lineTo(42, -22); c.stroke()
  } else if (index === 1) {
    // 沉钟矿道 Boss：寒晶巨像
    c.fillStyle = bodyGradient(c, theme, -82, -4); c.beginPath(); c.moveTo(-34, -4); c.lineTo(-28, -54); c.lineTo(-12, -74); c.lineTo(14, -70); c.lineTo(30, -50); c.lineTo(34, -4); c.closePath(); c.fill(); strokeShape(c)
    c.fillStyle = theme.body; c.fillRect(-46, -54, 14, 44); c.fillRect(32, -54, 14, 44)
    c.fillStyle = theme.accent
    for (const [x, h] of [[-18, 30], [-5, 40], [8, 34], [20, 26]]) { c.beginPath(); c.moveTo(x - 7, -70); c.lineTo(x, -70 - h); c.lineTo(x + 7, -70); c.closePath(); c.fill() }
    c.fillStyle = theme.light
    for (const side of [-1, 1]) { c.beginPath(); c.moveTo(side * 30, -52); c.lineTo(side * 42, -70); c.lineTo(side * 36, -46); c.closePath(); c.fill() }
    glint(c, 0, -42, 9, theme.glow)
    glint(c, -11, -56, 3.2, theme.eye); glint(c, 11, -56, 3.2, theme.eye)
    c.strokeStyle = 'rgba(230, 251, 255, .55)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-24, -20); c.lineTo(-16, -30); c.lineTo(-20, -40); c.moveTo(26, -16); c.lineTo(18, -28); c.stroke()
  } else if (index === 2) {
    // 赤岩峡谷 Boss：熔岩魔像
    c.fillStyle = bodyGradient(c, theme, -80, -4); c.beginPath(); c.moveTo(-32, -4); c.lineTo(-28, -52); c.lineTo(-12, -72); c.lineTo(14, -70); c.lineTo(30, -50); c.lineTo(34, -4); c.closePath(); c.fill(); strokeShape(c)
    c.strokeStyle = theme.glow; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-20, -10); c.lineTo(-12, -28); c.lineTo(-20, -42); c.moveTo(18, -8); c.lineTo(12, -26); c.lineTo(22, -40); c.stroke()
    c.fillStyle = theme.light; c.beginPath(); c.arc(0, -60, 14, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(9, 18, 16, .5)'; c.lineWidth = 1.2; c.stroke()
    c.strokeStyle = theme.accent; c.lineWidth = 5; c.beginPath(); c.moveTo(-10, -68); c.quadraticCurveTo(-26, -84, -18, -94); c.moveTo(10, -68); c.quadraticCurveTo(26, -84, 18, -94); c.stroke()
    glint(c, -6, -60, 3.2, theme.eye); glint(c, 6, -60, 3.2, theme.eye)
    c.fillStyle = theme.body; c.beginPath(); c.arc(-40, -30, 11, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(40, -30, 11, 0, Math.PI * 2); c.fill()
    glint(c, -40, -30, 4, theme.glow); glint(c, 40, -30, 4, theme.glow)
  } else if (index === 3) {
    // 风蚀高原 Boss：雷翼巨禽
    for (const side of [-1, 1]) { c.fillStyle = side < 0 ? theme.light : theme.accent; c.beginPath(); c.moveTo(side * 8, -56); c.quadraticCurveTo(side * 54, -96, side * 62, -44); c.quadraticCurveTo(side * 40, -52, side * 18, -38); c.closePath(); c.globalAlpha = .95; c.fill(); c.globalAlpha = 1 }
    c.fillStyle = bodyGradient(c, theme, -70, -4); c.beginPath(); c.ellipse(0, -34, 24, 28, 0, 0, Math.PI * 2); c.fill(); strokeShape(c)
    c.fillStyle = theme.body; c.beginPath(); c.arc(10, -66, 16, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(9, 18, 16, .5)'; c.lineWidth = 1.2; c.stroke()
    c.fillStyle = theme.accent; c.beginPath(); c.moveTo(23, -68); c.lineTo(43, -60); c.lineTo(23, -54); c.closePath(); c.fill()
    c.strokeStyle = theme.light; c.lineWidth = 3.5; c.beginPath(); c.moveTo(-4, -80); c.lineTo(2, -88); c.lineTo(-2, -96); c.stroke()
    glint(c, 13, -69, 3, theme.eye)
    c.strokeStyle = theme.accent; c.lineWidth = 4; c.beginPath(); c.moveTo(-8, -6); c.lineTo(-14, 2); c.moveTo(8, -6); c.lineTo(14, 2); c.stroke()
    c.strokeStyle = 'rgba(244, 233, 142, .5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-40, -50); c.lineTo(-30, -42); c.lineTo(-38, -34); c.moveTo(46, -46); c.lineTo(36, -38); c.lineTo(44, -30); c.stroke()
  } else if (index === 4) {
    // 幽蓝沼泽 Boss：潮汐利维坦
    const bodyStroke = c.createLinearGradient(-40, -80, 40, -10); bodyStroke.addColorStop(0, theme.light); bodyStroke.addColorStop(.5, theme.body); bodyStroke.addColorStop(1, theme.dark)
    c.strokeStyle = bodyStroke; c.lineWidth = 22; c.beginPath(); c.moveTo(-36, -4); c.bezierCurveTo(-52, -44, -6, -70, 10, -42); c.bezierCurveTo(26, -16, 48, -58, 34, -78); c.stroke()
    c.strokeStyle = theme.light; c.lineWidth = 7; c.beginPath(); c.moveTo(-30, -12); c.bezierCurveTo(-40, -42, -6, -58, 8, -40); c.stroke()
    c.fillStyle = theme.accent
    for (const [x, y, r] of [[-24, -46, -.8], [0, -62, -.1], [22, -50, .6]]) { c.save(); c.translate(x, y); c.rotate(r); c.beginPath(); c.moveTo(0, 0); c.lineTo(-6, -20); c.lineTo(9, -4); c.closePath(); c.fill(); c.restore() }
    c.fillStyle = theme.light; c.beginPath(); c.arc(34, -78, 14, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(9, 18, 16, .5)'; c.lineWidth = 1.2; c.stroke()
    glint(c, 40, -82, 3.4, theme.eye)
    glint(c, -10, -30, 6, theme.glow)
    c.strokeStyle = 'rgba(201, 245, 247, .5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-50, -8); c.quadraticCurveTo(-38, -18, -28, -8); c.moveTo(36, -8); c.quadraticCurveTo(48, -16, 58, -8); c.stroke()
  } else if (index === 5) {
    // 断星回廊 Boss：虚空巨眼
    c.strokeStyle = theme.dark; c.lineWidth = 6
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.beginPath(); c.moveTo(Math.cos(a) * 20, -50 + Math.sin(a) * 16); c.quadraticCurveTo(Math.cos(a) * 42, -24, Math.cos(a) * 32 + 6, -2); c.stroke() }
    c.fillStyle = bodyGradient(c, theme, -86, -20); c.beginPath(); c.arc(0, -52, 30, 0, Math.PI * 2); c.fill(); strokeShape(c)
    c.fillStyle = theme.accent
    for (const [x, h] of [[-20, 26], [-8, 36], [4, 32], [16, 24]]) { c.beginPath(); c.moveTo(x - 6, -76); c.lineTo(x, -76 - h); c.lineTo(x + 6, -76); c.closePath(); c.fill() }
    c.fillStyle = theme.light; c.beginPath(); c.ellipse(0, -52, 17, 12, 0, 0, Math.PI * 2); c.fill()
    glint(c, 0, -52, 7, theme.glow); c.fillStyle = '#1a1020'; c.beginPath(); c.arc(0, -52, 3.4, 0, Math.PI * 2); c.fill()
    c.fillStyle = theme.eye
    for (let i = 0; i < 4; i++) { const a = performance.now() / 800 + (i * Math.PI) / 2; c.beginPath(); c.arc(Math.cos(a) * 42, -52 + Math.sin(a) * 22, 2.4, 0, Math.PI * 2); c.fill() }
  } else if (index === 6) {
    // 灰烬王庭 Boss：灰烬巫王
    c.fillStyle = bodyGradient(c, theme, -92, -2); c.beginPath(); c.moveTo(-32, -2); c.lineTo(-22, -68); c.quadraticCurveTo(0, -94, 22, -68); c.lineTo(32, -2); c.closePath(); c.fill(); strokeShape(c)
    c.fillStyle = theme.dark
    for (const x of [-26, -14, -2, 10, 22]) { c.beginPath(); c.moveTo(x, -5); c.lineTo(x + 6, 4); c.lineTo(x + 12, -5); c.closePath(); c.fill() }
    c.fillStyle = theme.accent
    for (const [x, h] of [[-16, 20], [-5, 30], [6, 26], [16, 18]]) { c.beginPath(); c.moveTo(x - 5, -82); c.lineTo(x, -82 - h); c.lineTo(x + 5, -82); c.closePath(); c.fill() }
    c.fillStyle = '#141312'; c.beginPath(); c.ellipse(0, -62, 13, 17, 0, 0, Math.PI * 2); c.fill()
    glint(c, -6, -64, 3.2, theme.eye); glint(c, 6, -64, 3.2, theme.eye)
    glint(c, 0, -36, 7, theme.glow)
    c.fillStyle = theme.glow
    for (const [x, y] of [[-20, -34], [18, -28], [-8, -18], [24, -46]]) { c.beginPath(); c.arc(x, y, 2.2, 0, Math.PI * 2); c.fill() }
  } else if (index === 7) {
    // 深渊裂谷 Boss：血牙暴君
    c.fillStyle = theme.dark; c.fillRect(-24, -18, 16, 16); c.fillRect(8, -18, 16, 16)
    c.fillStyle = bodyGradient(c, theme, -78, -8); c.beginPath(); c.moveTo(-36, -8); c.lineTo(-30, -56); c.lineTo(-12, -74); c.lineTo(14, -72); c.lineTo(32, -54); c.lineTo(36, -8); c.closePath(); c.fill(); strokeShape(c)
    c.fillStyle = theme.accent
    for (const side of [-1, 1]) { c.beginPath(); c.moveTo(side * 26, -64); c.lineTo(side * 44, -80); c.lineTo(side * 36, -52); c.closePath(); c.fill() }
    c.fillStyle = theme.light; c.beginPath(); c.arc(2, -64, 15, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(9, 18, 16, .5)'; c.lineWidth = 1.2; c.stroke()
    c.strokeStyle = theme.accent; c.lineWidth = 5; c.beginPath(); c.moveTo(-9, -76); c.quadraticCurveTo(-22, -94, -14, -104); c.moveTo(13, -76); c.quadraticCurveTo(26, -94, 18, -104); c.stroke()
    c.fillStyle = '#f1e5c1'; c.beginPath(); c.moveTo(-2, -52); c.lineTo(-8, -38); c.lineTo(2, -50); c.fill(); c.beginPath(); c.moveTo(8, -52); c.lineTo(14, -38); c.lineTo(4, -50); c.fill()
    glint(c, -6, -67, 3, theme.eye); glint(c, 10, -67, 3, theme.eye)
    c.strokeStyle = theme.accent; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-20, -44); c.lineTo(-4, -30); c.lineTo(10, -42); c.stroke()
    c.fillStyle = theme.body; c.beginPath(); c.arc(-44, -26, 10, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(44, -26, 10, 0, Math.PI * 2); c.fill()
  } else if (index === 8) {
    // 苍白圣所 Boss：日轮主教
    c.strokeStyle = theme.glow; c.globalAlpha = .55; c.lineWidth = 4; c.beginPath(); c.arc(0, -86, 26, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1
    c.fillStyle = bodyGradient(c, theme, -84, -2); c.beginPath(); c.moveTo(-30, -2); c.lineTo(-20, -62); c.quadraticCurveTo(0, -80, 20, -62); c.lineTo(30, -2); c.closePath(); c.fill(); strokeShape(c)
    c.strokeStyle = theme.accent; c.lineWidth = 3; c.beginPath(); c.moveTo(-26, -8); c.lineTo(26, -8); c.stroke()
    c.strokeStyle = theme.body; c.lineWidth = 6; c.beginPath(); c.moveTo(-20, -54); c.lineTo(-42, -38); c.moveTo(20, -54); c.lineTo(42, -38); c.stroke()
    glint(c, -44, -36, 5, theme.glow); glint(c, 44, -36, 5, theme.glow)
    c.fillStyle = theme.accent; c.beginPath(); c.ellipse(0, -66, 13, 17, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = theme.dark; c.lineWidth = 2; c.stroke()
    c.fillStyle = theme.dark; c.fillRect(-7, -70, 4, 3); c.fillRect(3, -70, 4, 3)
    c.strokeStyle = theme.glow; c.lineWidth = 2
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; c.beginPath(); c.moveTo(Math.cos(a) * 30, -86 + Math.sin(a) * 30); c.lineTo(Math.cos(a) * 40, -86 + Math.sin(a) * 40); c.stroke() }
  } else {
    // 终焉之门 Boss：星辰泰坦
    c.fillStyle = theme.accent
    for (let i = 0; i < 8; i++) { const a = performance.now() / 1300 + (i * Math.PI * 2) / 8; c.save(); c.translate(Math.cos(a) * 44, -50 + Math.sin(a) * 26); c.rotate(a); c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 0); c.lineTo(0, 7); c.lineTo(-5, 0); c.closePath(); c.fill(); c.restore() }
    c.fillStyle = bodyGradient(c, theme, -88, -8); c.beginPath(); c.moveTo(0, -92); c.lineTo(26, -56); c.lineTo(16, -8); c.lineTo(-16, -8); c.lineTo(-26, -56); c.closePath(); c.fill(); strokeShape(c)
    c.fillStyle = theme.accent
    for (const [x, h] of [[-16, 22], [-4, 34], [8, 28], [18, 20]]) { c.beginPath(); c.moveTo(x - 5, -82); c.lineTo(x, -82 - h); c.lineTo(x + 5, -82); c.closePath(); c.fill() }
    glint(c, 0, -48, 11, theme.glow)
    glint(c, -8, -60, 3, theme.eye); glint(c, 8, -60, 3, theme.eye)
    c.strokeStyle = theme.light; c.lineWidth = 6; c.beginPath(); c.moveTo(-24, -54); c.lineTo(-42, -30); c.moveTo(24, -54); c.lineTo(42, -30); c.stroke()
  }
}
function drawFx(c: CanvasRenderingContext2D, fx: Fx) {
  const duration = fx.duration ?? .55
  const alpha = Math.min(1, fx.life / duration)
  const progress = 1 - alpha
  c.save(); c.globalAlpha = alpha; c.lineCap = 'round'
  if (fx.kind === 'damage-number') {
    c.globalAlpha = Math.min(1, alpha * 1.4)
    c.font = `700 ${fx.damage && fx.damage >= 100 ? 20 : 16}px 'Microsoft YaHei', sans-serif`
    c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(20, 29, 28, .88)'; c.strokeText(fx.text ?? '', fx.x, fx.y - progress * 38)
    c.fillStyle = fx.text?.startsWith('-') ? '#ffe09a' : '#ffc3a7'; c.fillText(fx.text ?? '', fx.x, fx.y - progress * 38)
  } else if (fx.kind === 'sword' || fx.kind === 'sword-arc') {
    c.strokeStyle = '#f3db9c'; c.lineWidth = fx.kind === 'sword' ? 5 : 8; c.beginPath(); c.arc(fx.x, fx.y, 25 + progress * 32, fx.direction === -1 ? 2.35 : -.55, fx.direction === -1 ? 4.3 : 1.5); c.stroke()
  } else if (fx.kind === 'whirlwind') {
    c.strokeStyle = '#e2d29a'; c.lineWidth = 5; c.beginPath(); c.ellipse(fx.x, fx.y, 35 + progress * 90, 16 + progress * 20, progress * 4, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.ellipse(fx.x, fx.y - 27, 26 + progress * 43, 9, -progress * 3, 0, Math.PI * 2); c.stroke()
  } else if (fx.kind === 'thrust') {
    c.strokeStyle = '#edf0da'; c.lineWidth = 7; c.beginPath(); c.moveTo(fx.x - 65 * (fx.direction ?? 1), fx.y); c.lineTo(fx.x + 28 * (fx.direction ?? 1), fx.y); c.stroke(); c.fillStyle = '#d6bd77'; c.beginPath(); c.arc(fx.x + 32 * (fx.direction ?? 1), fx.y, 9, 0, Math.PI * 2); c.fill()
  } else if (fx.kind === 'ground-break') {
    c.strokeStyle = '#dbbb76'; c.lineWidth = 5; c.beginPath(); c.moveTo(fx.x - 64, fx.y + 27); c.lineTo(fx.x - 31, fx.y + 1); c.lineTo(fx.x - 7, fx.y + 22); c.lineTo(fx.x + 20, fx.y - 6); c.lineTo(fx.x + 61, fx.y + 12); c.stroke()
  } else if (fx.kind === 'fire-pillar') {
    c.fillStyle = '#ed7850'; c.beginPath(); c.moveTo(fx.x - 18, fx.y + 12); c.quadraticCurveTo(fx.x - 13, fx.y - 55, fx.x, fx.y - 119); c.quadraticCurveTo(fx.x + 19, fx.y - 47, fx.x + 16, fx.y + 12); c.closePath(); c.fill(); c.fillStyle = '#f8cd76'; c.fillRect(fx.x - 5, fx.y - 35, 10, 42)
  } else if (fx.kind === 'arcane-aura' || fx.kind === 'blink-in' || fx.kind === 'blink-out') {
    c.strokeStyle = '#b9d9cb'; c.lineWidth = 4; c.beginPath(); c.arc(fx.x, fx.y, 20 + progress * 47, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(fx.x, fx.y, 12 + progress * 28, 0, Math.PI * 2); c.stroke()
  } else if (fx.kind === 'energy-array') {
    c.strokeStyle = '#a5d6c6'; c.lineWidth = 3; c.beginPath(); c.ellipse(fx.x, fx.y, 32 + progress * 22, 14 + progress * 8, 0, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(fx.x, fx.y - 56); c.lineTo(fx.x - 24, fx.y + 14); c.lineTo(fx.x + 24, fx.y + 14); c.closePath(); c.stroke(); c.beginPath(); c.arc(fx.x, fx.y - 10, 23, 0, Math.PI * 2); c.stroke()
  } else if (fx.kind === 'slash-crescent') {
    const dir = fx.direction ?? 1
    for (let layer = 0; layer < 3; layer++) {
      c.globalAlpha = alpha * (.9 - layer * .22)
      c.strokeStyle = layer === 0 ? '#fff1b8' : '#e6b95f'
      c.lineWidth = 10 - layer * 3
      c.beginPath(); c.arc(fx.x + dir * layer * 8, fx.y, 34 + progress * 46 - layer * 5, dir > 0 ? -1.05 : 2.1, dir > 0 ? .85 : 4)
      c.stroke()
    }
    c.globalAlpha = alpha * .7; c.strokeStyle = '#f7df9b'; c.lineWidth = 2
    c.beginPath(); c.moveTo(fx.x - dir * 20, fx.y - 30); c.lineTo(fx.x + dir * 70, fx.y - 8); c.stroke()
    c.beginPath(); c.moveTo(fx.x - dir * 20, fx.y + 18); c.lineTo(fx.x + dir * 60, fx.y + 30); c.stroke()
  } else if (fx.kind === 'whirlwind-storm') {
    const spin = performance.now() / 90
    for (let i = 0; i < 2; i++) {
      c.strokeStyle = i ? '#c9d6a5' : '#f0d98a'; c.lineWidth = 5
      c.save(); c.translate(fx.x, fx.y); c.rotate(spin * (i ? -1 : 1))
      c.beginPath(); c.ellipse(0, 0, 42 + progress * 80, 15 + progress * 22, 0, 0, Math.PI * 2); c.stroke()
      for (let blade = 0; blade < 4; blade++) {
        const angle = (blade * Math.PI) / 2
        c.beginPath(); c.moveTo(Math.cos(angle) * 20, Math.sin(angle) * 8); c.lineTo(Math.cos(angle) * (60 + progress * 60), Math.sin(angle) * (18 + progress * 18)); c.stroke()
      }
      c.restore()
    }
    c.strokeStyle = 'rgba(214, 196, 140, .55)'; c.lineWidth = 3
    c.beginPath(); c.ellipse(fx.x, world.floor - 4, 50 + progress * 70, 8 + progress * 6, 0, 0, Math.PI * 2); c.stroke()
  } else if (fx.kind === 'thrust-dash') {
    const dir = fx.direction ?? 1
    c.strokeStyle = '#eef4e2'; c.lineWidth = 7
    c.beginPath(); c.moveTo(fx.x - dir * 90, fx.y); c.lineTo(fx.x + dir * 45, fx.y); c.stroke()
    c.fillStyle = '#f7e8ae'; c.beginPath(); c.moveTo(fx.x + dir * 55, fx.y - 9); c.lineTo(fx.x + dir * 78, fx.y); c.lineTo(fx.x + dir * 55, fx.y + 9); c.closePath(); c.fill()
    c.strokeStyle = 'rgba(220, 232, 205, .65)'; c.lineWidth = 2
    for (let line = 0; line < 3; line++) {
      c.beginPath(); c.moveTo(fx.x - dir * (70 + line * 14), fx.y - 22 + line * 22); c.lineTo(fx.x + dir * (30 + line * 10), fx.y - 22 + line * 22); c.stroke()
    }
    c.fillStyle = 'rgba(160, 196, 176, .16)'
    for (let ghost = 0; ghost < 3; ghost++) c.fillRect(fx.x - dir * (30 + ghost * 22), fx.y - 48, 12, 96)
  } else if (fx.kind === 'ground-break') {
    c.strokeStyle = '#e0bd72'; c.lineWidth = 5
    c.beginPath(); c.moveTo(fx.x - 90, fx.y + 30); c.lineTo(fx.x - 52, fx.y + 6); c.lineTo(fx.x - 20, fx.y + 26); c.lineTo(fx.x + 12, fx.y - 4); c.lineTo(fx.x + 52, fx.y + 18); c.lineTo(fx.x + 86, fx.y + 2); c.stroke()
    c.strokeStyle = 'rgba(240, 210, 140, .7)'; c.lineWidth = 3
    c.beginPath(); c.arc(fx.x, fx.y + 26, 30 + progress * 90, Math.PI, Math.PI * 2); c.stroke()
    c.fillStyle = '#b08d4e'
    for (let rock = 0; rock < 4; rock++) {
      const bx = fx.x - 60 + rock * 40
      const by = fx.y + 26 - progress * (20 + rock * 10)
      c.beginPath(); c.moveTo(bx - 7, by); c.lineTo(bx, by - 16); c.lineTo(bx + 7, by); c.closePath(); c.fill()
    }
  } else if (fx.kind === 'arcane-blessing') {
    c.strokeStyle = '#b9e0d2'; c.lineWidth = 3
    c.beginPath(); c.ellipse(fx.x, world.floor - 4, 38 + progress * 22, 13 + progress * 6, 0, 0, Math.PI * 2); c.stroke()
    for (let ring = 0; ring < 3; ring++) {
      c.save(); c.translate(fx.x, fx.y); c.rotate(performance.now() / 500 + (ring * Math.PI * 2) / 3)
      c.beginPath(); c.ellipse(0, 0, 24 + ring * 10, 8 + ring * 3, ring * .7, 0, Math.PI * 2); c.stroke(); c.restore()
    }
    c.fillStyle = '#e7f4dc'
    for (let mote = 0; mote < 6; mote++) {
      const angle = performance.now() / 600 + (mote * Math.PI) / 3
      c.beginPath(); c.arc(fx.x + Math.cos(angle) * 34, fx.y - 30 + Math.sin(angle) * 14, 3, 0, Math.PI * 2); c.fill()
    }
  } else if (fx.kind === 'twin-fire-pillars') {
    for (const [offset, warm] of [[-80, false], [80, true]] as const) {
      c.fillStyle = warm ? '#f2a35c' : '#e86e4a'
      c.beginPath(); c.moveTo(fx.x + offset - 20, fx.y + 10); c.quadraticCurveTo(fx.x + offset - 14, fx.y - 60, fx.x + offset + 4, fx.y - 140); c.quadraticCurveTo(fx.x + offset + 20, fx.y - 52, fx.x + offset + 18, fx.y + 10); c.closePath(); c.fill()
      c.fillStyle = warm ? '#ffe0a0' : '#ffd07a'; c.fillRect(fx.x + offset - 5, fx.y - 50, 10, 55)
    }
    c.fillStyle = 'rgba(232, 120, 74, .25)'; c.beginPath(); c.ellipse(fx.x, fx.y + 8, 120, 12, 0, 0, Math.PI * 2); c.fill()
  } else if (fx.kind === 'blink-rift') {
    const dir = fx.direction ?? 1
    c.strokeStyle = '#b7d9cb'; c.lineWidth = 3
    for (let slit = 0; slit < 2; slit++) {
      const x = fx.x + dir * slit * 10
      c.beginPath(); c.moveTo(x, fx.y - 58); c.quadraticCurveTo(x + dir * 14, fx.y, x, fx.y + 48); c.stroke()
    }
    c.strokeStyle = 'rgba(180, 220, 205, .55)'; c.lineWidth = 2
    for (let trail = 0; trail < 4; trail++) {
      c.beginPath(); c.moveTo(fx.x - dir * (20 + trail * 18), fx.y - 20 + trail * 12); c.lineTo(fx.x - dir * (55 + trail * 20), fx.y - 20 + trail * 12); c.stroke()
    }
  } else if (fx.kind === 'energy-prison') {
    const spin = performance.now() / 400
    c.strokeStyle = '#a8e0d0'; c.lineWidth = 3
    c.save(); c.translate(fx.x, fx.y); c.rotate(spin)
    for (let side = 0; side < 4; side++) {
      c.rotate(Math.PI / 2)
      c.beginPath(); c.moveTo(0, -70); c.lineTo(18, -20); c.lineTo(0, 30); c.lineTo(-18, -20); c.closePath(); c.stroke()
    }
    c.restore()
    c.strokeStyle = 'rgba(215, 244, 234, .7)'; c.lineWidth = 2
    c.beginPath(); c.ellipse(fx.x, world.floor - 4, 52, 13, 0, 0, Math.PI * 2); c.stroke()
  } else if (fx.kind === 'energy-prison-hit') {
    c.strokeStyle = '#e8fff2'; c.lineWidth = 4
    c.beginPath(); c.moveTo(fx.x - 40, fx.y - 30); c.lineTo(fx.x + 40, fx.y + 20); c.stroke()
    c.beginPath(); c.moveTo(fx.x - 35, fx.y + 25); c.lineTo(fx.x + 35, fx.y - 25); c.stroke()
  } else if (fx.kind === 'double-jump') {
    c.strokeStyle = '#d8f0e2'; c.lineWidth = 3
    c.beginPath(); c.ellipse(fx.x, fx.y, 16 + progress * 30, 5 + progress * 8, 0, 0, Math.PI * 2); c.stroke()
    c.beginPath(); c.arc(fx.x, fx.y, 10 + progress * 26, 0, Math.PI * 2); c.stroke()
  } else if (fx.kind === 'spark') {
    c.fillStyle = fx.color ?? '#ffe09a'
    c.beginPath(); c.arc(fx.x, fx.y, fx.radius ?? 2, 0, Math.PI * 2); c.fill()
  } else if (fx.kind.startsWith('boss-')) {
    const theme = fx.kind.split('-')[2]
    const charging = fx.kind.includes('charge')
    const colors = BOSS_THEME_COLORS
    c.lineWidth = charging ? 5 : 10
    c.strokeStyle = colors[theme] ?? '#d78fb4'
    if (charging) {
      c.setLineDash([7, 6]); c.beginPath(); c.arc(fx.x, fx.y, 32 + progress * 22, 0, Math.PI * 2); c.stroke(); c.setLineDash([])
      c.beginPath(); c.moveTo(fx.x - 35, fx.y + 20); c.lineTo(fx.x + 35, fx.y + 20); c.stroke()
    } else if (theme === 'storm') {
      c.beginPath(); c.moveTo(fx.x - 100, fx.y - 28); c.lineTo(fx.x - 38, fx.y + 18); c.lineTo(fx.x - 7, fx.y - 29); c.lineTo(fx.x + 31, fx.y + 15); c.lineTo(fx.x + 100, fx.y - 23); c.stroke()
    } else if (theme === 'frost') {
      c.beginPath(); c.ellipse(fx.x, fx.y, 70 + progress * 25, 21 + progress * 9, 0, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(fx.x - 45, fx.y - 15); c.lineTo(fx.x, fx.y + 24); c.lineTo(fx.x + 45, fx.y - 15); c.stroke()
    } else if (theme === 'moss') {
      c.beginPath(); c.moveTo(fx.x - 100, fx.y + 14); c.bezierCurveTo(fx.x - 45, fx.y - 46, fx.x + 30, fx.y + 50, fx.x + 100, fx.y - 10); c.stroke()
      for (const side of [-1, 1]) { c.beginPath(); c.ellipse(fx.x + side * 45, fx.y - side * 8, 14, 6, side * -.65, 0, Math.PI * 2); c.stroke() }
    } else if (theme === 'sun') {
      for (let ray = 0; ray < 9; ray++) { const angle = (Math.PI * 2 * ray) / 9; c.beginPath(); c.moveTo(fx.x + Math.cos(angle) * 18, fx.y + Math.sin(angle) * 18); c.lineTo(fx.x + Math.cos(angle) * 100, fx.y + Math.sin(angle) * 42); c.stroke() }
    } else if (theme === 'blood') {
      c.beginPath(); c.arc(fx.x, fx.y, 72 + progress * 24, .12, Math.PI - .12); c.stroke(); c.beginPath(); c.arc(fx.x, fx.y, 43, Math.PI + .2, Math.PI * 2 - .2); c.stroke()
    } else if (theme === 'tide') {
      c.beginPath(); for (let step = 0; step <= 24; step++) { const x = fx.x - 105 + step * 9; const y = fx.y + Math.sin(step * .72 + progress * 8) * (10 + progress * 13); if (step === 0) c.moveTo(x, y); else c.lineTo(x, y) } c.stroke()
    } else if (theme === 'ash') {
      for (let shard = 0; shard < 7; shard++) { const x = fx.x - 80 + shard * 25; const y = fx.y + (shard % 2 ? 12 : -12); c.beginPath(); c.moveTo(x, y - 19); c.lineTo(x + 8, y + 8); c.lineTo(x - 6, y + 5); c.closePath(); c.stroke() }
    } else if (theme === 'star') {
      for (let ray = 0; ray < 4; ray++) { const angle = (Math.PI * ray) / 4; c.beginPath(); c.moveTo(fx.x - Math.cos(angle) * 95, fx.y - Math.sin(angle) * 35); c.lineTo(fx.x + Math.cos(angle) * 95, fx.y + Math.sin(angle) * 35); c.stroke() }
    } else {
      c.setLineDash(theme === 'void' ? [5, 4] : []); c.beginPath(); c.moveTo(fx.x - 100, fx.y); c.lineTo(fx.x + 105, fx.y); c.stroke(); c.setLineDash([])
      if (theme === 'ember') { c.fillStyle = '#f6c46c'; c.beginPath(); c.arc(fx.x, fx.y, 10 + progress * 12, 0, Math.PI * 2); c.fill() }
    }
  } else if (fx.kind === 'enemy-swipe') {
    c.strokeStyle = '#df9b75'; c.lineWidth = 5; c.beginPath(); c.arc(fx.x + (fx.direction ?? 1) * 20, fx.y, 24 + progress * 20, (fx.direction ?? 1) > 0 ? -.7 : 2.3, (fx.direction ?? 1) > 0 ? .9 : 4); c.stroke()
  } else if (fx.kind === 'dust') {
    c.fillStyle = '#d4c08c'; c.beginPath(); c.ellipse(fx.x, fx.y, 14 + progress * 25, 4 + progress * 4, 0, 0, Math.PI * 2); c.fill()
  } else {
    c.fillStyle = fx.kind === 'enemy-hit' ? '#e57f68' : '#f5d58d'; c.beginPath(); c.arc(fx.x, fx.y, 5 + progress * 13, 0, Math.PI * 2); c.fill()
  }
  c.restore()
}
function drawPotionDrops(c: CanvasRenderingContext2D) {
  if (scene !== 'battle' || !game) return
  const drops = game.drops ?? []
  for (const drop of drops) {
    const x = drop.x
    const y = world.floor - 13 + Math.sin(performance.now() / 180 + x) * 2
    const color = drop.type === 'hp-potion' ? '#e67a67' : '#6cb9d0'
    c.save(); c.shadowColor = color; c.shadowBlur = 12; c.fillStyle = color
    c.fillRect(x - 6, y - 8, 12, 15); c.fillRect(x - 3, y - 12, 6, 4)
    c.fillStyle = '#f1e5c1'
    if (drop.type === 'hp-potion') { c.fillRect(x - 1, y - 5, 2, 9); c.fillRect(x - 4, y - 2, 8, 2) }
    else { c.beginPath(); c.moveTo(x, y - 5); c.lineTo(x + 4, y - 1); c.lineTo(x, y + 4); c.lineTo(x - 4, y - 1); c.closePath(); c.fill() }
    c.restore()
  }
  const nearby = drops.some((drop) => Math.abs(drop.x - heroX) <= 105)
  if (nearby) {
    c.fillStyle = 'rgba(16, 27, 27, .82)'; c.fillRect(heroX - 30, world.floor - 143, 60, 23)
    c.fillStyle = '#e6d7a4'; c.font = '11px sans-serif'; c.textAlign = 'center'; c.fillText('S 拾取', heroX, world.floor - 127)
  }
}
function draw() {
  if (!ctx) return
  ctx.clearRect(0, 0, world.width, world.height); drawBackground(ctx)
  ctx.save()
  if (shake > 0) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake)
  if (scene === 'battle') ctx.translate(-cameraX, 0)
  drawPotionDrops(ctx)
  for (const foe of foes) drawFoe(ctx, foe)
  drawHero(ctx)
  for (const projectile of projectiles) {
    ctx.fillStyle = game?.role === 'mage' ? '#b6e0d0' : '#f2dc9e'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(projectile.x, projectile.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
  }
  if (scene === 'battle') {
    for (const shot of foeShots) {
      ctx.save(); ctx.shadowColor = shot.color; ctx.shadowBlur = 14; ctx.fillStyle = shot.color
      ctx.beginPath(); ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, .65)'; ctx.lineWidth = 1.5; ctx.stroke()
      ctx.globalAlpha = .42; ctx.strokeStyle = shot.color; ctx.lineWidth = shot.radius * .8
      ctx.beginPath(); ctx.moveTo(shot.x - shot.vx * .055, shot.y - shot.vy * .055); ctx.lineTo(shot.x, shot.y); ctx.stroke()
      ctx.restore()
    }
  }
  for (const fx of effects) drawFx(ctx, fx)
  if (game?.role === 'mage' && buffTime > 0) {
    const buffY = world.floor - Math.max(0, -heroY) - 118
    const buffWidth = 88
    ctx.fillStyle = 'rgba(13, 28, 28, .82)'; ctx.fillRect(heroX - buffWidth / 2, buffY - 14, buffWidth, 20)
    ctx.strokeStyle = 'rgba(185, 224, 210, .55)'; ctx.lineWidth = 1; ctx.strokeRect(heroX - buffWidth / 2, buffY - 14, buffWidth, 20)
    ctx.fillStyle = '#c7f0de'; ctx.font = "700 11px 'Microsoft YaHei', sans-serif"; ctx.textAlign = 'center'
    ctx.fillText(`强化 ${buffTime.toFixed(1)}s`, heroX, buffY)
  }
  ctx.restore()
  if (noticeTime > 0) { ctx.fillStyle = 'rgba(13, 28, 28, .86)'; ctx.fillRect(310, 24, 340, 38); ctx.fillStyle = '#e6d5a2'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(notice, 480, 48, 320) }
}
function frame(now: number) { const dt = Math.min((now - lastTime) / 1000, .045); lastTime = now; update(dt); draw(); requestAnimationFrame(frame) }
document.querySelector('#rotate-lock')?.addEventListener('click', () => { void enterLandscape() })
document.querySelector('#rotate-dismiss')?.addEventListener('click', () => document.querySelector('#rotate-hint')?.classList.add('dismissed'))
void boot(); requestAnimationFrame(frame)
