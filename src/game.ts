import './game.css'
import { cloudAvailable, currentCloudUser, fetchCloudProfile, loginCloudUser, logoutCloudUser, registerCloudUser, resetCloudPassword, saveCloudProfile } from './cloud'
import type { CloudProfile, CloudUser } from './cloud'
import { audioEnabled, playSfx, playSkillSfx, setMusicMode, toggleAudio, unlockAudio } from './audio'

type Role = 'warrior' | 'mage'
type Scene = 'title' | 'town' | 'battle' | 'defeat' | 'ending'
type GearType = 'weapon' | 'armor' | 'fashion'
type Gear = { id: string; name: string; level: number; type?: GearType; hp: number; mp?: number; attack: number; defense: number }
type WorldDrop = { id: string; type: 'hp-potion' | 'mp-potion'; x: number }
type AttributeStat = 'hp' | 'attack' | 'mp' | 'defense'
type AttributeAllocation = Record<AttributeStat, number>
type StageProgress = { kills: number; bossDefeated: boolean; pointsClaimed?: number }
type Save = { role: Role; stage: number; unlockedStage: number; kills: number; stageProgress?: Record<string, StageProgress>; hp: number; mp: number; gear: Gear[]; equipped: string | null; weaponId?: string | null; weapon2Id?: string | null; armorId?: string | null; fashionId?: string | null; level?: number; exp?: number; drops?: WorldDrop[]; bossDefeated?: boolean; attributePoints?: number; attributeAllocation?: AttributeAllocation; soul?: number; normalTalent?: number; advancedTalent?: number; talentFragments?: number; talentCoins?: number; lotteryChances?: number; shopFashionBought?: boolean; stamps?: number; tutorialDone?: boolean; hiddenCleared?: boolean; rivalTrust?: boolean; stage8Choice?: 'save' | 'chase' | 'together' | null; rescuedRock?: boolean; rescuedXiaoman?: boolean; rescuedZhou?: boolean; seenStories?: string[]; forgeIntroSeen?: boolean; shopIntroSeen?: boolean; lotteryIntroSeen?: boolean; townIntroSeen?: boolean; town: boolean; completed: boolean; dead: boolean }
type SaveSlot = { id: string; label: string; data: Save; updatedAt: number }
type Foe = { id: number; x: number; hp: number; maxHp: number; boss: boolean; timer: number; skillTimer: number; rangedTimer: number; flash: number; attackAnim: number; flying?: boolean; flyHeight?: number; flyPhase?: number; flyAmplitude?: number; flySpeed?: number; dashWindup?: number; dashDirection?: number; rangedWindup?: number; stunTimer?: number; specialTimer?: number; specialWindup?: number; specialKind?: 'pierce' | 'exclusive'; specialNext?: 'pierce' | 'exclusive'; mobSkillTimer?: number; skillWindup?: number; skillKind?: 'lunge' | 'slam'; tutorial?: boolean; mirror?: boolean; mirrorRole?: Role; mp?: number; mirrorSkillTimer?: number; mirrorWindup?: number; mirrorSkill?: number; mirrorBuffTimer?: number; mirrorBurst?: number; mirrorBurstWait?: number }
type Fx = { x: number; y: number; life: number; kind: string; direction?: number; text?: string; damage?: number; duration?: number; vx?: number; vy?: number; color?: string; radius?: number }
type Projectile = { x: number; y: number; vx: number; life: number; damage: number; targetId: number }
type FoeShot = { x: number; y: number; vx: number; vy: number; damage: number; radius: number; color: string; life: number }
type BossVictory = { stage: number; bossX: number; rewards: string[]; time: number; ending: boolean }
type StoryLine = { speaker: string; text: string }
type StoryChoice = { label: string; value: string; requires?: () => boolean }
type StoryData = { id: string; title?: string; lines: StoryLine[]; choices?: StoryChoice[] }
type BattlePlatform = { x: number; w: number; height: number; kind: 'tree' | 'rock' | 'ruin' | 'crystal' }

const SAVE_KEY = 'elemental-expedition-save-v2'
const DEMO_MODE = import.meta.env.MODE === 'demo'
const DEMO_SAVE_KEY = `${SAVE_KEY}:demo`
const GAME_VERSION = '1.67'
const stageNames = ['苔痕边境', '沉钟矿道', '赤岩峡谷', '风蚀高原', '幽蓝沼泽', '断星回廊', '灰烬王庭', '深渊裂谷', '苍白圣所', '终焉之门']
const roleLabels: Record<Role, string> = { warrior: '战士', mage: '法师' }
const skillLabels: Record<Role, string[]> = { warrior: ['前斩', '旋风斩', '突刺', '蓄力重斩'], mage: ['奥术强化', '双生火柱', '闪现', '能量禁锢'] }
const gearNames: Record<GearType, string[]> = { weapon: ['巡林者长剑', '碎岩战斧', '星火法杖', '守誓者之刃'], armor: ['苔纹护甲', '沉钟胸甲', '赤岩重铠', '星辉法袍'], fashion: ['时装'] }
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
  { mobHp: 500, mobAtk: 50, bossHp: 4000, bossAtk: 150 },
  { mobHp: 700, mobAtk: 70, bossHp: 9000, bossAtk: 200 },
  { mobHp: 1000, mobAtk: 100, bossHp: 15000, bossAtk: 300 },
  { mobHp: 1400, mobAtk: 140, bossHp: 22000, bossAtk: 450 },
  { mobHp: 1900, mobAtk: 190, bossHp: 30000, bossAtk: 650 },
  { mobHp: 2500, mobAtk: 250, bossHp: 39000, bossAtk: 900 },
  { mobHp: 3200, mobAtk: 320, bossHp: 49000, bossAtk: 1200 },
  { mobHp: 4000, mobAtk: 400, bossHp: 60000, bossAtk: 1550 },
  { mobHp: 4900, mobAtk: 490, bossHp: 72000, bossAtk: 1950 },
  { mobHp: 5900, mobAtk: 590, bossHp: 85000, bossAtk: 2400 },
]
const STAMP_UNLOCK = 10
const STAMP_DROP_CHANCE = .4
const OTHER_ROLE: Record<Role, Role> = { warrior: 'mage', mage: 'warrior' }
// 第 11 关（隐藏关卡）对应的 Boss 数值。
const HIDDEN_CONFIG = { bossHp: 99000, bossAtk: 2900, mp: 1000 }
const TALENT_FRAGMENTS_PER_COIN = 10
const ADVANCED_TALENT_COST = 3
const TOWN_NPC_X = 560
const TOWN_CIRCLE_X = 480
const TOWN_NPC_NAME = '阿岩'
const NORMAL_TALENTS = [
  { id: 1, name: '生命祝福', desc: '生命上限 +10%' },
  { id: 2, name: '锋锐', desc: '攻击力 +10%' },
  { id: 3, name: '守护', desc: '防御力 +20%' },
  { id: 4, name: '灵泉', desc: '法力上限 +5%' },
]
const ADVANCED_TALENTS = [
  { id: 1, name: '奥术精通', desc: '法力上限 +5%，技能伤害 +10%，所有技能蓝耗 +5%' },
  { id: 2, name: '生命转换', desc: '将生命上限的 1% 转化为法力上限' },
  { id: 3, name: '双持专精', desc: '可以额外装备一把武器' },
]
// 时装阶级可无限向上合成：每阶生命/攻击/蓝量各 +5%，防御额外多 5%。
function fashionTierStats(tier: number) {
  const level = Math.max(1, Math.floor(tier))
  return {
    hpPct: .05 * level,
    atkFlat: 10 * level,
    atkPct: .05 * level,
    defFlat: 10 * level,
    defPct: .05 + .05 * level,
    mpFlat: 10 * level,
    mpPct: .05 * level,
  }
}
function fashionTierName(tier: number) {
  const names = ['一阶时装', '二阶时装', '三阶时装', '四阶时装']
  return names[tier - 1] ?? `${tier} 阶时装`
}
const SHOP_ITEMS = [
  { id: 'armor1', name: '一阶护甲 ×1', cost: 1000, desc: '随机一件 1 级护甲' },
  { id: 'weapon1', name: '一阶武器 ×1', cost: 1000, desc: '随机一件 1 级武器' },
  { id: 'fragments2', name: '天赋币碎片 ×2', cost: 2000, desc: '用于合成天赋币' },
  { id: 'fashion1', name: '一阶时装 ×1', cost: 10000, desc: '限购一份；小怪与 Boss 不会掉落', unique: true },
]
const LOTTERY_PRIZES = [
  { id: 'attr', label: '属性点 +10', weight: 20 },
  { id: 'gear2', label: '当前品阶装备 ×2', weight: 10 },
  { id: 'coin', label: '天赋币 ×1', weight: 10 },
  { id: 'soul', label: '灵魂 ×2000', weight: 40 },
  { id: 'fashion', label: '一阶时装 ×1', weight: 5 },
  { id: 'empty', label: '空奖', weight: 5 },
  { id: 'gearHigh', label: '高一级装备 ×1', weight: 10 },
]
const ATTRIBUTE_STEP: Record<AttributeStat, number> = { hp: 10, attack: 1, mp: 1, defense: 1 }
const ATTRIBUTE_POINT_CAP_PER_STAGE = 20
const MAX_SMALL_KILLS = 50
const POTION_DROP_CHANCE = .15
const MAP_LEFT = 40
const TOWN_LEFT = 150
const TOWN_RIGHT = 810
const BASE_MAP_WIDTH = 1280
const MAP_SEGMENT = 480
const WAVE_SIZE = 5
const BOSS_ARENA_WIDTH = 640
// 第 4 关起部分小怪会飞行；第 8 关（血牙蛮兵）保持地面。
const FLYING_CHANCES = [0, 0, 0, .35, .3, .45, .35, 0, .3, .45]
const PLATFORM_LAYOUT = [
  { x: 360, height: 92, w: 120 },
  { x: 760, height: 132, w: 100 },
  { x: 1220, height: 96, w: 140 },
  { x: 1740, height: 150, w: 110 },
  { x: 2380, height: 110, w: 130 },
  { x: 3100, height: 138, w: 120 },
  { x: 4000, height: 104, w: 150 },
  { x: 5200, height: 128, w: 120 },
]
const PLATFORM_KINDS: BattlePlatform['kind'][] = ['tree', 'rock', 'ruin', 'crystal']

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
// 第 4 关起小怪也会使用远程攻击，越往后弹幕越多。
const MOB_RANGED: Array<BossRangedConfig | null> = [
  null,
  null,
  null,
  { count: 1, spread: 0, interval: 5.2, speed: 250, damageScale: .7 },
  { count: 1, spread: .14, interval: 4.8, speed: 260, damageScale: .72 },
  { count: 2, spread: .24, interval: 4.4, speed: 275, damageScale: .75 },
  { count: 2, spread: .32, interval: 4.0, speed: 290, damageScale: .78 },
  { count: 3, spread: .42, interval: 3.7, speed: 305, damageScale: .8 },
  { count: 3, spread: .52, interval: 3.4, speed: 320, damageScale: .82 },
  { count: 4, spread: .65, interval: 3.1, speed: 335, damageScale: .85 },
]
// 第 7 关起 Boss 拥有贯穿类和主题专属技能，二者交替使用。
const BOSS_SPECIAL_COOLDOWNS = [0, 0, 0, 0, 0, 0, 8.2, 7.6, 7.0, 6.4]
const BOSS_SPECIAL_NAMES: Array<{ pierce: string; exclusive: string } | null> = [
  null,
  null,
  null,
  null,
  null,
  null,
  { pierce: '灰烬贯穿', exclusive: '灰烬风暴' },
  { pierce: '血牙贯穿', exclusive: '血牙裂地' },
  { pierce: '圣光贯穿', exclusive: '日轮审判' },
  { pierce: '星轨贯穿', exclusive: '星辰陨落' },
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
let currentSaveKey = DEMO_MODE ? DEMO_SAVE_KEY : SAVE_KEY
let saveSlots: SaveSlot[] = readSaves(currentSaveKey)
let activeSlotId: string | null = null
let authState: 'loading' | 'auth' | 'game' = DEMO_MODE ? 'game' : cloudAvailable() ? 'loading' : 'game'
let authView: 'login' | 'register' | 'forgot' = 'login'
let authMessage = ''
let authBusy = false
let cloudUser: CloudUser | null = null
let cloudProfileId: string | null = null
let cloudSyncTimer: number | null = null
let offlineMode = DEMO_MODE || !cloudAvailable()
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
let flashTime = 0
let flashColor = '#ffe6a8'
let shieldActive = false
let shieldLocked = false
let bagOpen = false
let bagTab: 'gear' | 'talent' | 'other' = 'gear'
let craftingOpen = false
let attributesOpen = false
let npcOpen = false
let stageCircleOpen = false
let npcView: 'menu' | 'shop' | 'talent' = 'menu'
let lotteryOpen = false
let lotterySpinning = false
let lotteryHighlight = -1
let lotteryResult: string | null = null
let lotteryInterval: number | null = null
let lotteryTimeout: number | null = null
let effects: Fx[] = []
let keys = new Set<string>()
let logText = '小镇的篝火仍亮着，选择一片已开放的遗迹。'
let notice = ''
let noticeTime = 0
let lastTime = performance.now()
let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let bossVictory: BossVictory | null = null
let storyState: StoryData | null = null
let storyIndex = 0
let storyOnComplete: ((choice?: string) => void) | null = null
let tutorialMode = false
let tutorialStep = 0
let hiddenBattle = false
let heroSupportTop = world.floor

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
// 体验版专用：解锁全部关卡，并标记为已通关，方便直接挑战任意 Boss。
function applyDemoUnlock(save: Save) {
  if (!DEMO_MODE) return save
  save.unlockedStage = 10
  save.stageProgress ??= {}
  for (let stage = 1; stage <= 10; stage++) {
    const progress = save.stageProgress[String(stage)] ?? { kills: 0, bossDefeated: false, pointsClaimed: 0 }
    // 其它关卡标记为已通关，方便直接挑战 Boss；当前关卡保留真实进度，便于体验继续/重开。
    progress.bossDefeated = stage === save.stage ? Boolean(save.bossDefeated) : true
    progress.pointsClaimed ??= 0
    save.stageProgress[String(stage)] = progress
  }
  return save
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
  data.soul ??= 0
  data.normalTalent ??= 0
  data.advancedTalent ??= 0
  data.talentFragments ??= 0
  data.talentCoins ??= 0
  data.lotteryChances ??= 0
  data.shopFashionBought ??= false
  data.stamps ??= 0
  data.tutorialDone ??= true
  data.hiddenCleared ??= false
  data.rivalTrust ??= false
  data.stage8Choice ??= null
  data.rescuedRock ??= false
  data.rescuedXiaoman ??= false
  data.rescuedZhou ??= false
  data.seenStories ??= []
  data.forgeIntroSeen ??= false
  data.shopIntroSeen ??= false
  data.lotteryIntroSeen ??= false
  data.townIntroSeen ??= false
  data.weapon2Id ??= null
  data.fashionId ??= null
  if (data.weapon2Id && (data.weapon2Id === data.weaponId || !data.gear.some((gear) => gear.id === data.weapon2Id && gear.type === 'weapon'))) data.weapon2Id = null
  if (data.fashionId && !data.gear.some((gear) => gear.id === data.fashionId && gear.type === 'fashion')) data.fashionId = null
  data.stageProgress ??= {}
  data.stageProgress[String(data.stage)] ??= { kills: data.kills, bossDefeated: data.bossDefeated }
  for (const progress of Object.values(data.stageProgress)) progress.pointsClaimed ??= 0
  if (data.weaponId === undefined) data.weaponId = data.gear.find((gear) => gear.type === 'weapon' || (!gear.type && gear.id === data.equipped))?.id ?? null
  if (data.armorId === undefined) data.armorId = data.gear.find((gear) => gear.type === 'armor')?.id ?? null
  for (const gear of data.gear) {
    if (!gear.type) continue
    if (gear.type === 'fashion') { gear.hp = 0; gear.defense = 0; gear.attack = 0; gear.mp = 0; continue }
    const values = gearStats(gear.level)
    gear.hp = gear.type === 'armor' ? values.hp : 0
    gear.defense = gear.type === 'armor' ? values.defense : 0
    gear.attack = gear.type === 'weapon' ? values.attack : 0
    gear.mp = gear.type === 'weapon' ? values.mp : 0
  }
  while (data.exp >= xpToNext(data.level)) { data.exp -= xpToNext(data.level); data.level += 1 }
  return applyDemoUnlock(data)
}
function xpToNext(level: number) { return level <= xpThresholds.length ? xpThresholds[level - 1] : xpThresholds[xpThresholds.length - 1] * 2 ** (level - xpThresholds.length) }
function compactNumber(value: number) {
  if (!Number.isFinite(value)) return '∞'
  const abs = Math.abs(value)
  if (abs >= 1e12) return `${(value / 1e12).toFixed(1)}万亿`
  if (abs >= 1e8) return `${(value / 1e8).toFixed(1)}亿`
  if (abs >= 1e7) return `${(value / 1e8).toFixed(2)}亿`
  if (abs >= 1e4) return `${(value / 1e4).toFixed(1)}万`
  return String(Math.round(value))
}
// 正式版保持原样显示；体验版的 9999 级属性与资源用紧凑格式显示，避免撑破界面。
function displayNumber(value: number) { return DEMO_MODE ? compactNumber(value) : String(Math.round(value)) }
function displayCurrency(value: number) { return DEMO_MODE ? Math.round(value).toLocaleString('zh-CN') : String(Math.round(value)) }
function item(): Gear | undefined {
  return game?.gear.find((gear) => gear.id === game?.weaponId)
    ?? game?.gear.find((gear) => gear.id === game?.weapon2Id && game?.advancedTalent === 3)
    ?? game?.gear.find((gear) => gear.id === game?.armorId)
    ?? game?.gear.find((gear) => gear.id === game?.fashionId)
    ?? game?.gear.find((gear) => gear.id === game?.equipped)
}
function equippedGear() {
  if (!game) return []
  return game.gear.filter((gear) =>
    gear.id === game?.weaponId
    || (game?.advancedTalent === 3 && gear.id === game?.weapon2Id)
    || gear.id === game?.armorId
    || gear.id === game?.fashionId
    || (!gear.type && gear.id === game?.equipped)
  )
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
  return Math.max(3, Math.round(base - effectiveDefense()))
}
function effectiveDefense() { return stats().defense * (shieldActive ? 10 : 1) }
function stats() {
  const role = game?.role ?? 'warrior'
  const base = ROLE_BASE[role]
  const growth = roleLevelGrowth(role, game?.level ?? 1)
  const gear = equippedGear()
  const legacy = gear.find((entry) => !entry.type)
  const mainWeapon = gear.find((entry) => entry.type === 'weapon' && entry.id === game?.weaponId)
  const offWeapon = game?.advancedTalent === 3 ? gear.find((entry) => entry.type === 'weapon' && entry.id === game?.weapon2Id) : undefined
  const armor = gear.find((entry) => entry.type === 'armor')
  const fashion = gear.find((entry) => entry.type === 'fashion')
  const gearMultiplier = roleGearMultiplier(role)
  const allocation = game?.attributeAllocation ?? { hp: 0, attack: 0, mp: 0, defense: 0 }
  let hp = base.hp + growth.hp + Math.round((armor?.hp ?? legacy?.hp ?? 0) * gearMultiplier) + allocation.hp * ATTRIBUTE_STEP.hp
  let mp = base.mp + growth.mp + Math.round(((mainWeapon?.mp ?? 0) + (offWeapon?.mp ?? 0)) * gearMultiplier) + allocation.mp * ATTRIBUTE_STEP.mp
  let attack = base.attack + growth.attack + Math.round(((mainWeapon?.attack ?? 0) + (offWeapon?.attack ?? 0) + (legacy?.attack ?? 0)) * gearMultiplier) + allocation.attack * ATTRIBUTE_STEP.attack
  let defense = base.defense + growth.defense + Math.round((armor?.defense ?? legacy?.defense ?? 0) * gearMultiplier) + allocation.defense * ATTRIBUTE_STEP.defense
  const fashionStats = fashion ? fashionTierStats(fashion.level) : undefined
  if (fashionStats) {
    hp += Math.round(hp * fashionStats.hpPct)
    mp += fashionStats.mpFlat + Math.round(mp * fashionStats.mpPct)
    attack += fashionStats.atkFlat + Math.round(attack * fashionStats.atkPct)
    defense += fashionStats.defFlat + Math.round(defense * fashionStats.defPct)
  }
  if (game?.normalTalent === 1) hp = Math.round(hp * 1.10)
  else if (game?.normalTalent === 2) attack = Math.round(attack * 1.10)
  else if (game?.normalTalent === 3) defense = Math.round(defense * 1.20)
  else if (game?.normalTalent === 4) mp = Math.round(mp * 1.05)
  if (game?.advancedTalent === 1) mp = Math.round(mp * 1.05)
  if (game?.advancedTalent === 2) {
    const converted = Math.round(hp * .01)
    hp = Math.max(1, hp - converted)
    mp += converted
  }
  const buffMultiplier = role === 'mage' && buffTime > 0 ? 1.1 : 1
  attack = Math.round(attack * buffMultiplier)
  return { hp: Math.round(hp), mp: Math.round(mp), attack: Math.round(attack), defense: Math.round(defense) }
}
function restoreTownVitals() { if (!game) return; game.hp = stats().hp; game.mp = stats().mp }
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
function addFx(kind: string, x = heroX, y = world.floor - 80, direction = 1, life = .56, color?: string) { effects.push({ kind, x, y, direction, life, color }) }
function addDamageText(foe: Foe, damage: number) {
  const offset = foe.tutorial ? 160 : foe.mirror ? 108 : foe.boss ? 205 : 83
  effects.push({ kind: 'damage-number', x: foe.x, y: world.floor - offset - foeFlyOffset(foe), life: .95, duration: .95, text: `-${displayNumber(damage)}`, damage })
}
function addSparks(x: number, y: number, count: number, colors: string[], speed = 150) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const velocity = speed * (.35 + Math.random())
    effects.push({ kind: 'spark', x, y, life: .35 + Math.random() * .35, duration: .7, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity - 40, color: colors[i % colors.length], radius: 1.5 + Math.random() * 2.5 })
  }
}
function addShake(amount: number) { shake = Math.max(shake, amount) }
function addFlash(amount: number, color = '#ffe6a8') { flashTime = Math.max(flashTime, amount); flashColor = color }
function stageIndexNow() { return Math.max(0, Math.min(9, (game?.stage ?? 1) - 1)) }
function platformsForStage(): BattlePlatform[] {
  const stage = hiddenBattle ? 0 : Math.max(0, Math.min(9, (game?.stage ?? 1) - 1))
  return PLATFORM_LAYOUT.map((platform, index) => ({ ...platform, kind: PLATFORM_KINDS[(index + stage) % PLATFORM_KINDS.length] }))
}
function computeUnlockedWidth() {
  if (!game) return BASE_MAP_WIDTH
  if (game.kills >= MAX_SMALL_KILLS) return BASE_MAP_WIDTH + (MAX_SMALL_KILLS / WAVE_SIZE) * MAP_SEGMENT + BOSS_ARENA_WIDTH
  return BASE_MAP_WIDTH + Math.floor(game.kills / WAVE_SIZE) * MAP_SEGMENT
}
function refreshMap() { unlockedWidth = computeUnlockedWidth() }
function clampHeroX(x: number) { return Math.max(MAP_LEFT, Math.min(Math.max(MAP_LEFT, unlockedWidth - 55), x)) }
function clampFoeX(x: number) { return Math.max(MAP_LEFT, Math.min(Math.max(MAP_LEFT, unlockedWidth - 30), x)) }
function updateCamera() {
  cameraX = Math.max(0, Math.min(Math.max(0, unlockedWidth - world.width), heroX - world.width * .42))
}
function foeFlyOffset(foe: Foe) {
  if (!foe.flying) return 0
  const base = foe.flyHeight ?? 0
  const amplitude = foe.flyAmplitude ?? 0
  const speed = foe.flySpeed ?? 1
  return base + Math.sin(performance.now() / 1000 * speed + (foe.flyPhase ?? 0)) * amplitude
}
function foeWorldY(foe: Foe) { return world.floor - foeFlyOffset(foe) }
function foeScreenLeft(foe: Foe) { return `${((foe.x - cameraX) / world.width) * 100}%` }
function spawnFoe(x: number, boss = false, flying = false): Foe {
  const config = STAGE_CONFIG[stageIndexNow()]
  const hp = boss ? config.bossHp : config.mobHp
  const clampedX = Math.max(MAP_LEFT + 20, Math.min(unlockedWidth - 40, x))
  return { id: nextFoeId++, x: clampedX, hp, maxHp: hp, boss, timer: .7 + Math.random() * 1.2, skillTimer: 3.2, rangedTimer: 3.4 + Math.random() * 1.2, flash: 0, attackAnim: 0, flying: boss ? false : flying, flyHeight: !boss && flying ? 120 + Math.random() * 70 : 0, flyPhase: !boss && flying ? Math.random() * Math.PI * 2 : 0, flyAmplitude: !boss && flying ? 16 + Math.random() * 20 : 0, flySpeed: !boss && flying ? .8 + Math.random() * .5 : 0, stunTimer: 0, specialTimer: boss && stageIndexNow() >= 6 ? 4.5 + Math.random() * 1.5 : 0, specialNext: boss ? 'pierce' : undefined, mobSkillTimer: !boss && stageIndexNow() >= 3 ? 4 + Math.random() * 3 : 0 }
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
  // 伤害在命中时按玩家当前防御结算，护盾可以及时生效。
  const damage = stageValues.bossAtk * config.damageScale
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
function fireShotFan(originX: number, originY: number, targetX: number, count: number, spread: number, speed: number, rawDamage: number, color: string, radius = 9, life = 4) {
  const targetY = world.floor - 55
  const baseAngle = Math.atan2(targetY - originY, targetX - originX)
  for (let i = 0; i < count; i++) {
    const offset = count === 1
      ? 0
      : spread >= Math.PI * 2 - .01
        ? (Math.PI * 2 * i) / count
        : -spread / 2 + (spread * i) / (count - 1)
    const angle = baseAngle + offset
    foeShots.push({ x: originX, y: originY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, damage: rawDamage, radius: count > 6 ? Math.min(radius, 7) : radius, color, life })
  }
}
function hurtPlayer(rawDamage: number, shakeAmount = 0) {
  if (!game) return 0
  const dealt = Math.max(3, Math.round(rawDamage - effectiveDefense()))
  game.hp = Math.max(0, game.hp - dealt)
  effects.push({ kind: 'damage-number', x: heroX, y: world.floor - 90 + heroY, life: .85, duration: .85, text: `-${displayNumber(dealt)}`, damage: dealt })
  armorHitFx()
  if (shakeAmount) addShake(shakeAmount)
  if (game.hp <= 0) { scene = 'defeat'; paused = false; game.dead = true; save(); renderGame() }
  return dealt
}
function fireMobVolley(foe: Foe, config: BossRangedConfig, stageIndex: number) {
  const stageValues = STAGE_CONFIG[stageIndex]
  const theme = STAGE_THEMES[stageIndex]
  const originY = foe.flying ? foeWorldY(foe) - 10 : world.floor - 36
  fireShotFan(foe.x, originY, heroX, config.count, config.spread, config.speed, stageValues.mobAtk * config.damageScale, theme.glow, 8)
  addFx('mob-ranged-fire', foe.x, originY, Math.sign(heroX - foe.x) || 1, .36, theme.glow)
  addSparks(foe.x, originY, 8, [theme.light, theme.glow], 130)
  addShake(2)
  setLog('遗迹守卫发射远程弹幕！')
}
function executeMobSkill(foe: Foe, stageIndex: number) {
  if (!game) return
  const config = STAGE_CONFIG[stageIndex]
  const theme = STAGE_THEMES[stageIndex]
  if (foe.skillKind === 'lunge') {
    const direction = Math.sign(heroX - foe.x) || 1
    const startX = foe.x
    foe.x = clampFoeX(foe.x + direction * 120)
    foe.attackAnim = .3
    addFx('mob-skill-lunge-execute', (startX + foe.x) / 2, foeWorldY(foe) - 18, direction, .42, theme.glow)
    addSparks(foe.x, foeWorldY(foe) - 16, 8, [theme.accent, theme.glow], 150)
    if (Math.abs(heroX - foe.x) < 95 && (heroY > -36)) hurtPlayer(config.mobAtk * 1.6, 5)
    setLog('遗迹守卫冲撞！')
  } else {
    addFx('mob-skill-slam-execute', foe.x, world.floor - 4, 1, .65, theme.glow)
    addSparks(foe.x, world.floor - 8, 16, [theme.accent, theme.glow], 220)
    addShake(7)
    if (Math.abs(heroX - foe.x) < 155 && (heroY > -40)) hurtPlayer(config.mobAtk * 1.5, 6)
    setLog('遗迹守卫震地！')
  }
}
function startBossSpecial(foe: Foe, stageIndex: number) {
  if (!game) return
  const special = BOSS_SPECIAL_NAMES[stageIndex]
  if (!special) return
  const kind = foe.specialNext ?? 'pierce'
  const name = kind === 'pierce' ? special.pierce : special.exclusive
  const duration = kind === 'pierce' ? .85 : 1.05
  const theme = BOSS_THEMES[stageIndex]
  const color = BOSS_THEME_COLORS[theme] ?? '#d78fb4'
  const direction = Math.sign(heroX - foe.x) || 1
  foe.specialKind = kind
  foe.specialWindup = duration
  foe.specialTimer = BOSS_SPECIAL_COOLDOWNS[stageIndex] ?? 8
  foe.specialNext = kind === 'pierce' ? 'exclusive' : 'pierce'
  foe.flash = .2; foe.attackAnim = .5
  effects.push({ kind: `boss-special-windup-${kind}-${theme}`, x: foe.x, y: world.floor - 120, direction, life: duration, duration, color, text: name })
  addSparks(foe.x, world.floor - 105, 12, [color, '#fff6d0'], 130)
  addShake(4)
  playSfx('boss')
  setLog(`守关者正在蓄力「${name}」· 注意前摇！`)
}
function executeBossSpecial(foe: Foe, kind: 'pierce' | 'exclusive', stageIndex: number) {
  if (!game) return
  const stageValues = STAGE_CONFIG[stageIndex]
  const color = BOSS_THEME_COLORS[BOSS_THEMES[stageIndex]] ?? '#d78fb4'
  const direction = Math.sign(heroX - foe.x) || 1
  const originY = world.floor - 70
  const name = BOSS_SPECIAL_NAMES[stageIndex]?.exclusive ?? '专属技能'
  if (kind === 'pierce') {
    fireShotFan(foe.x, originY, heroX, 1, 0, 520, stageValues.bossAtk * 2.2, color, 16, 3)
    addFx('boss-special-beam', foe.x, originY, direction, .6, color)
    addSparks(foe.x, originY, 18, [color, '#ffffff'], 240)
    addShake(10)
    setLog('守关者释放贯穿光束！')
    return
  }
  if (stageIndex === 6) {
    fireShotFan(foe.x, originY, heroX, 8, 1.15, 300, stageValues.bossAtk * .75, color, 8)
    addFx('boss-special-nova-ash', foe.x, world.floor - 80, direction, .85, color)
    addShake(9)
  } else if (stageIndex === 7) {
    addFx('boss-special-nova-blood', foe.x, world.floor - 18, direction, .95, color)
    addSparks(foe.x, world.floor - 8, 22, [color, '#ffd0b0'], 260)
    if (Math.abs(heroX - foe.x) < 230 && (heroY > -40)) hurtPlayer(stageValues.bossAtk * 2.5, 16)
    addShake(14)
  } else if (stageIndex === 8) {
    fireShotFan(foe.x, originY, heroX, 12, Math.PI * 2, 320, stageValues.bossAtk * .65, color, 7)
    addFx('boss-special-nova-sun', foe.x, world.floor - 80, direction, 1.0, color)
    addShake(10)
  } else {
    fireShotFan(foe.x, originY, heroX, 10, 1.5, 340, stageValues.bossAtk * .75, color, 7)
    fireShotFan(foe.x, originY, heroX, 1, 0, 220, stageValues.bossAtk * 1.6, '#fff2b0', 18, 3)
    addFx('boss-special-nova-star', foe.x, world.floor - 80, direction, 1.1, color)
    addShake(12)
  }
  setLog(`守关者释放「${name}」！`)
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
function spawnTutorialBoss(): Foe {
  return { id: nextFoeId++, x: Math.min(BASE_MAP_WIDTH - 100, heroX + 300), hp: 1000, maxHp: 1000, boss: true, tutorial: true, timer: 999, skillTimer: 999, rangedTimer: 999, flash: 0, attackAnim: 0, stunTimer: 0 }
}
function tutorialHintText() {
  if (!tutorialMode) return ''
  return [
    '目标 1 / 5：按 A / D 或 ← → 移动',
    '目标 2 / 5：按 J 或攻击键，攻击训练傀儡',
    '目标 3 / 5：按 K 跳跃，空中再按 K 二段跳',
    '目标 4 / 5：按 1–4 或技能键，释放一次技能',
    '训练完成！击败训练傀儡',
  ][Math.min(4, tutorialStep)]
}
function tutorialHintMarkup() {
  if (!tutorialMode) return ''
  return `<div class="tutorial-hint"><b>新手引导</b><span>${tutorialHintText()}</span></div>`
}
function updateTutorialHint() {
  const label = document.querySelector<HTMLElement>('.tutorial-hint span')
  if (label) label.textContent = tutorialHintText()
}
function advanceTutorialStep(next: number) {
  if (!tutorialMode || next <= tutorialStep) return
  tutorialStep = Math.min(4, next)
  updateTutorialHint()
  if (tutorialStep === 4) toast('训练目标完成！训练傀儡现在可以受到伤害。')
}
function beginTutorial() {
  if (!game) return
  tutorialMode = true
  tutorialStep = 0
  hiddenBattle = false
  scene = 'battle'
  game.town = false; game.dead = false; game.completed = false
  paused = false
  heroX = 480; heroY = 0; velocityY = 0; grounded = true; jumpCount = 0; facing = 1; heroSupportTop = world.floor
  unlockedWidth = BASE_MAP_WIDTH
  cameraX = 0
  buffTime = 0; burst = 0; burstTargetId = null; shake = 0
  projectiles = []; foeShots = []; effects = []
  foes = [spawnTutorialBoss()]
  waveReady = false; bossPending = false
  game.hp = stats().hp; game.mp = stats().mp
  resetPanels()
  save()
  if (!seenStory('tutorial-intro')) startStory(tutorialIntroStoryData(), () => { save(); renderGame() })
  else renderGame()
}
function spawnMirror(): Foe {
  const mirrorRole = game ? OTHER_ROLE[game.role] : 'mage'
  return { id: nextFoeId++, x: Math.min(BASE_MAP_WIDTH - 120, heroX + 320), hp: HIDDEN_CONFIG.bossHp, maxHp: HIDDEN_CONFIG.bossHp, boss: true, mirror: true, mirrorRole, mp: HIDDEN_CONFIG.mp, timer: 1.3, skillTimer: 999, rangedTimer: 999, flash: 0, attackAnim: 0, stunTimer: 0, mirrorSkillTimer: 2.8, mirrorSkill: -1 }
}
function beginHiddenBattle() {
  if (!game) return
  if (!hiddenUnlocked()) { toast(`集齐 ${STAMP_UNLOCK} 枚王印印章后才能挑战宿敌。`); return }
  hiddenBattle = true
  tutorialMode = false
  scene = 'battle'
  game.town = true; game.dead = false
  paused = false
  heroX = 480; heroY = 0; velocityY = 0; grounded = true; heroSupportTop = world.floor; jumpCount = 0; facing = 1
  unlockedWidth = BASE_MAP_WIDTH; cameraX = 0
  buffTime = 0; burst = 0; burstTargetId = null; shake = 0
  projectiles = []; foeShots = []; effects = []
  foes = [spawnMirror()]
  waveReady = false; bossPending = false
  game.hp = stats().hp; game.mp = stats().mp
  resetPanels()
  save()
  if (!seenStory('hidden-intro')) startStory(hiddenStoryData(), () => { save(); renderGame() })
  else renderGame()
}
function executeMirrorSkill(foe: Foe, skill: number) {
  if (!game) return
  const role = foe.mirrorRole ?? 'mage'
  const direction = Math.sign(heroX - foe.x) || 1
  const attack = HIDDEN_CONFIG.bossAtk * ((foe.mirrorBuffTimer ?? 0) > 0 ? 1.1 : 1)
  const color = '#c9a7e8'
  if (role === 'warrior') {
    if (skill === 0) {
      if (Math.abs(heroX - foe.x) < 190) hurtPlayer(attack * 1.5, 5)
      addFx('front-slash', heroX, world.floor - 62 + heroY, direction, .6, color)
    } else if (skill === 1) {
      if (Math.abs(heroX - foe.x) < 240) hurtPlayer(attack * 1.5, 6)
      addFx('whirlwind-storm', foe.x, world.floor - 82 + heroY, direction, .8, color)
      addShake(5)
    } else if (skill === 2) {
      foe.x = clampFoeX(foe.x + direction * 160)
      addFx('thrust-dash', foe.x, world.floor - 70 + heroY, direction, .5, color)
      if (Math.abs(heroX - foe.x) < 110) hurtPlayer(attack, 5)
    } else {
      if (Math.abs(heroX - foe.x) < 220) hurtPlayer(attack * 2, 12)
      addFx('great-slash', foe.x + direction * 70, world.floor - 80 + heroY, direction, 1, color)
      addFx('ground-break', foe.x + direction * 60, world.floor - 70, direction, .8)
      addShake(14)
    }
    setLog(`宿敌释放「${skillLabels.warrior[skill]}」！`)
  } else {
    if (skill === 0) {
      foe.mirrorBuffTimer = 7
      addFx('arcane-blessing', foe.x, world.floor - 88, direction, 1, color)
      addSparks(foe.x, world.floor - 70, 10, [color, '#e6ddb0'], 90)
      setLog('宿敌释放「奥术强化」！')
    } else if (skill === 1) {
      const center = foe.x + direction * 150
      addFx('twin-fire-pillars', center, world.floor - 2, direction, .9)
      if (Math.abs(heroX - foe.x) < 320) hurtPlayer(attack * 1.6, 6)
      addShake(5)
      setLog('宿敌释放「双生火柱」！')
    } else if (skill === 2) {
      const away = Math.abs(heroX - foe.x) < 190
      foe.x = clampFoeX(foe.x + (away ? -direction : direction) * 180)
      addFx('blink-rift', foe.x, world.floor - 65, direction, .4, color)
      setLog('宿敌释放「闪现」！')
    } else {
      foe.mirrorBurst = 5
      foe.mirrorBurstWait = .06
      addFx('energy-prison', heroX, world.floor - 80, direction, 1.1, color)
      setLog('宿敌释放「能量禁锢」！没有眩晕，但会连续命中 5 次。')
    }
  }
}
function updateMirrorFoe(foe: Foe, dt: number, distance: number, direction: number) {
  if (!game) return
  foe.mp = Math.min(HIDDEN_CONFIG.mp, (foe.mp ?? 0) + dt * 4)
  foe.mirrorBuffTimer = Math.max(0, (foe.mirrorBuffTimer ?? 0) - dt)
  if ((foe.mirrorBurst ?? 0) > 0) {
    foe.mirrorBurstWait = (foe.mirrorBurstWait ?? 0) - dt
    if (foe.mirrorBurstWait <= 0) {
      foe.mirrorBurstWait = .1
      foe.mirrorBurst = (foe.mirrorBurst ?? 0) - 1
      if (Math.abs(heroX - foe.x) < 320) {
        hurtPlayer(HIDDEN_CONFIG.bossAtk * .35, 2)
        addFx('arcane-bolt-hit', heroX, world.floor - 70 + heroY, Math.sign(foe.x - heroX) || 1, .35, '#c9a7e8')
      }
    }
    return
  }
  if (foe.mirrorWindup !== undefined) {
    foe.mirrorWindup -= dt
    if (foe.mirrorWindup <= 0) {
      const skill = foe.mirrorSkill ?? 0
      foe.mirrorWindup = undefined
      executeMirrorSkill(foe, skill)
      foe.attackAnim = .35
    }
    return
  }
  const speed = foe.mirrorRole === 'mage' ? 95 : 120
  if (Math.abs(distance) > (foe.mirrorRole === 'mage' ? 210 : 120)) foe.x = clampFoeX(foe.x + direction * speed * dt)
  else if (foe.mirrorRole === 'mage' && Math.abs(distance) < 105) foe.x = clampFoeX(foe.x - direction * 80 * dt)
  foe.timer -= dt
  if (foe.timer <= 0 && Math.abs(heroX - foe.x) < 125) {
    hurtPlayer(HIDDEN_CONFIG.bossAtk * .35, 4)
    foe.timer = 1.15
    foe.attackAnim = .3
    addFx('enemy-swipe', heroX, world.floor - 52 + heroY, -direction, .35)
  }
  foe.mirrorSkillTimer = Math.max(0, (foe.mirrorSkillTimer ?? 0) - dt)
  if (foe.mirrorSkillTimer <= 0 && Math.abs(distance) < 560) {
    const role = foe.mirrorRole ?? 'mage'
    let skill = ((foe.mirrorSkill ?? -1) + 1) % 4
    let cost = SKILL_COSTS[role][skill]
    if ((foe.mp ?? 0) < cost) { skill = 0; cost = SKILL_COSTS[role][0] }
    if ((foe.mp ?? 0) >= cost) {
      foe.mp = Math.max(0, (foe.mp ?? 0) - cost)
      foe.mirrorSkill = skill
      foe.mirrorWindup = .5
      foe.mirrorSkillTimer = 3.6 + Math.random() * 1.2
      foe.flash = .18; foe.attackAnim = .4
      const color = '#c9a7e8'
      effects.push({ kind: 'mirror-charge', x: foe.x, y: world.floor - 86, direction, life: .5, duration: .5, color, text: skillLabels[role][skill] })
      addSparks(foe.x, world.floor - 80, 8, [color, '#ffffff'], 100)
      setLog(`宿敌正在蓄力「${skillLabels[role][skill]}」...`)
      playSfx('boss')
    } else {
      foe.mirrorSkillTimer = 2
    }
  }
}
function beginStage(stage: number, mode: 'continue' | 'restart' | 'boss' = 'continue') {
  if (!game) return
  hiddenBattle = false
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
  heroSupportTop = world.floor
  projectiles = []; foeShots = []
  effects = []
  burst = 0; burstTargetId = null; shake = 0
  resetPanels()
  enterBattlefield()
  const storyStarted = startStageStory(stage)
  save()
  if (!storyStarted) renderGame()
}
function start(role: Role, previous?: Save) {
  game = previous ? structuredClone(previous) : freshSave(role)
  applyDemoUnlock(game)
  if (!game.tutorialDone) { beginTutorial(); return }
  game.unlockedStage = Math.min(10, Math.max(game.unlockedStage ?? 1, game.stage))
  scene = game.completed ? 'ending' : game.dead ? 'defeat' : game.town ? 'town' : 'battle'
  paused = false
  heroX = 480; heroY = 0; velocityY = 0; grounded = true; heroSupportTop = world.floor; buffTime = 0; burst = 0; burstTargetId = null; shake = 0; jumpCount = 0; cameraX = 0
  skillWait = [0, 0, 0, 0]; effects = []; projectiles = []; foeShots = []; resetPanels()
  const caps = stats()
  game.hp = Math.min(Math.max(1, game.hp), caps.hp)
  game.mp = Math.min(Math.max(0, game.mp), caps.mp)
  if (scene === 'town') { game.hp = caps.hp; game.mp = caps.mp }
  if (scene === 'battle') enterBattlefield()
  if (scene === 'town' && !game.townIntroSeen) {
    startStory(townIntroStoryData(), () => { if (!game) return; game.townIntroSeen = true; save(); renderGame() })
    return
  }
  save(); render()
}
function freshSave(role: Role): Save {
  const base = ROLE_BASE[role]
  return { role, stage: 1, unlockedStage: 1, kills: 0, hp: base.hp, mp: base.mp, gear: [], equipped: null, weaponId: null, weapon2Id: null, armorId: null, fashionId: null, level: 1, exp: 0, drops: [], bossDefeated: false, attributePoints: 0, attributeAllocation: { hp: 0, attack: 0, mp: 0, defense: 0 }, soul: 0, normalTalent: 0, advancedTalent: 0, talentFragments: 0, talentCoins: 0, lotteryChances: 0, shopFashionBought: false, stamps: 0, tutorialDone: false, hiddenCleared: false, rivalTrust: false, stage8Choice: null, rescuedRock: false, rescuedXiaoman: false, rescuedZhou: false, seenStories: [], forgeIntroSeen: false, shopIntroSeen: false, lotteryIntroSeen: false, townIntroSeen: false, town: true, completed: false, dead: false }
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
// 体验版只允许在本机 localhost 打开，防止被意外部署到公网。
function demoLocalOnly() {
  if (!DEMO_MODE) return false
  const host = location.hostname
  return host !== '' && host !== 'localhost' && host !== '127.0.0.1' && host !== '::1'
}
function renderDemoLocked() {
  app.innerHTML = `<main class="auth-screen"><section class="auth-card demo-lock"><div class="auth-brand"><b>A</b><span><strong>冒险王</strong><small>体验版</small></span></div><h2>体验版仅限本地使用</h2><p>该体验版不会随正式版部署。请在开发机上运行 <code>npm run preview:demo</code>，并通过 <code>localhost</code> 或 <code>127.0.0.1</code> 打开。</p></section></main>`
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
  currentSaveKey = DEMO_MODE ? DEMO_SAVE_KEY : SAVE_KEY
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
  currentSaveKey = DEMO_MODE ? DEMO_SAVE_KEY : SAVE_KEY
  saveSlots = readSaves(currentSaveKey)
  activeSlotId = null
  game = null
  scene = 'title'
  renderTitle()
}
async function boot() {
  if (demoLocalOnly()) {
    authState = 'game'
    renderDemoLocked()
    return
  }
  if (DEMO_MODE) {
    authState = 'game'
    offlineMode = true
    cloudUser = null
    currentSaveKey = DEMO_SAVE_KEY
    saveSlots = readSaves(DEMO_SAVE_KEY)
    render()
    return
  }
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
  const accountBar = DEMO_MODE
    ? `<div class="account-bar offline demo-account"><span><i></i>体验版 · 全部关卡已解锁 · 独立体验存档</span><span class="account-actions">${audioButton}</span></div>`
    : cloudUser
      ? `<div class="account-bar"><span><i></i>云端账号 · ${escapeHtml(cloudUser.username)}</span><span class="account-actions">${audioButton}<button data-action="logout" type="button">退出登录</button></span></div>`
      : `<div class="account-bar offline"><span><i></i>离线模式 · 进度仅保存在本机</span><span class="account-actions">${audioButton}${cloudAvailable() ? '<button data-action="login" type="button">登录 / 注册</button>' : ''}</span></div>`
  const slots = saveSlots.map((slot) => `<article class="save-slot"><span class="save-slot-info"><b>${slot.label}</b><small>${roleLabels[slot.data.role]} · ${slot.data.level ?? 1} 级 · ${slot.data.town ? '小镇' : `第 ${slot.data.stage} 关`} · 击败 ${slot.data.kills}</small></span><button class="save-resume" data-action="resume" data-slot="${slot.id}">继续　↗</button><button class="save-delete" data-action="delete-slot" data-slot="${slot.id}" aria-label="删除${slot.label}" title="删除存档">×</button></article>`).join('')
  const overwriteDialog = pendingRole ? `<div class="slot-scrim"><section class="slot-dialog"><small>存档槽已满 · 3 / 3</small><h2>新建${roleLabels[pendingRole]}存档</h2><p>请选择一个存档槽。覆盖前会再次确认，取消不会改动任何存档。</p>${saveSlots.map((slot) => `<button data-action="overwrite-slot" data-slot="${slot.id}"><span><b>${slot.label}</b><small>${roleLabels[slot.data.role]} · ${slot.data.town ? '小镇' : `第 ${slot.data.stage} 关`}</small></span><i>选择覆盖</i></button>`).join('')}<button class="slot-cancel" data-action="cancel-new">取消</button></section></div>` : ''
  app.innerHTML = `<main class="title-screen"><section class="title-copy"><div class="eyebrow"><i></i> 单机动作 RPG · 十章远征</div><h1>冒险王<span>：元素远征</span></h1><p class="intro">古老遗迹再度苏醒。选择你的职业，穿越十片失落之地，直面守关者。</p>${accountBar}${saveSlots.length ? `<section class="saved-slots"><div class="slots-heading"><span>远征存档</span><small>${saveSlots.length} / 3</small></div>${slots}</section>` : ''}<div class="rule"></div><div class="class-picks"><button class="class-card" data-action="role" data-role="warrior"><b class="role-mark">刃</b><span><strong>新建战士</strong><small>剑刃近战 · 创建独立存档</small></span><i>↗</i></button><button class="class-card" data-action="role" data-role="mage"><b class="role-mark mage-mark">✦</b><span><strong>新建法师</strong><small>法杖远程 · 创建独立存档</small></span><i>↗</i></button></div><footer><span>存档最多 3 个 · 覆盖前确认</span><span class="game-version">版本 ${GAME_VERSION}</span><span>01 — 10</span></footer></section><div class="title-art" aria-hidden="true"><div class="sun"></div><div class="mountains"></div><div class="ruins"><i></i><i></i><i></i></div><div class="silhouette"><b></b><i></i><span></span></div><small>THE LOST FRONTIER <span>遗迹之外，仍有远方</span></small></div></main>${overwriteDialog}`
}
function gearMarkup(canEquip: boolean) {
  if (!game) return ''
  if (!game.gear.length) return '<div class="empty-gear">背包里还没有装备<small>击败遗迹守卫，寻找装备</small></div>'
  const worn = new Set([game.weaponId, game.armorId, game.fashionId])
  if (game.advancedTalent === 3 && game.weapon2Id) worn.add(game.weapon2Id)
  const multiplier = roleGearMultiplier(game.role)
  const scaled = (value: number | undefined) => Math.round((value ?? 0) * multiplier)
  return game.gear.map((gear) => {
    const equipped = worn.has(gear.id) || (!gear.type && game!.equipped === gear.id)
    const type = gear.type === 'weapon' ? '武器' : gear.type === 'armor' ? '护甲' : gear.type === 'fashion' ? '时装' : '旧装备'
    const icon = itemIcon(gear.type ?? 'legacy')
    const details = gear.type === 'fashion'
      ? fashionSummary(gear.level)
      : gear.type === 'weapon'
        ? `蓝量 +${scaled(gear.mp)} · 攻击 +${scaled(gear.attack)}`
        : gear.type === 'armor'
          ? `生命 +${scaled(gear.hp)} · 防御 +${scaled(gear.defense)}`
          : `生命 +${scaled(gear.hp)} · 攻击 +${scaled(gear.attack)} · 防御 +${scaled(gear.defense)}`
    let actions = ''
    if (gear.type === 'weapon' && game!.advancedTalent === 3) {
      const isMain = gear.id === game!.weaponId
      const isOff = gear.id === game!.weapon2Id
      actions = `${isMain ? '<i class="equipped">主手</i>' : `<button data-action="equip-main" data-id="${gear.id}" ${canEquip ? '' : 'disabled'}>主手</button>`}${isOff ? '<i class="equipped">副手</i>' : `<button data-action="equip-off" data-id="${gear.id}" ${canEquip ? '' : 'disabled'}>副手</button>`}`
    } else if (equipped) actions = '<i class="equipped">已装备</i>'
    else {
      actions = `<button data-action="equip" data-id="${gear.id}" ${canEquip ? '' : 'disabled'}>${canEquip ? '穿戴' : '小镇可穿'}</button>`
    }
    return `<article class="gear-row ${equipped ? 'active-gear' : ''}"><span class="gear-glyph ${gear.type ?? 'legacy'}">${icon}</span><span class="gear-copy"><b>${gear.name}</b><small>${type} · ${gear.level} 级 · ${details}</small></span><span class="gear-actions">${actions}</span></article>`
  }).join('')
}
function craftMarkup() {
  if (!game) return '<div class="empty-gear">没有可合成的装备</div>'
  const worn = new Set([game.weaponId, game.armorId, game.fashionId])
  const groups = new Map<string, { type: GearType; level: number; count: number }>()
  for (const gear of game.gear) {
    if (!gear.type || worn.has(gear.id)) continue
    const key = `${gear.type}:${gear.level}`
    const group = groups.get(key) ?? { type: gear.type, level: gear.level, count: 0 }
    group.count += 1
    groups.set(key, group)
  }
  if (!groups.size) return '<div class="empty-gear">没有未穿戴的武器、护甲或时装<small>武器/护甲满 5 件、一阶时装满 3 件后可合成</small></div>'
  return [...groups.values()].sort((a, b) => a.level - b.level || a.type.localeCompare(b.type)).map((group) => {
    const required = group.type === 'fashion' ? 3 : 5
    const label = group.type === 'weapon' ? '武器' : group.type === 'armor' ? '护甲' : '时装'
    const resultLabel = group.type === 'fashion' ? fashionTierName(group.level + 1) : `${group.level + 1} 级`
    return `<article class="craft-row"><span class="gear-glyph">${itemIcon(group.type)}</span><span class="gear-copy"><b>${label} · ${group.level} 级</b><small>${group.count} / ${required} 件未穿戴材料 · 合成后为 ${resultLabel}</small></span><button data-action="synthesize-group" data-type="${group.type}" data-level="${group.level}" ${group.count >= required ? '' : 'disabled'}>合成</button></article>`
  }).join('')
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
  const forgeButton = forgeUnlocked()
    ? '<button class="secondary" data-action="open-crafting">⚒ 合成台</button>'
    : '<button class="secondary" disabled title="通关第一关后解锁">⚒ 合成台 · 第1关解锁</button>'
  const npcButton = npcUnlocked()
    ? `<button class="secondary town-npc" data-action="open-npc">${itemIcon('npc')} ${TOWN_NPC_NAME} · 商人 · S</button>`
    : '<button class="secondary" disabled title="通关第一关后解锁">阿岩 · 第1关解锁</button>'
  const hiddenButton = (current.stamps ?? 0) >= STAMP_UNLOCK
    ? `<button class="secondary town-hidden" data-action="open-hidden">${itemIcon('stamp')} 王印试炼 · 挑战宿敌</button>`
    : ''
  return `<section class="panel town-panel"><header><span>冒险者小镇</span><small>SAFE HAVEN</small></header><p>在镇内自由走动整备；可以跳跃、攻击和练习技能，不消耗法力。走到镇中央的远征法阵按 S 可以直接选择关卡。</p><div class="town-shortcuts">${forgeButton}<button class="secondary" data-action="open-attributes">✦ 属性分配 · ${current.attributePoints ?? 0} 点</button><button class="secondary town-lottery" data-action="open-lottery" ${(current.lotteryChances ?? 0) > 0 ? '' : 'disabled'}>🎟 抽奖 · ${current.lotteryChances ?? 0} 次</button>${npcButton}${hiddenButton}</div><div class="town-currency"><span>${itemIcon('soul')} 灵魂 ${displayCurrency(current.soul ?? 0)}</span><span>${itemIcon('fragment')} 碎片 ${displayCurrency(current.talentFragments ?? 0)}</span><span>${itemIcon('coin')} 天赋币 ${displayCurrency(current.talentCoins ?? 0)}</span><span>${itemIcon('stamp')} 印章 ${displayCurrency(current.stamps ?? 0)} / ${STAMP_UNLOCK}</span></div>${npcUnlocked() ? `<p class="npc-hint">${TOWN_NPC_NAME}已经回到镇上：走到他面前按 S 对话。</p>` : '<p class="npc-hint">通关第一关后，阿岩会出现在镇上。</p>'}${current.completed ? `<p class="stage-progress-copy">十片遗迹皆已沉寂</p><button class="primary" data-action="role-select">返回角色选择</button>` : `<label class="stage-picker"><span>选择关卡</span><select id="stage-select">${options}</select></label><button class="primary" data-action="enter-stage">进入遗迹　→</button>`}</section>`
}
function stageOneCleared() {
  return Boolean(game && (game.unlockedStage > 1 || game.stageProgress?.['1']?.bossDefeated))
}
function forgeUnlocked() { return stageOneCleared() }
function npcUnlocked() { return stageOneCleared() }
function hiddenUnlocked() { return Boolean(game && (game.stamps ?? 0) >= STAMP_UNLOCK) }
function talentUnlocked() { return Boolean(game && (game.level ?? 1) >= 5) }
// 统一的物品图标：背包、商城、抽奖与货币展示共用。
const ITEM_ICON_PATHS: Record<string, string> = {
  weapon: '<path d="M14.5 2.5h7v7L11 20l-3.5.5.5-3.5L18.5 6.5l-1-1L7 16l-3.5.5.5-3.5L14.5 2.5Z"/>',
  armor: '<path d="M12 2 4 5.5V11c0 5 3.4 9.2 8 11 4.6-1.8 8-6 8-11V5.5L12 2Zm0 3.2 5 2.2V11c0 3.5-2.1 6.6-5 8-2.9-1.4-5-4.5-5-8V7.4l5-2.2Z"/>',
  fashion: '<path d="M9 2h6l-1.2 4.2L18 10l-2 12H8L6 10l4.2-3.8L9 2Zm1.5 2-.6 3.1L6.5 10 8 20h8l1.5-10-3.4-2.9L13.5 4h-3Z"/>',
  soul: '<path d="M12 2c1.4 3.4 4.5 4.7 5.6 7.8 1.3 3.6-.7 7.2-4 8.6 1.6-3.1.6-5-1.1-6.7.2 3.2-1.6 4.5-3 5.6.8-3.6-1.2-5.2-1.5-8.1C7.8 7 9.8 4.8 12 2Z"/>',
  fragment: '<path d="m12 2 5.5 7.5L12 22 6.5 9.5 12 2Zm0 3.4L8.7 9.8l3.3 8 3.3-8L12 5.4Z"/>',
  coin: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm0 2.5 1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5L12 6.5Z"/>',
  ticket: '<path d="M3 5h18v4.2a2.8 2.8 0 0 0 0 5.6V19H3v-4.2a2.8 2.8 0 0 0 0-5.6V5Zm2 2v1.3a4.8 4.8 0 0 1 0 7.4V17h14v-1.3a4.8 4.8 0 0 1 0-7.4V7H5Z"/>',
  attribute: '<path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2Z"/>',
  potion: '<path d="M9 2h6v4l3 4.5V22H6V10.5L9 6V2Zm2 2v2.7L8 11.1V20h8v-8.9l-3-4.4V4h-2Z"/>',
  bag: '<path d="M6 7V5a4 4 0 0 1 8 0v2h3l1.5 14h-13L6 7Zm2 0h6V5a3 3 0 0 0-6 0v2Zm-2 2-1 10h12L16 9H6Z"/>',
  npc: '<path d="M12 2a4 4 0 0 1 4 4h2a3 3 0 0 1 3 3v3l-2 1v6H5v-6l-2-1V9a3 3 0 0 1 3-3h2a4 4 0 0 1 4-4Zm-1 4a1 1 0 0 0 2 0V5a1 1 0 0 0-2 0v1Zm-3 4a1 1 0 0 0-1 1v2h10v-2a1 1 0 0 0-1-1H8Zm-3 6 2 1h10l2-1v2H5v-2Z"/>',
  stamp: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-2 4h4v4h-4V8Zm-1 6h6v2H9v-2Z"/>',
  legacy: '<path d="m12 2 3 7h7l-5.7 4.4 2.2 7L12 16l-6.5 4.4 2.2-7L2 9h7l3-7Z"/>',
}
function itemIcon(name: string, className = '') {
  const path = ITEM_ICON_PATHS[name] ?? ITEM_ICON_PATHS.coin
  return `<span class="item-icon ${className}" aria-hidden="true"><svg viewBox="0 0 24 24">${path}</svg></span>`
}
function prizeIcon(id: string) {
  if (id === 'empty') return '∅'
  const names: Record<string, string> = { attr: 'attribute', gear2: 'weapon', coin: 'coin', soul: 'soul', fashion: 'fashion', gearHigh: 'weapon' }
  return itemIcon(names[id] ?? 'coin')
}
function seenStory(id: string) { return Boolean(game?.seenStories?.includes(id)) }
function startStory(data: StoryData, onComplete?: (choice?: string) => void) {
  if (!game) return
  storyState = data
  storyIndex = 0
  storyOnComplete = onComplete ?? null
  // 剧情会占据屏幕底部，先收起横屏提示，避免遮挡对话按钮。
  document.querySelector('#rotate-hint')?.classList.add('dismissed')
  renderGame()
}
function storyMarkup() {
  if (!storyState) return ''
  const line = storyState.lines[Math.min(storyIndex, storyState.lines.length - 1)]
  const isLast = storyIndex >= storyState.lines.length - 1
  const choices = isLast ? (storyState.choices ?? []).filter((choice) => !choice.requires || choice.requires()) : []
  return `<div class="bag-scrim story-scrim"><section class="bag-dialog story-dialog"><header><div><small>STORY · 远征记录</small><h2>${storyState.title ?? '剧情'}</h2></div></header><div class="story-body"><b class="story-speaker">${line.speaker}</b><p class="story-text">${line.text}</p><div class="story-progress">${storyIndex + 1} / ${storyState.lines.length}</div></div><div class="story-actions">${choices.length ? choices.map((choice) => `<button class="secondary" data-action="story-choice" data-value="${choice.value}">${choice.label}</button>`).join('') : `<button class="primary" data-action="story-next">${isLast ? '结束' : '继续'}</button>`}</div></section></div>`
}
function advanceStory() {
  if (!storyState) return
  if (storyIndex < storyState.lines.length - 1) { storyIndex += 1; renderGame(); return }
  if (storyState.choices?.length) return
  finishStory()
}
function chooseStory(value: string) {
  if (!storyState?.choices?.length) return
  finishStory(value)
}
function finishStory(choice?: string) {
  if (game && storyState) {
    game.seenStories ??= []
    if (!game.seenStories.includes(storyState.id)) game.seenStories.push(storyState.id)
  }
  const callback = storyOnComplete
  storyState = null
  storyIndex = 0
  storyOnComplete = null
  callback?.(choice)
  renderGame()
}
function stageStoryData(stage: number): StoryData | null {
  const relation = game?.role === 'mage' ? '你看到了师父。' : '你看到了兄长。'
  switch (stage) {
    case 1: return { id: 'stage-story-1', title: '第一关 · 勇气印', lines: [
      { speaker: '旁白', text: '百年前，第一位冒险王留下十座试炼场。每通过一座，得一枚王印。有人说，集齐十印者可以登王座；也有人说，冒险王根本不想让人集齐。' },
      { speaker: '宿敌', text: '你也是来拿勇气印的？' },
      { speaker: '主角', text: '不。我是来确认，这座试炼场到底在怕什么。' },
      { speaker: '守关者', text: '二人同至，试炼开启。一人后退，二人皆败。' },
      { speaker: '宿敌', text: '试炼场不会呼吸。但被关在下面的东西，会。' },
      { speaker: '旁白', text: '裂缝深处传来呼吸声。先击败守关者，再去看看裂缝里到底有什么。' },
    ] }
    case 2: return { id: 'stage-story-2', title: '第二关 · 坚韧印', lines: [
      { speaker: '旁白', text: '第二座试炼场比第一座更旧。门楣上刻着：坚韧不是不倒下，是倒下后还记得为什么站起来。' },
      { speaker: '守关者', text: '锁！锁！锁！都是锁！那就一起锁死吧！' },
      { speaker: '主角', text: '你被一段外来的指令压住了。我帮你改回来。' },
      { speaker: '旁白', text: '你救下一名矿工。他低声说：三年前，有人带着希望往第五关去了。灰冠的灰烬味道，正从更深的地方飘来。' },
      { speaker: '守关者', text: '他在找十印。他不是要成王，他是要开锁。' },
    ] }
    case 3: return { id: 'stage-story-3', title: '第三关 · 冷静印', lines: [
      { speaker: '旁白', text: '试炼场中央，一个年轻冒险者被灰色锁链吊在半空。锁链连着他脚下的机关核心。他就是这关的“活钥匙”。' },
      { speaker: '阿岩', text: '别过来！我一动，机关就炸。灰冠说，要么我当钥匙，要么这关永远关着。' },
      { speaker: '宿敌', text: '救他，机关暴走；不救，机关平稳。你选。' },
      { speaker: '主角', text: '那就让它炸。冒险王不是靠扔下活人当上的。' },
      { speaker: '阿岩', text: '我叫阿岩。左边第三个齿轮！灰冠改过顺序，我记住了！打胸口！' },
      { speaker: '阿岩', text: '等我修完这台机关就回小镇。营火集市，我在那儿支个摊——以后你救的命，我拿一辈子还。' },
      { speaker: '旁白', text: '你救出阿岩。他回到小镇常驻，成为营火集市的商人。' },
    ] }
    case 4: return { id: 'stage-story-4', title: '第四关 · 洞察印', lines: [
      { speaker: '旁白', text: `第四关没有门。你走进去时，四周变成了你最熟悉的地方。${relation}` },
      { speaker: '幻象', text: '打赢我，你就能看清自己。打不赢，你就留在这儿，当我的新脸。' },
      { speaker: '心魔', text: '十印不是王冠，是十道锁。你每拿一枚，锁就松一分。灰冠想全拿走。' },
      { speaker: '主角', text: '我想知道怎么补。' },
      { speaker: '心魔', text: '补锁需要牺牲印。第十关。前任冒险王把自己锁在那里。' },
    ] }
    case 5: return { id: 'stage-story-5', title: '第五关 · 时间印', lines: [
      { speaker: '旁白', text: '第五关的时间是坏的。你走进大厅，看到三分钟前的自己正在被击倒。第三次循环时，你看到了她。' },
      { speaker: '小满', text: '你又来了。我每次都在这里死。灰冠拿我当“时间锚点”。' },
      { speaker: '主角', text: '这次我记住你了。你叫小满。不是时间锚点。' },
      { speaker: '小满', text: '灰冠拿走了一部分时间印。真正的记录在后厅。我带你们去。' },
      { speaker: '旁白', text: '后厅记录：十印是锁。我是第一道锁。去第七关看我的记忆，然后去第十关做选择。别学我——别一个人扛。' },
    ] }
    case 6: return { id: 'stage-story-6', title: '第六关 · 平衡印', lines: [
      { speaker: '宿敌', text: '灰冠的人先到了。临时再合作一次，出去就散。' },
      { speaker: '主角', text: '第五关，你想用时间印复活谁？' },
      { speaker: '宿敌', text: '上一届选拔，我朋友死在试炼里。灰冠说时间印能改写结果。我知道他在利用我，但我需要那一次“重选”。' },
      { speaker: '主角', text: '你朋友不会希望你这样。' },
      { speaker: '旁白', text: '击败守关者后，宿敌转身离开：第七关我不去了。第八关如果我还活着，我会出现。' },
    ] }
    case 7: return { id: 'stage-story-7', title: '第七关 · 记忆印', lines: [
      { speaker: '老周', text: '别一个人扛。别一个人扛……' },
      { speaker: '老周', text: '我是前任冒险王的同伴。他把自己锁进第十关那天，我就在旁边。灰冠把我塞进记忆里，让我一遍遍看这段。' },
      { speaker: '旁白', text: '记忆里，前任冒险王集齐十印，发现王座下压着灾厄之心。他说：十印不是王冠，是十道锁。我把自己变成第十一道锁，才勉强压住它。' },
      { speaker: '老周', text: '一百年了。第一次有人跟我说“够了”。小子，第十关见。门可以不开，锁可以不守。' },
      { speaker: '旁白', text: '你救出老周。他前往第十关等候，而灾厄之心即将苏醒。' },
    ] }
    case 8: return { id: 'stage-story-8', title: '第八关 · 净化印', lines: [
      { speaker: '旁白', text: '第八关的空气是脏的。宿敌被吊在试炼场中央，身上缠着灰色锁链，眼睛半灰。' },
      { speaker: '宿敌', text: '他在用我当锚点。净化试炼场，就会净化我。我可能变回那个想复活朋友的蠢货，也可能直接没了。' },
      { speaker: '灰冠', text: '选吧。救他，污染扩散；追我，印到手，他变成污染源。冒险王不是要果断吗？果断一个给我看。' },
      { speaker: '旁白', text: '你握紧了净化印。无论选哪一边，蚀都会在你做选择时动手。' },
    ], choices: [
      { label: '先救宿敌', value: 'save' },
      { label: '先追灰冠', value: 'chase' },
      { label: '一起净化（需救过阿岩、小满、老周）', value: 'together', requires: () => Boolean(game?.rescuedRock && game?.rescuedXiaoman && game?.rescuedZhou) },
    ] }
    case 9: {
      const helpers = game?.rescuedRock && game?.rescuedXiaoman && game?.rescuedZhou
        ? '阿岩、小满、老周从三面赶来。阿岩喊着左边第三个齿轮，小满举起时间记录，老周的灵魂出现在王座投影旁。'
        : '宿敌从侧门走出：我来看看这个蠢货能不能赢你。顺便——你要开锁，我先打你。'
      return { id: 'stage-story-9', title: '第九关 · 荣耀印', lines: [
        { speaker: '旁白', text: '王城竞技场。灰冠站在中央，身后是九枚王印的投影。他手里拿着时间印。' },
        { speaker: '灰冠', text: '十印是锁！冒险王不是英雄，是看门人！今天，我打开这扇门，让所有人看看门后是什么。' },
        { speaker: '旁白', text: helpers },
        { speaker: '主角', text: '他们不是废物。他们是我救过的人。现在，他们来救我了。' },
      ] }
    }
    case 10: return { id: 'stage-story-10', title: '第十关 · 牺牲印', lines: [
      { speaker: '旁白', text: '第十关没有门，只有一座王座。王座下压着一颗跳动的心——灾厄之心。王座旁坐着一尊快散架的雕像，前任冒险王的残影。' },
      { speaker: '残影', text: '你来了。十印齐了，但门还没开。因为最后一道锁，是我。打赢我，然后做选择。' },
      { speaker: '锁灵', text: '我守了一百年。让我看看，你配不配做选择。' },
      { speaker: '旁白', text: '击败锁灵后，残影问你：坐上王座成为新的锁，或者把十印按进灾厄之心，让它和锁一起消失。' },
    ] }
    default: return null
  }
}
function applyStageStoryOutcome(stage: number, choice?: string) {
  if (!game) return
  if (stage === 3) game.rescuedRock = true
  if (stage === 5) game.rescuedXiaoman = true
  if (stage === 7) game.rescuedZhou = true
  if (stage === 8) {
    const value = choice === 'save' || choice === 'chase' || choice === 'together' ? choice : 'save'
    game.stage8Choice = value
    game.rivalTrust = value !== 'chase'
    if (value === 'together') { game.rescuedRock = true; game.rescuedXiaoman = true; game.rescuedZhou = true }
  }
}
function startStageStory(stage: number) {
  if (!game) return false
  const data = stageStoryData(stage)
  if (!data || seenStory(data.id)) return false
  startStory(data, (choice) => {
    applyStageStoryOutcome(stage, choice)
    save()
    renderGame()
  })
  return true
}
function stageEndingStoryData(): StoryData {
  const trust = game?.rivalTrust
  const helpers = trust
    ? '宿敌冲上来帮你扛住一半反噬；阿岩、小满、老周从三面稳住王座残骸。十印化为光点，王座崩塌。'
    : '宿敌没有动。你独自把十印按进灾厄之心。反噬爆发，没有人扛。灾厄之心消失，你活了下来，但身边没有人。'
  const rival = trust
    ? '宿敌站起来，拍了拍灰，忽然拔出武器：既然没有冒险王了……第一关那笔账，该算算了。就你和我，打一场。'
    : '宿敌站在出口外，没有回头：第一关你让我先拿印，第八关你选印不选人。这两笔账，今天一起算。不是切磋，是决战。'
  return { id: 'stage-ending-story', title: '终章 · 牺牲印', lines: [
    { speaker: '旁白', text: '锁灵跪下，残影恢复。他笑：行。你比我强。我当年只想着自己扛，你想着下一个。' },
    { speaker: '残影', text: '现在你面前只有一件事：坐上王座成为新的锁，或者把十印按进灾厄之心，让它和锁一起消失。' },
    { speaker: '旁白', text: helpers },
    { speaker: '宿敌', text: rival },
    { speaker: '旁白', text: trust ? '隐藏关卡【挑战宿敌】开启。性质：友好切磋。' : '隐藏关卡【挑战宿敌】开启。性质：生死决战。' },
  ] }
}
function hiddenStoryData(): StoryData {
  const trust = game?.rivalTrust
  return { id: 'hidden-intro', title: '隐藏关卡 · 挑战宿敌', lines: trust ? [
    { speaker: '旁白', text: '你们站在第一关的废墟上。门楣上那行字还在：勇气不是不害怕，是害怕了还往前走。字被灰盖了一半。' },
    { speaker: '宿敌', text: '第一关你让我先拿印。我当时觉得你蠢，后来觉得你危险，再后来……觉得你可能是对的。现在我想亲手试试，你到底有多对。' },
    { speaker: '旁白', text: '宿敌使用与你对称的技能组。这是一场没有规则的切磋。' },
  ] : [
    { speaker: '旁白', text: '你们站在第一关的废墟上。站在对面的人，已经不打算跟你一起走了。' },
    { speaker: '宿敌', text: '第八关你选印不选人。行。今天我也选——选打完这一场，然后走。' },
    { speaker: '旁白', text: '宿敌的攻击更狠。这是一场生死决战。' },
  ] }
}
function hiddenCompleteStoryData(): StoryData {
  const trust = game?.rivalTrust
  return { id: 'hidden-complete', title: '隐藏关卡 · 终局', lines: trust ? [
    { speaker: '宿敌', text: '……行。你确实有点东西。第一关那笔账，清了。第八关那笔，也清了。下次冒险，你探路，我殿后。' },
    { speaker: '旁白', text: '没有王印的冒险，也是冒险。冒险王从来不是王，是那个先迈出一步的人。' },
  ] : [
    { speaker: '宿敌', text: '你赢了。第一关那笔，第八关那笔，都清了。你走吧。' },
    { speaker: '旁白', text: '宿敌没有回头。你是个好冒险王，但你不是个好同伴。保重。' },
  ] }
}
function townIntroStoryData(): StoryData {
  return { id: 'town-intro', title: '冒险者小镇', lines: [
    { speaker: '旁白', text: '你已经完成了新手指引。这里是冒险者小镇，安全区内不会生成敌人，生命和法力会自动回满。' },
    { speaker: '旁白', text: '背包：点击顶栏“背包”，查看装备、时装、天赋币和其他物品；装备需要手动穿戴。' },
    { speaker: '旁白', text: '属性：击杀小怪获得属性点，在小镇的属性面板中分配，立即生效。' },
    { speaker: '旁白', text: '合成台与阿岩：通关第一关后解锁。合成台可用 5 件同类同级装备或 3 件同阶时装合成；阿岩在营火集市用灵魂交易。' },
    { speaker: '旁白', text: '抽奖：首次通关关卡获得抽奖机会。击败 50 只小怪后挑战 Boss，祝你好运。' },
  ] }
}
function tutorialIntroStoryData(): StoryData {
  return { id: 'tutorial-intro', title: '新手试炼场', lines: [
    { speaker: '旁白', text: '这里是新手试炼场。先学会战斗，再踏上远征。' },
    { speaker: '旁白', text: '按 A / D 或左右键移动；按 J 攻击；按 K 跳跃，空中再按 K 二段跳；按 1–4 释放技能。' },
    { speaker: '主角', text: '训练傀儡就在前方。完成训练目标后，再击败它。' },
  ] }
}
function tutorialCompleteStoryData(): StoryData {
  return { id: 'tutorial-complete', title: '新手指引完成', lines: [
    { speaker: '旁白', text: '训练傀儡倒下。你已经掌握了移动、攻击、跳跃和技能。' },
    { speaker: '旁白', text: '已完成新手指引。现在进入冒险者小镇，开始真正的远征。' },
  ] }
}
function forgeIntroStoryData(): StoryData {
  return { id: 'forge-intro', title: '功能介绍 · 合成台', lines: [
    { speaker: '旁白', text: '合成台：消耗未穿戴的材料。5 件同类同等级的武器或护甲可以合成高一级装备；3 件同阶时装可以合成下一阶时装。' },
    { speaker: '旁白', text: '合成品不会自动穿戴。装备等级和时装阶级没有上限。' },
  ] }
}
function shopIntroStoryData(): StoryData {
  return { id: 'shop-intro', title: '功能介绍 · 阿岩', lines: [
    { speaker: '旁白', text: '阿岩使用灵魂交易。灵魂来自击杀小怪和 Boss，可以在商城购买装备、天赋币碎片和时装。' },
    { speaker: '旁白', text: '第一关通关后，阿岩会出现在小镇地图上。走到他面前按 S 对话。' },
  ] }
}
function lotteryIntroStoryData(): StoryData {
  return { id: 'lottery-intro', title: '功能介绍 · 抽奖', lines: [
    { speaker: '旁白', text: '首次通关每个关卡会获得一次抽奖机会。重复通关已经通过的关卡不会再次获得。' },
    { speaker: '旁白', text: '奖池包含属性点、装备、天赋币、灵魂和时装。祝你好运。' },
  ] }
}
function bagMarkup() {
  if (!game) return ''
  const s = stats()
  const main = game.gear.find((gear) => gear.id === game?.weaponId)
  const off = game.advancedTalent === 3 ? game.gear.find((gear) => gear.id === game?.weapon2Id) : undefined
  const armor = game.gear.find((gear) => gear.id === game?.armorId)
  const fashion = game.gear.find((gear) => gear.id === game?.fashionId)
  const chips = [
    `${itemIcon('weapon')} ${main?.name ?? '无武器'}`,
    off ? `${itemIcon('weapon')} ${off.name}（副手）` : '',
    `${itemIcon('armor')} ${armor?.name ?? '无护甲'}`,
    `${itemIcon('fashion')} ${fashion?.name ?? '无时装'}`,
  ].filter(Boolean).map((text) => `<span>${text}</span>`).join('')
  const tabs = [['gear', `${itemIcon('weapon')} 装备`], ['talent', `${itemIcon('coin')} 天赋币`], ['other', `${itemIcon('soul')} 其他`]] as const
  const tabButtons = tabs.map(([id, label]) => `<button class="${bagTab === id ? 'active' : ''}" data-action="bag-tab" data-tab="${id}" type="button">${label}</button>`).join('')
  const content = bagTab === 'gear' ? `<div class="bag-list">${gearMarkup(scene === 'town')}</div>` : bagTab === 'talent' ? talentBagMarkup() : otherBagMarkup()
  return `<div class="bag-scrim"><section class="bag-dialog"><header><div><small>INVENTORY · ${game.gear.length} 件物品</small><h2>远征背包</h2></div><button data-action="close-bag" aria-label="关闭背包">×</button></header><div class="bag-character"><div class="bag-stats"><span>♥ 生命 ${displayNumber(game.hp)} / ${displayNumber(s.hp)}</span><span>✦ 法力 ${displayNumber(game.mp)} / ${displayNumber(s.mp)}</span><span>⚔ 攻击 ${displayNumber(s.attack)}</span><span>▰ 防御 ${displayNumber(s.defense)}</span><span>★ 等级 ${game.level ?? 1}</span></div><div class="bag-equipped">${chips}</div></div><div class="bag-tabs">${tabButtons}</div>${content}</section></div>`
}
function talentBagMarkup() {
  if (!game) return ''
  const normal = NORMAL_TALENTS.find((talent) => talent.id === game?.normalTalent)
  const advanced = ADVANCED_TALENTS.find((talent) => talent.id === game?.advancedTalent)
  return `<div class="bag-info-list"><article class="info-row"><span>${itemIcon('fragment')} 天赋币碎片</span><b>${displayCurrency(game.talentFragments ?? 0)}</b></article><article class="info-row"><span>${itemIcon('coin')} 天赋币</span><b>${displayCurrency(game.talentCoins ?? 0)}</b></article><article class="info-row"><span>${itemIcon('attribute')} 普通天赋</span><b>${normal?.name ?? '未选择'}</b></article><article class="info-row"><span>${itemIcon('coin')} 高级天赋</span><b>${advanced?.name ?? '未选择'}</b></article></div><p class="bag-note">在同一背包中管理天赋材料；前往小镇商人处合成天赋币并选择天赋。</p>`
}
function otherBagMarkup() {
  if (!game) return ''
  return `<div class="bag-info-list"><article class="info-row"><span>${itemIcon('soul')} 灵魂</span><b>${displayCurrency(game.soul ?? 0)}</b></article><article class="info-row"><span>${itemIcon('stamp')} 王印印章</span><b>${displayCurrency(game.stamps ?? 0)} / ${STAMP_UNLOCK}</b></article><article class="info-row"><span>${itemIcon('ticket')} 抽奖机会</span><b>${displayCurrency(game.lotteryChances ?? 0)}</b></article><article class="info-row"><span>${itemIcon('attribute')} 属性点</span><b>${displayCurrency(game.attributePoints ?? 0)}</b></article></div><p class="bag-note">灵魂可以在小镇商人处购买装备与材料；集齐 ${STAMP_UNLOCK} 枚王印印章可开启隐藏关卡。</p>`
}
function npcMarkup() {
  if (!game || !npcOpen) return ''
  const title = npcView === 'shop' ? '灵魂商城' : npcView === 'talent' ? '天赋研究' : `${TOWN_NPC_NAME} · 商人`
  const content = npcView === 'shop' ? shopMarkup() : npcView === 'talent' ? talentMarkup() : npcMenuMarkup()
  return `<div class="bag-scrim npc-scrim"><section class="bag-dialog npc-dialog"><header><div><small>MERCHANT · 冒险者小镇</small><h2>${title}</h2></div><button data-action="close-npc">×</button></header>${content}</section></div>`
}
function npcMenuMarkup() {
  if (!game) return ''
  return `<p>“谢谢你把我从第三关拉出来。灵魂、天赋、运气——你想要哪一种？”</p><div class="npc-menu"><button data-action="npc-shop"><b>${itemIcon('soul')}</b><span><strong>商城</strong><small>用灵魂购买装备与材料</small></span></button><button data-action="npc-talent"><b>${itemIcon('coin')}</b><span><strong>天赋</strong><small>${talentUnlocked() ? '研究普通与高级天赋' : '角色 5 级后开放'}</small></span></button><button data-action="open-lottery"><b>${itemIcon('ticket')}</b><span><strong>抽奖</strong><small>${game.lotteryChances ?? 0} 次机会</small></span></button></div><div class="npc-currency"><span>${itemIcon('soul')} 灵魂 ${displayCurrency(game.soul ?? 0)}</span><span>${itemIcon('fragment')} 碎片 ${displayCurrency(game.talentFragments ?? 0)}</span><span>${itemIcon('coin')} 天赋币 ${displayCurrency(game.talentCoins ?? 0)}</span></div>`
}
function shopMarkup() {
  if (!game) return ''
  const rows = SHOP_ITEMS.map((item) => {
    const soldOut = item.unique && game!.shopFashionBought
    const canBuy = !soldOut && (game!.soul ?? 0) >= item.cost
    const icon = item.id === 'armor1' ? 'armor' : item.id === 'weapon1' ? 'weapon' : item.id === 'fragments2' ? 'fragment' : 'fashion'
    return `<article class="shop-row"><span class="gear-glyph">${itemIcon(icon)}</span><span class="gear-copy"><b>${item.name}</b><small>${item.desc}</small></span><b class="shop-price">${itemIcon('soul')} ${item.cost}</b><button data-action="shop-buy" data-id="${item.id}" ${canBuy ? '' : 'disabled'}>${soldOut ? '已购买' : '购买'}</button></article>`
  }).join('')
  return `<div class="npc-currency"><span>${itemIcon('soul')} 灵魂 ${displayCurrency(game.soul ?? 0)}</span><span>${itemIcon('fragment')} 碎片 ${displayCurrency(game.talentFragments ?? 0)}</span></div><div class="bag-list shop-list">${rows}</div><button class="secondary npc-back" data-action="npc-menu">返回商人</button>`
}
function talentMarkup() {
  if (!game) return ''
  if (!talentUnlocked()) return `<div class="talent-locked"><b>天赋尚未解锁</b><p>角色达到 5 级后可以研究天赋。</p><button class="secondary npc-back" data-action="npc-menu">返回商人</button></div>`
  const hasNormal = (game.normalTalent ?? 0) > 0
  const hasAdvanced = (game.advancedTalent ?? 0) > 0
  const normalRows = NORMAL_TALENTS.map((talent) => {
    const active = game!.normalTalent === talent.id
    const can = active || hasNormal || (game!.talentCoins ?? 0) >= 1
    const label = active ? '已选' : hasNormal ? '更换' : `选择 ${itemIcon('coin')}1`
    return `<article class="talent-row ${active ? 'active' : ''}"><span class="gear-glyph">${itemIcon('attribute')}</span><span class="gear-copy"><b>${talent.name}</b><small>${talent.desc}</small></span><button data-action="talent-normal" data-id="${talent.id}" ${can ? '' : 'disabled'}>${label}</button></article>`
  }).join('')
  const advancedRows = ADVANCED_TALENTS.map((talent) => {
    const active = game!.advancedTalent === talent.id
    const can = active || hasAdvanced || (game!.talentCoins ?? 0) >= ADVANCED_TALENT_COST
    const label = active ? '已选' : hasAdvanced ? '更换' : `选择 ${itemIcon('coin')}${ADVANCED_TALENT_COST}`
    return `<article class="talent-row ${active ? 'active' : ''}"><span class="gear-glyph">${itemIcon('coin')}</span><span class="gear-copy"><b>${talent.name}</b><small>${talent.desc}</small></span><button data-action="talent-advanced" data-id="${talent.id}" ${can ? '' : 'disabled'}>${label}</button></article>`
  }).join('')
  const canCraft = (game.talentFragments ?? 0) >= TALENT_FRAGMENTS_PER_COIN
  return `<div class="npc-currency"><span>${itemIcon('fragment')} 碎片 ${displayCurrency(game.talentFragments ?? 0)}</span><span>${itemIcon('coin')} 天赋币 ${displayCurrency(game.talentCoins ?? 0)}</span><span>${itemIcon('attribute')} 等级 ${displayNumber(game.level ?? 1)}</span></div><section class="talent-block"><h3>普通天赋 <small>${hasNormal ? '更换免费' : '首次选择需要 1 天赋币'} · 只能选择一个</small></h3>${normalRows}</section><section class="talent-block"><h3>高级天赋 <small>${hasAdvanced ? '更换免费' : `首次选择需要 ${ADVANCED_TALENT_COST} 天赋币`} · 只能选择一个</small></h3>${advancedRows}</section><div class="talent-footer"><button class="secondary" data-action="talent-craft" ${canCraft ? '' : 'disabled'}>${itemIcon('coin')} 合成天赋币（${displayCurrency(game.talentFragments ?? 0)} / ${TALENT_FRAGMENTS_PER_COIN}）</button><button class="secondary npc-back" data-action="npc-menu">返回商人</button></div><p class="bag-note">同时拥有普通和高级天赋后，Boss 掉落的天赋币碎片将转化为 1000 灵魂。</p>`
}
function lotteryMarkup() {
  if (!game || !lotteryOpen) return ''
  const cards = LOTTERY_PRIZES.map((prize, index) => `<article class="lottery-card ${index === lotteryHighlight ? 'highlight' : ''}" data-lottery-index="${index}"><b>${prizeIcon(prize.id)}</b><span>${prize.label}</span></article>`).join('')
  return `<div class="bag-scrim lottery-scrim"><section class="bag-dialog lottery-dialog"><header><div><small>LOTTERY · 机会 ${game.lotteryChances ?? 0}</small><h2>命运抽奖</h2></div>${lotterySpinning ? '' : '<button data-action="close-lottery">×</button>'}</header><p>首次通关关卡获得抽奖机会；重复通关已通过的关卡不会再次获得。</p><div class="lottery-grid">${cards}</div>${lotteryResult ? `<div class="lottery-result">获得：${escapeHtml(lotteryResult)}</div>` : ''}<button class="primary lottery-spin" data-action="lottery-spin" ${lotterySpinning || (game.lotteryChances ?? 0) <= 0 ? 'disabled' : ''}>${lotterySpinning ? '抽奖中…' : '开始抽奖'}</button></section></div>`
}
function bossVictoryMarkup() {
  if (!bossVictory) return ''
  const rewardRows = bossVictory.rewards.map((reward, index) => `<li style="animation-delay:${(.5 + index * .1).toFixed(2)}s">${reward}</li>`).join('')
  const particles = Array.from({ length: 24 }, (_, index) => {
    const angle = (index / 24) * Math.PI * 2
    const distance = 58 + (index % 5) * 17
    const x = Math.cos(angle) * distance
    const y = Math.sin(angle) * distance
    return `<i style="--x:${x.toFixed(0)}px;--y:${y.toFixed(0)}px;--delay:${(index % 6) * .1}s"></i>`
  }).join('')
  return `<div class="boss-victory-overlay"><div class="victory-rays"></div><div class="victory-flash"></div><div class="victory-particles">${particles}</div><div class="victory-copy"><small>— BOSS DEFEATED —</small><h2>守关者已击败</h2><p>${stageNames[bossVictory.stage - 1]} · 第 ${String(bossVictory.stage).padStart(2, '0')} 章</p><ul class="victory-rewards">${rewardRows}</ul><button class="primary victory-continue" data-action="continue-victory">${bossVictory.ending ? '远征完成　▶' : '返回小镇　▶'}</button></div><div class="victory-timer"><i style="animation-duration:${bossVictory.time.toFixed(2)}s"></i></div></div>`
}
function openNpcMenu() {
  if (!game || scene !== 'town' || !npcUnlocked()) return
  if (!game.shopIntroSeen) {
    startStory(shopIntroStoryData(), () => {
      if (!game) return
      game.shopIntroSeen = true
      save()
      resetPanels(); npcOpen = true; npcView = 'menu'; renderGame()
    })
    return
  }
  resetPanels(); npcOpen = true; npcView = 'menu'; renderGame()
}
function openLottery() {
  if (!game || scene !== 'town') return
  if (!game.lotteryIntroSeen) {
    startStory(lotteryIntroStoryData(), () => {
      if (!game) return
      game.lotteryIntroSeen = true
      save()
      openLottery()
    })
    return
  }
  bagOpen = false; craftingOpen = false; attributesOpen = false; npcOpen = false
  lotteryOpen = true; lotterySpinning = false; lotteryResult = null; lotteryHighlight = -1
  if (lotteryInterval !== null) { window.clearInterval(lotteryInterval); lotteryInterval = null }
  if (lotteryTimeout !== null) { window.clearTimeout(lotteryTimeout); lotteryTimeout = null }
  renderGame()
}
function closeLottery() {
  if (lotterySpinning) return
  if (lotteryInterval !== null) { window.clearInterval(lotteryInterval); lotteryInterval = null }
  if (lotteryTimeout !== null) { window.clearTimeout(lotteryTimeout); lotteryTimeout = null }
  lotteryOpen = false; lotteryResult = null; lotteryHighlight = -1
  renderGame()
}
// 打开任意面板前统一收起其它弹窗，避免多个遮罩叠加。
function resetPanels() {
  bagOpen = false; craftingOpen = false; attributesOpen = false; npcOpen = false; lotteryOpen = false; stageCircleOpen = false
  lotterySpinning = false; lotteryResult = null; lotteryHighlight = -1
  if (lotteryInterval !== null) { window.clearInterval(lotteryInterval); lotteryInterval = null }
  if (lotteryTimeout !== null) { window.clearTimeout(lotteryTimeout); lotteryTimeout = null }
  keys.clear()
  shieldActive = false; shieldLocked = false
}
function rollLottery() {
  const total = LOTTERY_PRIZES.reduce((sum, prize) => sum + prize.weight, 0)
  let roll = Math.random() * total
  for (let index = 0; index < LOTTERY_PRIZES.length; index += 1) {
    roll -= LOTTERY_PRIZES[index].weight
    if (roll <= 0) return { ...LOTTERY_PRIZES[index], index }
  }
  return { ...LOTTERY_PRIZES[LOTTERY_PRIZES.length - 1], index: LOTTERY_PRIZES.length - 1 }
}
function applyLotteryPrize(id: string) {
  if (!game) return
  const stage = Math.max(1, Math.min(10, game.stage))
  if (id === 'attr') game.attributePoints = (game.attributePoints ?? 0) + 10
  else if (id === 'gear2') for (let count = 0; count < 2; count += 1) game.gear.unshift(makeGear(Math.random() < .5 ? 'weapon' : 'armor', stage))
  else if (id === 'coin') game.talentCoins = (game.talentCoins ?? 0) + 1
  else if (id === 'soul') game.soul = (game.soul ?? 0) + 2000
  else if (id === 'fashion') game.gear.unshift(makeFashion(1))
  else if (id === 'gearHigh') game.gear.unshift(makeGear(Math.random() < .5 ? 'weapon' : 'armor', stage + 1))
}
function startLottery() {
  if (!game || lotterySpinning || (game.lotteryChances ?? 0) <= 0) return
  const prize = rollLottery()
  lotterySpinning = true; lotteryResult = null; lotteryHighlight = 0
  renderGame()
  if (lotteryInterval !== null) { window.clearInterval(lotteryInterval); lotteryInterval = null }
  lotteryInterval = window.setInterval(() => {
    lotteryHighlight = (lotteryHighlight + 1) % LOTTERY_PRIZES.length
    document.querySelectorAll<HTMLElement>('.lottery-card').forEach((card) => card.classList.toggle('highlight', Number(card.dataset.lotteryIndex) === lotteryHighlight))
  }, 70)
  lotteryTimeout = window.setTimeout(() => {
    if (lotteryInterval !== null) { window.clearInterval(lotteryInterval); lotteryInterval = null }
    lotteryTimeout = null
    if (!game) return
    game.lotteryChances = Math.max(0, (game.lotteryChances ?? 0) - 1)
    lotterySpinning = false
    lotteryHighlight = prize.index
    lotteryResult = prize.label
    applyLotteryPrize(prize.id)
    save()
    renderGame()
  }, 3000)
}
function buyShopItem(id: string) {
  if (!game || !npcUnlocked()) return
  const item = SHOP_ITEMS.find((entry) => entry.id === id)
  if (!item) return
  if (item.unique && game.shopFashionBought) { toast('这件时装已经购买过。'); return }
  if ((game.soul ?? 0) < item.cost) { toast('灵魂不足。'); return }
  game.soul = (game.soul ?? 0) - item.cost
  if (id === 'armor1') game.gear.unshift(makeGear('armor', 1))
  else if (id === 'weapon1') game.gear.unshift(makeGear('weapon', 1))
  else if (id === 'fragments2') game.talentFragments = (game.talentFragments ?? 0) + 2
  else if (id === 'fashion1') { game.gear.unshift(makeFashion(1)); game.shopFashionBought = true }
  save(); npcOpen = true; npcView = 'shop'; renderGame(); toast(`已购买：${item.name}`)
}
function selectNormalTalent(id: number) {
  if (!game || !talentUnlocked()) return
  if (game.normalTalent === id) { toast('已经选择了这个天赋。'); return }
  const hasNormal = (game.normalTalent ?? 0) > 0
  if (!hasNormal && (game.talentCoins ?? 0) < 1) { toast('首次选择普通天赋需要 1 个天赋币。'); return }
  if (!hasNormal) game.talentCoins = (game.talentCoins ?? 0) - 1
  game.normalTalent = id
  const current = stats(); game.hp = Math.min(game.hp, current.hp); game.mp = Math.min(game.mp, current.mp)
  save(); npcOpen = true; npcView = 'talent'; renderGame(); toast(hasNormal ? '普通天赋已更换（更换免费）。' : '普通天赋已选择。')
}
function selectAdvancedTalent(id: number) {
  if (!game || !talentUnlocked() || game.advancedTalent === id) return
  const hasAdvanced = (game.advancedTalent ?? 0) > 0
  if (!hasAdvanced && (game.talentCoins ?? 0) < ADVANCED_TALENT_COST) { toast(`首次选择高级天赋需要 ${ADVANCED_TALENT_COST} 个天赋币。`); return }
  if (!hasAdvanced) game.talentCoins = (game.talentCoins ?? 0) - ADVANCED_TALENT_COST
  game.advancedTalent = id
  const current = stats(); game.hp = Math.min(game.hp, current.hp); game.mp = Math.min(game.mp, current.mp)
  save(); npcOpen = true; npcView = 'talent'; renderGame(); toast(hasAdvanced ? '高级天赋已更换（更换免费）。' : '高级天赋已选择。')
}
function craftTalentCoin() {
  if (!game || (game.talentFragments ?? 0) < TALENT_FRAGMENTS_PER_COIN) return
  game.talentFragments = (game.talentFragments ?? 0) - TALENT_FRAGMENTS_PER_COIN
  game.talentCoins = (game.talentCoins ?? 0) + 1
  save(); npcOpen = true; npcView = 'talent'; renderGame(); toast('合成成功：天赋币 ×1。')
}
function stageCircleMarkup() {
  if (!game || !stageCircleOpen) return ''
  const current = game
  const rows = Array.from({ length: Math.max(1, current.unlockedStage) }, (_, index) => {
    const stage = index + 1
    const progress = getStageProgress(stage)
    const state = progress.bossDefeated ? 'Boss 已击败 · 可再次挑战' : (progress.kills ?? 0) > 0 ? `进度 ${progress.kills} / ${MAX_SMALL_KILLS}` : '尚未探索'
    return `<button class="stage-circle-row ${current.stage === stage ? 'active' : ''}" data-action="circle-enter-stage" data-stage="${stage}"><b>${String(stage).padStart(2, '0')}</b><span><strong>${stageNames[stage - 1]}</strong><small>${state}</small></span><i>进入 →</i></button>`
  }).join('')
  return `<div class="bag-scrim stage-circle-scrim"><section class="bag-dialog stage-circle-dialog"><header><div><small>WAYPOINT · 冒险者小镇</small><h2>远征法阵</h2></div><button data-action="close-stage-circle" aria-label="关闭法阵">×</button></header><p>选择一处已解锁的遗迹。选中的关卡会从当前进度继续。</p><div class="stage-circle-list">${rows}</div></section></div>`
}
function openStageCircle() {
  if (!game || scene !== 'town') return
  resetPanels()
  stageCircleOpen = true
  document.querySelector('#rotate-hint')?.classList.add('dismissed')
  renderGame()
}
function drawTownWaypoint(c: CanvasRenderingContext2D) {
  if (!game || scene !== 'town') return
  const x = TOWN_CIRCLE_X
  const now = performance.now()
  const pulse = .7 + Math.sin(now / 380) * .3
  const near = Math.abs(heroX - x) <= 60
  c.save()
  // 地面光晕
  const aura = c.createRadialGradient(x, world.floor, 4, x, world.floor, 66)
  aura.addColorStop(0, `rgba(159, 232, 255, ${.28 + pulse * .12})`)
  aura.addColorStop(.55, 'rgba(125, 196, 226, .1)')
  aura.addColorStop(1, 'rgba(125, 196, 226, 0)')
  c.fillStyle = aura
  c.beginPath(); c.ellipse(x, world.floor + 2, 66, 24, 0, 0, Math.PI * 2); c.fill()
  // 外圈与旋转符环
  c.strokeStyle = 'rgba(159, 232, 255, .72)'; c.lineWidth = 2
  c.beginPath(); c.ellipse(x, world.floor + 2, 47, 16, 0, 0, Math.PI * 2); c.stroke()
  c.strokeStyle = 'rgba(201, 178, 115, .8)'; c.lineWidth = 1.4
  c.beginPath(); c.ellipse(x, world.floor + 2, 36, 12, 0, 0, Math.PI * 2); c.stroke()
  c.save(); c.translate(x, world.floor + 2); c.scale(1, .34); c.rotate(now / 2600)
  c.setLineDash([7, 5]); c.strokeStyle = 'rgba(191, 234, 241, .85)'; c.lineWidth = 2.2
  c.beginPath(); c.arc(0, 0, 43, 0, Math.PI * 2); c.stroke(); c.setLineDash([])
  c.restore()
  // 环绕符文
  for (let i = 0; i < 8; i++) {
    const angle = now / 1900 + (i * Math.PI * 2) / 8
    const px = x + Math.cos(angle) * 41
    const py = world.floor + 2 + Math.sin(angle) * 13
    c.save(); c.translate(px, py); c.rotate(angle)
    c.fillStyle = i % 2 ? '#c9b273' : '#9fe8ff'
    c.globalAlpha = .55 + .35 * Math.sin(now / 420 + i)
    c.beginPath(); c.moveTo(0, -3.4); c.lineTo(2.2, 0); c.lineTo(0, 3.4); c.lineTo(-2.2, 0); c.closePath(); c.fill()
    c.restore()
  }
  // 升腾光柱与粒子
  const beam = c.createLinearGradient(0, world.floor - 120, 0, world.floor)
  beam.addColorStop(0, 'rgba(159, 232, 255, 0)'); beam.addColorStop(1, 'rgba(159, 232, 255, .18)')
  c.fillStyle = beam
  c.beginPath(); c.moveTo(x - 16, world.floor); c.lineTo(x - 7, world.floor - 116); c.lineTo(x + 7, world.floor - 116); c.lineTo(x + 16, world.floor); c.closePath(); c.fill()
  c.fillStyle = '#d8f6ff'; c.shadowColor = '#9fe8ff'; c.shadowBlur = 8
  for (let i = 0; i < 5; i++) {
    const rise = ((now / 26 + i * 47) % 118)
    const alpha = 1 - rise / 118
    c.globalAlpha = alpha * .8
    c.beginPath(); c.arc(x + Math.sin(now / 700 + i) * 14, world.floor - rise, 1.6, 0, Math.PI * 2); c.fill()
  }
  c.restore()
  drawCompanionNameplates(c, '远征法阵', x, near, world.floor - 112)
}
type TownCompanion = { id: 'xiaoman' | 'zhou'; name: string; x: number }
// 第 5、7 关救下的同伴会回到小镇；未救出时不会出现。
function townCompanions(): TownCompanion[] {
  if (!game) return []
  const list: TownCompanion[] = []
  if (game.rescuedXiaoman) list.push({ id: 'xiaoman', name: '小满', x: 340 })
  if (game.rescuedZhou) list.push({ id: 'zhou', name: '老周', x: 720 })
  return list
}
function companionThanksStoryData(id: TownCompanion['id']): StoryData {
  if (id === 'xiaoman') return { id: 'thanks-xiaoman', title: '小满 · 谢谢', lines: [
    { speaker: '小满', text: '谢谢你，冒险王。时间回放里我死过很多次，这一次你把我拉了回来。' },
    { speaker: '小满', text: '以后我就在小镇帮你看着时间。出发前记得回来看看。' },
  ] }
  return { id: 'thanks-zhou', title: '老周 · 谢谢', lines: [
    { speaker: '老周', text: '谢谢你，小子。我在记忆里困了一百年，第一次有人对我说“够了”。' },
    { speaker: '老周', text: '这条命是你拽回来的。小镇的营火，我给你留着。' },
  ] }
}
function drawCompanionNameplates(c: CanvasRenderingContext2D, name: string, x: number, near: boolean, top: number) {
  c.save()
  c.textAlign = 'center'
  c.fillStyle = 'rgba(12, 24, 24, .88)'
  c.fillRect(x - 30, top - 22, 60, 19)
  c.strokeStyle = 'rgba(201, 178, 115, .45)'; c.lineWidth = 1; c.strokeRect(x - 30, top - 22, 60, 19)
  c.fillStyle = '#e8d7a0'; c.font = "700 11px 'Microsoft YaHei', sans-serif"
  c.fillText(name, x, top - 8)
  if (near) { c.fillStyle = '#b9e0d2'; c.font = '10px sans-serif'; c.fillText('S 对话', x, top + 13) }
  c.restore()
}
function drawTownCompanions(c: CanvasRenderingContext2D) {
  if (!game || scene !== 'town') return
  const now = performance.now()
  for (const companion of townCompanions()) {
    const x = companion.x
    const bob = Math.sin(now / 420 + x) * 1.2
    const near = Math.abs(heroX - x) <= 70
    c.save()
    c.fillStyle = 'rgba(8, 17, 17, .3)'; c.beginPath(); c.ellipse(x, world.floor + 2, 18, 5.5, 0, 0, Math.PI * 2); c.fill()
    c.translate(x, world.floor + bob)
    if (companion.id === 'xiaoman') {
      // 小满：时间记录者，青蓝色长裙与悬浮沙漏。
      const dress = c.createLinearGradient(0, -70, 0, -4)
      dress.addColorStop(0, '#83c9d6'); dress.addColorStop(.55, '#3d7f93'); dress.addColorStop(1, '#1d3f52')
      c.fillStyle = dress; c.beginPath(); c.moveTo(-13, -58); c.lineTo(13, -58); c.lineTo(21, -5); c.lineTo(-21, -5); c.closePath(); c.fill()
      c.strokeStyle = 'rgba(8, 24, 30, .6)'; c.lineWidth = 1.2; c.stroke()
      c.fillStyle = '#e8d7a0'; c.fillRect(-15, -33, 30, 3)
      c.fillStyle = '#d9f2f6'; c.beginPath(); c.arc(0, -70, 10, 0, Math.PI * 2); c.fill()
      c.fillStyle = '#4a3543'; c.beginPath(); c.moveTo(-11, -70); c.quadraticCurveTo(-12, -86, 0, -88); c.quadraticCurveTo(12, -86, 11, -70); c.lineTo(7, -76); c.lineTo(-7, -76); c.closePath(); c.fill()
      glint(c, -4, -71, 1.8, '#bff2df'); glint(c, 4, -71, 1.8, '#bff2df')
      c.save(); c.translate(0, -94); c.rotate(now / 900)
      c.strokeStyle = '#bfeaf1'; c.lineWidth = 1.4; c.beginPath(); c.arc(0, 0, 9, 0, Math.PI * 2); c.stroke()
      c.fillStyle = '#e8f8ff'; c.beginPath(); c.moveTo(0, -9); c.lineTo(3, 0); c.lineTo(0, 9); c.lineTo(-3, 0); c.closePath(); c.fill()
      c.restore()
      c.save(); c.translate(20, -46); c.shadowColor = '#9fe8ff'; c.shadowBlur = 9
      c.fillStyle = '#bfeaf1'; c.beginPath(); c.moveTo(0, -9); c.lineTo(6, 0); c.lineTo(0, 9); c.lineTo(-6, 0); c.closePath(); c.fill(); c.restore()
    } else {
      // 老周：记忆守望者，灰褐长袍、白须与灵魂灯火。
      const robe = c.createLinearGradient(0, -72, 0, -4)
      robe.addColorStop(0, '#b6a687'); robe.addColorStop(.55, '#75654f'); robe.addColorStop(1, '#3a3128')
      c.fillStyle = robe; c.beginPath(); c.moveTo(-15, -62); c.lineTo(15, -62); c.lineTo(23, -5); c.lineTo(-23, -5); c.closePath(); c.fill()
      c.strokeStyle = 'rgba(20, 16, 12, .6)'; c.lineWidth = 1.2; c.stroke()
      c.fillStyle = '#8d7a5b'; c.fillRect(-17, -36, 34, 4)
      c.fillStyle = '#d8bd98'; c.beginPath(); c.arc(0, -72, 10, 0, Math.PI * 2); c.fill()
      c.fillStyle = '#efe6d3'; c.beginPath(); c.moveTo(-8, -66); c.quadraticCurveTo(0, -50, 8, -66); c.quadraticCurveTo(0, -59, -8, -66); c.fill()
      c.strokeStyle = '#efe6d3'; c.lineWidth = 2; c.beginPath(); c.moveTo(-6, -74); c.lineTo(-12, -67); c.moveTo(6, -74); c.lineTo(12, -67); c.stroke()
      glint(c, -4, -73, 1.4, '#ffe6a8'); glint(c, 4, -73, 1.4, '#ffe6a8')
      c.strokeStyle = '#7a5a35'; c.lineWidth = 3; c.beginPath(); c.moveTo(20, -4); c.lineTo(24, -66); c.stroke()
      c.save(); c.shadowColor = '#ffd27a'; c.shadowBlur = 12
      c.fillStyle = '#ffe6a8'; c.beginPath(); c.arc(24, -71, 4.5 + Math.sin(now / 300) * .8, 0, Math.PI * 2); c.fill(); c.restore()
    }
    c.restore()
    drawCompanionNameplates(c, companion.name, x, near, world.floor - 108 + bob)
  }
}
function drawTownNpc(c: CanvasRenderingContext2D) {
  if (!game || scene !== 'town' || !npcUnlocked()) return
  const x = TOWN_NPC_X
  const now = performance.now()
  const bob = Math.sin(now / 460) * 1.1
  const near = Math.abs(heroX - x) <= 80
  c.save()
  c.fillStyle = 'rgba(8, 17, 17, .3)'; c.beginPath(); c.ellipse(x, world.floor + 2, 20, 6, 0, 0, Math.PI * 2); c.fill()
  c.translate(x, world.floor + bob)
  // 阿岩：从第三关救出的年轻冒险者，如今在营火集市摆摊。
  const coat = c.createLinearGradient(0, -66, 0, -4)
  coat.addColorStop(0, '#6fb2a1'); coat.addColorStop(.55, '#3f7568'); coat.addColorStop(1, '#1f3f3a')
  c.fillStyle = coat; c.beginPath(); c.moveTo(-15, -60); c.lineTo(15, -60); c.lineTo(19, -6); c.lineTo(-19, -6); c.closePath(); c.fill()
  c.strokeStyle = 'rgba(8, 24, 22, .6)'; c.lineWidth = 1.2; c.stroke()
  c.fillStyle = '#c9b273'; c.fillRect(-16, -34, 32, 4)
  // 皮革斜挎带与钱袋
  c.strokeStyle = '#8a5f3a'; c.lineWidth = 4; c.beginPath(); c.moveTo(-13, -55); c.lineTo(13, -22); c.stroke()
  c.fillStyle = '#a9753f'; c.beginPath(); c.ellipse(13, -20, 6, 5, -.3, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#e0c07a'; c.beginPath(); c.arc(13, -20, 2, 0, Math.PI * 2); c.fill()
  // 手臂与护腕
  c.fillStyle = '#3f7568'; c.fillRect(-21, -56, 7, 22); c.fillRect(14, -56, 7, 21)
  c.fillStyle = '#b98d58'; c.fillRect(-22, -38, 9, 4); c.fillRect(13, -39, 9, 4)
  // 头部、短发与护目镜
  c.fillStyle = '#d8b48a'; c.beginPath(); c.arc(0, -71, 10, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#2b2620'; c.beginPath(); c.moveTo(-11, -74); c.quadraticCurveTo(0, -86, 11, -74); c.lineTo(9, -78); c.lineTo(-9, -78); c.closePath(); c.fill()
  c.fillStyle = '#c9b273'; c.fillRect(-9, -75, 18, 3)
  glint(c, -4, -70, 1.7, '#ffe6a8'); glint(c, 4, -70, 1.7, '#ffe6a8')
  // 肩上的旅商木箱
  c.fillStyle = '#7a5230'; c.fillRect(14, -96, 16, 20)
  c.strokeStyle = '#4e341f'; c.lineWidth = 1.2; c.strokeRect(14, -96, 16, 20)
  c.fillStyle = '#c9b273'; c.fillRect(14, -88, 16, 2)
  // 招牌灯
  c.strokeStyle = '#8a5f3a'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-20, -8); c.lineTo(-26, -66); c.stroke()
  c.save(); c.shadowColor = '#ffd27a'; c.shadowBlur = 13
  c.fillStyle = '#ffe6a8'; c.beginPath(); c.arc(-26, -70, 4.6 + Math.sin(now / 260) * .7, 0, Math.PI * 2); c.fill(); c.restore()
  c.restore()
  drawCompanionNameplates(c, TOWN_NPC_NAME, x, near, world.floor - 120 + bob)
}
function renderGame() {
  if (!game) return renderTitle()
  const s = stats()
  const isTown = scene === 'town'
  const canControl = (scene === 'battle' || scene === 'town') && !paused && !bossVictory
  if (isTown) { heroX = Math.max(TOWN_LEFT, Math.min(TOWN_RIGHT, heroX)); cameraX = 0 }
  const boss = foes.some((foe) => foe.boss)
  setMusicMode(isTown ? 'town' : boss ? 'boss' : 'battle')
  const areaName = tutorialMode ? '新手试炼场' : hiddenBattle ? '隐藏关卡 · 挑战宿敌' : stageNames[game.stage - 1]
  const bossLabel = tutorialMode ? '训练傀儡' : hiddenBattle ? '宿敌' : '守关者'
  const chapterLabel = tutorialMode ? 'NEW PLAYER' : hiddenBattle ? 'SECRET BATTLE' : `第 ${String(game.stage).padStart(2, '0')} 章`
  const countText = tutorialMode ? '训练' : hiddenBattle ? '宿敌' : boss ? bossLabel : `${game.kills} / ${MAX_SMALL_KILLS}`
  const townOverlay = ''
  const deathOverlay = scene === 'defeat' ? '<div class="overlay death-overlay"><small>EXPEDITION PAUSED</small><h2>你倒在了遗迹深处</h2><p>继续战斗会以半血复活并保留当前进度；重新开始会恢复满状态并从本关第一波重新挑战；回到小镇会恢复满状态。</p><div class="death-actions"><button data-action="respawn-fight" class="primary">继续战斗（半血）</button><button data-action="restart-stage" class="secondary">重新开始（满状态）</button><button data-action="respawn-town" class="secondary">回到小镇</button></div></div>' : ''
  const endingOverlay = scene === 'ending' ? '<div class="overlay"><small>THE FRONTIER IS YOURS</small><h2>十片遗迹，皆已沉寂</h2><p>你完成了元素远征。</p><button data-action="town" class="primary">返回小镇　↗</button></div>' : ''
  app.innerHTML = `<main class="game-shell ${isTown ? 'town-mode' : ''}"><header class="game-header"><a data-action="town" class="wordmark"><b>A</b> 冒险王 <i>／</i> ${isTown ? '冒险者小镇' : '元素远征'}</a>${DEMO_MODE ? '<span class="demo-badge">体验版 · 全关卡</span>' : ''}<span class="save-state"><i></i>${isTown ? '小镇安全区' : '进度已自动保存'}</span><span class="soul-badge" title="灵魂">${itemIcon('soul')} ${displayNumber(game.soul ?? 0)}</span><button class="bag-button" data-action="bag">${itemIcon('bag')} 背包 <span>${game.gear.length}</span></button><button class="save-button" data-action="save" title="保存进度">▣</button></header><section class="overview"><div><small>${isTown ? '冒险者小镇' : chapterLabel}</small><h1>${isTown ? '营火集市' : areaName}</h1><p>${isTown ? '缓冲区 · 整备装备与选择关卡' : tutorialMode ? '新手试炼 · 完成引导目标' : hiddenBattle ? '宿敌对决 · 没有退路' : `遗迹入口 · 击败 ${MAX_SMALL_KILLS} 只守卫后迎战 Boss`}</p></div><div class="metrics"><div><small>职业</small><b>${roleLabels[game.role]}</b></div><div><small>已击杀</small><b>${isTown ? `开放至第 ${game.unlockedStage} 关` : countText}</b></div><div><small>当前装备</small><b>${item()?.name ?? '无'}</b></div></div></section><section class="game-grid"><div class="battle-column"><div class="arena-label"><span>◆ ${isTown ? '冒险者小镇 · 补给站' : `${areaName} · 深层区域`}</span><b id="enemy-name">${isTown ? '安全区域' : tutorialMode ? '训练傀儡正在等待' : hiddenBattle ? '宿敌正在等待' : boss ? `${bossLabel}冲刺准备中` : `${foes.length} 只守卫正在逼近`}</b></div><div class="arena-stage"><div class="arena"><canvas id="arena" aria-label="横版战斗场景"></canvas><div class="coords"><span>${isTown ? 'TOWN · SAFE ZONE' : tutorialMode ? 'NEW PLAYER · TRAINING' : hiddenBattle ? 'SECRET · RIVAL' : `遗迹远征 · ${String(game.stage).padStart(2, '0')}`}</span><span>${boss ? 'BOSS ENCOUNTER' : isTown ? 'REST & PREPARE' : 'WAVE ENCOUNTER'}</span></div>${townOverlay}${deathOverlay}${endingOverlay}${bossVictoryMarkup()}${tutorialHintMarkup()}<div class="mobile-control-deck"><div class="mobile-rail mobile-move-rail"><button class="mobile-pad" data-move="left" aria-label="向左移动" title="向左移动" ${canControl ? '' : 'disabled'}>←</button><button class="mobile-pad" data-move="right" aria-label="向右移动" title="向右移动" ${canControl ? '' : 'disabled'}>→</button></div><div class="mobile-rail mobile-action-rail"><div class="mobile-skills">${[2, 3, 0, 1].map((index) => `<button class="mobile-skill" data-action="skill" data-index="${index}" aria-label="技能 ${index + 1}" ${canControl ? '' : 'disabled'}>${index + 1}</button>`).join('')}</div><div class="mobile-utils"><button class="mobile-skill mobile-pickup" data-action="pickup" aria-label="拾取" title="拾取药水 / 与商人对话" ${canControl ? '' : 'disabled'}>S</button><button class="mobile-skill mobile-shield" data-shield aria-label="护盾" title="按住生成护盾" ${canControl ? '' : 'disabled'}>L</button></div><button class="mobile-pad attack-pad" data-action="attack" aria-label="攻击" title="攻击" ${canControl ? '' : 'disabled'}>⚔</button><button class="mobile-pad jump-pad" data-action="jump" aria-label="跳跃" title="跳跃" ${canControl ? '' : 'disabled'}>↟</button></div></div></div></div><div class="foe-health"><div><span>${isTown ? '冒险者状态' : boss ? bossLabel : '本批守卫'}</span><b id="foe-hp">${isTown ? '安全休整' : boss ? `${Math.ceil(foes[0]?.hp ?? 0)} / ${foes[0]?.maxHp ?? 0}` : `${foes.length} 名敌人 · 已击败 ${game.kills} / ${MAX_SMALL_KILLS}`}</b></div><div><i id="foe-fill" style="width:${boss ? `${Math.max(0, foes[0].hp / foes[0].maxHp * 100)}%` : '100%'}"></i></div></div><div class="combat-bar"><button data-action="attack" class="attack" ${canControl ? '' : 'disabled'}><b>${game.role === 'warrior' ? '⚔' : '✦'}</b><span><strong>${game.role === 'warrior' ? '剑刃斩击' : '法杖射击'}</strong><small>J · ${game.role === 'warrior' ? '近战' : '远程'}</small></span></button><button data-action="jump" ${canControl ? '' : 'disabled'}><b>↟</b><span><strong>跳跃</strong><small>K ×2</small></span></button>${skillLabels[game.role].map((label, i) => `<button data-action="skill" data-index="${i}" ${canControl ? '' : 'disabled'}><i>${i + 1}</i><span><strong>${label}</strong><small>${skillSummary(game!.role, i)}</small></span></button>`).join('')}</div><div class="combat-log"><b>✦</b><span>${logText}</span></div></div><aside class="side-column">${isTown ? townPanelMarkup() : ''}<section class="panel status-panel"><header><span>角色状态</span><small>${String(game.stage).padStart(2, '0')}</small></header><div class="hero-card"><b class="avatar ${game.role}">${game.role === 'warrior' ? '刃' : '✦'}</b><span><strong>${roleLabels[game.role]}</strong><small>${game.role === 'warrior' ? '钢铁誓约 · 剑士' : '星辉学派 · 法杖'}</small></span></div><div class="resource-label"><span>生命</span><b id="hp-text">${displayNumber(game.hp)} <i>/ ${displayNumber(s.hp)}</i></b><em>♥</em></div><div class="resource"><i id="hp-fill" style="width:${game.hp / s.hp * 100}%"></i></div><div class="resource-label mana-label"><span>法力</span><b id="mp-text">${displayNumber(game.mp)} <i>/ ${displayNumber(s.mp)}</i></b><em>✦</em></div><div class="resource"><i id="mp-fill" style="width:${game.mp / s.mp * 100}%"></i></div><div class="stats"><div><small>攻击</small><b>${displayNumber(s.attack)}</b></div><div><small>防御</small><b>${displayNumber(s.defense)}</b></div><div><small>增益</small><b id="buff-stat">${buffTime > 0 ? `${buffTime.toFixed(1)}s` : '—'}</b></div></div></section><section class="panel gear-panel"><header><span>装备栏</span><small>${item()?.name ?? '未装备'}</small></header><div class="gear-summary">${item() ? `生命 +${item()!.hp}　攻击 +${item()!.attack}　防御 +${item()!.defense}` : '装备不会自动穿戴，请在小镇打开背包手动更换。'}</div><button class="open-bag" data-action="bag">打开背包　↗</button><div class="camp-hint">⌂　${isTown ? '安全区内可自由更换装备' : '击败 Boss 后回到小镇整备'}</div></section></aside></section><footer class="game-footer"><span>WASD / ← → 移动　·　J 攻击　·　K 跳跃 / 二段跳　·　1–4 技能　·　L 护盾</span><b>LOCAL SAVE　●</b></footer>${bagOpen ? bagMarkup() : ''}</main>`
  if (craftingOpen && isTown) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', `<div class="bag-scrim craft-scrim"><section class="bag-dialog craft-dialog"><header><div><small>FORGE · 冒险者小镇</small><h2>合成台</h2></div><button data-action="close-crafting" aria-label="关闭合成台">×</button></header><p>只消耗未穿戴的材料：5 件同类同等级武器/护甲合成高一级装备；3 件一阶时装合成二阶时装。</p><div class="bag-list craft-list">${craftMarkup()}</div></section></div>`)
  if (attributesOpen && isTown) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', attributeMarkup())
  if (npcOpen) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', npcMarkup())
  if (stageCircleOpen) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', stageCircleMarkup())
  if (lotteryOpen) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', lotteryMarkup())
  if (storyState) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', storyMarkup())
  mountBattleHud()
  mountLevelHud()
  mountEquipmentHud()
  if (isTown && !game.completed) mountTownStageActions()
  const header = document.querySelector<HTMLElement>('.game-header')
  header?.insertAdjacentHTML('beforeend', '<button class="role-select-button" data-action="role-select">角色选择</button>')
  header?.insertAdjacentHTML('beforeend', '<button class="landscape-button" data-action="landscape" title="进入横屏全屏">横屏</button>')
  header?.insertAdjacentHTML('beforeend', `<button class="audio-button" data-action="toggle-audio" title="音效与音乐开关">${audioEnabled() ? '♪' : '×'}</button>`)
  if (scene === 'battle' && header && !bossVictory) header.insertAdjacentHTML('beforeend', `<button class="pause-button" data-action="pause" title="按 P 暂停或继续">${paused ? '继续' : '暂停'} <span>P</span></button>`)
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
  if (controls) controls.textContent = 'WASD / ← → 移动　·　J 攻击　·　K 跳跃 / 二段跳　·　1–4 技能　·　L 按住护盾（防御 ×10，耗蓝 3/秒）　·　S 拾取药水　·　P 暂停'
  setupCanvas()
  syncHud()
}
function render() {
  if (authState === 'auth') return renderAuth()
  if (authState === 'loading') return renderAuthLoading()
  scene === 'title' ? renderTitle() : renderGame()
}
function foeLabel(foe: Foe) { return foe.tutorial ? '训练傀儡' : foe.mirror ? '宿敌' : foe.boss ? '守关者' : '遗迹守卫' }
function foeHeadTop(foe: Foe) {
  const offset = (foe.tutorial ? 270 : foe.mirror ? 118 : foe.boss ? 242 : 72) + foeFlyOffset(foe)
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
    bars.innerHTML = `<div class="player-resource"><div><span>生命</span><b id="hp-text">${displayNumber(game.hp)} / ${displayNumber(s.hp)}</b></div><div class="resource"><i id="hp-fill" style="width:${game.hp / s.hp * 100}%"></i></div></div><div class="player-resource mana-resource"><div><span>法力</span><b id="mp-text">${displayNumber(game.mp)} / ${displayNumber(s.mp)}</b></div><div class="resource"><i id="mp-fill" style="width:${game.mp / s.mp * 100}%"></i></div></div>`
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
    head.innerHTML = `<span>${foeLabel(foe)} <b>${Math.ceil(foe.hp)}</b></span><div><i class="foe-head-fill" style="width:${Math.max(0, foe.hp / foe.maxHp * 100)}%"></i></div>`
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
  const maxed = !Number.isFinite(needed)
  const progress = document.createElement('div')
  progress.className = 'level-progress'
  progress.innerHTML = `<div><b id="level-label">角色等级 ${level}</b><span id="xp-label">${maxed ? '经验 MAX' : `经验 ${displayNumber(exp)} / ${displayNumber(needed)}`}</span></div><div class="xp-track"><i id="xp-fill" style="width:${maxed ? 100 : Math.min(100, exp / needed * 100)}%"></i></div>`
  heroCard.insertAdjacentElement('afterend', progress)
}
function mountEquipmentHud() {
  if (!game) return
  const weapon = game.gear.find((gear) => gear.id === game?.weaponId)
  const offWeapon = game.advancedTalent === 3 ? game.gear.find((gear) => gear.id === game?.weapon2Id) : undefined
  const armor = game.gear.find((gear) => gear.id === game?.armorId)
  const fashion = game.gear.find((gear) => gear.id === game?.fashionId)
  const multiplier = roleGearMultiplier(game.role)
  const scaled = (value: number | undefined) => Math.round((value ?? 0) * multiplier)
  const weaponName = [weapon?.name, offWeapon?.name].filter(Boolean).join(' / ') || '未装备'
  const header = document.querySelector<HTMLElement>('.gear-panel header small')
  const summary = document.querySelector<HTMLElement>('.gear-summary')
  if (header) header.textContent = `武器：${weaponName} · 护甲：${armor?.name ?? '未装备'} · 时装：${fashion?.name ?? '未装备'}${game.role === 'mage' ? ' · 法师收益 80%' : ''}`
  if (summary) summary.innerHTML = `<span>⚔ 武器　蓝量 +${scaled((weapon?.mp ?? 0) + (offWeapon?.mp ?? 0))}　攻击 +${scaled((weapon?.attack ?? 0) + (offWeapon?.attack ?? 0))}</span><span>▰ 护甲　生命 +${scaled(armor?.hp)}　防御 +${scaled(armor?.defense)}</span><span>✧ 时装　${fashion ? fashionSummary(fashion.level) : '未装备'}</span>`
  const metric = document.querySelector<HTMLElement>('.metrics div:last-child b')
  if (metric) metric.textContent = `${weaponName} / ${armor?.name ?? '无护甲'} / ${fashion?.name ?? '无时装'}`
}
function mountTownStageActions() {
  if (!game || scene !== 'town' || game.completed) return
  const select = document.querySelector<HTMLSelectElement>('#stage-select')
  const existingButton = document.querySelector('[data-action="enter-stage"]')
  if (!select || !existingButton) return
  const progress = getStageProgress(game.stage)
  const actionHtml = progress.bossDefeated
    ? `<p class="stage-progress-copy">本关 Boss 已击败</p><div class="town-stage-choices"><button class="secondary" data-action="restart-stage">重新开始（满状态）</button><button class="primary" data-action="challenge-boss">直接挑战 Boss</button></div>`
    : game.kills > 0
      ? `<p class="stage-progress-copy">未通关 · 可继续进度或重新开始</p><div class="town-stage-choices"><button class="primary" data-action="continue-progress">继续战斗（半血）</button><button class="secondary" data-action="restart-stage">重新开始（满状态）</button></div>`
      : `<p class="stage-progress-copy">未通关 · 从第一波开始</p><button class="primary town-continue-stage" data-action="restart-stage">从第一波开始（满状态）</button>`
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
  const maxed = !Number.isFinite(needed)
  if (levelLabel) levelLabel.textContent = `角色等级 ${level}`
  if (xpLabel) xpLabel.textContent = maxed ? '经验 MAX' : `经验 ${displayNumber(exp)} / ${displayNumber(needed)}`
  if (xpFill) xpFill.style.width = `${maxed ? 100 : Math.min(100, exp / needed * 100)}%`
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
  const hp = document.querySelector<HTMLElement>('#hp-text'); if (hp) hp.innerHTML = `${displayNumber(game.hp)} <i>/ ${displayNumber(s.hp)}</i>`
  const mp = document.querySelector<HTMLElement>('#mp-text'); if (mp) mp.innerHTML = `${displayNumber(game.mp)} <i>/ ${displayNumber(s.mp)}</i>`
  const coreStats = document.querySelectorAll<HTMLElement>('.stats div b')
  if (coreStats[0]) coreStats[0].textContent = displayNumber(s.attack)
  if (coreStats[1]) coreStats[1].textContent = displayNumber(s.defense)
  const killMetric = document.querySelector<HTMLElement>('.metrics div:nth-child(2) b')
  if (killMetric && scene === 'battle') killMetric.textContent = foes.some((foe) => foe.boss) ? '守关者' : `${game.kills} / ${MAX_SMALL_KILLS}`
  const foeHp = document.querySelector<HTMLElement>('#foe-hp')
  if (foeHp && scene === 'battle') foeHp.textContent = bossVictory ? 'BOSS DEFEATED' : foes[0]?.boss ? `${Math.ceil(foes[0].hp)} / ${foes[0].maxHp}` : `${foes.length} 名敌人 · 已击败 ${game.kills} / ${MAX_SMALL_KILLS}`
  const buff = document.querySelector<HTMLElement>('#buff-stat'); if (buff) buff.textContent = buffTime > 0 ? `${buffTime.toFixed(1)}s` : '—'
  const enemyName = document.querySelector<HTMLElement>('#enemy-name')
  if (enemyName && scene === 'battle') enemyName.textContent = bossVictory ? '守关者已击败 · 远征记录更新' : tutorialMode ? '训练傀儡正在等待' : hiddenBattle ? '宿敌正在等待' : foes[0]?.boss ? `${foeLabel(foes[0])}冲刺准备中` : foes.length ? `${foes.length} 只守卫正在逼近` : waveReady ? '继续向右推进，解锁新的区域' : '区域已清空'
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
      head.innerHTML = `<span>${foeLabel(foe)} <b></b></span><div><i class="foe-head-fill"></i></div>`
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
function skillCostFor(role: Role, index: number) {
  const base = SKILL_COSTS[role][index]
  return game?.advancedTalent === 1 ? Math.ceil(base * 1.05) : base
}
function skillPower(index: number) {
  const multiplier = SKILL_MULTIPLIERS[game?.role ?? 'warrior'][index]
  const talentMultiplier = game?.advancedTalent === 1 ? 1.1 : 1
  return Math.round(stats().attack * multiplier * talentMultiplier)
}
function skillSummary(role: Role, index: number) {
  const cost = skillCostFor(role, index)
  if (role === 'mage' && index === 0) return `+10% 攻速/攻击 · 7s · ${cost} MP`
  if (role === 'mage' && index === 2) return `无伤害位移 · ${cost} MP`
  if (role === 'mage' && index === 3) return `眩晕 1s · 5 连击 · ${cost} MP`
  return `${Math.round(SKILL_MULTIPLIERS[role][index] * 100)}% 攻击 · ${cost} MP`
}
function spend(cost: number) {
  if (!game) return false
  if (scene === 'town') return true
  if (game.mp < cost) { toast('法力不足，无法释放技能。'); return false }
  game.mp -= cost
  return true
}
function targetForFacing(range: number): Foe | undefined {
  return foes.filter((foe) => Math.abs(foe.x - heroX) <= range).sort((a, b) => {
    const distance = Math.abs(a.x - heroX) - Math.abs(b.x - heroX)
    if (Math.abs(distance) > 1) return distance
    return (b.x - heroX) * facing - (a.x - heroX) * facing
  })[0]
}
function strike(target: Foe, damage: number, label: string) {
  if (!game || !foes.includes(target)) return
  if (target.tutorial && tutorialStep < 4) {
    setLog('先完成训练目标，训练傀儡暂时不会受伤。')
    addFx('impact', target.x, world.floor - 58, -1, .22)
    return
  }
  playSfx('hit')
  const dealt = Math.max(1, Math.round(damage))
  target.hp -= dealt; target.flash = .18
  addDamageText(target, dealt)
  const impactY = target.flying ? foeWorldY(target) - 14 : target.mirror ? world.floor - 68 : target.tutorial ? world.floor - 100 : world.floor - (target.boss ? 120 : 58)
  addFx('impact', target.x, impactY, -1, .22)
  addSparks(target.x, impactY + 8, 4, ['#ffe6a8', '#e8b56f'], 110)
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
  if ((scene !== 'battle' && scene !== 'town') || paused || bossVictory || storyState || !game || attackWait > 0) return
  const hasted = game.role === 'mage' && buffTime > 0
  attackWait = hasted ? .42 / 1.1 : .42; attackSwing = .32
  const nearest = [...foes].sort((a, b) => Math.abs(a.x - heroX) - Math.abs(b.x - heroX))[0]
  if (nearest) facing = Math.sign(nearest.x - heroX) || facing
  if (game.role === 'warrior') {
    const style = weaponStyle()
    const fxColor = weaponFxColor()
    const swingY = world.floor - 53 + heroY
    addFx(`weapon-swing-${style}`, heroX + facing * 42, swingY, facing, .4, fxColor)
    if (!foes.length) addFx('slash-crescent', heroX + facing * 46, swingY - 3, facing, .5)
    addSparks(heroX + facing * 54, swingY + 4, style === 'axe' ? 9 : 5, [fxColor, '#fff2c0'], style === 'axe' ? 140 : 90)
    if (style === 'axe') addShake(3)
    strikeNearby(stats().attack, '剑刃斩击', 138)
  } else {
    const target = targetForFacing(unlockedWidth - MAP_LEFT)
    const projectileDirection = target ? Math.sign(target.x - heroX) || facing : facing
    projectiles.push({ x: heroX + projectileDirection * 20, y: world.floor - 54 + heroY, vx: projectileDirection * 620, life: 1.3, damage: stats().attack, targetId: target?.id ?? -1 })
    addFx('muzzle', heroX + projectileDirection * 20, world.floor - 54 + heroY, projectileDirection, .16)
    addSparks(heroX + projectileDirection * 20, world.floor - 54 + heroY, 4, [weaponFxColor(), '#e8ffe8'], 80)
    if (!target) setLog('法杖光弹向空地上射出。')
  }
  playSfx(game.role === 'warrior' ? 'slash' : 'magic')
  if (tutorialMode && tutorialStep === 1) advanceTutorialStep(2)
}
function jump() {
  if ((scene !== 'battle' && scene !== 'town') || paused || bossVictory || storyState) return
  if (grounded) {
    grounded = false; velocityY = -570; jumpCount = 1
    addFx('dust', heroX, world.floor - 2, 1, .3)
    playSfx('jump')
  } else if (jumpCount < 2) {
    jumpCount = 2; velocityY = -480
    addFx('double-jump', heroX, world.floor + heroY, facing, .36)
    addSparks(heroX, world.floor + heroY, 10, ['#cfe6d8', '#e8dcb0'], 130)
    playSfx('double-jump')
    if (tutorialMode && tutorialStep === 2) advanceTutorialStep(3)
  }
}
function cast(index: number) {
  if ((scene !== 'battle' && scene !== 'town') || paused || bossVictory || storyState || !game || index < 0 || index > 3) return
  if (skillWait[index] > 0) { toast('技能还在冷却中。'); return }
  if (!spend(skillCostFor(game.role, index))) return
  skillWait[index] = SKILL_COOLDOWNS[index]
  attackSwing = .32
  playSkillSfx(game.role, index)
  const power = skillPower(index)
  // 技能 3：按 A + 3 向左、D + 3 向右；没按方向键时沿当前视角方向。
  if (index === 2) {
    const left = keys.has('a') || keys.has('arrowleft')
    const right = keys.has('d') || keys.has('arrowright')
    if (left !== right) facing = right ? 1 : -1
  } else if (!(game.role === 'mage' && index === 1)) {
    // 法师双生火柱固定在当前朝向前方，不再自动转向最近的敌人。
    const nearest = [...foes].sort((a, b) => Math.abs(a.x - heroX) - Math.abs(b.x - heroX))[0]
    if (nearest) facing = Math.sign(nearest.x - heroX) || facing
  }
  if (game.role === 'warrior') {
    const style = weaponStyle()
    const fxColor = weaponFxColor()
    if (index === 0) {
      const frontY = world.floor - 78 + heroY
      addFx(`weapon-swing-${style}`, heroX + facing * 56, frontY, facing, .56, fxColor)
      addFx('front-slash', heroX + facing * 62, frontY, facing, .66, fxColor)
      addFx('slash-crescent', heroX + facing * 50, frontY - 2, facing, .55)
      addSparks(heroX + facing * 82, frontY + 6, 16, [fxColor, '#f2c46d', '#fff6d0'], 190)
      addShake(3)
      addFlash(.18, fxColor)
      const target = targetForFacing(165)
      if (!target) setLog(foes.length ? '距离太远，攻击没有命中。' : '剑气划过空气。')
      else {
        // 前斩附带一点击退，把目标推离角色。
        if (!target.boss) target.x = clampFoeX(target.x + (Math.sign(target.x - heroX) || facing) * 34)
        strike(target, power, '前斩')
      }
    } else if (index === 1) {
      addFx('whirlwind-storm', heroX, world.floor - 82 + heroY, facing, .8)
      addSparks(heroX, world.floor - 70 + heroY, 14, [fxColor, '#e9d797'], 210)
      addShake(5)
      strikeNearby(power, '旋风斩', 205, true)
    } else if (index === 2) {
      addFx('thrust-dash', heroX + facing * 88, world.floor - 82 + heroY, facing, .42)
      const startX = heroX
      const endX = scene === 'town'
        ? Math.max(TOWN_LEFT, Math.min(TOWN_RIGHT, heroX + facing * 150))
        : clampHeroX(heroX + facing * 150)
      const targets = foes.filter((foe) => foe.x >= Math.min(startX, endX) - 38 && foe.x <= Math.max(startX, endX) + 38)
      heroX = endX
      addFx(`weapon-swing-${style}`, heroX + facing * 50, world.floor - 80 + heroY, facing, .45, fxColor)
      addSparks(heroX, world.floor - 70 + heroY, 6, [fxColor, '#f3efd6'], 120)
      if (targets.length) {
        // 突刺会把非 Boss 目标一起带到落点前方。
        targets.forEach((foe, order) => {
          if (!foe.boss) foe.x = clampFoeX(endX + facing * (30 + order * 42))
          strike(foe, power, '突刺')
        })
      } else setLog('突刺穿过前方，未命中目标。')
    } else {
      const greatY = world.floor - 80 + heroY
      addFx(`weapon-swing-${style}`, heroX + facing * 60, greatY, facing, .7, fxColor)
      addFx('great-slash', heroX + facing * 92, greatY, facing, 1.15, fxColor)
      addFx('great-quake', heroX + facing * 70, world.floor - 8, facing, 1.0, fxColor)
      addFx('ground-break', heroX + facing * 60, world.floor - 70, facing, .85)
      addSparks(heroX + facing * 60, world.floor - 8, 36, [fxColor, '#d8b96c', '#fff6d0', '#a98d55'], 340)
      addShake(18)
      addFlash(.55, fxColor)
      strikeNearby(power, '蓄力重斩', 175, true)
    }
  } else if (index === 0) {
    buffTime = 7
    addFx('arcane-blessing', heroX, world.floor - 88, facing, 1)
    addSparks(heroX, world.floor - 70, 12, ['#b9e0d2', '#e6ddb0'], 90)
    setLog('奥术强化：7 秒内攻击与攻速提升 10%。')
  } else if (index === 1) {
    const center = heroX + facing * 150
    addFx('twin-fire-pillars', center, world.floor - 2, facing, .9)
    addSparks(heroX + facing * 120, world.floor - 40, 16, ['#ff9a5c', '#ffd27a'], 170)
    addShake(4)
    const targets = foes.filter((foe) => Math.abs(foe.x - heroX) <= 320)
    // 火柱之间的吸力：非 Boss 敌人被拉向两根火柱的中点。
    targets.forEach((foe) => { if (!foe.boss) foe.x = clampFoeX(foe.x + (center - foe.x) * .8) })
    if (targets.length) targets.forEach((foe) => strike(foe, power, '双生火柱'))
    else setLog('双生火柱在空地上燃起。')
  } else if (index === 2) {
    addFx('blink-rift', heroX, world.floor - 65, facing, .35)
    heroX = scene === 'town'
      ? Math.max(TOWN_LEFT, Math.min(TOWN_RIGHT, heroX + facing * 210))
      : clampHeroX(heroX + facing * 210)
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
    target.stunTimer = target.mirror ? 0 : 1
    target.dashWindup = undefined
    target.specialWindup = undefined
    target.skillWindup = undefined
    target.rangedWindup = undefined
    target.specialTimer = Math.max(target.specialTimer ?? 0, 2)
    burst = 5; burstWait = .06; burstTargetId = target.id
    addFx('energy-prison', target.x, world.floor - (target.boss ? 130 : 66), facing, 1.2)
    addSparks(target.x, world.floor - 80, 18, ['#a8e0d0', '#d7f4ea'], 120)
    setLog('能量禁锢展开 · 控制目标 1 秒并瞬发 5 次普攻。')
  }
  if (tutorialMode && tutorialStep === 3) advanceTutorialStep(4)
  syncHud(); save()
}
function defeatFoe(target: Foe) {
  if (!game) return
  playSfx('defeat')
  const wasBoss = target.boss
  foes = foes.filter((foe) => foe.id !== target.id)
  if (target.tutorial) {
    foes = []
    tutorialMode = false; tutorialStep = 0
    game.tutorialDone = true; game.town = true; game.dead = false; game.completed = false
    scene = 'town'; paused = false; heroSupportTop = world.floor
    restoreTownVitals()
    projectiles = []; foeShots = []; effects = []; burst = 0; burstTargetId = null
    save()
    startStory(tutorialCompleteStoryData(), () => {
      if (!game) return
      if (!game.townIntroSeen) {
        startStory(townIntroStoryData(), () => { if (!game) return; game.townIntroSeen = true; save(); renderGame() })
      } else renderGame()
    })
    return
  }
  if (target.mirror) {
    foes = []
    hiddenBattle = false
    game.hiddenCleared = true
    game.town = true; game.dead = false
    scene = 'town'; paused = false; heroSupportTop = world.floor
    restoreTownVitals()
    projectiles = []; foeShots = []; effects = []; burst = 0; burstTargetId = null
    save()
    startStory(hiddenCompleteStoryData(), () => { save(); renderGame() })
    return
  }
  const bossExperience = (wasBoss ? 100 : 10) * 2 ** (game.stage - 1)
  awardExperience(bossExperience)
  const droppedGear = dropGear(wasBoss)
  if (!wasBoss) dropPotions(target.x)
  if (wasBoss) {
    const clearedStage = game.stage
    const soulGain = clearedStage * 100
    game.soul = (game.soul ?? 0) + soulGain
    game.bossDefeated = true
    game.unlockedStage = Math.max(game.unlockedStage, Math.min(10, clearedStage + 1))
    game.stageProgress ??= {}
    const clearedProgress = game.stageProgress[String(clearedStage)]
    const wasFirstClear = !clearedProgress?.bossDefeated
    game.stageProgress[String(clearedStage)] = { kills: game.kills, bossDefeated: true, pointsClaimed: clearedProgress?.pointsClaimed ?? 0 }
    const rewards = [`${itemIcon('soul')} 灵魂 +${soulGain}`, `${itemIcon('attribute')} 经验 +${bossExperience}`]
    for (const gear of droppedGear) rewards.push(`${itemIcon(gear.type === 'armor' ? 'armor' : 'weapon')} ${gear.name}`)
    if (Math.random() < STAMP_DROP_CHANCE) {
      game.stamps = (game.stamps ?? 0) + 1
      rewards.push(`${itemIcon('stamp')} 王印印章 +1（${game.stamps} / ${STAMP_UNLOCK}）`)
      toast(`获得王印印章 ×1 · ${game.stamps} / ${STAMP_UNLOCK}`)
    }
    if (wasFirstClear) {
      game.lotteryChances = (game.lotteryChances ?? 0) + 1
      rewards.push(`${itemIcon('ticket')} 抽奖机会 +1`)
      toast('首次通关 · 获得一次抽奖机会。')
    }
    if (clearedStage >= 3) {
      const fragmentChance = (clearedStage + 1) * .05
      if (Math.random() < fragmentChance) {
        if (game.normalTalent && game.advancedTalent) {
          game.soul += 1000
          rewards.push(`${itemIcon('soul')} 天赋碎片转化为 1000 灵魂`)
          toast('天赋已成型 · 天赋币碎片转化为 1000 灵魂。')
        } else {
          game.talentFragments = (game.talentFragments ?? 0) + 1
          rewards.push(`${itemIcon('fragment')} 天赋币碎片 +1`)
          toast('获得天赋币碎片 ×1。')
        }
      }
    }
    foeShots = []
    projectiles = []
    // 先进入胜利演出；结算和场景切换延迟到动画结束。
    bossVictory = { stage: clearedStage, bossX: target.x, rewards, time: 3.6, ending: clearedStage >= 10 }
    game.town = true
    if (clearedStage >= 10) game.completed = true
    addFx('victory-shockwave', target.x, world.floor - 92, 1, 1.5)
    addSparks(target.x, world.floor - 88, 46, ['#fff4c4', '#f5cf7a', '#ffd27a', '#ffffff'], 380)
    addShake(18)
    playSfx('victory')
    save(); renderGame(); return
  }
  game.kills += 1
  game.soul = (game.soul ?? 0) + game.stage * 5
  awardKillPoints()
  if (foes.length === 0) armNextWave()
  save(); syncHud()
}
function finishBossVictory() {
  if (!game || !bossVictory) return
  const clearedStage = bossVictory.stage
  const ending = bossVictory.ending
  bossVictory = null
  keys.clear()
  if (ending || clearedStage >= 10) {
    game.completed = true; scene = 'ending'; game.town = false
  } else {
    // 下一关从第一波开始，不能直接挑战 Boss。
    game.stage = clearedStage + 1
    game.kills = 0
    game.bossDefeated = false
    scene = 'town'; game.town = true; heroX = 480; cameraX = 0; heroY = 0; velocityY = 0; grounded = true; jumpCount = 0; heroSupportTop = world.floor
    restoreTownVitals()
  }
  save()
  if (clearedStage >= 10 && !seenStory('stage-ending-story')) startStory(stageEndingStoryData(), () => { save(); renderGame() })
  else renderGame()
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
function makeFashion(tier: number): Gear {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: fashionTierName(tier), level: tier, type: 'fashion', hp: 0, mp: 0, attack: 0, defense: 0 }
}
function fashionSummary(tier: number) {
  const stats = fashionTierStats(tier)
  return `生命 +${Math.round(stats.hpPct * 100)}% · 攻击 +${stats.atkFlat} + ${Math.round(stats.atkPct * 100)}% · 防御 +${stats.defFlat} + ${Math.round(stats.defPct * 100)}% · 蓝量 +${stats.mpFlat} + ${Math.round(stats.mpPct * 100)}%`
}
function gearDropLevel(): number {
  if (!game) return 0
  for (let candidate = game.stage; candidate >= 1; candidate -= 1) {
    const chance = Math.max(0, .06 - candidate * .01)
    if (Math.random() < chance) return candidate
  }
  return 0
}
function dropGear(boss: boolean): Gear[] {
  const dropped: Gear[] = []
  if (!game) return dropped
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
    dropped.push(gear)
    toast(`${boss ? 'Boss' : '小怪'}掉落：${level} 级${type === 'weapon' ? '武器' : '护甲'}「${gear.name}」`)
    setLog(`${gear.name}已放入背包，穿戴后生效。`)
  }
  return dropped
}
function dropPotions(x: number) {
  if (!game) return
  for (const type of ['hp-potion', 'mp-potion'] as const) {
    if (Math.random() < POTION_DROP_CHANCE) game.drops!.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, x: Math.max(MAP_LEFT, Math.min(unlockedWidth - 35, x)) })
  }
}
function pickupDrop() {
  if (!game) return
  if (scene === 'town') {
    const companion = townCompanions().find((entry) => Math.abs(heroX - entry.x) <= 70)
    if (companion) { startStory(companionThanksStoryData(companion.id)); return }
    if (Math.abs(heroX - TOWN_CIRCLE_X) <= 60) { openStageCircle(); return }
    if (npcUnlocked() && Math.abs(heroX - TOWN_NPC_X) <= 80) openNpcMenu()
    return
  }
  if (scene !== 'battle') return
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
  if (gear.type === 'fashion') game.fashionId = id
  else if (gear.type === 'weapon') {
    if (game.advancedTalent === 3 && game.weaponId && game.weaponId !== id) {
      if (game.weapon2Id === id) game.weapon2Id = null
      game.weapon2Id = id
    } else {
      if (game.weapon2Id === id) game.weapon2Id = null
      game.weaponId = id
    }
  } else if (gear.type === 'armor') game.armorId = id
  else { game.weaponId = null; game.weapon2Id = null; game.armorId = null; game.fashionId = null }
  const after = stats()
  game.hp = Math.min(after.hp, game.hp + after.hp - before.hp)
  game.mp = Math.min(after.mp, game.mp + after.mp - before.mp)
  save(); bagOpen = true; renderGame(); toast(`已装备 ${gear.name}`)
}
function equipSlot(id: string, slot: 'main' | 'off') {
  if (!game || scene !== 'town') { toast('请回到小镇后更换装备。'); return }
  const gear = game.gear.find((entry) => entry.id === id)
  if (!gear || gear.type !== 'weapon') return
  if (slot === 'off' && game.advancedTalent !== 3) { toast('需要双持专精天赋才能装备副武器。'); return }
  const before = stats()
  if (slot === 'off') {
    if (game.weaponId === id) game.weaponId = null
    game.weapon2Id = id
  } else {
    if (game.weapon2Id === id) game.weapon2Id = null
    game.weaponId = id
  }
  game.equipped = id
  const after = stats()
  game.hp = Math.min(after.hp, game.hp + after.hp - before.hp)
  game.mp = Math.min(after.mp, game.mp + after.mp - before.mp)
  save(); bagOpen = true; renderGame(); toast(`已装备 ${gear.name}（${slot === 'main' ? '主手' : '副手'}）`)
}
function synthesizeGear(type: GearType, level: number) {
  if (!game || scene !== 'town') { toast('请回到小镇后合成装备。'); return }
  const worn = new Set([game.weaponId, game.armorId, game.fashionId])
  const required = type === 'fashion' ? 3 : 5
  const matches = game.gear.filter((entry) => entry.type === type && entry.level === level && !worn.has(entry.id))
  if (matches.length < required) {
    toast(type === 'fashion' ? '合成二阶时装需要 3 件未穿戴的一阶时装。' : '合成需要 5 件同品类、同等级且未穿戴的装备。')
    return
  }
  const consumed = new Set(matches.slice(0, required).map((entry) => entry.id))
  game.gear = game.gear.filter((entry) => !consumed.has(entry.id))
  const result = type === 'fashion' ? makeFashion(level + 1) : makeGear(type, level + 1)
  game.gear.unshift(result)
  save(); renderGame(); craftingOpen = true; renderGame()
  toast(type === 'fashion' ? `合成成功：${result.name}` : `合成成功：${result.name} · ${result.level} 级`)
}
function continueCurrentProgress() {
  if (!game || scene !== 'town' || game.kills <= 0 || game.bossDefeated) return
  scene = 'battle'; game.town = false; game.dead = false; paused = false
  game.hp = Math.max(1, Math.round(stats().hp * .5))
  heroX = 480; heroY = 0; velocityY = 0; grounded = true; heroSupportTop = world.floor
  projectiles = []; foeShots = []; effects = []; burst = 0; burstTargetId = null; enterBattlefield(); save(); renderGame()
}
function retreatToTown() {
  if (!game) return
  paused = false
  hiddenBattle = false
  scene = 'town'; game.town = true; game.dead = false
  restoreTownVitals()
  heroX = 480; cameraX = 0; heroY = 0; velocityY = 0; grounded = true; heroSupportTop = world.floor; jumpCount = 0
  foes = []; projectiles = []; foeShots = []; burst = 0; burstTargetId = null; resetPanels(); save(); renderGame()
}
function resumeBattle() {
  if (!game) return
  paused = false
  if (hiddenBattle) {
    scene = 'battle'; game.town = true; game.dead = false
    game.hp = Math.max(1, Math.round(stats().hp * .5)); game.mp = Math.min(stats().mp, game.mp)
    heroX = 480; heroY = 0; velocityY = 0; grounded = true; heroSupportTop = world.floor; jumpCount = 0
    projectiles = []; foeShots = []; burst = 0; burstTargetId = null
    save(); renderGame(); return
  }
  scene = 'battle'; game.town = false; game.dead = false; game.hp = Math.max(1, Math.round(stats().hp * .5)); game.mp = Math.min(stats().mp, game.mp)
  heroX = 480; heroY = 0; velocityY = 0; grounded = true; heroSupportTop = world.floor; projectiles = []; foeShots = []; burst = 0; burstTargetId = null; enterBattlefield(); save(); renderGame()
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
  if (bossVictory && name !== 'continue-victory') return
  if (name === 'continue-victory') { finishBossVictory(); return }
  if (storyState) {
    if (name === 'story-next') advanceStory()
    else if (name === 'story-choice' && target.dataset.value) chooseStory(target.dataset.value)
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
    resetPanels()
    scene = 'title'; paused = false; pendingRole = null; foes = []; projectiles = []; foeShots = []
    saveSlots = readSaves()
    renderTitle()
  }
  if (name === 'delete-slot' && target.dataset.slot) deleteSaveSlot(target.dataset.slot)
  if (name === 'cancel-delete') { pendingDeleteId = null; document.querySelector('.delete-confirm')?.remove() }
  if (name === 'confirm-delete') confirmDeleteSave()
  if (name === 'overwrite-slot' && pendingRole && target.dataset.slot) createRole(pendingRole, target.dataset.slot)
  if (name === 'cancel-new') { pendingRole = null; renderTitle() }
  if (name === 'open-crafting' && scene === 'town') {
    if (!forgeUnlocked()) { toast('通关第一关后解锁合成台。'); return }
    if (game && !game.forgeIntroSeen) {
      startStory(forgeIntroStoryData(), () => {
        if (!game) return
        game.forgeIntroSeen = true
        save()
        resetPanels(); craftingOpen = true; renderGame()
      })
      return
    }
    resetPanels(); craftingOpen = true; renderGame()
  }
  if (name === 'close-crafting') { craftingOpen = false; renderGame() }
  if (name === 'open-attributes' && game && scene === 'town') { resetPanels(); attributesOpen = true; renderGame() }
  if (name === 'close-attributes') { attributesOpen = false; renderGame() }
  if (name === 'allocate-attr' && target.dataset.stat) {
    const stat = target.dataset.stat
    if (stat === 'hp' || stat === 'attack' || stat === 'mp' || stat === 'defense') allocateAttribute(stat)
  }
  if (name === 'continue-progress' && game && scene === 'town') continueCurrentProgress()
  if (name === 'continue-stage' && game && scene === 'town') beginStage(game.stage, 'continue')
  if (name === 'restart-stage' && game && (scene === 'town' || scene === 'defeat')) {
    if (hiddenBattle) beginHiddenBattle()
    else beginStage(game.stage, 'restart')
  }
  if (name === 'open-hidden' && game && scene === 'town') beginHiddenBattle()
  if (name === 'challenge-boss' && game && scene === 'town') beginStage(game.stage, 'boss')
  if (name === 'attack') attack()
  if (name === 'pickup') pickupDrop()
  if (name === 'jump') jump()
  if (name === 'skill') cast(Number(target.dataset.index))
  if (name === 'pause' && scene === 'battle') { paused = !paused; keys.clear(); renderGame() }
  if (name === 'bag') { resetPanels(); bagOpen = true; renderGame() }
  if (name === 'close-bag') { bagOpen = false; renderGame() }
  if (name === 'bag-tab' && target.dataset.tab) {
    const tab = target.dataset.tab
    if (tab === 'gear' || tab === 'talent' || tab === 'other') { bagTab = tab; bagOpen = true; renderGame() }
  }
  if (name === 'equip' && target.dataset.id) equip(target.dataset.id)
  if (name === 'equip-main' && target.dataset.id) equipSlot(target.dataset.id, 'main')
  if (name === 'equip-off' && target.dataset.id) equipSlot(target.dataset.id, 'off')
  if (name === 'open-npc' && game && scene === 'town' && npcUnlocked()) { openNpcMenu() }
  if (name === 'close-npc') { npcOpen = false; renderGame() }
  if (name === 'close-stage-circle') { stageCircleOpen = false; renderGame() }
  if (name === 'circle-enter-stage' && game && target.dataset.stage) {
    stageCircleOpen = false
    beginStage(Math.max(1, Math.min(game.unlockedStage, Number(target.dataset.stage))))
  }
  if (name === 'npc-menu') { npcView = 'menu'; renderGame() }
  if (name === 'npc-shop') { npcView = 'shop'; renderGame() }
  if (name === 'npc-talent') { npcView = 'talent'; renderGame() }
  if (name === 'shop-buy' && target.dataset.id) buyShopItem(target.dataset.id)
  if (name === 'talent-normal' && target.dataset.id) selectNormalTalent(Number(target.dataset.id))
  if (name === 'talent-advanced' && target.dataset.id) selectAdvancedTalent(Number(target.dataset.id))
  if (name === 'talent-craft') craftTalentCoin()
  if (name === 'open-lottery') openLottery()
  if (name === 'close-lottery') closeLottery()
  if (name === 'lottery-spin') startLottery()
  if (name === 'synthesize-group' && target.dataset.type && target.dataset.level) synthesizeGear(target.dataset.type as GearType, Number(target.dataset.level))
  if (name === 'enter-stage' && game) {
    const selected = Number(document.querySelector<HTMLSelectElement>('#stage-select')?.value ?? game.stage)
    beginStage(Math.max(1, Math.min(game.unlockedStage, selected)))
  }
  if (name === 'respawn-town') retreatToTown()
  if (name === 'respawn-fight') resumeBattle()
  if (name === 'town' && game) retreatToTown()
  if (name === 'save') { save(); toast('远征进度已保存。') }
}
app.addEventListener('click', (event) => {
  const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-action]') : null
  if (target && !target.hasAttribute('disabled')) {
    // 手机战斗按键在 pointerdown 时立即响应，避免多指触控时 click 丢失或重复触发。
    if (target.closest('.mobile-control-deck')) return
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
// 每个触控点单独记录按下的虚拟键，松开一根手指时不会影响另一根手指的移动或护盾。
const touchPointers = new Map<number, 'arrowleft' | 'arrowright' | 'l'>()
app.addEventListener('pointerdown', (event) => {
  if (!(event.target instanceof HTMLElement)) return
  const moveButton = event.target.closest<HTMLElement>('[data-move]')
  if (moveButton?.dataset.move) {
    event.preventDefault()
    const key = moveButton.dataset.move === 'left' ? 'arrowleft' : 'arrowright'
    keys.add(key)
    touchPointers.set(event.pointerId, key)
  }
  const shieldButton = event.target.closest<HTMLButtonElement>('[data-shield]')
  if (shieldButton && !shieldButton.disabled) {
    event.preventDefault()
    keys.add('l')
    touchPointers.set(event.pointerId, 'l')
  }
  // 手机端攻击、跳跃、技能与 S：在按下瞬间执行，支持一边移动一边攻击/跳跃。
  const actionButton = event.target.closest<HTMLElement>('.mobile-control-deck [data-action]')
  if (actionButton && !actionButton.hasAttribute('disabled')) {
    event.preventDefault()
    playSfx('ui')
    performAction(actionButton.dataset.action ?? '', actionButton)
  }
})
app.addEventListener('contextmenu', (event) => {
  if (event.target instanceof HTMLElement && event.target.closest('button, [data-move], [data-shield]')) event.preventDefault()
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
function releaseTouchPointer(event: PointerEvent) {
  const key = touchPointers.get(event.pointerId)
  if (!key) return
  touchPointers.delete(event.pointerId)
  const stillHeld = Array.from(touchPointers.values()).includes(key)
  if (!stillHeld) {
    keys.delete(key)
    if (key === 'l') shieldLocked = false
  }
}
// 窗口失焦或指针被系统取消时，只清理没有其它手指按住的键。
window.addEventListener('pointerup', releaseTouchPointer)
window.addEventListener('pointercancel', releaseTouchPointer)
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase()
  if (pendingDeleteId && key === 'escape') { pendingDeleteId = null; document.querySelector('.delete-confirm')?.remove(); return }
  if (lotteryOpen && key === 'escape') { closeLottery(); return }
  if (stageCircleOpen && key === 'escape') { stageCircleOpen = false; renderGame(); return }
  if (npcOpen && key === 'escape') { npcOpen = false; renderGame(); return }
  if (bagOpen && key === 'escape') { bagOpen = false; renderGame(); return }
  if (attributesOpen && key === 'escape') { attributesOpen = false; renderGame(); return }
  if (craftingOpen && key === 'escape') { craftingOpen = false; renderGame(); return }
  if (bagOpen || craftingOpen || attributesOpen || npcOpen || lotteryOpen || stageCircleOpen) return
  if (bossVictory) {
    if (key === ' ' || key === 'enter') event.preventDefault()
    if (key === 'enter' || key === ' ' || key === 'escape') finishBossVictory()
    return
  }
  if (storyState) {
    if (key === 'enter' || key === ' ') { event.preventDefault(); advanceStory() }
    return
  }
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
window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase()
  keys.delete(key)
  if (key === 'l') shieldLocked = false
})
window.addEventListener('blur', () => { keys.clear(); touchPointers.clear(); shieldActive = false; shieldLocked = false })
function setupCanvas() {
  canvas = document.querySelector<HTMLCanvasElement>('#arena')
  if (!canvas) return
  canvas.width = world.width; canvas.height = world.height; ctx = canvas.getContext('2d')
}
function update(dt: number) {
  shake = Math.max(0, shake - dt * 30)
  flashTime = Math.max(0, flashTime - dt * 1.6)
  if (paused) { shieldActive = false; return }
  if (storyState) return
  if (scene !== 'battle' || bossVictory) shieldActive = false
  if (scene !== 'battle') cameraX = 0
  attackWait = Math.max(0, attackWait - dt); attackSwing = Math.max(0, attackSwing - dt); buffTime = Math.max(0, buffTime - dt)
  skillWait = skillWait.map((time) => Math.max(0, time - dt))
  if (scene === 'town' && game) {
    const left = keys.has('a') || keys.has('arrowleft')
    const right = keys.has('d') || keys.has('arrowright')
    if (left !== right) {
      const direction = right ? 1 : -1
      heroX = Math.max(TOWN_LEFT, Math.min(TOWN_RIGHT, heroX + direction * 220 * dt))
      facing = direction
    }
    if (keys.has('j') && attackWait <= 0) attack()
    if (!grounded) {
      heroY += velocityY * dt; velocityY += 1450 * dt
      if (heroY >= 0) { heroY = 0; velocityY = 0; grounded = true; jumpCount = 0 }
    }
    for (const projectile of [...projectiles]) {
      projectile.x += projectile.vx * dt
      projectile.life -= dt
      if (projectile.life <= 0 || projectile.x < TOWN_LEFT - 120 || projectile.x > TOWN_RIGHT + 120) {
        projectiles = projectiles.filter((entry) => entry !== projectile)
      }
    }
    cameraX = 0
    syncHud()
  }
  if (bossVictory) {
    bossVictory.time -= dt
    if (bossVictory.time <= 0) finishBossVictory()
  } else if (scene === 'battle' && game) {
    const holdingShield = keys.has('l') && !shieldLocked && !bossVictory && game.mp > 0
    shieldActive = holdingShield
    if (holdingShield) {
      game.mp = Math.max(0, game.mp - dt * 3)
      if (game.mp <= 0) {
        game.mp = 0; shieldActive = false; shieldLocked = true
        addFx('shield-break', heroX + facing * 42, world.floor - 50 + heroY, facing, .55, weaponFxColor())
        addSparks(heroX + facing * 42, world.floor - 50 + heroY, 14, [weaponFxColor(), '#ffffff'], 220)
        addShake(4)
        toast('法力耗尽，护盾解除。')
      }
    }
    if (!shieldActive) game.mp = Math.min(stats().mp, game.mp + dt * 4)
    const left = keys.has('a') || keys.has('arrowleft'); const right = keys.has('d') || keys.has('arrowright')
    if (left !== right) { const d = right ? 1 : -1; heroX = clampHeroX(heroX + d * 245 * dt); facing = d }
    if (tutorialMode && tutorialStep === 0 && left !== right) advanceTutorialStep(1)
    if (keys.has('j') && attackWait <= 0) attack()
    if (grounded && heroSupportTop < world.floor) {
      const support = platformsForStage().find((platform) => heroX >= platform.x && heroX <= platform.x + platform.w && world.floor - platform.height === heroSupportTop)
      if (!support) { grounded = false; velocityY = 0 }
    }
    if (!grounded) {
      const previousFeetY = world.floor + heroY
      heroY += velocityY * dt; velocityY += 1450 * dt
      const feetY = world.floor + heroY
      if (velocityY > 0) {
        const landing = platformsForStage()
          .filter((platform) => heroX >= platform.x && heroX <= platform.x + platform.w && world.floor - platform.height >= previousFeetY - 1 && world.floor - platform.height <= feetY + 1)
          .sort((a, b) => (world.floor - a.height) - (world.floor - b.height))[0]
        if (landing) {
          heroSupportTop = world.floor - landing.height
          heroY = heroSupportTop - world.floor
          velocityY = 0; grounded = true; jumpCount = 0
          addFx('dust', heroX, heroSupportTop - 2, 1, .3)
        } else if (feetY >= world.floor) {
          heroSupportTop = world.floor; heroY = 0; velocityY = 0; grounded = true; jumpCount = 0
          addFx('dust', heroX, world.floor - 2, 1, .2)
        }
      }
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
      if (foe.tutorial) continue
      const distance = heroX - foe.x
      const directionToHero = Math.sign(distance) || 1
      if (foe.mirror) {
        updateMirrorFoe(foe, dt, distance, directionToHero)
        if (game.hp <= 0) break
        continue
      }
      const mobRanged = MOB_RANGED[stageIndex]
      if (foe.boss) foe.specialTimer = Math.max(0, (foe.specialTimer ?? 0) - dt)
      else foe.mobSkillTimer = Math.max(0, (foe.mobSkillTimer ?? 0) - dt)

      // 小怪技能：短暂前摇后冲撞或震地。
      if (!foe.boss && foe.skillWindup !== undefined) {
        foe.skillWindup -= dt
        if (foe.skillWindup <= 0) {
          executeMobSkill(foe, stageIndex)
          foe.skillWindup = undefined
          if (game.hp <= 0) break
        }
        continue
      }
      // 小怪远程攻击：蓄力后发射。
      if (!foe.boss && foe.rangedWindup !== undefined) {
        foe.rangedWindup -= dt
        if (foe.rangedWindup <= 0) {
          foe.rangedWindup = undefined
          if (mobRanged) fireMobVolley(foe, mobRanged, stageIndex)
          foe.rangedTimer = mobRanged?.interval ?? 4
          foe.attackAnim = .3
        }
        continue
      }
      if (!foe.boss && mobRanged && (foe.mobSkillTimer ?? 0) <= 0 && Math.abs(distance) < 430) {
        const kind = stageIndex >= 6 ? 'slam' : 'lunge'
        const windup = kind === 'lunge' ? .38 : .5
        foe.skillKind = kind
        foe.skillWindup = windup
        foe.mobSkillTimer = 6 + Math.random() * 2
        foe.rangedTimer = Math.max(foe.rangedTimer, 1.5)
        foe.flash = .18; foe.attackAnim = .45
        const theme = STAGE_THEMES[stageIndex]
        effects.push({ kind: kind === 'lunge' ? 'mob-skill-lunge' : 'mob-skill-slam', x: foe.x, y: foeWorldY(foe) - 12, direction: directionToHero, life: windup, duration: windup, color: theme.glow })
        addSparks(foe.x, foeWorldY(foe) - 20, 8, [theme.accent, theme.glow], 100)
        setLog(`遗迹守卫正在蓄力${kind === 'lunge' ? '冲撞' : '震地'}...`)
        continue
      }
      if (!foe.boss && mobRanged && foe.rangedTimer <= 0 && Math.abs(distance) > 135 && Math.abs(distance) < 620) {
        foe.rangedWindup = .45
        foe.rangedTimer = mobRanged.interval + .45
        foe.mobSkillTimer = Math.max(foe.mobSkillTimer ?? 0, 1.5)
        foe.flash = .15; foe.attackAnim = .4
        const theme = STAGE_THEMES[stageIndex]
        effects.push({ kind: 'mob-ranged-charge', x: foe.x, y: foeWorldY(foe) - 18, direction: directionToHero, life: .45, duration: .45, color: theme.glow })
        addSparks(foe.x, foeWorldY(foe) - 18, 7, [theme.light, theme.glow], 100)
        setLog('遗迹守卫正在凝聚远程攻击...')
        continue
      }

      // Boss 强力技能 / 专属技能：独立前摇，前摇期间停止普通行动。
      if (foe.boss && foe.specialWindup !== undefined) {
        foe.specialWindup -= dt
        if (foe.specialWindup <= 0) {
          const kind = foe.specialKind
          foe.specialWindup = undefined
          foe.specialKind = undefined
          if (kind) executeBossSpecial(foe, kind, stageIndex)
          if (game.hp <= 0) break
        }
        continue
      }
      if (foe.boss && stageIndex >= 6 && (foe.specialTimer ?? 0) <= 0 && foe.dashWindup === undefined && foe.rangedWindup === undefined && Math.abs(distance) < 620) {
        startBossSpecial(foe, stageIndex)
        continue
      }
      if (foe.boss && foe.dashWindup !== undefined) {
        foe.dashWindup -= dt
        if (foe.dashWindup <= 0) {
          const startX = foe.x
          foe.x = Math.max(MAP_LEFT, Math.min(unlockedWidth - 30, foe.x + (foe.dashDirection ?? directionToHero) * dashConfig.speed))
          foe.dashWindup = undefined
          foe.attackAnim = .35
          addFx(bossFx('dash'), (startX + foe.x) / 2, world.floor - 70, foe.dashDirection ?? directionToHero, .55)
          if (Math.abs(heroX - foe.x) < 105 && (heroY > -35)) {
            game.hp = Math.max(0, game.hp - foeDamage(foe, true))
            armorHitFx()
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
        if (Math.abs(distance) < (foe.boss ? 138 : 112) && foe.timer <= 0 && (heroY > -36)) {
          const damage = foeDamage(foe)
          game.hp = Math.max(0, game.hp - damage); foe.timer = foe.boss ? Math.max(1, 1.5 - game.stage * .035) : 1.7 + Math.random() * .5
          foe.attackAnim = .35
          playSfx(foe.boss ? 'boss' : 'slash')
          playSfx('hurt')
          const theme = STAGE_THEMES[stageIndex]
          addFx(foe.boss ? bossFx('melee') : 'enemy-swipe', heroX, world.floor - 52 + heroY, -directionToHero, .38)
          armorHitFx()
          addSparks(heroX, world.floor - 48 + heroY, foe.boss ? 8 : 5, [theme.accent, theme.glow], foe.boss ? 150 : 110)
          if (foe.flying) addSparks(foe.x, foeWorldY(foe), 6, [theme.light, theme.accent], 100)
          effects.push({ kind: 'damage-number', x: heroX, y: world.floor - 90 + heroY, life: .82, duration: .82, text: `-${displayNumber(damage)}` })
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
        const shotDamage = Math.max(3, Math.round(shot.damage - effectiveDefense()))
        game.hp = Math.max(0, game.hp - shotDamage)
        effects.push({ kind: 'damage-number', x: heroX, y: world.floor - 90 + heroY, life: .82, duration: .82, text: `-${displayNumber(shotDamage)}`, damage: shotDamage })
        armorHitFx()
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
          const hitY = target.flying ? foeWorldY(target) - 24 : world.floor - (target.boss ? 120 : 58)
          const hitColor = weaponFxColor()
          addFx('arcane-bolt-hit', target.x, hitY, Math.sign(target.x - heroX) || 1, .38, hitColor)
          addFx('energy-prison-hit', target.x, hitY, 1, .32)
          addSparks(target.x, hitY + 10, 7, [hitColor, '#e8ffe8'], 140)
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
function drawBattleScenery(c: CanvasRenderingContext2D) {
  if (scene !== 'battle') return
  const theme = currentStageTheme()
  const stage = hiddenBattle ? 0 : stageIndexNow()
  const segments = Math.ceil(Math.min(unlockedWidth, 7000) / MAP_SEGMENT)
  for (let segment = 0; segment < segments; segment++) {
    const variant = (segment + stage) % 4
    const x0 = segment * MAP_SEGMENT
    if (x0 > cameraX + world.width + 120 || x0 + MAP_SEGMENT < cameraX - 120) continue
    c.save(); c.globalAlpha = .5
    if (variant === 0) {
      for (const [dx, h] of [[70, 70], [300, 96]]) {
        const tx = x0 + dx
        c.fillStyle = theme.dark; c.fillRect(tx - 4, world.floor - h, 8, h)
        c.fillStyle = theme.body; c.beginPath(); c.arc(tx, world.floor - h - 6, 22, 0, Math.PI * 2); c.fill()
      }
    } else if (variant === 1) {
      c.fillStyle = theme.dark; c.fillRect(x0 + 80, world.floor - 80, 22, 80); c.fillRect(x0 + 260, world.floor - 54, 18, 54)
      c.fillStyle = theme.body; c.fillRect(x0 + 70, world.floor - 86, 44, 8); c.fillRect(x0 + 252, world.floor - 60, 34, 6)
    } else if (variant === 2) {
      c.fillStyle = theme.accent; c.beginPath(); c.moveTo(x0 + 100, world.floor); c.lineTo(x0 + 112, world.floor - 54); c.lineTo(x0 + 124, world.floor); c.closePath(); c.fill()
      c.fillStyle = theme.glow; c.beginPath(); c.moveTo(x0 + 280, world.floor); c.lineTo(x0 + 292, world.floor - 38); c.lineTo(x0 + 304, world.floor); c.closePath(); c.fill()
    } else {
      c.strokeStyle = theme.dark; c.lineWidth = 5
      c.beginPath(); c.moveTo(x0 + 90, world.floor); c.lineTo(x0 + 98, world.floor - 64); c.lineTo(x0 + 80, world.floor - 82); c.moveTo(x0 + 98, world.floor - 48); c.lineTo(x0 + 116, world.floor - 64); c.stroke()
      c.strokeStyle = theme.accent; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x0 + 300, world.floor - 100); c.lineTo(x0 + 300, world.floor - 60); c.stroke()
      c.fillStyle = theme.accent; c.beginPath(); c.arc(x0 + 300, world.floor - 56, 5, 0, Math.PI * 2); c.fill()
    }
    c.restore()
  }
}
function drawPlatforms(c: CanvasRenderingContext2D) {
  if (scene !== 'battle') return
  const theme = currentStageTheme()
  for (const platform of platformsForStage()) {
    if (platform.x > cameraX + world.width + 100 || platform.x + platform.w < cameraX - 100) continue
    const top = world.floor - platform.height
    c.save()
    if (platform.kind === 'tree') {
      c.fillStyle = theme.dark; c.fillRect(platform.x + platform.w / 2 - 7, top, 14, platform.height)
      c.fillStyle = theme.body; c.fillRect(platform.x, top - 5, platform.w, 10)
      c.fillStyle = theme.light; c.fillRect(platform.x, top - 5, platform.w, 2)
      c.globalAlpha = .7; c.fillStyle = theme.body
      c.beginPath(); c.ellipse(platform.x + 10, top - 20, 26, 14, -.3, 0, Math.PI * 2); c.fill()
      c.beginPath(); c.ellipse(platform.x + platform.w - 8, top - 18, 24, 13, .3, 0, Math.PI * 2); c.fill()
    } else if (platform.kind === 'rock') {
      c.fillStyle = theme.dark
      c.beginPath(); c.moveTo(platform.x, world.floor); c.lineTo(platform.x + 8, top + 18); c.lineTo(platform.x + 24, top); c.lineTo(platform.x + platform.w - 20, top); c.lineTo(platform.x + platform.w - 4, top + 22); c.lineTo(platform.x + platform.w, world.floor); c.closePath(); c.fill()
      c.fillStyle = theme.body; c.fillRect(platform.x + 20, top - 2, platform.w - 36, 7)
      c.globalAlpha = .45; c.fillStyle = theme.light; c.fillRect(platform.x + 20, top - 2, platform.w - 36, 2)
    } else if (platform.kind === 'ruin') {
      c.fillStyle = theme.dark; c.fillRect(platform.x + 10, top, 18, platform.height); c.fillRect(platform.x + platform.w - 28, top, 18, platform.height)
      c.fillStyle = theme.body; c.fillRect(platform.x, top - 8, platform.w, 10)
      c.globalAlpha = .4; c.fillStyle = theme.light; c.fillRect(platform.x, top - 8, platform.w, 2)
    } else {
      c.fillStyle = theme.dark; c.fillRect(platform.x, top + 8, platform.w, Math.max(0, platform.height - 8))
      c.fillStyle = theme.body; c.fillRect(platform.x, top, platform.w, 8)
      c.globalAlpha = .7; c.fillStyle = theme.glow
      for (const [dx, h] of [[20, 34], [platform.w / 2, 48], [platform.w - 18, 28]]) {
        c.beginPath(); c.moveTo(platform.x + dx - 6, top); c.lineTo(platform.x + dx, top - h); c.lineTo(platform.x + dx + 6, top); c.closePath(); c.fill()
      }
    }
    c.restore()
  }
}
function currentStageTheme(): EnemyTheme {
  const index = hiddenBattle ? 0 : Math.max(0, Math.min(9, (game?.stage ?? 1) - 1))
  return STAGE_THEMES[index]
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
  const jumpHeight = Math.max(0, -heroY)
  const now = performance.now()
  const sway = Math.sin(now / 150) * (grounded ? 1.2 : 0)
  const walking = grounded && (keys.has('a') || keys.has('d') || keys.has('arrowleft') || keys.has('arrowright'))
  const walk = walking ? Math.sin(now / 90) : 0
  c.fillStyle = 'rgba(8, 17, 17, .36)'; c.beginPath(); c.ellipse(heroX, (grounded ? heroSupportTop : world.floor) + 2, Math.max(11, 24 - jumpHeight * .036), 6, 0, 0, Math.PI * 2); c.fill()
  const auraColor = game.role === 'warrior'
    ? (fashionPalette(equippedLevel('fashion'))?.trim ?? '#ffd27a')
    : orbColor(equippedLevel('weapon'))
  c.save(); c.globalAlpha = .22; c.strokeStyle = auraColor; c.lineWidth = 1.4
  c.beginPath(); c.ellipse(heroX, world.floor + 2, 31, 8, 0, 0, Math.PI * 2); c.stroke(); c.restore()
  c.save(); c.translate(heroX, world.floor - jumpHeight + sway); c.scale(facing * .8, .8); c.rotate(walk * .022)
  c.save(); c.shadowColor = auraColor; c.shadowBlur = 7
  if (game.role === 'warrior') drawWarriorHero(c, now, walk)
  else drawMageHero(c, now, walk)
  c.restore()
  c.restore()
  drawFashionOrbit(c, jumpHeight)
}
function drawShield(c: CanvasRenderingContext2D) {
  if (!shieldActive || !game || scene !== 'battle') return
  const x = heroX + facing * 42
  const y = world.floor - 50 + heroY
  const color = weaponFxColor()
  const pulse = .88 + Math.sin(performance.now() / 110) * .12
  c.save(); c.translate(x, y); c.rotate(facing * .08)
  c.shadowColor = color; c.shadowBlur = 20
  c.globalAlpha = .3; c.fillStyle = color
  c.beginPath(); c.ellipse(0, 0, 13 * pulse, 35 * pulse, 0, 0, Math.PI * 2); c.fill()
  c.globalAlpha = .95; c.strokeStyle = color; c.lineWidth = 3
  c.beginPath(); c.ellipse(0, 0, 14 * pulse, 37 * pulse, 0, 0, Math.PI * 2); c.stroke()
  c.globalAlpha = .55; c.strokeStyle = '#ffffff'; c.lineWidth = 1.3
  c.beginPath(); c.ellipse(-facing * 2.4, 0, 9 * pulse, 30 * pulse, 0, 0, Math.PI * 2); c.stroke()
  c.globalAlpha = .8; c.fillStyle = '#ffffff'
  for (let i = 0; i < 3; i++) {
    const angle = performance.now() / 500 + (i * Math.PI * 2) / 3
    c.beginPath(); c.arc(Math.cos(angle) * 6, Math.sin(angle) * 24, 1.5, 0, Math.PI * 2); c.fill()
  }
  c.restore()
}
function equippedLevel(type: GearType) {
  const id = type === 'weapon' ? game?.weaponId : type === 'armor' ? game?.armorId : game?.fashionId
  return game?.gear.find((gear) => gear.id === id)?.level ?? 0
}
function equippedWeapon() { return game?.gear.find((gear) => gear.id === game?.weaponId) }
function weaponStyle(): 'sword' | 'axe' | 'staff' | 'blade' {
  const name = equippedWeapon()?.name ?? ''
  if (name.includes('战斧')) return 'axe'
  if (name.includes('法杖')) return 'staff'
  if (name.includes('之刃')) return 'blade'
  return 'sword'
}
function weaponFxColor() {
  const weapon = equippedWeapon()
  const level = weapon?.level ?? 1
  const style = weaponStyle()
  const colors: Record<string, string[]> = {
    sword: ['#ffe6a8', '#ffd27a', '#f5cf7a', '#ffe9b0', '#ffc46b', '#fff2c8'],
    axe: ['#ffb066', '#ff9a4d', '#ffc78a', '#ff7a3d', '#ffd6a0', '#ffb066'],
    staff: ['#c7b3ff', '#9fe8ff', '#ffb3e6', '#b3ffcf', '#fff0a8', '#c7b3ff'],
    blade: ['#9fe8ff', '#c7b3ff', '#b3ffcf', '#ffd6a0', '#ffb3e6', '#9fe8ff'],
  }
  const palette = colors[style] ?? colors.sword
  return palette[(Math.max(1, level) - 1) % palette.length]
}
function armorFxColor() {
  const armor = game?.gear.find((gear) => gear.id === game?.armorId)
  if (!armor) return '#cfd8c4'
  const name = armor.name ?? ''
  const base = name.includes('赤岩') ? 20 : name.includes('星辉') ? 265 : name.includes('沉钟') ? 187 : name.includes('苔纹') ? 104 : 90
  const level = Math.max(1, armor.level)
  return `hsl(${(base + level * 18) % 360}, 58%, 70%)`
}
function armorHitFx() { addFx('armor-hit', heroX, world.floor - 54 + heroY, 1, .5, armorFxColor()) }
function weaponPalette(level: number) {
  const palettes = [
    { light: '#f3f5e8', dark: '#c9d2c4', glow: '' },
    { light: '#ffe9a8', dark: '#d8b25c', glow: '#f5cf7a' },
    { light: '#d9c6ff', dark: '#9a7ad0', glow: '#b99aef' },
    { light: '#c5f2ff', dark: '#6fb8cc', glow: '#8ee6ff' },
    { light: '#ffd0a0', dark: '#e08a52', glow: '#ffb06a' },
  ]
  return palettes[Math.max(0, Math.min(palettes.length - 1, level - 1))] ?? palettes[0]
}
function armorPalette(level: number) {
  if (level >= 5) return { light: '#e0c47c', mid: '#a57c37', dark: '#57401d' }
  if (level >= 3) return { light: '#b8c8db', mid: '#70859c', dark: '#3b4b5c' }
  if (level >= 2) return { light: '#c0bda6', mid: '#7d7a68', dark: '#414238' }
  return { light: '#9aa89b', mid: '#66786d', dark: '#3c4d45' }
}
function fashionPalette(tier: number) {
  if (tier >= 4) return { top: '#7fc7d9', bottom: '#2b3f6e', trim: '#fff2b0' }
  if (tier >= 3) return { top: '#c25a3f', bottom: '#4a1f1c', trim: '#ffd18a' }
  if (tier >= 2) return { top: '#8a5cc2', bottom: '#3b245c', trim: '#f0c9ff' }
  if (tier >= 1) return { top: '#3e8f87', bottom: '#17413f', trim: '#e7d18f' }
  return null
}
// 时装环绕特效：阶级越高，环绕粒子越多、轨道越大。
function drawFashionOrbit(c: CanvasRenderingContext2D, jumpHeight: number) {
  if (!game) return
  const tier = equippedLevel('fashion')
  const palette = fashionPalette(tier)
  if (!tier || !palette) return
  const now = performance.now()
  const centerX = heroX
  const centerY = world.floor - jumpHeight - 37
  const count = Math.min(8, 2 + tier)
  const radiusX = 24 + Math.min(12, tier * 2.4)
  const radiusY = 13 + Math.min(8, tier * 1.6)
  c.save()
  c.globalAlpha = .85
  if (tier >= 2) {
    c.globalAlpha = .32; c.strokeStyle = palette.trim; c.lineWidth = 1.2
    c.beginPath(); c.ellipse(centerX, centerY, radiusX + 4, radiusY + 3, 0, 0, Math.PI * 2); c.stroke()
    if (tier >= 4) {
      c.globalAlpha = .2
      c.beginPath(); c.ellipse(centerX, centerY, radiusX + 10, radiusY + 7, 0, 0, Math.PI * 2); c.stroke()
    }
  }
  for (let i = 0; i < count; i++) {
    const speed = 900 - Math.min(320, tier * 65)
    const angle = now / speed + (i * Math.PI * 2) / count
    const x = centerX + Math.cos(angle) * radiusX
    const y = centerY + Math.sin(angle) * radiusY
    c.save(); c.translate(x, y); c.rotate(angle)
    c.shadowColor = palette.trim; c.shadowBlur = 8
    c.fillStyle = i % 2 ? palette.trim : palette.top
    if (tier >= 2) {
      c.beginPath(); c.moveTo(0, -3.5); c.lineTo(2.6, 0); c.lineTo(0, 3.5); c.lineTo(-2.6, 0); c.closePath(); c.fill()
    } else {
      c.beginPath(); c.arc(0, 0, 2.4, 0, Math.PI * 2); c.fill()
    }
    c.restore()
  }
  c.restore()
}
function robePalette(level: number) {
  if (level >= 4) return { top: '#7a6bb0', mid: '#4c4178', bottom: '#2b2448' }
  if (level >= 2) return { top: '#6fb2a1', mid: '#468779', bottom: '#26524a' }
  return { top: '#5a9c8c', mid: '#3d7a6c', bottom: '#244d45' }
}
function orbColor(level: number) {
  const colors = ['#b9e0d2', '#ffe28a', '#d6b4ff', '#9fe8ff', '#ffb38a']
  return colors[Math.max(0, Math.min(colors.length - 1, level - 1))] ?? colors[0]
}
function drawWarriorHero(c: CanvasRenderingContext2D, now: number, walk: number) {
  const capeWave = Math.sin(now / 260) * 3
  const weaponLevel = equippedLevel('weapon')
  const armorLevel = equippedLevel('armor')
  const fashionTier = equippedLevel('fashion')
  const bladeTint = weaponPalette(weaponLevel)
  const plate = armorPalette(armorLevel)
  const fashion = fashionPalette(fashionTier)
  // 时装的柔光轮廓
  if (fashion) {
    c.save(); c.globalAlpha = .2; c.fillStyle = fashion.trim
    c.beginPath(); c.ellipse(0, -42, 30, 48, 0, 0, Math.PI * 2); c.fill(); c.restore()
  }
  // 背后的圆盾
  c.fillStyle = plate.dark; c.strokeStyle = fashion?.trim ?? '#c6a967'; c.lineWidth = 2
  c.beginPath(); c.arc(-17, -46, 12, 0, Math.PI * 2); c.fill(); c.stroke()
  c.fillStyle = fashion?.trim ?? '#c6a967'; c.beginPath(); c.arc(-17, -46, 4, 0, Math.PI * 2); c.fill()
  // 披风：装备时装后更换配色
  const cape = c.createLinearGradient(0, -64, 0, -6)
  cape.addColorStop(0, fashion?.top ?? '#a9433a'); cape.addColorStop(1, fashion?.bottom ?? '#5f211f')
  c.fillStyle = cape; c.beginPath(); c.moveTo(-12, -62); c.quadraticCurveTo(-36, -40, -30 + capeWave, -6); c.lineTo(-10, -12); c.lineTo(8, -8); c.lineTo(12, -60); c.closePath(); c.fill()
  c.strokeStyle = 'rgba(24, 12, 10, .62)'; c.lineWidth = 1.3; c.stroke()
  c.fillStyle = 'rgba(255, 232, 176, .14)'; c.beginPath(); c.moveTo(-10, -58); c.quadraticCurveTo(-24, -34, -21 + capeWave, -12); c.lineTo(-13, -16); c.closePath(); c.fill()
  if (fashion) { c.strokeStyle = fashion.trim; c.globalAlpha = .7; c.lineWidth = 1; c.stroke(); c.globalAlpha = 1 }
  // 双持专精：背后的副武器
  if (game?.advancedTalent === 3 && game.weapon2Id) {
    c.save(); c.translate(-16, -44); c.rotate(.75)
    c.fillStyle = '#c6a967'; c.fillRect(-2, -2, 4, 11)
    c.fillStyle = bladeTint.dark; c.beginPath(); c.moveTo(0, -4); c.lineTo(4, -48); c.lineTo(8, -4); c.closePath(); c.fill()
    c.fillStyle = bladeTint.light; c.fillRect(4, -42, 1.5, 32)
    c.restore()
  }
  // 腿与靴子
  const legSwing = walk * 3
  c.fillStyle = '#263531'; c.fillRect(-13, -28, 10, 24 + legSwing); c.fillRect(3, -28, 10, 24 - legSwing)
  c.fillStyle = '#c3b893'; c.fillRect(-16, -6 + legSwing, 16, 6); c.fillRect(1, -6 - legSwing, 16, 6)
  c.fillStyle = plate.light; c.fillRect(-14, -24 + legSwing, 7, 4); c.fillRect(7, -24 - legSwing, 7, 4)
  // 胸甲
  const armor = c.createLinearGradient(0, -64, 0, -28); armor.addColorStop(0, plate.light); armor.addColorStop(.55, plate.mid); armor.addColorStop(1, plate.dark)
  c.fillStyle = armor; c.beginPath(); c.moveTo(-15, -62); c.lineTo(15, -62); c.lineTo(13, -30); c.lineTo(-13, -30); c.closePath(); c.fill()
  c.strokeStyle = 'rgba(12, 22, 20, .55)'; c.lineWidth = 1.2; c.stroke()
  c.fillStyle = 'rgba(232, 236, 211, .22)'; c.beginPath(); c.moveTo(-9, -59); c.lineTo(2, -59); c.lineTo(-1, -34); c.lineTo(-10, -38); c.closePath(); c.fill()
  c.strokeStyle = fashion?.trim ?? '#d6bd7c'; c.lineWidth = 1.3
  c.beginPath(); c.moveTo(-12, -56); c.lineTo(-10, -34); c.moveTo(12, -56); c.lineTo(10, -34); c.stroke()
  c.fillStyle = fashion?.trim ?? '#e3c985'; c.beginPath(); c.moveTo(0, -56); c.lineTo(3.6, -51.5); c.lineTo(0, -47); c.lineTo(-3.6, -51.5); c.closePath(); c.fill()
  if (armorLevel > 0) {
    c.save(); c.translate(0, -47); c.rotate(Math.PI / 4)
    c.fillStyle = bladeTint.glow || fashion?.trim || '#e7cf8e'; c.fillRect(-3, -3, 6, 6); c.restore()
  }
  // 腰带
  c.fillStyle = '#5a3f2a'; c.fillRect(-14, -34, 28, 6); c.fillStyle = '#d0b16a'; c.fillRect(-3, -35, 6, 8)
  // 肩甲
  c.fillStyle = plate.light; c.beginPath(); c.ellipse(-15, -58, 8, 6, -.25, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(15, -58, 8, 6, .25, 0, Math.PI * 2); c.fill()
  c.strokeStyle = 'rgba(12, 22, 20, .5)'; c.lineWidth = 1.2; c.stroke()
  c.fillStyle = plate.light
  c.beginPath(); c.moveTo(-23, -60); c.lineTo(-31, -71); c.lineTo(-16, -64); c.closePath(); c.fill()
  c.beginPath(); c.moveTo(23, -60); c.lineTo(31, -71); c.lineTo(16, -64); c.closePath(); c.fill()
  c.strokeStyle = 'rgba(12, 22, 20, .5)'; c.stroke()
  // 手臂
  c.fillStyle = plate.mid; c.fillRect(-21, -54, 7, 22); c.fillRect(14, -54, 7, 20)
  // 头部与头盔
  c.fillStyle = '#d8b48a'; c.fillRect(-10, -82, 20, 22)
  const helm = c.createLinearGradient(0, -92, 0, -72); helm.addColorStop(0, plate.light); helm.addColorStop(1, plate.dark)
  c.fillStyle = helm; c.beginPath(); c.moveTo(-13, -72); c.lineTo(-13, -86); c.quadraticCurveTo(0, -96, 13, -86); c.lineTo(13, -72); c.lineTo(8, -72); c.lineTo(8, -80); c.lineTo(-8, -80); c.lineTo(-8, -72); c.closePath(); c.fill()
  c.strokeStyle = 'rgba(12, 22, 20, .55)'; c.lineWidth = 1.2; c.stroke()
  c.fillStyle = plate.mid; c.fillRect(-2, -84, 4, 12)
  c.fillStyle = plate.dark
  c.beginPath(); c.moveTo(-13, -81); c.lineTo(-8, -74); c.lineTo(-11, -70); c.lineTo(-16, -79); c.closePath(); c.fill()
  c.beginPath(); c.moveTo(13, -81); c.lineTo(8, -74); c.lineTo(11, -70); c.lineTo(16, -79); c.closePath(); c.fill()
  c.fillStyle = '#ffd67a'; c.shadowColor = '#ffb347'; c.shadowBlur = 6
  c.fillRect(-7, -78, 5, 2.4); c.fillRect(2, -78, 5, 2.4); c.shadowBlur = 0
  c.fillStyle = '#a9433a'; c.beginPath(); c.moveTo(-4, -94); c.quadraticCurveTo(0, -104, 6, -95); c.quadraticCurveTo(2, -99, -4, -94); c.fill()
  c.fillStyle = '#7e2f2a'; c.beginPath(); c.moveTo(-8, -93); c.quadraticCurveTo(-10, -103, -2, -100); c.quadraticCurveTo(-4, -97, -8, -93); c.fill()
  c.fillStyle = '#d4543f'; c.beginPath(); c.moveTo(4, -96); c.quadraticCurveTo(10, -105, 12, -97); c.quadraticCurveTo(8, -99, 4, -96); c.fill()
  c.fillStyle = '#e3c985'; c.fillRect(-13, -88, 26, 2)
  // 剑
  c.save(); c.translate(15, -54); if (attackSwing > 0) c.rotate(-.8)
  if (attackSwing > 0) {
    c.save(); c.globalAlpha = .28; c.fillStyle = bladeTint.glow || '#ffe6a8'
    c.beginPath(); c.moveTo(-6, -3); c.lineTo(38, -16); c.lineTo(48, -5); c.lineTo(2, 4); c.closePath(); c.fill(); c.restore()
  }
  c.fillStyle = '#d1b06a'; c.fillRect(-2, -4, 5, 13)
  c.fillStyle = bladeTint.glow || '#e7cf8e'; c.beginPath(); c.arc(.5, 9.5, 2.5, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#c6a967'; c.fillRect(-7, -6, 14, 4)
  c.beginPath(); c.moveTo(-7, -6); c.lineTo(-13, -10); c.lineTo(-8, -2); c.closePath(); c.fill()
  c.beginPath(); c.moveTo(7, -6); c.lineTo(13, -10); c.lineTo(8, -2); c.closePath(); c.fill()
  const blade = c.createLinearGradient(0, -8, 48, -8); blade.addColorStop(0, bladeTint.light); blade.addColorStop(.5, bladeTint.dark); blade.addColorStop(1, bladeTint.light)
  c.shadowColor = bladeTint.glow || '#ffe6a8'; c.shadowBlur = weaponLevel >= 3 ? 12 : 7
  c.fillStyle = blade; c.beginPath(); c.moveTo(2, -5); c.lineTo(44, -2); c.lineTo(49, 0); c.lineTo(44, 3); c.lineTo(2, 4); c.closePath(); c.fill()
  c.shadowBlur = 0
  c.fillStyle = 'rgba(255, 255, 255, .72)'; c.fillRect(6, -2, 32, 1.5)
  c.fillStyle = `${bladeTint.glow || '#ffd27a'}aa`
  for (const x of [13, 21, 29, 37]) c.fillRect(x, -1, 4, 1)
  c.restore()
}
function drawMageHero(c: CanvasRenderingContext2D, now: number, walk: number) {
  const pulse = .7 + Math.sin(now / 260) * .3
  const wave = Math.sin(now / 220) * 2
  const weaponLevel = equippedLevel('weapon')
  const armorLevel = equippedLevel('armor')
  const fashionTier = equippedLevel('fashion')
  const fashion = fashionPalette(fashionTier)
  const robeTint = robePalette(armorLevel)
  const gem = orbColor(weaponLevel)
  const trim = fashion?.trim ?? '#c9b273'
  if (fashion) {
    c.save(); c.globalAlpha = .2; c.fillStyle = fashion.trim
    c.beginPath(); c.ellipse(0, -44, 28, 46, 0, 0, Math.PI * 2); c.fill(); c.restore()
  }
  // 披风：装备时装后更换配色
  const cape = c.createLinearGradient(0, -64, 0, -4)
  cape.addColorStop(0, fashion?.top ?? '#2f6b60'); cape.addColorStop(1, fashion?.bottom ?? '#183a35')
  c.fillStyle = cape; c.beginPath(); c.moveTo(-12, -62); c.quadraticCurveTo(-30, -36, -26 + wave, -6); c.lineTo(-4, -12); c.lineTo(10, -8); c.lineTo(12, -60); c.closePath(); c.fill()
  c.strokeStyle = 'rgba(8, 20, 18, .62)'; c.lineWidth = 1.3; c.stroke()
  c.fillStyle = 'rgba(197, 255, 232, .12)'; c.beginPath(); c.moveTo(-10, -58); c.quadraticCurveTo(-21, -32, -19 + wave, -12); c.lineTo(-11, -16); c.closePath(); c.fill()
  if (fashion) { c.strokeStyle = fashion.trim; c.globalAlpha = .7; c.lineWidth = 1; c.stroke(); c.globalAlpha = 1 }
  // 双持专精：背后的副法杖
  if (game?.advancedTalent === 3 && game.weapon2Id) {
    c.save(); c.translate(-19, -8); c.rotate(-.28)
    c.strokeStyle = '#7a5a35'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(3, -48); c.stroke()
    c.save(); c.shadowColor = gem; c.shadowBlur = 10; c.fillStyle = gem; c.beginPath(); c.arc(3, -53, 4.5, 0, Math.PI * 2); c.fill(); c.restore()
    c.restore()
  }
  // 长袍
  const robe = c.createLinearGradient(0, -66, 0, -4); robe.addColorStop(0, robeTint.top); robe.addColorStop(.55, robeTint.mid); robe.addColorStop(1, robeTint.bottom)
  c.fillStyle = robe; c.beginPath(); c.moveTo(-14, -60); c.lineTo(14, -60); c.lineTo(22, -6); c.lineTo(-22, -6); c.closePath(); c.fill()
  c.strokeStyle = 'rgba(10, 24, 21, .55)'; c.lineWidth = 1.2; c.stroke()
  c.strokeStyle = trim; c.lineWidth = 2; c.beginPath(); c.moveTo(-18, -10); c.lineTo(18, -10); c.stroke()
  c.fillStyle = 'rgba(201, 229, 213, .18)'; c.beginPath(); c.moveTo(-5, -58); c.lineTo(6, -58); c.lineTo(10, -14); c.lineTo(-8, -14); c.closePath(); c.fill()
  c.fillStyle = trim; c.fillRect(-14, -38, 28, 4)
  // 肩部披肩与下摆符文
  c.fillStyle = robeTint.top; c.beginPath(); c.moveTo(-17, -59); c.quadraticCurveTo(0, -52, 17, -59); c.lineTo(13, -48); c.quadraticCurveTo(0, -43, -13, -48); c.closePath(); c.fill()
  c.strokeStyle = trim; c.lineWidth = 1.3; c.stroke()
  c.strokeStyle = trim; c.globalAlpha = .8; c.lineWidth = 1.4
  c.beginPath(); c.moveTo(-16, -13); c.lineTo(-10, -17); c.lineTo(-5, -12); c.lineTo(0, -17); c.lineTo(5, -12); c.lineTo(10, -17); c.lineTo(16, -13); c.stroke(); c.globalAlpha = 1
  if (armorLevel > 0) {
    c.save(); c.translate(0, -47); c.rotate(now / 1400)
    c.strokeStyle = trim; c.globalAlpha = .85; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1
    c.rotate(Math.PI / 4); c.fillStyle = gem; c.fillRect(-3, -3, 6, 6); c.restore()
  }
  // 脚
  c.fillStyle = '#2a2f2a'; c.fillRect(-12 + walk * 2, -6, 10, 6); c.fillRect(3 - walk * 2, -6, 10, 6)
  // 兜帽
  const hood = c.createLinearGradient(0, -94, 0, -62); hood.addColorStop(0, robeTint.top); hood.addColorStop(1, robeTint.bottom)
  c.fillStyle = hood; c.beginPath(); c.moveTo(-14, -62); c.quadraticCurveTo(-16, -88, 0, -96); c.quadraticCurveTo(16, -88, 14, -62); c.closePath(); c.fill()
  c.strokeStyle = 'rgba(10, 24, 21, .55)'; c.lineWidth = 1.2; c.stroke()
  c.strokeStyle = trim; c.globalAlpha = .85; c.lineWidth = 1.3
  c.beginPath(); c.moveTo(-13, -63); c.quadraticCurveTo(-14, -85, 0, -93); c.quadraticCurveTo(14, -85, 13, -63); c.stroke(); c.globalAlpha = 1
  c.fillStyle = '#162925'; c.beginPath(); c.ellipse(0, -73, 9, 11, 0, 0, Math.PI * 2); c.fill()
  glint(c, -4, -74, 2.2, gem); glint(c, 4, -74, 2.2, gem)
  c.fillStyle = trim; c.beginPath(); c.moveTo(0, -63); c.lineTo(3, -58); c.lineTo(0, -53); c.lineTo(-3, -58); c.closePath(); c.fill()
  // 兜帽上的悬浮秘法冠环
  c.save(); c.translate(0, -104); c.rotate(now / 1800)
  c.strokeStyle = `${gem}cc`; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, 8, 0, Math.PI * 2); c.stroke()
  c.fillStyle = gem; c.beginPath(); c.moveTo(0, -9); c.lineTo(2.4, 0); c.lineTo(0, 9); c.lineTo(-2.4, 0); c.closePath(); c.fill()
  c.restore()
  // 法杖（攻击/施法时整体挥动）
  c.save(); c.translate(18, -8)
  if (attackSwing > 0) c.rotate(-.42)
  const shaft = c.createLinearGradient(0, 0, 6, -56)
  shaft.addColorStop(0, '#5a3f26'); shaft.addColorStop(.5, '#8a633c'); shaft.addColorStop(1, '#c39a62')
  c.strokeStyle = shaft; c.lineWidth = 3.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(5, -54); c.stroke()
  c.fillStyle = trim; c.fillRect(1, -22, 6, 3); c.fillRect(3, -42, 6, 3)
  // 法杖飘带
  c.strokeStyle = `${gem}88`; c.lineWidth = 1.6
  c.beginPath(); c.moveTo(2, -32); c.quadraticCurveTo(-8, -22, -4 + Math.sin(now / 320) * 3, -10); c.stroke()
  const orbX = 6; const orbY = -60
  c.save(); c.shadowColor = gem; c.shadowBlur = 15 + (buffTime > 0 ? 12 : 0) + pulse * 5
  c.fillStyle = buffTime > 0 ? '#f2fff8' : gem; c.beginPath(); c.arc(orbX, orbY, 6 + pulse, 0, Math.PI * 2); c.fill()
  c.fillStyle = 'rgba(255, 255, 255, .85)'; c.beginPath(); c.arc(orbX - 2, orbY - 2, 2, 0, Math.PI * 2); c.fill(); c.restore()
  // 秘法环与环绕棱晶
  c.strokeStyle = `${gem}bb`; c.lineWidth = 1.3; c.beginPath(); c.arc(orbX, orbY, 11 + pulse * 2, 0, Math.PI * 2); c.stroke()
  for (let i = 0; i < 3; i++) {
    const angle = now / 900 + (i * Math.PI * 2) / 3
    c.save(); c.translate(orbX + Math.cos(angle) * 15, orbY + Math.sin(angle) * 10); c.rotate(angle)
    c.fillStyle = i % 2 ? trim : gem; c.beginPath(); c.moveTo(0, -4); c.lineTo(2.4, 0); c.lineTo(0, 4); c.lineTo(-2.4, 0); c.closePath(); c.fill()
    c.restore()
  }
  c.restore()
  // 悬浮的秘法符文
  c.fillStyle = `${gem}aa`
  for (let i = 0; i < 2; i++) {
    const angle = now / 1200 + i * Math.PI
    c.save(); c.translate(-22 + Math.cos(angle) * 5, -46 + Math.sin(angle) * 8); c.rotate(angle)
    c.beginPath(); c.moveTo(0, -3.5); c.lineTo(2.2, 0); c.lineTo(0, 3.5); c.lineTo(-2.2, 0); c.closePath(); c.fill(); c.restore()
  }
}
function drawFoe(c: CanvasRenderingContext2D, foe: Foe) {
  const theme = currentStageTheme()
  const index = Math.max(0, Math.min(9, (game?.stage ?? 1) - 1))
  const scale = foe.tutorial ? 1.7 : foe.mirror ? .9 : foe.boss ? 2.25 : .8
  const dir = heroX <= foe.x ? -1 : 1
  const now = performance.now()
  const flyHeight = foe.flying ? foeFlyOffset(foe) : 0
  const attackPhase = foe.attackAnim > 0 ? Math.min(1, 1 - foe.attackAnim / .5) : 0
  const lunge = Math.sin(attackPhase * Math.PI) * (foe.boss ? 12 : 6)
  const bob = Math.sin(now / (foe.flying ? 240 : 420) + foe.id * 1.7) * (foe.flying ? 4 : foe.boss ? 2 : 1.2)
  const sway = Math.sin(now / (foe.boss ? 520 : 300) + foe.id) * (foe.boss ? .022 : .045) * dir
  c.save(); c.fillStyle = 'rgba(8, 17, 17, .32)'; c.beginPath(); c.ellipse(foe.x, world.floor + 2, foe.flying ? 11 : foe.boss ? 48 : 19, foe.flying ? 3 : foe.boss ? 10 : 5, 0, 0, Math.PI * 2); c.fill(); c.restore()
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
  else { c.shadowColor = theme.glow; c.shadowBlur = foe.boss ? 14 : 6 }
  if (foe.tutorial) drawTutorialBossModel(c)
  else if (foe.mirror) {
    c.save()
    c.shadowColor = '#c9a7e8'; c.shadowBlur = 16; c.globalAlpha = .95
    if (foe.mirrorRole === 'mage') drawMageHero(c, now, 0)
    else drawWarriorHero(c, now, 0)
    c.restore()
  } else if (foe.boss) drawBossModel(c, index, theme)
  else drawMobModel(c, index, theme)
  c.restore()
  // Boss 周身浮动的能量碎晶，强化压迫感。
  if (foe.boss && !foe.tutorial) {
    c.save(); c.fillStyle = theme.glow; c.shadowColor = theme.glow; c.shadowBlur = 8
    for (let i = 0; i < 5; i++) {
      const angle = now / 1000 + (i * Math.PI * 2) / 5
      const px = foe.x + Math.cos(angle) * (46 + Math.sin(now / 700 + i) * 6)
      const py = world.floor - 78 - flyHeight + Math.sin(angle) * 30 - Math.cos(now / 900 + i) * 10
      c.globalAlpha = .35 + .35 * Math.sin(now / 500 + i)
      c.beginPath(); c.moveTo(px, py - 3.5); c.lineTo(px + 2, py); c.lineTo(px, py + 3.5); c.lineTo(px - 2, py); c.closePath(); c.fill()
    }
    c.restore()
  }
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
function drawTutorialBossModel(c: CanvasRenderingContext2D) {
  c.lineJoin = 'round'; c.lineCap = 'round'
  // 木质训练傀儡：木桶身体、草绳、标靶胸口与木剑。
  c.fillStyle = '#4a3221'; c.fillRect(-18, -28, 12, 28); c.fillRect(6, -28, 12, 28)
  c.fillStyle = '#c9b273'; c.fillRect(-23, -7, 19, 7); c.fillRect(4, -7, 19, 7)
  const body = c.createLinearGradient(0, -92, 0, -18)
  body.addColorStop(0, '#c99a5b'); body.addColorStop(.55, '#9a6c3c'); body.addColorStop(1, '#5a3f2a')
  c.fillStyle = body; c.beginPath(); c.moveTo(-26, -20); c.lineTo(-22, -78); c.quadraticCurveTo(0, -94, 22, -78); c.lineTo(26, -20); c.closePath(); c.fill(); strokeShape(c)
  c.strokeStyle = '#6b4a2f'; c.lineWidth = 4
  for (const y of [-70, -50, -30]) { c.beginPath(); c.moveTo(-24, y); c.lineTo(24, y); c.stroke() }
  c.fillStyle = '#2d3a31'; c.beginPath(); c.arc(0, -56, 15, 0, Math.PI * 2); c.fill()
  c.strokeStyle = '#e7cf8e'; c.lineWidth = 2
  c.beginPath(); c.arc(0, -56, 11, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(0, -56, 5, 0, Math.PI * 2); c.stroke()
  c.fillStyle = '#7a5230'; c.fillRect(-40, -72, 13, 42); c.fillRect(27, -72, 13, 36)
  c.fillStyle = '#d8b48a'; c.beginPath(); c.arc(0, -102, 15, 0, Math.PI * 2); c.fill(); strokeShape(c)
  c.fillStyle = '#d6c18a'; c.beginPath(); c.moveTo(-17, -108); c.lineTo(-10, -124); c.lineTo(0, -114); c.lineTo(10, -124); c.lineTo(17, -108); c.closePath(); c.fill()
  glint(c, -5, -103, 2.4, '#ffe08a'); glint(c, 5, -103, 2.4, '#ffe08a')
  c.strokeStyle = '#3a2b1c'; c.lineWidth = 2; c.beginPath(); c.moveTo(-5, -93); c.lineTo(5, -93); c.stroke()
  // 木剑
  c.save(); c.translate(34, -40); c.rotate(.18)
  c.fillStyle = '#6b4a2f'; c.fillRect(-2, -5, 4, 22)
  c.fillStyle = '#d8c9a0'; c.beginPath(); c.moveTo(0, -7); c.lineTo(44, -10); c.lineTo(48, -6); c.lineTo(0, -3); c.closePath(); c.fill()
  c.restore()
  // 训练牌
  c.fillStyle = '#33493d'; c.fillRect(-12, -154, 24, 26); c.fillStyle = '#141f1b'; c.fillRect(-9, -151, 18, 20)
  c.fillStyle = '#e7ddbd'; c.font = "700 10px 'Microsoft YaHei', sans-serif"; c.textAlign = 'center'; c.fillText('训练', 0, -137)
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
  } else if (fx.kind === 'shield-break') {
    const color = fx.color ?? '#b9e0d2'
    c.strokeStyle = color; c.lineWidth = 3
    for (let ring = 0; ring < 2; ring++) {
      c.globalAlpha = alpha * (1 - ring * .35)
      c.beginPath(); c.arc(fx.x, fx.y, 14 + progress * 40 + ring * 10, 0, Math.PI * 2); c.stroke()
    }
    c.globalAlpha = alpha; c.fillStyle = color
    for (let shard = 0; shard < 10; shard++) {
      const angle = (shard / 10) * Math.PI * 2
      const radius = 10 + progress * 36
      c.beginPath(); c.arc(fx.x + Math.cos(angle) * radius, fx.y + Math.sin(angle) * radius * .7, 2.5, 0, Math.PI * 2); c.fill()
    }
  } else if (fx.kind === 'arcane-bolt-hit') {
    const dir = fx.direction ?? 1
    const color = fx.color ?? '#b9e0d2'
    c.globalAlpha = alpha * .7; c.strokeStyle = color; c.lineWidth = 4
    c.beginPath(); c.moveTo(fx.x - dir * 82, fx.y + 4); c.lineTo(fx.x - dir * 12, fx.y); c.stroke()
    c.globalAlpha = alpha * .9; c.fillStyle = color
    c.beginPath(); c.arc(fx.x, fx.y, 8 + progress * 10, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(fx.x, fx.y, 3 + progress * 5, 0, Math.PI * 2); c.fill()
    c.globalAlpha = alpha * .65; c.strokeStyle = color; c.lineWidth = 2
    c.beginPath(); c.arc(fx.x, fx.y, 18 + progress * 28, 0, Math.PI * 2); c.stroke()
    for (let ray = 0; ray < 4; ray++) {
      const angle = (ray / 4) * Math.PI * 2 + progress * 2
      c.beginPath(); c.moveTo(fx.x + Math.cos(angle) * 14, fx.y + Math.sin(angle) * 10); c.lineTo(fx.x + Math.cos(angle) * (30 + progress * 16), fx.y + Math.sin(angle) * (22 + progress * 10)); c.stroke()
    }
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
  } else if (fx.kind === 'mirror-charge') {
    const color = fx.color ?? '#c9a7e8'
    c.globalAlpha = alpha; c.strokeStyle = color; c.lineWidth = 3
    c.beginPath(); c.arc(fx.x, fx.y, 20 + progress * 16, 0, Math.PI * 2); c.stroke()
    c.beginPath(); c.arc(fx.x, fx.y, 10 + progress * 10, 0, Math.PI * 2); c.stroke()
    c.globalAlpha = alpha * .6; c.fillStyle = color
    c.beginPath(); c.arc(fx.x, fx.y, 5 + progress * 6, 0, Math.PI * 2); c.fill()
    for (let i = 0; i < 4; i++) {
      const angle = performance.now() / 240 + (i * Math.PI) / 2
      c.globalAlpha = alpha * .8
      c.beginPath(); c.arc(fx.x + Math.cos(angle) * (24 + progress * 10), fx.y + Math.sin(angle) * (14 + progress * 6), 2, 0, Math.PI * 2); c.fill()
    }
    if (fx.text) {
      c.globalAlpha = Math.min(1, alpha * 1.2); c.font = "700 12px 'Microsoft YaHei', sans-serif"; c.textAlign = 'center'
      c.lineWidth = 3; c.strokeStyle = 'rgba(9, 15, 15, .85)'; c.strokeText(fx.text, fx.x, fx.y - 60)
      c.fillStyle = '#f0e4ff'; c.fillText(fx.text, fx.x, fx.y - 60)
    }
  } else if (fx.kind === 'mob-ranged-charge') {
    const color = fx.color ?? '#a9e2e5'
    const pulse = .7 + Math.sin(performance.now() / 90) * .2
    c.globalAlpha = alpha * .9; c.strokeStyle = color; c.lineWidth = 2
    c.beginPath(); c.arc(fx.x, fx.y, 8 + progress * 10, 0, Math.PI * 2); c.stroke()
    c.fillStyle = color; c.beginPath(); c.arc(fx.x, fx.y, 3 + pulse * 2, 0, Math.PI * 2); c.fill()
    for (let i = 0; i < 3; i++) {
      const angle = performance.now() / 240 + (i * Math.PI * 2) / 3
      c.beginPath(); c.arc(fx.x + Math.cos(angle) * 14, fx.y + Math.sin(angle) * 9, 1.8, 0, Math.PI * 2); c.fill()
    }
  } else if (fx.kind === 'mob-ranged-fire') {
    const color = fx.color ?? '#a9e2e5'
    c.strokeStyle = color; c.lineWidth = 3; c.globalAlpha = alpha
    c.beginPath(); c.arc(fx.x, fx.y, 8 + progress * 26, 0, Math.PI * 2); c.stroke()
    c.fillStyle = '#ffffff'; c.globalAlpha = alpha * .7
    c.beginPath(); c.arc(fx.x, fx.y, 4 + progress * 8, 0, Math.PI * 2); c.fill()
  } else if (fx.kind === 'mob-skill-lunge') {
    const dir = fx.direction ?? 1
    const color = fx.color ?? '#a9e2e5'
    c.strokeStyle = color; c.lineWidth = 3; c.globalAlpha = alpha * (.5 + progress * .5)
    c.beginPath(); c.moveTo(fx.x - dir * 20, fx.y + 20); c.lineTo(fx.x + dir * (30 + progress * 40), fx.y + 20); c.stroke()
    c.beginPath(); c.arc(fx.x, fx.y, 12 + progress * 14, 0, Math.PI * 2); c.stroke()
    c.fillStyle = color
    for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(fx.x - dir * i * 6, fx.y + 26 + ((i * 5) % 10), 1.6, 0, Math.PI * 2); c.fill() }
  } else if (fx.kind === 'mob-skill-slam') {
    const color = fx.color ?? '#a9e2e5'
    c.strokeStyle = color; c.lineWidth = 3; c.globalAlpha = alpha * .9
    for (let ring = 0; ring < 2; ring++) { c.beginPath(); c.ellipse(fx.x, world.floor - 4, 16 + progress * 36 + ring * 10, 5 + progress * 8, 0, 0, Math.PI * 2); c.stroke() }
    c.fillStyle = color
    for (let i = 0; i < 6; i++) { const angle = (i / 6) * Math.PI * 2; c.beginPath(); c.arc(fx.x + Math.cos(angle) * (12 + progress * 20), world.floor - 6 + Math.sin(angle) * 6, 2, 0, Math.PI * 2); c.fill() }
  } else if (fx.kind === 'mob-skill-lunge-execute') {
    const dir = fx.direction ?? 1
    const color = fx.color ?? '#a9e2e5'
    c.strokeStyle = color; c.lineWidth = 6; c.globalAlpha = alpha
    c.beginPath(); c.moveTo(fx.x - dir * 70, fx.y); c.lineTo(fx.x + dir * 40, fx.y); c.stroke()
    c.strokeStyle = '#ffffff'; c.lineWidth = 2
    c.beginPath(); c.moveTo(fx.x - dir * 55, fx.y - 4); c.lineTo(fx.x + dir * 30, fx.y - 4); c.stroke()
  } else if (fx.kind === 'mob-skill-slam-execute') {
    const color = fx.color ?? '#a9e2e5'
    c.strokeStyle = color; c.lineWidth = 4
    for (let ring = 0; ring < 2; ring++) {
      const ringProgress = (progress + ring * .18) % 1
      c.globalAlpha = alpha * (1 - ringProgress * .7)
      c.beginPath(); c.ellipse(fx.x, world.floor - 3, 24 + ringProgress * 90, 8 + ringProgress * 18, 0, 0, Math.PI * 2); c.stroke()
    }
  } else if (fx.kind.startsWith('boss-special-windup-')) {
    const parts = fx.kind.split('-')
    const kind = parts[3]
    const theme = parts[4]
    const color = fx.color ?? BOSS_THEME_COLORS[theme] ?? '#d78fb4'
    const dir = fx.direction ?? 1
    if (fx.text) {
      c.globalAlpha = Math.min(1, alpha * 1.2)
      c.font = "700 13px 'Microsoft YaHei', sans-serif"; c.textAlign = 'center'
      c.lineWidth = 3; c.strokeStyle = 'rgba(10, 16, 16, .85)'; c.strokeText(fx.text, fx.x, fx.y - 86)
      c.fillStyle = '#fff1c8'; c.fillText(fx.text, fx.x, fx.y - 86)
    }
    c.globalAlpha = alpha; c.strokeStyle = color; c.lineWidth = 3
    c.beginPath(); c.arc(fx.x, fx.y, 30 + progress * 20, 0, Math.PI * 2); c.stroke()
    c.beginPath(); c.arc(fx.x, fx.y, 18 + progress * 12, 0, Math.PI * 2); c.stroke()
    c.fillStyle = color; c.globalAlpha = alpha * .6
    c.beginPath(); c.arc(fx.x, fx.y, 8 + progress * 10, 0, Math.PI * 2); c.fill()
    if (kind === 'pierce') {
      c.globalAlpha = alpha * .9; c.strokeStyle = color; c.lineWidth = 2
      c.beginPath(); c.moveTo(fx.x + dir * 30, fx.y); c.lineTo(fx.x + dir * (60 + progress * 120), fx.y); c.stroke()
      for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(fx.x + dir * (45 + i * 24), fx.y, 3 - progress * 2, 0, Math.PI * 2); c.stroke() }
    } else if (theme === 'ash') {
      c.strokeStyle = color; c.lineWidth = 2
      for (let i = 0; i < 3; i++) {
        c.globalAlpha = alpha * (.5 + i * .1)
        c.beginPath(); c.ellipse(fx.x, fx.y, 40 + progress * 30 + i * 12, 14 + progress * 10, performance.now() / 600 + i, 0, Math.PI * 2); c.stroke()
      }
      c.fillStyle = color; c.globalAlpha = alpha * .9
      for (let i = 0; i < 8; i++) { const angle = performance.now() / 500 + (i * Math.PI * 2) / 8; c.beginPath(); c.arc(fx.x + Math.cos(angle) * (22 + progress * 20), fx.y + Math.sin(angle) * (12 + progress * 12), 2.2, 0, Math.PI * 2); c.fill() }
    } else if (theme === 'blood') {
      c.strokeStyle = color; c.lineWidth = 4; c.globalAlpha = alpha * .9
      for (const side of [-1, 1]) { c.beginPath(); c.arc(fx.x, fx.y, 32 + progress * 24, side > 0 ? -.9 : 2.1, side > 0 ? 1.0 : 4.0); c.stroke() }
      c.fillStyle = '#ffd0c0'
      for (let i = 0; i < 5; i++) { const angle = performance.now() / 300 + (i * Math.PI * 2) / 5; c.beginPath(); c.arc(fx.x + Math.cos(angle) * 20, fx.y + Math.sin(angle) * 14, 2.5, 0, Math.PI * 2); c.fill() }
    } else if (theme === 'sun') {
      c.strokeStyle = color; c.lineWidth = 2; c.globalAlpha = alpha * .85
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + progress * .5
        c.beginPath(); c.moveTo(fx.x + Math.cos(angle) * 18, fx.y + Math.sin(angle) * 12); c.lineTo(fx.x + Math.cos(angle) * (44 + progress * 30), fx.y + Math.sin(angle) * (30 + progress * 20)); c.stroke()
      }
      c.beginPath(); c.arc(fx.x, fx.y, 26 + progress * 14, 0, Math.PI * 2); c.stroke()
    } else {
      c.strokeStyle = color; c.lineWidth = 2; c.globalAlpha = alpha * .9
      for (let i = 0; i < 6; i++) {
        const angle = performance.now() / 700 + (i * Math.PI) / 3
        c.beginPath(); c.moveTo(fx.x + Math.cos(angle) * 14, fx.y + Math.sin(angle) * 9); c.lineTo(fx.x + Math.cos(angle + 2.1) * 30, fx.y + Math.sin(angle + 2.1) * 20); c.stroke()
      }
      c.fillStyle = '#ffffff'
      for (let i = 0; i < 8; i++) { const angle = performance.now() / 600 + (i * Math.PI) / 4; c.beginPath(); c.arc(fx.x + Math.cos(angle) * (25 + progress * 16), fx.y + Math.sin(angle) * (15 + progress * 10), 2, 0, Math.PI * 2); c.fill() }
    }
    c.globalAlpha = alpha * .7; c.strokeStyle = '#ffffff'; c.lineWidth = 2
    c.beginPath(); c.arc(fx.x, fx.y, 52 - progress * 20, 0, Math.PI * 2); c.stroke()
  } else if (fx.kind.startsWith('boss-special-nova-')) {
    const theme = fx.kind.slice('boss-special-nova-'.length)
    const color = fx.color ?? BOSS_THEME_COLORS[theme] ?? '#d78fb4'
    for (let ring = 0; ring < 3; ring++) {
      const ringProgress = (progress + ring * .14) % 1
      c.globalAlpha = alpha * (1 - ringProgress * .8)
      c.strokeStyle = ring === 0 ? '#fff6d0' : color
      c.lineWidth = 5 - ring
      c.beginPath(); c.arc(fx.x, fx.y, 30 + ringProgress * 220, 0, Math.PI * 2); c.stroke()
    }
    c.globalAlpha = alpha * .85; c.strokeStyle = color; c.lineWidth = 3
    if (theme === 'ash') {
      for (let i = 0; i < 10; i++) { const angle = (i / 10) * Math.PI * 2 + progress; c.beginPath(); c.moveTo(fx.x + Math.cos(angle) * 20, fx.y + Math.sin(angle) * 12); c.lineTo(fx.x + Math.cos(angle) * (80 + progress * 60), fx.y + Math.sin(angle) * (45 + progress * 30)); c.stroke() }
    } else if (theme === 'blood') {
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(fx.x, world.floor - 8 - i * 10, 40 + progress * 150 + i * 20, .15, Math.PI - .15); c.stroke() }
    } else if (theme === 'sun') {
      for (let i = 0; i < 16; i++) { const angle = (i / 16) * Math.PI * 2 + progress * .5; c.beginPath(); c.moveTo(fx.x + Math.cos(angle) * 24, fx.y + Math.sin(angle) * 14); c.lineTo(fx.x + Math.cos(angle) * (100 + progress * 80), fx.y + Math.sin(angle) * (60 + progress * 50)); c.stroke() }
    } else {
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2
        const radius = 40 + progress * 130
        c.beginPath(); c.moveTo(fx.x + Math.cos(angle) * radius, fx.y + Math.sin(angle) * radius * .6); c.lineTo(fx.x + Math.cos(angle + 2.5) * radius * .7, fx.y + Math.sin(angle + 2.5) * radius * .4); c.stroke()
      }
    }
  } else if (fx.kind === 'boss-special-beam') {
    const dir = fx.direction ?? 1
    const color = fx.color ?? '#d78fb4'
    c.strokeStyle = color; c.lineWidth = 18 - progress * 10; c.globalAlpha = alpha * .85
    c.beginPath(); c.moveTo(fx.x, fx.y); c.lineTo(fx.x + dir * 700, fx.y); c.stroke()
    c.strokeStyle = '#ffffff'; c.lineWidth = 5
    c.beginPath(); c.moveTo(fx.x, fx.y); c.lineTo(fx.x + dir * 700, fx.y); c.stroke()
    c.fillStyle = '#ffffff'; c.globalAlpha = alpha * .8
    c.beginPath(); c.arc(fx.x + dir * 700, fx.y, 14 + progress * 20, 0, Math.PI * 2); c.fill()
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
  } else if (fx.kind === 'victory-shockwave') {
    const centerY = fx.y
    for (let ring = 0; ring < 3; ring++) {
      const ringProgress = (progress + ring * .16) % 1
      c.globalAlpha = alpha * (1 - ringProgress * .82)
      c.strokeStyle = ring === 0 ? '#fff4c4' : ring === 1 ? '#f5cf7a' : '#ffd27a'
      c.lineWidth = 6 - ring * 1.6
      c.beginPath(); c.arc(fx.x, centerY, 18 + ringProgress * 200, 0, Math.PI * 2); c.stroke()
    }
    c.globalAlpha = alpha
    c.strokeStyle = '#ffe9a8'; c.lineWidth = 3
    for (let ray = 0; ray < 16; ray++) {
      const angle = (ray / 16) * Math.PI * 2 + progress * .45
      const inner = 24 + progress * 42
      const outer = 82 + progress * 175
      c.beginPath(); c.moveTo(fx.x + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner * .55); c.lineTo(fx.x + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer * .55); c.stroke()
    }
    c.fillStyle = 'rgba(255, 236, 176, .22)'; c.beginPath(); c.arc(fx.x, centerY, 18 + progress * 62, 0, Math.PI * 2); c.fill()
  } else if (fx.kind === 'front-slash') {
    const dir = fx.direction ?? 1
    const color = fx.color ?? '#ffe6a8'
    for (let layer = 0; layer < 3; layer++) {
      c.globalAlpha = alpha * (1 - layer * .18)
      c.strokeStyle = layer === 0 ? '#fff6d0' : color
      c.lineWidth = 12 - layer * 3
      c.beginPath(); c.arc(fx.x + dir * layer * 8, fx.y, 44 + progress * 108 - layer * 5, dir > 0 ? -1.15 : 2.0, dir > 0 ? 1.0 : 4.15); c.stroke()
    }
    c.globalAlpha = alpha * .68; c.strokeStyle = '#ffffff'; c.lineWidth = 3
    c.beginPath(); c.moveTo(fx.x - dir * 30, fx.y - 44); c.lineTo(fx.x + dir * 104, fx.y - 6); c.stroke()
    c.beginPath(); c.moveTo(fx.x - dir * 28, fx.y + 34); c.lineTo(fx.x + dir * 88, fx.y + 48); c.stroke()
    c.globalAlpha = alpha * .35; c.strokeStyle = color; c.lineWidth = 2
    c.beginPath(); c.ellipse(fx.x, fx.y, 54 + progress * 120, 16 + progress * 30, 0, 0, Math.PI * 2); c.stroke()
  } else if (fx.kind === 'great-slash') {
    const dir = fx.direction ?? 1
    const color = fx.color ?? '#ffe6a8'
    for (let layer = 0; layer < 5; layer++) {
      c.globalAlpha = alpha * (1 - layer * .14)
      c.strokeStyle = layer === 0 ? '#fff6d0' : layer === 1 ? '#ffffff' : color
      c.lineWidth = 22 - layer * 3.6
      c.beginPath(); c.arc(fx.x + dir * layer * 12, fx.y, 90 + progress * 260 - layer * 14, dir > 0 ? -1.25 : 2.0, dir > 0 ? 1.05 : 4.2); c.stroke()
    }
    c.globalAlpha = alpha * .72
    for (let beam = 0; beam < 7; beam++) {
      const offset = (beam - 3) * 28
      c.strokeStyle = beam % 2 ? '#fff6d0' : color
      c.lineWidth = 4
      c.beginPath(); c.moveTo(fx.x + dir * offset, fx.y - 140 - progress * 80); c.lineTo(fx.x + dir * (offset + 40), fx.y + 40 + progress * 30); c.stroke()
    }
    c.globalAlpha = alpha * .85; c.fillStyle = '#fff6d0'
    for (let spark = 0; spark < 18; spark++) {
      const angle = (spark / 18) * Math.PI * 2 + progress * .6
      const radius = 40 + progress * 170 + (spark % 4) * 14
      c.beginPath(); c.arc(fx.x + Math.cos(angle) * radius, fx.y + Math.sin(angle) * radius * .6, 2 + (spark % 3), 0, Math.PI * 2); c.fill()
    }
    c.globalAlpha = alpha * .3; c.strokeStyle = '#ffffff'; c.lineWidth = 2
    c.beginPath(); c.arc(fx.x, fx.y, 120 + progress * 300, 0, Math.PI * 2); c.stroke()
  } else if (fx.kind === 'great-quake') {
    const color = fx.color ?? '#d8b96c'
    const groundY = world.floor - 2
    for (let ring = 0; ring < 3; ring++) {
      const ringProgress = (progress + ring * .12) % 1
      c.globalAlpha = alpha * (1 - ringProgress * .75)
      c.strokeStyle = ring === 0 ? '#fff6d0' : color
      c.lineWidth = 6 - ring * 1.6
      c.beginPath(); c.ellipse(fx.x, groundY, 40 + ringProgress * 230, 10 + ringProgress * 34, 0, 0, Math.PI * 2); c.stroke()
    }
    c.globalAlpha = alpha * .85; c.strokeStyle = color; c.lineWidth = 4
    for (let crack = 0; crack < 10; crack++) {
      const dir = crack % 2 ? 1 : -1
      const startX = fx.x + dir * 12
      const endX = fx.x + dir * (30 + progress * (50 + (crack * 17) % 110))
      const endY = groundY - 8 - ((crack * 13) % 46) * (1 - progress * .2)
      c.beginPath(); c.moveTo(startX, groundY - 2); c.lineTo(endX, endY); c.stroke()
    }
    c.fillStyle = '#b08d4e'
    for (let rock = 0; rock < 10; rock++) {
      const dir = rock % 2 ? 1 : -1
      const bx = fx.x + dir * (20 + progress * (60 + rock * 9))
      const by = groundY - progress * (40 + (rock % 5) * 22) + progress * progress * 60
      const size = 4 + (rock % 4)
      c.save(); c.translate(bx, by); c.rotate(progress * 4 + rock)
      c.beginPath(); c.moveTo(-size, 0); c.lineTo(0, -size * 1.6); c.lineTo(size, 0); c.closePath(); c.fill(); c.restore()
    }
    c.globalAlpha = alpha * .55
    const pillar = c.createLinearGradient(fx.x, groundY, fx.x, groundY - 250)
    pillar.addColorStop(0, color); pillar.addColorStop(1, 'rgba(255, 255, 255, 0)')
    c.fillStyle = pillar; c.fillRect(fx.x - 14, groundY - 250, 28, 250)
    c.globalAlpha = alpha * .3; c.fillStyle = '#fff6d0'; c.fillRect(fx.x - 4, groundY - 220, 8, 220)
    c.globalAlpha = alpha * .5; c.fillStyle = '#ffffff'
    c.beginPath(); c.arc(fx.x, groundY - 16, 14 + progress * 26, 0, Math.PI * 2); c.fill()
  } else if (fx.kind.startsWith('weapon-swing-')) {
    const style = fx.kind.slice('weapon-swing-'.length)
    const dir = fx.direction ?? 1
    const color = fx.color ?? '#ffe6a8'
    if (style === 'axe') {
      c.strokeStyle = color; c.lineWidth = 9
      c.beginPath(); c.arc(fx.x, fx.y, 32 + progress * 42, dir > 0 ? -1.1 : 2.0, dir > 0 ? .9 : 4.2); c.stroke()
      c.strokeStyle = '#fff2c8'; c.lineWidth = 3
      c.beginPath(); c.arc(fx.x, fx.y, 24 + progress * 40, dir > 0 ? -1.2 : 2.0, dir > 0 ? 1.0 : 4.2); c.stroke()
      c.globalAlpha = alpha * .35; c.fillStyle = color
      c.beginPath(); c.ellipse(fx.x, fx.y, 40 + progress * 30, 12 + progress * 10, 0, 0, Math.PI * 2); c.fill()
    } else if (style === 'staff') {
      c.strokeStyle = color; c.lineWidth = 5
      c.beginPath(); c.arc(fx.x, fx.y, 22 + progress * 42, dir > 0 ? -1.2 : 2.0, dir > 0 ? 1.1 : 4.3); c.stroke()
      c.fillStyle = '#ffffff'; c.globalAlpha = alpha * .8
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + progress * 3
        c.beginPath(); c.arc(fx.x + Math.cos(angle) * (18 + progress * 20), fx.y + Math.sin(angle) * (10 + progress * 12), 2.5, 0, Math.PI * 2); c.fill()
      }
    } else if (style === 'blade') {
      c.strokeStyle = color; c.lineWidth = 4
      for (let layer = 0; layer < 2; layer++) {
        c.globalAlpha = alpha * (.9 - layer * .3)
        c.beginPath(); c.arc(fx.x + dir * layer * 6, fx.y, 26 + progress * 50 - layer * 4, dir > 0 ? -1.1 : 2.0, dir > 0 ? 1.0 : 4.2); c.stroke()
      }
    } else {
      c.strokeStyle = color; c.lineWidth = 6
      c.beginPath(); c.arc(fx.x, fx.y, 24 + progress * 40, dir > 0 ? -.9 : 2.1, dir > 0 ? .95 : 4.0); c.stroke()
      c.strokeStyle = '#fff2c8'; c.lineWidth = 2
      c.beginPath(); c.arc(fx.x, fx.y, 18 + progress * 30, dir > 0 ? -1.0 : 2.1, dir > 0 ? .8 : 4.0); c.stroke()
    }
  } else if (fx.kind === 'armor-hit') {
    const color = fx.color ?? '#cfd8c4'
    c.strokeStyle = color; c.lineWidth = 3
    for (let ring = 0; ring < 2; ring++) {
      c.globalAlpha = alpha * (1 - ring * .35)
      c.beginPath(); c.arc(fx.x, fx.y, 18 + progress * 30 + ring * 12, 0, Math.PI * 2); c.stroke()
    }
    c.globalAlpha = alpha; c.fillStyle = color
    for (let shard = 0; shard < 6; shard++) {
      const angle = (shard / 6) * Math.PI * 2 + progress
      const radius = 20 + progress * 22
      c.beginPath(); c.arc(fx.x + Math.cos(angle) * radius, fx.y + Math.sin(angle) * radius * .7, 2.5, 0, Math.PI * 2); c.fill()
    }
    c.globalAlpha = alpha * .6; c.fillStyle = '#ffffff'
    c.beginPath(); c.arc(fx.x, fx.y, 8 + progress * 10, 0, Math.PI * 2); c.fill()
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
  drawBattleScenery(ctx)
  drawPlatforms(ctx)
  drawPotionDrops(ctx)
  for (const foe of foes) drawFoe(ctx, foe)
  if (scene === 'town') { drawTownWaypoint(ctx); drawTownNpc(ctx); drawTownCompanions(ctx) }
  drawHero(ctx)
  drawShield(ctx)
  for (const projectile of projectiles) {
    const projectileColor = weaponFxColor()
    ctx.fillStyle = projectileColor; ctx.shadowColor = projectileColor; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(projectile.x, projectile.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
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
  if (flashTime > 0) {
    ctx.save()
    ctx.globalAlpha = Math.min(.42, flashTime * .9)
    ctx.fillStyle = flashColor
    ctx.fillRect(0, 0, world.width, world.height)
    ctx.restore()
  }
  if (noticeTime > 0) { ctx.fillStyle = 'rgba(13, 28, 28, .86)'; ctx.fillRect(310, 24, 340, 38); ctx.fillStyle = '#e6d5a2'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(notice, 480, 48, 320) }
}
function frame(now: number) { const dt = Math.min((now - lastTime) / 1000, .045); lastTime = now; update(dt); draw(); requestAnimationFrame(frame) }
document.querySelector('#rotate-lock')?.addEventListener('click', () => { void enterLandscape() })
window.addEventListener('pointerdown', () => document.querySelector('#rotate-hint')?.classList.add('dismissed'), { once: true })
document.querySelector('#rotate-dismiss')?.addEventListener('click', () => document.querySelector('#rotate-hint')?.classList.add('dismissed'))
void boot(); requestAnimationFrame(frame)
