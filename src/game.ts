import './game.css'
import { cloudAvailable, currentCloudUser, fetchCloudProfile, loginCloudUser, logoutCloudUser, registerCloudUser, resetCloudPassword, saveCloudProfile } from './cloud'
import type { CloudProfile, CloudUser } from './cloud'
import { audioEnabled, playSfx, playSkillSfx, setMusicMode, toggleAudio, unlockAudio } from './audio'

type Role = 'warrior' | 'mage'
type Scene = 'title' | 'town' | 'battle' | 'defeat' | 'ending'
type GearType = 'weapon' | 'armor' | 'fashion'
type WeaponStyle = 'sword' | 'axe' | 'blade' | 'bow' | 'staff' | 'book'
type SkillSetKey = 'sword' | 'bow' | 'staff' | 'book'
type GemKind = 'life' | 'defense' | 'attack' | 'energy'
type Gem = { id: string; kind: GemKind; tier: number }
type Gear = { id: string; name: string; level: number; type?: GearType; style?: WeaponStyle; hp: number; mp?: number; attack: number; defense: number; sockets?: number; socketGems?: (Gem | null)[] }
type WorldDrop = { id: string; type: 'hp-potion' | 'mp-potion' | 'material'; x: number; materialKey?: string }
type AttributeStat = 'hp' | 'attack' | 'mp' | 'defense'
type AttributeAllocation = Record<AttributeStat, number>
type StageProgress = { kills: number; bossDefeated: boolean; pointsClaimed?: number }
type Save = { role: Role; stage: number; unlockedStage: number; kills: number; stageProgress?: Record<string, StageProgress>; hp: number; mp: number; gear: Gear[]; equipped: string | null; weaponId?: string | null; weapon2Id?: string | null; armorId?: string | null; armor2Id?: string | null; fashionId?: string | null; extraSlot?: 'weapon' | 'armor'; level?: number; exp?: number; drops?: WorldDrop[]; bossDefeated?: boolean; attributePoints?: number; attributeAllocation?: AttributeAllocation; soul?: number; normalTalent?: number; normalTalentLevels?: number[]; advancedTalent?: number; advancedTalentLevel?: number; talentFragments?: number; talentCoins?: number; lotteryChances?: number; shopFashionBought?: boolean; reviveCoins?: number; reviveUsed?: boolean; fragmentBuyDay?: string; reviveBuyAt?: number; materials?: Record<string, number>; stones?: number[]; enhance?: { weapon: number; armor: number; armor2: number; weapon2: number; failWeapon: number; failArmor: number; failArmor2: number; failWeapon2: number }; nightmareCleared?: number[]; stamps?: number; tutorialDone?: boolean; hiddenCleared?: boolean; rivalTrust?: boolean; stage8Choice?: 'save' | 'chase' | 'together' | null; rescuedRock?: boolean; rescuedXiaoman?: boolean; rescuedZhou?: boolean; seenStories?: string[]; forgeIntroSeen?: boolean; shopIntroSeen?: boolean; lotteryIntroSeen?: boolean; townIntroSeen?: boolean; mainQuestsClaimed?: number[]; sideQuest?: { stage: number; clears: number } | null; sideQuestDay?: string; skillLevels?: Record<string, number>; gems?: Gem[]; punchStones?: number; punchBuyAt?: number; horns?: number; hornBuyAt?: number; hornBuff?: 'material' | 'attack' | 'gear' | null; hornBuffUntil?: number; town: boolean; completed: boolean; dead: boolean }
type SaveSlot = { id: string; label: string; data: Save; updatedAt: number }
type Foe = { id: number; x: number; hp: number; maxHp: number; boss: boolean; timer: number; skillTimer: number; rangedTimer: number; flash: number; attackAnim: number; flying?: boolean; flyHeight?: number; flyPhase?: number; flyAmplitude?: number; flySpeed?: number; dashWindup?: number; dashDirection?: number; rangedWindup?: number; stunTimer?: number; specialTimer?: number; specialWindup?: number; specialKind?: 'pierce' | 'exclusive'; specialNext?: 'pierce' | 'exclusive'; mobSkillTimer?: number; skillWindup?: number; skillKind?: 'lunge' | 'slam'; tutorial?: boolean; mirror?: boolean; mirrorRole?: Role; mp?: number; mirrorSkillTimer?: number; mirrorWindup?: number; mirrorSkill?: number; mirrorBuffTimer?: number; mirrorBurst?: number; mirrorBurstWait?: number; mirrorSwitch?: number; mirrorSwapTimer?: number; mirrorNextRole?: Role; wanderTimer?: number; wanderTargetX?: number | null }
type Fx = { x: number; y: number; life: number; kind: string; direction?: number; text?: string; damage?: number; duration?: number; vx?: number; vy?: number; color?: string; radius?: number }
type Projectile = { x: number; y: number; vx: number; vy?: number; life: number; damage: number; targetId: number; kind?: 'homing' | 'arrow' | 'book' | 'charged' | 'fall' | 'blast'; pierce?: boolean; hitIds?: number[]; maxDistance?: number; startX?: number; label?: string; radius?: number; fromClone?: boolean }
type FoeShot = { x: number; y: number; vx: number; vy: number; damage: number; radius: number; color: string; life: number }
type BossVictory = { stage: number; bossX: number; rewards: string[]; time: number; ending: boolean; nightmare?: boolean }
type BossChestLoot = { soul: number; gear: Gear[]; stamps: number; lottery: number; fragments: number; rewards: string[] }
type BossChest = { x: number; stage: number; ending: boolean; loot: BossChestLoot; opened: boolean; opening: number }
type LootReveal = { rewards: string[]; stage: number; ending: boolean }
type StoryLine = { speaker: string; text: string }
type StoryChoice = { label: string; value: string; requires?: () => boolean }
type StoryData = { id: string; title?: string; lines: StoryLine[]; choices?: StoryChoice[] }
type BattlePlatform = { x: number; w: number; height: number; kind: 'tree' | 'rock' | 'ruin' | 'crystal' }

const SAVE_KEY = 'elemental-expedition-save-v2'
const DEMO_MODE = import.meta.env.MODE === 'demo'
const DEMO_SAVE_KEY = `${SAVE_KEY}:demo`
const GAME_VERSION = '1.82'
const stageNames = ['苔痕边境', '沉钟矿道', '赤岩峡谷', '风蚀高原', '幽蓝沼泽', '断星回廊', '灰烬王庭', '深渊裂谷', '苍白圣所', '终焉之门']
const roleLabels: Record<Role, string> = { warrior: '战士', mage: '法师' }
const SKILL_LABELS: Record<SkillSetKey, string[]> = {
  sword: ['前斩', '旋风斩', '突刺', '蓄力重斩'],
  bow: ['蓄力箭', '箭雨腾空', '花炸弹', '猎鹰坠击'],
  staff: ['奥术强化', '双生火柱', '闪现', '能量禁锢'],
  book: ['隐匿', '镜像分身', '爆裂分身', '魔典爆炸'],
}
const WEAPON_NAMES: Record<WeaponStyle, string[]> = {
  sword: ['巡林者长剑'],
  axe: ['碎岩战斧'],
  blade: ['守誓者之刃'],
  bow: ['风语长弓', '逐日猎弓'],
  staff: ['星火法杖'],
  book: ['星辉魔典', '秘仪之书'],
}
const gearNames: Record<GearType, string[]> = { weapon: [], armor: ['苔纹护甲', '沉钟胸甲', '赤岩重铠', '星辉法袍'], fashion: ['时装'] }
const xpThresholds = [200, 500, 1200, 2700]

// ── 可调数值集中区 ─────────────────────────────────────────────
const ROLE_BASE: Record<Role, { hp: number; mp: number; attack: number; defense: number }> = {
  warrior: { hp: 1000, mp: 500, attack: 100, defense: 10 },
  mage: { hp: 800, mp: 450, attack: 120, defense: 8 },
}
const MAGE_GROWTH_RATE = 0.8
const SKILL_COSTS: Record<SkillSetKey, number[]> = {
  sword: [20, 30, 20, 50],
  bow: [30, 30, 40, 60],
  staff: [40, 30, 10, 50],
  book: [30, 20, 10, 50],
}
const SKILL_MULTIPLIERS: Record<SkillSetKey, number[]> = {
  sword: [1.5, 1.5, 1, 2],
  bow: [0, 0, 1.5, 0],
  staff: [0, 1.6, 1, 0],
  book: [0, 0, 1.5, 2],
}
// 弓箭蓄力上限（秒）与“身位”换算：技能 3 的位移统一为 2.5 个身位。
const BOW_CHARGE_MAX = 2
const BODY_UNIT = 56
const SKILL3_DISTANCE = BODY_UNIT * 2.5
const SKILL_COOLDOWNS = [0, 0, 0, 0]
// ── 可自定义按键 ─────────────────────────────────────────────
type BindAction = 'left' | 'right' | 'attack' | 'jump' | 'skill1' | 'skill2' | 'skill3' | 'skill4'
const BIND_ACTIONS: BindAction[] = ['left', 'right', 'attack', 'jump', 'skill1', 'skill2', 'skill3', 'skill4']
const BIND_LABELS: Record<BindAction, string> = { left: '向左移动', right: '向右移动', attack: '普通攻击', jump: '跳跃', skill1: '技能 1', skill2: '技能 2', skill3: '技能 3', skill4: '技能 4' }
const DEFAULT_BINDS: Record<BindAction, string> = { left: 'a', right: 'd', attack: 'j', jump: 'k', skill1: '1', skill2: '2', skill3: '3', skill4: '4' }
const BIND_STORE_KEY = 'adventure-key-binds-v1'
const FIXED_KEYS = new Set(['s', 'l', 'p', 'escape', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'enter', ' '])
function loadKeyBinds(): Record<BindAction, string> {
  const binds = { ...DEFAULT_BINDS }
  try {
    const raw = JSON.parse(localStorage.getItem(BIND_STORE_KEY) ?? '{}') as Partial<Record<BindAction, unknown>>
    for (const action of BIND_ACTIONS) {
      if (typeof raw[action] === 'string' && raw[action]) binds[action] = raw[action] as string
    }
  } catch { /* ignore */ }
  return binds
}
let keyBinds = loadKeyBinds()
let listeningBind: BindAction | null = null
function saveKeyBinds() { try { localStorage.setItem(BIND_STORE_KEY, JSON.stringify(keyBinds)) } catch { /* ignore */ } }
function keyLabel(key: string) {
  const labels: Record<string, string> = { arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓', ' ': '空格', escape: 'Esc', enter: '回车' }
  return labels[key] ?? key.toUpperCase()
}
function bindSkillIndex(key: string) {
  return [keyBinds.skill1, keyBinds.skill2, keyBinds.skill3, keyBinds.skill4].indexOf(key)
}
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
const STAMP_DROP_CHANCE = .35
const OTHER_ROLE: Record<Role, Role> = { warrior: 'mage', mage: 'warrior' }
// 第 11 关（隐藏关卡）对应的 Boss 数值。
const HIDDEN_CONFIG = { bossHp: 99000, bossAtk: 2900, mp: 1000 }
const TALENT_FRAGMENTS_PER_COIN = 10
const ADVANCED_TALENT_COST = 3
const TOWN_NPC_X = 620
const TOWN_CIRCLE_X = 430
const TOWN_NPC_NAME = '阿岩'
const SECOND_NPC_X = 190
const SECOND_NPC_NAME = '铸魂师·霍恩'
// 每关小怪的 3 种专属掉落物。
const STAGE_MATERIALS: string[][] = [
  ['苔痕叶片', '古木碎屑', '勇气碎晶'],
  ['寒晶碎片', '矿脉残渣', '钟声余响'],
  ['熔岩核屑', '赤岩碎块', '冷静火晶'],
  ['风暴羽屑', '雷蚀石片', '洞察风晶'],
  ['潮汐鳞片', '幽蓝水珠', '时间砂砾'],
  ['虚空星尘', '断星棱片', '平衡碎晶'],
  ['灰烬余烬', '王庭残章', '记忆灰晶'],
  ['血牙碎骨', '深渊矿屑', '净化血晶'],
  ['苍白圣羽', '日轮残光', '荣耀圣晶'],
  ['星辰碎屑', '终焉门片', '牺牲星晶'],
]
const STONE_NAMES = ['一阶强化石', '二阶强化石', '三阶强化石', '四阶强化石', '五阶强化石']
function materialKey(stage: number, variant: number) { return `s${stage}-${variant}` }
function materialInfo(key: string) {
  const match = /^s(\d+)-(\d+)$/.exec(key)
  if (!match) return null
  const stage = Number(match[1])
  const variant = Number(match[2])
  const name = STAGE_MATERIALS[stage - 1]?.[variant]
  return name ? { stage, variant, name } : null
}
function materialCount(key: string) { return game?.materials?.[key] ?? 0 }
function addMaterial(key: string, amount = 1) {
  if (!game) return
  game.materials ??= {}
  game.materials[key] = Math.max(0, (game.materials[key] ?? 0) + amount)
}
function stoneCount(tier: number) { return game?.stones?.[tier - 1] ?? 0 }
function addStone(tier: number, amount = 1) {
  if (!game) return
  game.stones ??= [0, 0, 0, 0, 0]
  game.stones[tier - 1] = Math.max(0, (game.stones[tier - 1] ?? 0) + amount)
}
function stoneName(tier: number) { return STONE_NAMES[tier - 1] ?? `${tier} 阶强化石` }
function secondNpcUnlocked() { return Boolean(game && (game.unlockedStage > 5 || game.stageProgress?.['5']?.bossDefeated)) }
function nightmareUnlocked(stage: number) {
  if (!game?.stageProgress?.[String(stage)]?.bossDefeated) return false
  return stage === 1 || Boolean(game.nightmareCleared?.includes(stage - 1))
}
function baseEnhanceChance(level: number) {
  const table = [100, 90, 80, 70, 60, 50, 40, 30, 20, 15, 10, 5, 1]
  return level < table.length ? table[level] : 1
}
function enhanceChance(level: number, stoneTier: number, failStack: number) {
  return Math.min(100, baseEnhanceChance(level) + (stoneTier - 1) * 20 + failStack * 5)
}
function enhanceWeaponBonus(level: number) {
  return level <= 0 ? { attackPct: 0, mpPct: 0 } : { attackPct: .02 * level, mpPct: (.03 + .02 * level) }
}
function enhanceArmorBonus(level: number) {
  return level <= 0 ? { hpPct: 0, defensePct: 0 } : { hpPct: .02 * level, defensePct: (.03 + .02 * level) }
}
type NormalTalentKind = 'hp' | 'attack' | 'defense' | 'mp'
const NORMAL_TALENTS: Array<{ id: number; name: string; kind: NormalTalentKind; step: number }> = [
  { id: 1, name: '生命祝福', kind: 'hp', step: .02 },
  { id: 2, name: '锋锐', kind: 'attack', step: .02 },
  { id: 3, name: '守护', kind: 'defense', step: .05 },
  { id: 4, name: '灵泉', kind: 'mp', step: .02 },
]
const ADVANCED_TALENTS = [
  { id: 1, name: '奥术精通', desc: '法力上限 +5%，技能伤害 +10%' },
  { id: 2, name: '生命转换', desc: '将生命上限的 1% 转化为法力上限' },
  { id: 3, name: '双持专精', desc: '可以额外装备一把武器' },
]
function normalTalentLevels(): number[] {
  return game?.normalTalentLevels?.length === 4 ? game.normalTalentLevels : [0, 0, 0, 0]
}
function normalTalentLevel(id: number) { return normalTalentLevels()[id - 1] ?? 0 }
function normalTalentUpgradeCost(level: number) { return Math.max(1, level) }
function normalTalentRefund(level: number) { return level > 0 ? Math.max(1, level - 1) : 0 }
function normalTalentEffect(id: number, level = normalTalentLevel(id)) {
  const talent = NORMAL_TALENTS.find((entry) => entry.id === id)
  if (!talent) return ''
  const label = talent.kind === 'hp' ? '生命上限' : talent.kind === 'attack' ? '攻击力' : talent.kind === 'defense' ? '防御力' : '法力上限'
  return `${label} +${Math.round(talent.step * level * 100)}%`
}
function advancedTalentLevel() { return Math.max(0, game?.advancedTalentLevel ?? 0) }
function advancedTalentUpgradeCost(level: number) { return 2 * level + 1 }
function advancedTalentSpent(level: number) { return level > 0 ? level * level + 2 : 0 }
function advancedTalentRefund(level: number) { return level <= 0 ? 0 : level === 1 ? 3 : 2 * level - 1 }
function advancedSkillDamagePct(level: number) { return (2 * level + 8) / 100 }
function advancedMpPct(level: number) { return (2 * level + 3) / 100 }
function advancedConvertPct(level: number) { return (level + 1) * .005 }
function advancedEquipPct(level: number) { return level >= 2 ? .02 * (level - 1) : 0 }
function dualWieldUnlocked() { return game?.advancedTalent === 3 && advancedTalentLevel() >= 1 && (game?.extraSlot ?? 'weapon') === 'weapon' }
function extraArmorUnlocked() { return game?.advancedTalent === 3 && advancedTalentLevel() >= 1 && game?.extraSlot === 'armor' }
function advancedEffectText(id: number, level: number) {
  if (level <= 0) return ''
  if (id === 1) return `法力上限 +${Math.round(advancedMpPct(level) * 100)}%，技能伤害 +${Math.round(advancedSkillDamagePct(level) * 100)}%`
  if (id === 2) return `生命上限的 ${(advancedConvertPct(level) * 100).toFixed(1)}% 转化为法力上限（生命不减少）`
  if (level <= 1) return '可额外装备武器或护甲（二选一，升级后提高装备属性）'
  return `可额外装备武器或护甲（二选一），装备属性 +${Math.round(advancedEquipPct(level) * 100)}%`
}
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
  const names = ['一阶时装', '二阶时装', '三阶时装', '四阶时装', '五阶时装', '六阶时装']
  return names[tier - 1] ?? `${tier} 阶时装`
}
// ── 宝石 ─────────────────────────────────────────────
const GEM_KINDS: GemKind[] = ['life', 'defense', 'attack', 'energy']
const GEM_NAMES: Record<GemKind, string> = { life: '生命宝石', defense: '防御宝石', attack: '攻击宝石', energy: '能量宝石' }
const GEM_STAT_LABEL: Record<GemKind, string> = { life: '生命', defense: '防御', attack: '攻击', energy: '法力' }
const GEM_STAT_BASE: Record<GemKind, number> = { life: 100, defense: 10, attack: 10, energy: 20 }
const GEM_TIER_NAMES = ['一阶', '二阶', '三阶', '四阶', '五阶', '六阶']
function gemTierName(tier: number) { return GEM_TIER_NAMES[tier - 1] ?? `${tier} 阶` }
function gemStatValue(kind: GemKind, tier: number) { return GEM_STAT_BASE[kind] * 2 ** (Math.max(1, Math.floor(tier)) - 1) }
function gemName(gem: Gem) { return `${gemTierName(gem.tier)}${GEM_NAMES[gem.kind]}` }
function gemSummary(gem: Gem) { return `${GEM_STAT_LABEL[gem.kind]} +${gemStatValue(gem.kind, gem.tier)}` }
function randomGemKind(): GemKind { return GEM_KINDS[Math.floor(Math.random() * GEM_KINDS.length)] }
function makeGem(kind: GemKind, tier: number): Gem {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind, tier: Math.max(1, Math.min(6, Math.floor(tier))) }
}
function normalizeGem(value: unknown): Gem | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as { id?: unknown; kind?: unknown; tier?: unknown }
  if (!GEM_KINDS.includes(raw.kind as GemKind)) return null
  const tier = Math.max(1, Math.min(6, Math.floor(Number(raw.tier) || 1)))
  return { id: typeof raw.id === 'string' && raw.id ? raw.id : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind: raw.kind as GemKind, tier }
}
// 新装备随机获得 0/1/2 个孔位：30% / 50% / 20%。
function randomSocketCount() {
  const roll = Math.random() * 100
  return roll < 30 ? 0 : roll < 80 ? 1 : 2
}
// 旧存档装备用固定哈希生成孔位，避免每次读档都变化。
function legacySocketCount(id: string) {
  let sum = 0
  for (let i = 0; i < id.length; i += 1) sum = (sum + id.charCodeAt(i) * (i + 1)) % 100
  return sum < 30 ? 0 : sum < 80 ? 1 : 2
}
type ShopCategory = 'equipment' | 'fashion' | 'gem' | 'material' | 'other'
type ShopGrant =
  | { kind: 'gear'; gearType: 'weapon' | 'armor'; level: number }
  | { kind: 'fashion'; tier: number }
  | { kind: 'gem'; gemKind: GemKind; tier: number }
  | { kind: 'material'; key: string }
  | { kind: 'stone'; tier: number }
  | { kind: 'punch'; amount: number }
  | { kind: 'fragments'; amount: number }
  | { kind: 'revive'; amount: number }
  | { kind: 'talentCoin'; amount: number }
  | { kind: 'soul'; amount: number }
  | { kind: 'lottery'; amount: number }
  | { kind: 'horn'; amount: number }
type ShopItem = { id: string; name: string; cost: number; desc: string; category: ShopCategory; icon: string; iconClass?: string; unique?: boolean; demoOnly?: boolean; grant: ShopGrant }
const SHOP_ITEMS: ShopItem[] = [
  // 正式版商城不出售武器与护甲。
  { id: 'armor1', name: '一阶护甲 ×1', cost: 1000, desc: '随机一件 1 级护甲', category: 'equipment', icon: 'armor', demoOnly: true, grant: { kind: 'gear', gearType: 'armor', level: 1 } },
  { id: 'weapon1', name: '一阶武器 ×1', cost: 1000, desc: '随机一件 1 级武器', category: 'equipment', icon: 'weapon', demoOnly: true, grant: { kind: 'gear', gearType: 'weapon', level: 1 } },
  { id: 'fragments1', name: '天赋币碎片 ×1', cost: 2000, desc: '每日限购一次', category: 'other', icon: 'fragment', grant: { kind: 'fragments', amount: 1 } },
  { id: 'revive1', name: '复活币 ×1', cost: 2000, desc: '每 3 天限购一次；战斗中死亡可满状态复活', category: 'other', icon: 'revive', grant: { kind: 'revive', amount: 1 } },
  { id: 'punch1', name: '打孔石 ×1', cost: 2000, desc: '每周限购一次；在合成台为装备打孔', category: 'material', icon: 'punch', grant: { kind: 'punch', amount: 1 } },
  { id: 'fashion1', name: '一阶时装 ×1', cost: 10000, desc: '限购一份；小怪与 Boss 不会掉落', category: 'fashion', icon: 'fashion', unique: true, grant: { kind: 'fashion', tier: 1 } },
  { id: 'horn1', name: '号角 ×1', cost: 10000, desc: '每月限购一次；使用后选择一种增益，持续 30 分钟', category: 'other', icon: 'horn', grant: { kind: 'horn', amount: 1 } },
]
// 体验版商城：所有道具 1 灵魂，覆盖时装、装备、宝石、材料与消耗品。
function demoShopItems(): ShopItem[] {
  const items: ShopItem[] = []
  for (let tier = 2; tier <= 4; tier += 1) {
    items.push({ id: `demo-fashion-${tier}`, name: `${fashionTierName(tier)} ×1`, cost: 1, desc: '体验版商城道具', category: 'fashion', icon: 'fashion', demoOnly: true, grant: { kind: 'fashion', tier } })
  }
  for (let level = 2; level <= 11; level += 1) {
    items.push({ id: `demo-weapon-${level}`, name: `${level} 级武器 ×1`, cost: 1, desc: '体验版商城道具', category: 'equipment', icon: 'weapon', demoOnly: true, grant: { kind: 'gear', gearType: 'weapon', level } })
    items.push({ id: `demo-armor-${level}`, name: `${level} 级护甲 ×1`, cost: 1, desc: '体验版商城道具', category: 'equipment', icon: 'armor', demoOnly: true, grant: { kind: 'gear', gearType: 'armor', level } })
  }
  for (const kind of GEM_KINDS) {
    for (let tier = 1; tier <= 6; tier += 1) {
      items.push({ id: `demo-gem-${kind}-${tier}`, name: `${gemName({ id: '', kind, tier })} ×1`, cost: 1, desc: `体验版商城道具 · ${gemSummary({ id: '', kind, tier })}`, category: 'gem', icon: 'gem', iconClass: `gem-${kind}`, demoOnly: true, grant: { kind: 'gem', gemKind: kind, tier } })
    }
  }
  STAGE_MATERIALS.forEach((materials, stageIndex) => {
    materials.forEach((name, variant) => {
      const key = materialKey(stageIndex + 1, variant)
      items.push({ id: `demo-material-${key}`, name: `${name} ×1`, cost: 1, desc: `第 ${stageIndex + 1} 关专属材料`, category: 'material', icon: 'fragment', demoOnly: true, grant: { kind: 'material', key } })
    })
  })
  STONE_NAMES.forEach((name, index) => {
    items.push({ id: `demo-stone-${index + 1}`, name: `${name} ×1`, cost: 1, desc: '体验版商城道具', category: 'material', icon: 'enhance', demoOnly: true, grant: { kind: 'stone', tier: index + 1 } })
  })
  items.push(
    { id: 'demo-talent-coin', name: '天赋币 ×1', cost: 1, desc: '体验版商城道具', category: 'other', icon: 'coin', demoOnly: true, grant: { kind: 'talentCoin', amount: 1 } },
    { id: 'demo-soul-1000', name: '灵魂 ×1000', cost: 1, desc: '体验版商城道具', category: 'other', icon: 'soul', demoOnly: true, grant: { kind: 'soul', amount: 1000 } },
    { id: 'demo-soul-10000', name: '灵魂 ×10000', cost: 1, desc: '体验版商城道具', category: 'other', icon: 'soul', demoOnly: true, grant: { kind: 'soul', amount: 10000 } },
    { id: 'demo-lottery-1', name: '抽奖机会 ×1', cost: 1, desc: '体验版商城道具', category: 'other', icon: 'ticket', demoOnly: true, grant: { kind: 'lottery', amount: 1 } },
  )
  return items
}
function shopItems(): ShopItem[] {
  return DEMO_MODE ? [...SHOP_ITEMS, ...demoShopItems()] : SHOP_ITEMS.filter((item) => !item.demoOnly)
}
const SHOP_CATEGORY_LABELS: Record<ShopCategory, string> = { equipment: '装备', fashion: '时装', gem: '宝石', material: '材料', other: '其他' }
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
// 双击左/右移动键进入奔跑状态，松开方向键后解除。
let runActive = false
let lastMoveTapDir: -1 | 0 | 1 = 0
let lastMoveTapTime = 0
let attackWait = 0
let skillWait = [0, 0, 0, 0]
let attackSwing = 0
let buffTime = 0
let burst = 0
let burstWait = 0
let burstTargetId: number | null = null
// 能量禁锢的残留法阵：在目标位置继续显示 1.4 秒。
let prisonTimer = 0
let prisonX = 0
let prisonY = 0
let prisonColor = '#a8e0d0'
let invisibleTimer = 0
let cloneTimer = 0
// 分身自己的动作计时：用于绘制同步攻击/施法的特效。
let cloneAttackPulse = 0
let cloneCastPulse = 0
let cloneStealthTimer = 0
let cloneX = 0
let cloneY = 0
let cloneHp = 0
let cloneMaxHp = 0
let bowCharging = false
let bowCharge = 0
let bowChargeSource: 'attack' | 'skill1' | null = null
let bowAirLocked = false
let flowerBomb: { x: number; y: number; timer: number } | null = null
let skyBow: { x: number; timer: number; shots: number } | null = null
// 魔法书技能 3：冲向敌人的实体分身，接触或超时后自爆。
type BombClone = { x: number; y: number; timer: number; power: number; source: 'main' | 'clone' }
let bombClones: BombClone[] = []
// 魔法书技能 4：飞向目标的远程爆炸法球。
let arcaneOrb: { x: number; y: number; targetX: number; timer: number; power: number } | null = null
let shake = 0
let flashTime = 0
let flashColor = '#ffe6a8'
let shieldActive = false
let shieldLocked = false
let bagOpen = false
// 号角：选择增益的弹窗与全屏吹响动画（动画持续到该时间戳）。
let hornPickerOpen = false
let hornAnimUntil = 0
let hornAnimTimeout: number | null = null
let bagTab: 'gear' | 'gems' | 'talent' | 'other' = 'gear'
let bagGearFilter: 'all' | 'weapon' | 'armor' | 'fashion' = 'all'
let craftingOpen = false
let forgeSlots: string[] = []
let forgeTab: 'gear' | 'special' | 'stone' | 'punch' = 'gear'
let specialSlots: string[] = []
let enhanceStoneTier = 1
let attributesOpen = false
let npcOpen = false
let stageCircleOpen = false
let gameMenuOpen = false
let settingsOpen = false
let quitConfirmOpen = false
let gameClosed = false
let creditsOpen = false
let storyLogOpen = false
let storyLogStage = 1
let skillPanelOpen = false
let secondNpcOpen = false
let secondView: 'menu' | 'dungeon' | 'gems' = 'menu'
let enhanceSlot: 'weapon' | 'weapon2' | 'armor' | 'armor2' = 'weapon'
let nightmareStage: number | null = null
let attrHoldTimer: number | null = null
let attrRepeatTimer: number | null = null
let attrSuppressClick = false
let npcView: 'menu' | 'shop' | 'talent' | 'enhance' | 'quests' = 'menu'
let questTab: 'main' | 'side' = 'main'
let shopCategory: 'all' | ShopCategory = 'all'
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
let viewOffsetY = 0
let viewHeight = world.height
let renderScale = 1
let bossVictory: BossVictory | null = null
let bossChest: BossChest | null = null
let lootReveal: LootReveal | null = null
let storyState: StoryData | null = null
let storyIndex = 0
let storyOnComplete: ((choice?: string) => void) | null = null
let tutorialMode = false
let tutorialStep = 0
let hiddenBattle = false
let heroSupportTop = world.floor
// 当前战斗用时（秒），进入战场或开始新战斗时重置。
let battleTime = 0
// 战斗连击：命中累计，5 秒不命中或被击中 2 次后清零。
let comboCount = 0
let comboTimer = 0
let comboHitsTaken = 0
let comboPop = 0
let joystickPointerId: number | null = null

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
// 每个体验存档首次载入时发放一次满级体验套装；之后保留玩家的改动。
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
  if (!Array.isArray(data.normalTalentLevels) || data.normalTalentLevels.length < 4) {
    const levels = [0, 0, 0, 0]
    if ((data.normalTalent ?? 0) >= 1 && (data.normalTalent ?? 0) <= 4) levels[(data.normalTalent ?? 1) - 1] = 1
    data.normalTalentLevels = levels
  } else {
    data.normalTalentLevels = data.normalTalentLevels.slice(0, 4).map((level) => Math.max(0, Math.floor(Number(level) || 0)))
  }
  data.advancedTalentLevel = Math.max(0, Math.floor(Number(data.advancedTalentLevel ?? ((data.advancedTalent ?? 0) > 0 ? 1 : 0))))
  data.reviveCoins = Math.max(0, Math.floor(Number(data.reviveCoins ?? 0)))
  data.reviveUsed = Boolean(data.reviveUsed)
  data.fragmentBuyDay ??= ''
  data.reviveBuyAt ??= 0
  data.materials ??= {}
  data.stones ??= [0, 0, 0, 0, 0]
  if (!Array.isArray(data.stones) || data.stones.length < 5) {
    const stones = [0, 0, 0, 0, 0]
    for (let i = 0; i < 5; i++) stones[i] = Math.max(0, Math.floor(Number(data.stones?.[i] ?? 0)))
    data.stones = stones
  } else {
    data.stones = data.stones.slice(0, 5).map((count) => Math.max(0, Math.floor(Number(count) || 0)))
  }
  data.enhance ??= { weapon: 0, armor: 0, armor2: 0, weapon2: 0, failWeapon: 0, failArmor: 0, failArmor2: 0, failWeapon2: 0 }
  data.enhance = {
    weapon: Math.max(0, Math.floor(Number(data.enhance.weapon) || 0)),
    armor: Math.max(0, Math.floor(Number(data.enhance.armor) || 0)),
    armor2: Math.max(0, Math.floor(Number(data.enhance.armor2) || 0)),
    weapon2: Math.max(0, Math.floor(Number(data.enhance.weapon2) || 0)),
    failWeapon: Math.max(0, Math.floor(Number(data.enhance.failWeapon) || 0)),
    failArmor: Math.max(0, Math.floor(Number(data.enhance.failArmor) || 0)),
    failArmor2: Math.max(0, Math.floor(Number(data.enhance.failArmor2) || 0)),
    failWeapon2: Math.max(0, Math.floor(Number(data.enhance.failWeapon2) || 0)),
  }
  data.extraSlot = data.extraSlot === 'armor' ? 'armor' : 'weapon'
  data.armor2Id ??= null
  data.nightmareCleared = Array.isArray(data.nightmareCleared) ? [...new Set(data.nightmareCleared.map((stage) => Math.floor(Number(stage))).filter((stage) => stage >= 1 && stage <= 10))] : []
  data.talentFragments ??= 0
  data.talentCoins ??= 0
  data.lotteryChances ??= 0
  data.shopFashionBought ??= false
  data.mainQuestsClaimed = Array.isArray(data.mainQuestsClaimed)
    ? [...new Set(data.mainQuestsClaimed.map((stage) => Math.floor(Number(stage))).filter((stage) => stage >= 1 && stage <= 10))]
    : []
  const sideStage = Math.floor(Number(data.sideQuest?.stage ?? 0))
  data.sideQuest = sideStage >= 1 && sideStage <= 10
    ? { stage: sideStage, clears: Math.max(0, Math.min(2, Math.floor(Number(data.sideQuest?.clears ?? 0)))) }
    : null
  data.sideQuestDay = typeof data.sideQuestDay === 'string' ? data.sideQuestDay : ''
  const skillLevels = data.skillLevels && typeof data.skillLevels === 'object' ? data.skillLevels : {}
  const normalizedSkillLevels: Record<string, number> = {}
  for (const set of ['sword', 'bow', 'staff', 'book']) {
    for (let index = 0; index < 4; index += 1) {
      normalizedSkillLevels[`${set}:${index}`] = Math.max(1, Math.floor(Number(skillLevels[`${set}:${index}`] ?? 1)))
    }
  }
  data.skillLevels = normalizedSkillLevels
  data.gems = Array.isArray(data.gems) ? data.gems.map(normalizeGem).filter((gem): gem is Gem => Boolean(gem)) : []
  data.punchStones = Math.max(0, Math.floor(Number(data.punchStones ?? 0)))
  data.punchBuyAt = Math.max(0, Number(data.punchBuyAt ?? 0))
  data.horns = Math.max(0, Math.floor(Number(data.horns ?? 0)))
  data.hornBuyAt = Math.max(0, Number(data.hornBuyAt ?? 0))
  data.hornBuff = data.hornBuff === 'material' || data.hornBuff === 'attack' || data.hornBuff === 'gear' ? data.hornBuff : null
  data.hornBuffUntil = Math.max(0, Number(data.hornBuffUntil ?? 0))
  if (!data.hornBuff || data.hornBuffUntil <= Date.now()) { data.hornBuff = null; data.hornBuffUntil = 0 }
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
    if (!gear.type) { gear.sockets = 0; gear.socketGems = []; continue }
    if (gear.type === 'fashion') { gear.hp = 0; gear.defense = 0; gear.attack = 0; gear.mp = 0; gear.sockets = 0; gear.socketGems = []; continue }
    const values = gearStats(gear.level)
    gear.hp = gear.type === 'armor' ? values.hp : 0
    gear.defense = gear.type === 'armor' ? values.defense : 0
    gear.attack = gear.type === 'weapon' ? values.attack : 0
    gear.mp = gear.type === 'weapon' ? values.mp : 0
    // 武器/护甲的孔位：旧存档没有孔位时按装备 id 固定生成 0/1/2 个。
    if (!Number.isFinite(gear.sockets)) gear.sockets = legacySocketCount(gear.id)
    gear.sockets = Math.max(0, Math.min(2, Math.floor(Number(gear.sockets) || 0)))
    const existingGems = Array.isArray(gear.socketGems) ? gear.socketGems : []
    gear.socketGems = Array.from({ length: gear.sockets }, (_, index) => normalizeGem(existingGems[index]))
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
// 300ms 内连续按同一方向两次进入奔跑；奔跑期间可以正常攻击。
function noteMoveTap(direction: -1 | 1) {
  const now = performance.now()
  if (lastMoveTapDir !== direction) runActive = false
  if (lastMoveTapDir === direction && now - lastMoveTapTime <= 300) runActive = true
  lastMoveTapDir = direction
  lastMoveTapTime = now
}
function battleMoveSpeed(running: boolean) { return running ? 322 : 190 }
function townMoveSpeed(running: boolean) { return running ? 296 : 172 }
function comboBuffPct() {
  if (comboCount >= 300) return 10
  if (comboCount >= 150) return 5
  if (comboCount >= 50) return 2
  return 0
}
function comboAttackMultiplier() {
  return scene === 'battle' ? 1 + comboBuffPct() / 100 : 1
}
// ── 号角增益 ─────────────────────────────────────────
// 号角购买后保存在背包里，使用时可从三种增益中任选一种，持续 30 分钟。
const HORN_BUFF_DURATION = 30 * 60 * 1000
const HORN_BUFFS: Record<'material' | 'attack' | 'gear', { name: string; desc: string }> = {
  material: { name: '材料掉率翻倍', desc: '关卡材料掉落概率翻倍' },
  attack: { name: '攻击力 +10%', desc: '攻击力提高 10%' },
  gear: { name: '装备掉率 +20%', desc: '装备掉率提高 20%，对 Boss 只提高 10%' },
}
function hornBuffActive(kind: 'material' | 'attack' | 'gear') {
  return Boolean(game && game.hornBuff === kind && (game.hornBuffUntil ?? 0) > Date.now())
}
function hornBuffRemaining() {
  return Math.max(0, (game?.hornBuffUntil ?? 0) - Date.now())
}
function formatHornTime(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
function resetCombo() {
  comboCount = 0
  comboTimer = 0
  comboHitsTaken = 0
  comboPop = 0
}
function addComboHit() {
  comboCount += 1
  comboTimer = 5
  comboPop = .18
}
function takeComboHit() {
  if (comboCount <= 0) return
  comboHitsTaken += 1
  if (comboHitsTaken >= 2) resetCombo()
}
function syncComboHud() {
  const display = document.querySelector<HTMLElement>('#combo-display')
  if (!display) return
  const active = scene === 'battle' && comboCount > 0
  display.style.display = active ? 'grid' : 'none'
  if (!active) return
  display.style.opacity = String(Math.min(1, comboTimer / 2))
  display.classList.toggle('tier-1', comboCount >= 50 && comboCount < 150)
  display.classList.toggle('tier-2', comboCount >= 150 && comboCount < 300)
  display.classList.toggle('tier-3', comboCount >= 300)
  const count = display.querySelector<HTMLElement>('#combo-count')
  if (count) {
    count.textContent = String(comboCount)
    // 字号整体放大一倍，并随连击数继续增长。
    count.style.fontSize = `${88 + Math.min(60, comboCount * .1)}px`
    count.style.transform = `scale(${1 + comboPop * .6})`
  }
  const buff = display.querySelector<HTMLElement>('#combo-buff')
  if (buff) buff.textContent = comboBuffPct() > 0 ? `攻击 +${comboBuffPct()}%` : ''
}
function formatBattleTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(secs).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}
function item(): Gear | undefined {
  return game?.gear.find((gear) => gear.id === game?.weaponId)
    ?? game?.gear.find((gear) => gear.id === game?.weapon2Id && dualWieldUnlocked())
    ?? game?.gear.find((gear) => gear.id === game?.armorId)
    ?? game?.gear.find((gear) => gear.id === game?.fashionId)
    ?? game?.gear.find((gear) => gear.id === game?.equipped)
}
function equippedGear() {
  if (!game) return []
  return game.gear.filter((gear) =>
    gear.id === game?.weaponId
    || (dualWieldUnlocked() && gear.id === game?.weapon2Id)
    || gear.id === game?.armorId
    || (extraArmorUnlocked() && gear.id === game?.armor2Id)
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
  const base = (foe.boss ? config.bossAtk * (dash ? 1.5 : 1) : config.mobAtk) * (nightmareStage !== null ? 1.5 : 1)
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
  const offWeapon = dualWieldUnlocked() ? gear.find((entry) => entry.type === 'weapon' && entry.id === game?.weapon2Id) : undefined
  const armor = gear.find((entry) => entry.type === 'armor' && entry.id === game?.armorId)
  const armor2 = extraArmorUnlocked() ? gear.find((entry) => entry.type === 'armor' && entry.id === game?.armor2Id) : undefined
  const fashion = gear.find((entry) => entry.type === 'fashion')
  const gearMultiplier = roleGearMultiplier(role)
  const allocation = game?.attributeAllocation ?? { hp: 0, attack: 0, mp: 0, defense: 0 }
  const enhanceData = game?.enhance ?? { weapon: 0, armor: 0, armor2: 0, weapon2: 0, failWeapon: 0, failArmor: 0, failArmor2: 0, failWeapon2: 0 }
  const weaponEnhance = enhanceWeaponBonus(enhanceData.weapon)
  const offEnhance = enhanceWeaponBonus(enhanceData.weapon2)
  const armorEnhance = enhanceArmorBonus(enhanceData.armor)
  const armor2Enhance = enhanceArmorBonus(enhanceData.armor2 ?? 0)
  const mainAtkBase = Math.round((mainWeapon?.attack ?? 0) * gearMultiplier)
  const mainMpBase = Math.round((mainWeapon?.mp ?? 0) * gearMultiplier)
  const offAtkBase = Math.round((offWeapon?.attack ?? 0) * gearMultiplier)
  const offMpBase = Math.round((offWeapon?.mp ?? 0) * gearMultiplier)
  const armorHpBase = Math.round((armor?.hp ?? legacy?.hp ?? 0) * gearMultiplier)
  const armorDefenseBase = Math.round((armor?.defense ?? legacy?.defense ?? 0) * gearMultiplier)
  const armor2HpBase = Math.round((armor2?.hp ?? 0) * gearMultiplier)
  const armor2DefenseBase = Math.round((armor2?.defense ?? 0) * gearMultiplier)
  const gearHp = armorHpBase + (armor ? Math.round(armorHpBase * armorEnhance.hpPct) : 0) + armor2HpBase + (armor2 ? Math.round(armor2HpBase * armor2Enhance.hpPct) : 0)
  const gearMp = mainMpBase + Math.round(mainMpBase * weaponEnhance.mpPct) + offMpBase + Math.round(offMpBase * offEnhance.mpPct)
  const gearAttack = mainAtkBase + Math.round(mainAtkBase * weaponEnhance.attackPct) + offAtkBase + Math.round(offAtkBase * offEnhance.attackPct) + Math.round((legacy?.attack ?? 0) * gearMultiplier)
  const gearDefense = armorDefenseBase + (armor ? Math.round(armorDefenseBase * armorEnhance.defensePct) : 0) + armor2DefenseBase + (armor2 ? Math.round(armor2DefenseBase * armor2Enhance.defensePct) : 0)
  let hp = base.hp + growth.hp + allocation.hp * ATTRIBUTE_STEP.hp + gearHp
  let mp = base.mp + growth.mp + allocation.mp * ATTRIBUTE_STEP.mp + gearMp
  let attack = base.attack + growth.attack + allocation.attack * ATTRIBUTE_STEP.attack + gearAttack
  let defense = base.defense + growth.defense + allocation.defense * ATTRIBUTE_STEP.defense + gearDefense
  let equipHp = gearHp, equipMp = gearMp, equipAttack = gearAttack, equipDefense = gearDefense
  const fashionStats = fashion ? fashionTierStats(fashion.level) : undefined
  if (fashionStats) {
    const fHp = Math.round(hp * fashionStats.hpPct)
    const fMp = fashionStats.mpFlat + Math.round(mp * fashionStats.mpPct)
    const fAttack = fashionStats.atkFlat + Math.round(attack * fashionStats.atkPct)
    const fDefense = fashionStats.defFlat + Math.round(defense * fashionStats.defPct)
    hp += fHp; mp += fMp; attack += fAttack; defense += fDefense
    equipHp += fHp; equipMp += fMp; equipAttack += fAttack; equipDefense += fDefense
  }
  // 双持专精升级：提高装备提供的属性。
  const equipBonus = game?.advancedTalent === 3 ? advancedEquipPct(advancedTalentLevel()) : 0
  if (equipBonus > 0) {
    hp += Math.round(equipHp * equipBonus); mp += Math.round(equipMp * equipBonus)
    attack += Math.round(equipAttack * equipBonus); defense += Math.round(equipDefense * equipBonus)
  }
  // 普通天赋可以同时生效，等级越高加成越高。
  const levels = normalTalentLevels()
  if (levels[0]) hp = Math.round(hp * (1 + .02 * levels[0]))
  if (levels[1]) attack = Math.round(attack * (1 + .02 * levels[1]))
  if (levels[2]) defense = Math.round(defense * (1 + .05 * levels[2]))
  if (levels[3]) mp = Math.round(mp * (1 + .02 * levels[3]))
  const advLevel = advancedTalentLevel()
  if (game?.advancedTalent === 1 && advLevel) mp = Math.round(mp * (1 + advancedMpPct(advLevel)))
  if (game?.advancedTalent === 2 && advLevel) mp += Math.round(hp * advancedConvertPct(advLevel))
  // 已装备的主武器/主护甲上的宝石提供固定属性。
  const gemBonus = equippedGemBonus()
  hp += gemBonus.hp; mp += gemBonus.mp; attack += gemBonus.attack; defense += gemBonus.defense
  if (invisibleTimer > 0) attack = Math.round(attack * (1.05 + .1 * (skillLevel(0, 'book') - 1)))
  const buffMultiplier = role === 'mage' && buffTime > 0 ? 1 + .1 * skillLevel(0, 'staff') : 1
  attack = Math.round(attack * buffMultiplier)
  if (hornBuffActive('attack')) attack = Math.round(attack * 1.1)
  attack = Math.round(attack * comboAttackMultiplier())
  return { hp: Math.round(hp), mp: Math.round(mp), attack: Math.round(attack), defense: Math.round(defense) }
}
function equippedGemBonus() {
  const bonus = { hp: 0, mp: 0, attack: 0, defense: 0 }
  if (!game) return bonus
  const items = [
    game.gear.find((gear) => gear.id === game?.weaponId),
    game.gear.find((gear) => gear.id === game?.armorId),
  ]
  for (const gear of items) {
    const sockets = Math.max(0, Math.min(2, gear?.sockets ?? 0))
    for (let index = 0; index < sockets; index += 1) {
      const gem = gear?.socketGems?.[index]
      if (!gem) continue
      const value = gemStatValue(gem.kind, gem.tier)
      if (gem.kind === 'life') bonus.hp += value
      else if (gem.kind === 'defense') bonus.defense += value
      else if (gem.kind === 'attack') bonus.attack += value
      else bonus.mp += value
    }
  }
  return bonus
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
  if (invisibleTimer > 0) return 0
  const scaledDamage = nightmareStage !== null ? rawDamage * 1.5 : rawDamage
  const dealt = Math.max(3, Math.round(scaledDamage - effectiveDefense()))
  game.hp = Math.max(0, game.hp - dealt)
  takeComboHit()
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
  battleTime = 0
  resetCombo()
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
  battleTime = 0
  resetCombo()
  tutorialMode = true
  tutorialStep = 0
  hiddenBattle = false
  bossChest = null; lootReveal = null; nightmareStage = null; invisibleTimer = 0; cloneTimer = 0; cloneAttackPulse = 0; cloneCastPulse = 0; cloneStealthTimer = 0; bowCharging = false; bowCharge = 0; bowChargeSource = null; bowAirLocked = false; flowerBomb = null; skyBow = null; bombClones = []; arcaneOrb = null
  if (game) game.reviveUsed = false
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
  return { id: nextFoeId++, x: Math.min(BASE_MAP_WIDTH - 120, heroX + 320), hp: HIDDEN_CONFIG.bossHp, maxHp: HIDDEN_CONFIG.bossHp, boss: true, mirror: true, mirrorRole, mp: HIDDEN_CONFIG.mp, timer: 1.3, skillTimer: 999, rangedTimer: 999, flash: 0, attackAnim: 0, stunTimer: 0, mirrorSkillTimer: 2.8, mirrorSkill: -1, mirrorSwapTimer: 9 }
}
function beginHiddenBattle() {
  if (!game) return
  if (!hiddenUnlocked()) { toast(`集齐 ${STAMP_UNLOCK} 枚王印印章后才能挑战宿敌。`); return }
  battleTime = 0
  resetCombo()
  hiddenBattle = true
  tutorialMode = false
  bossChest = null; lootReveal = null; nightmareStage = null; invisibleTimer = 0; cloneTimer = 0; cloneAttackPulse = 0; cloneCastPulse = 0; cloneStealthTimer = 0; bowCharging = false; bowCharge = 0; bowChargeSource = null; bowAirLocked = false; flowerBomb = null; skyBow = null; bombClones = []; arcaneOrb = null
  if (game) game.reviveUsed = false
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
    setLog(`宿敌释放「${SKILL_LABELS[role === 'warrior' ? 'sword' : 'staff'][skill]}」！`)
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
  // 宿敌更换武器：2.5 秒前摇，期间站着不动、浑身金光，受到伤害增加 10%。
  if ((foe.mirrorSwitch ?? 0) > 0) {
    foe.mirrorSwitch = (foe.mirrorSwitch ?? 0) - dt
    if (foe.mirrorSwitch <= 0) {
      foe.mirrorSwitch = 0
      foe.mirrorRole = foe.mirrorNextRole ?? (foe.mirrorRole === 'warrior' ? 'mage' : 'warrior')
      foe.mirrorNextRole = undefined
      foe.mirrorSkill = -1
      foe.mirrorSkillTimer = 1.4
      foe.mirrorWindup = undefined
      foe.mp = HIDDEN_CONFIG.mp
      foe.flash = .2; foe.attackAnim = .3
      const weapon = foe.mirrorRole === 'warrior' ? '长剑' : '法杖'
      setLog(`宿敌换上了${weapon}，技能组随之更换！`)
      effects.push({ kind: 'mirror-charge', x: foe.x, y: world.floor - 88, direction, life: .5, duration: .5, color: '#ffe08a', text: `换装 · ${weapon}` })
      addSparks(foe.x, world.floor - 70, 22, ['#ffe08a', '#fff4c4', '#ffffff'], 190)
      playSfx('boss')
    }
    return
  }
  foe.mirrorSwapTimer = Math.max(0, (foe.mirrorSwapTimer ?? 9) - dt)
  if (foe.mirrorSwapTimer <= 0) {
    foe.mirrorSwapTimer = 13 + Math.random() * 4
    foe.mirrorSwitch = 2.5
    foe.mirrorNextRole = foe.mirrorRole === 'warrior' ? 'mage' : 'warrior'
    foe.mirrorWindup = undefined
    setLog('宿敌开始更换武器：2.5 秒内不会移动，金光护体但受到的伤害增加 10%。')
    effects.push({ kind: 'mirror-charge', x: foe.x, y: world.floor - 88, direction, life: .8, duration: .8, color: '#ffe08a', text: '更换武器' })
    addSparks(foe.x, world.floor - 74, 10, ['#ffe08a', '#fff4c4'], 90)
    playSfx('boss')
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
    const mirrorSet = role === 'warrior' ? 'sword' : 'staff'
    let cost = SKILL_COSTS[mirrorSet][skill]
    if ((foe.mp ?? 0) < cost) { skill = 0; cost = SKILL_COSTS[mirrorSet][0] }
    if ((foe.mp ?? 0) >= cost) {
      foe.mp = Math.max(0, (foe.mp ?? 0) - cost)
      foe.mirrorSkill = skill
      foe.mirrorWindup = .5
      foe.mirrorSkillTimer = 3.6 + Math.random() * 1.2
      foe.flash = .18; foe.attackAnim = .4
      const color = '#c9a7e8'
      effects.push({ kind: 'mirror-charge', x: foe.x, y: world.floor - 86, direction, life: .5, duration: .5, color, text: SKILL_LABELS[role === 'warrior' ? 'sword' : 'staff'][skill] })
      addSparks(foe.x, world.floor - 80, 8, [color, '#ffffff'], 100)
      setLog(`宿敌正在蓄力「${SKILL_LABELS[role === 'warrior' ? 'sword' : 'staff'][skill]}」...`)
      playSfx('boss')
    } else {
      foe.mirrorSkillTimer = 2
    }
  }
}
function beginStage(stage: number, mode: 'continue' | 'restart' | 'boss' = 'continue') {
  if (!game) return
  hiddenBattle = false
  bossChest = null; lootReveal = null; nightmareStage = null; invisibleTimer = 0; cloneTimer = 0; cloneAttackPulse = 0; cloneCastPulse = 0; cloneStealthTimer = 0; bowCharging = false; bowCharge = 0; bowChargeSource = null; bowAirLocked = false; flowerBomb = null; skyBow = null; bombClones = []; arcaneOrb = null
  game.reviveUsed = false
  tutorialMode = false; tutorialStep = 0
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
  bossChest = null; lootReveal = null; nightmareStage = null; invisibleTimer = 0; cloneTimer = 0; cloneAttackPulse = 0; cloneCastPulse = 0; cloneStealthTimer = 0; bowCharging = false; bowCharge = 0; bowChargeSource = null; bowAirLocked = false; flowerBomb = null; skyBow = null; bombClones = []; arcaneOrb = null
  applyDemoUnlock(game)
  if (!game.tutorialDone) { beginTutorial(); return }
  game.unlockedStage = Math.min(10, Math.max(game.unlockedStage ?? 1, game.stage))
  // 从角色选择继续游戏时统一回到小镇，而不是直接恢复上次未结束的战斗。
  scene = 'town'
  game.town = true
  game.dead = false
  paused = false
  heroX = 480; heroY = 0; velocityY = 0; grounded = true; heroSupportTop = world.floor; buffTime = 0; burst = 0; burstTargetId = null; shake = 0; jumpCount = 0; cameraX = 0
  skillWait = [0, 0, 0, 0]; effects = []; projectiles = []; foeShots = []; resetPanels()
  const caps = stats()
  game.hp = Math.min(Math.max(1, game.hp), caps.hp)
  game.mp = Math.min(Math.max(0, game.mp), caps.mp)
  game.hp = caps.hp; game.mp = caps.mp
  if (!game.townIntroSeen) {
    startStory(townIntroStoryData(), () => { if (!game) return; game.townIntroSeen = true; save(); renderGame() })
    return
  }
  save(); render()
}
function freshSave(role: Role): Save {
  const base = ROLE_BASE[role]
  return { role, stage: 1, unlockedStage: 1, kills: 0, hp: base.hp, mp: base.mp, gear: [], equipped: null, weaponId: null, weapon2Id: null, armorId: null, armor2Id: null, fashionId: null, extraSlot: 'weapon', level: 1, exp: 0, drops: [], bossDefeated: false, attributePoints: 0, attributeAllocation: { hp: 0, attack: 0, mp: 0, defense: 0 }, soul: 0, normalTalent: 0, normalTalentLevels: [0, 0, 0, 0], advancedTalent: 0, advancedTalentLevel: 0, talentFragments: 0, talentCoins: 0, lotteryChances: 0, shopFashionBought: false, reviveCoins: 0, reviveUsed: false, fragmentBuyDay: '', reviveBuyAt: 0, materials: {}, stones: [0, 0, 0, 0, 0], enhance: { weapon: 0, armor: 0, armor2: 0, weapon2: 0, failWeapon: 0, failArmor: 0, failArmor2: 0, failWeapon2: 0 }, nightmareCleared: [], stamps: 0, tutorialDone: false, hiddenCleared: false, rivalTrust: false, stage8Choice: null, rescuedRock: false, rescuedXiaoman: false, rescuedZhou: false, seenStories: [], forgeIntroSeen: false, shopIntroSeen: false, lotteryIntroSeen: false, townIntroSeen: false, mainQuestsClaimed: [], sideQuest: null, sideQuestDay: '', skillLevels: {}, gems: [], punchStones: 0, punchBuyAt: 0, horns: 0, hornBuyAt: 0, hornBuff: null, hornBuffUntil: 0, town: true, completed: false, dead: false }
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
  app.innerHTML = `<main class="auth-screen"><section class="auth-card demo-lock"><div class="auth-brand"><b>A</b><span><strong>成王之路</strong><small>体验版</small></span></div><h2>体验版仅限本地使用</h2><p>该体验版不会随正式版部署。请在开发机上运行 <code>npm run preview:demo</code>，并通过 <code>localhost</code> 或 <code>127.0.0.1</code> 打开。</p></section></main>`
}
function renderAuthLoading() {
  setMusicMode('title')
  app.innerHTML = `<main class="auth-screen"><section class="auth-card auth-loading"><div class="auth-brand"><b>A</b><span><strong>成王之路</strong><small>元素远征 · 云端存档</small></span></div><p>正在连接云端存档…</p></section></main>`
}
function renderAuth() {
  setMusicMode('title')
  const isRegister = authView === 'register'
  const isForgot = authView === 'forgot'
  const firstInput = isForgot ? 'auth-email' : 'auth-username'
  app.innerHTML = `<main class="auth-screen"><section class="auth-card">
    <div class="auth-brand"><b>A</b><span><strong>成王之路</strong><small>元素远征 · 云端远征档案</small></span></div>
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
  app.innerHTML = `<main class="title-screen"><section class="title-copy"><div class="eyebrow"><i></i> 单机动作 RPG · 十章远征</div><h1>成王之路<span>：元素远征</span></h1><p class="intro">古老遗迹再度苏醒。选择你的职业，穿越十片失落之地，直面守关者。</p>${accountBar}${saveSlots.length ? `<section class="saved-slots"><div class="slots-heading"><span>远征存档</span><small>${saveSlots.length} / 3</small></div>${slots}</section>` : ''}<div class="rule"></div><div class="class-picks"><button class="class-card" data-action="role" data-role="warrior"><b class="role-mark">刃</b><span><strong>新建战士</strong><small>剑刃近战 · 创建独立存档</small></span><i>↗</i></button><button class="class-card" data-action="role" data-role="mage"><b class="role-mark mage-mark">✦</b><span><strong>新建法师</strong><small>法杖远程 · 创建独立存档</small></span><i>↗</i></button></div><footer><span>存档最多 3 个 · 覆盖前确认</span><span class="game-version">版本 ${GAME_VERSION}</span><span>01 — 10</span></footer></section><div class="title-art" aria-hidden="true"><div class="sun"></div><div class="mountains"></div><div class="ruins"><i></i><i></i><i></i></div><div class="silhouette"><b></b><i></i><span></span></div><small>THE LOST FRONTIER <span>遗迹之外，仍有远方</span></small></div></main>${overwriteDialog}`
}
function gearMarkup(canEquip: boolean, filter: 'all' | 'weapon' | 'armor' | 'fashion' = 'all') {
  if (!game) return ''
  const list = filter === 'all' ? game.gear : game.gear.filter((gear) => gear.type === filter)
  if (!list.length) return `<div class="empty-gear">${filter === 'all' ? '背包里还没有装备' : `背包里还没有${filter === 'weapon' ? '武器' : filter === 'armor' ? '护甲' : '时装'}`}<small>击败遗迹守卫，寻找装备</small></div>`
  const worn = new Set([game.weaponId, game.armorId, game.fashionId])
  if (dualWieldUnlocked() && game.weapon2Id) worn.add(game.weapon2Id)
  const multiplier = roleGearMultiplier(game.role)
  const scaled = (value: number | undefined) => Math.round((value ?? 0) * multiplier)
  return list.map((gear) => {
    const equipped = worn.has(gear.id) || (!gear.type && game!.equipped === gear.id)
    const type = gear.type === 'weapon' ? '武器' : gear.type === 'armor' ? '护甲' : gear.type === 'fashion' ? '时装' : '旧装备'
    const icon = gearIcon(gear)
    const details = gear.type === 'fashion'
      ? fashionSummary(gear.level)
      : gear.type === 'weapon'
        ? `蓝量 +${scaled(gear.mp)} · 攻击 +${scaled(gear.attack)}`
        : gear.type === 'armor'
          ? `生命 +${scaled(gear.hp)} · 防御 +${scaled(gear.defense)}`
          : `生命 +${scaled(gear.hp)} · 攻击 +${scaled(gear.attack)} · 防御 +${scaled(gear.defense)}`
    const socketInfo = gear.type === 'weapon' || gear.type === 'armor' ? ` · 孔位 ${gear.sockets ?? 0}/2${(gear.socketGems ?? []).filter((gem): gem is Gem => Boolean(gem)).length ? ` · 宝石 ${(gear.socketGems ?? []).filter((gem): gem is Gem => Boolean(gem)).map(gemSummary).join('、')}` : ''}` : ''
    const compatible = gear.type !== 'weapon' || canUseWeapon(gear)
    let actions = ''
    if (!compatible) actions = '<i class="equipped">职业不符</i>'
    else if (gear.type === 'armor' && extraArmorUnlocked()) {
      const isMain = gear.id === game!.armorId
      const isOff = gear.id === game!.armor2Id
      actions = `${isMain ? '<i class="equipped">主护甲</i>' : `<button data-action="equip" data-id="${gear.id}" ${canEquip ? '' : 'disabled'}>主护甲</button>`}${isOff ? '<i class="equipped">副护甲</i>' : `<button data-action="equip-armor2" data-id="${gear.id}" ${canEquip ? '' : 'disabled'}>副护甲</button>`}`
    } else if (gear.type === 'weapon' && dualWieldUnlocked()) {
      const isMain = gear.id === game!.weaponId
      const isOff = gear.id === game!.weapon2Id
      actions = `${isMain ? '<i class="equipped">主手</i>' : `<button data-action="equip-main" data-id="${gear.id}" ${canEquip ? '' : 'disabled'}>主手</button>`}${isOff ? '<i class="equipped">副手</i>' : `<button data-action="equip-off" data-id="${gear.id}" ${canEquip ? '' : 'disabled'}>副手</button>`}`
    } else if (equipped) actions = '<i class="equipped">已装备</i>'
    else {
      actions = `<button data-action="equip" data-id="${gear.id}" ${canEquip && compatible ? '' : 'disabled'}>${!compatible ? '职业不符' : canEquip ? '穿戴' : '小镇可穿'}</button>`
    }
    return `<article class="gear-row ${equipped ? 'active-gear' : ''}" draggable="true" data-drag-id="${gear.id}" data-action="equip-gear" data-id="${gear.id}" title="点击装备 / 拖到左侧装备框"><span class="gear-glyph ${gear.type ?? 'legacy'}">${icon}</span><span class="gear-copy"><b>${gear.name}</b><small>${type} · ${gear.level} 级 · ${details}${socketInfo}</small></span><span class="gear-actions">${actions}</span></article>`
  }).join('')
}
function forgeSlotItems(): Gear[] {
  if (!game) return []
  return forgeSlots.map((id) => game!.gear.find((gear) => gear.id === id)).filter((gear): gear is Gear => Boolean(gear))
}
function forgeSlotLimit() {
  const first = forgeSlotItems()[0]
  return first?.type === 'fashion' ? 3 : 5
}
type ForgeRecipe = { valid: boolean; required: number; resultName: string; reason: string; type?: GearType; level?: number; style?: WeaponStyle }
function forgeRecipe(): ForgeRecipe {
  const items = forgeSlotItems()
  if (!items.length) return { valid: false, required: 5, resultName: '生成物', reason: '将未穿戴的装备放入左侧孔位' }
  const type = items[0].type
  const level = items[0].level
  if (!type) return { valid: false, required: 5, resultName: '生成物', reason: '该物品无法用于合成' }
  const allFashion = items.every((gear) => gear.type === 'fashion')
  if (allFashion) {
    const required = 3
    const same = items.every((gear) => gear.level === level)
    if (!same) return { valid: false, required, resultName: '生成物', reason: '时装箱只能放入同阶时装' }
    return {
      valid: items.length === required,
      required,
      type: 'fashion',
      level,
      resultName: `${fashionTierName(level + 1)}（下一阶时装）`,
      reason: items.length === required ? '可以合成' : `还需要 ${required - items.length} 件同阶时装`,
    }
  }
  // 高阶装备合成：同阶的武器/护甲可以混搭，不要求同类或同武器款式。
  const required = 5
  const same = items.every((gear) => (gear.type === 'weapon' || gear.type === 'armor') && gear.level === level)
  if (!same) return { valid: false, required, resultName: '生成物', reason: '只能放入同阶的非时装装备（武器/护甲可混搭）' }
  const valid = items.length === required
  const sameType = items.every((gear) => gear.type === items[0].type)
  const resultType: GearType | undefined = sameType ? items[0].type : undefined
  return {
    valid,
    required,
    type: resultType,
    level,
    resultName: valid && resultType === 'weapon' ? `${level + 1} 级武器` : valid && resultType === 'armor' ? `${level + 1} 级护甲` : `${level + 1} 级装备（武器/护甲随机）`,
    reason: valid ? '可以合成' : `还需要 ${required - items.length} 件同阶装备`,
  }
}
function forgeAddItem(id: string) {
  if (!game || scene !== 'town') return
  const gear = game.gear.find((entry) => entry.id === id)
  if (!gear || !gear.type) return
  if (forgeSlots.includes(id)) return
  if (forgeSlots.length >= forgeSlotLimit()) { toast('当前孔位已经放满。'); return }
  const first = forgeSlotItems()[0]
  if (first) {
    const fashionMix = first.type === 'fashion' || gear.type === 'fashion'
    if (fashionMix ? (first.type !== 'fashion' || gear.type !== 'fashion' || first.level !== gear.level) : first.level !== gear.level) {
      toast(fashionMix ? '时装箱只能放入同阶时装。' : '只能放入同阶装备。')
      return
    }
  }
  forgeSlots.push(id)
  renderGame()
}
function forgeRemoveSlot(index: number) {
  if (index < 0 || index >= forgeSlots.length) return
  forgeSlots.splice(index, 1)
  renderGame()
}
function forgeCombine() {
  if (!game || scene !== 'town') return
  const recipe = forgeRecipe()
  if (!recipe.valid || recipe.level === undefined) return
  if ((game.soul ?? 0) < 1000) { toast('合成装备需要 1000 灵魂。'); return }
  game.soul = (game.soul ?? 0) - 1000
  const consumed = new Set(forgeSlots)
  // 被合成消耗的装备如果镶有宝石，先把宝石取回背包。
  game.gems ??= []
  for (const gear of game.gear) {
    if (!consumed.has(gear.id)) continue
    for (const gem of gear.socketGems ?? []) if (gem) game.gems.push(gem)
  }
  game.gear = game.gear.filter((gear) => !consumed.has(gear.id))
  const resultType: GearType = recipe.type ?? (Math.random() < .5 ? 'weapon' : 'armor')
  const result = resultType === 'fashion' ? makeFashion(recipe.level + 1) : makeGear(resultType, recipe.level + 1, recipe.style)
  game.gear.unshift(result)
  forgeSlots = []
  save(); craftingOpen = true; renderGame()
  toast(`合成成功：${result.name}`)
}
function forgeTabsMarkup() {
  const tabs: Array<[string, string, boolean]> = [
    ['gear', '装备合成', false],
    ['special', '专属合成', false],
    ['stone', '强化石', false],
    ['punch', '打孔', false],
  ]
  return `<div class="forge-tabs">${tabs.map(([id, label, disabled]) => `<button class="${forgeTab === id ? 'active' : ''}" data-action="forge-tab" data-tab="${id}" ${disabled ? 'disabled' : ''}>${label}</button>`).join('')}</div>`
}
function forgeGearMarkup() {
  if (!game) return ''
  const worn = new Set([game.weaponId, game.weapon2Id, game.armorId, game.armor2Id, game.fashionId])
  const recipe = forgeRecipe()
  const slotLimit = forgeSlotLimit()
  const cost = 1000
  const canForge = recipe.valid && (game.soul ?? 0) >= cost
  const slotMarkup = Array.from({ length: slotLimit }, (_, index) => {
    const gear = game!.gear.find((entry) => entry.id === forgeSlots[index])
    if (!gear) return `<div class="forge-slot empty"><b>+</b><small>空孔位</small></div>`
    const typeLabel = gear.type === 'weapon' ? '武器' : gear.type === 'armor' ? '护甲' : '时装'
    const levelLabel = gear.type === 'fashion' ? fashionTierName(gear.level) : `${gear.level} 级`
    return `<button class="forge-slot filled" data-action="forge-remove" data-slot="${index}" title="点击取出"><span class="gear-glyph">${gearIcon(gear)}</span><b>${gear.name}</b><small>${typeLabel} · ${levelLabel}</small><i>取出</i></button>`
  }).join('')
  const items = game.gear.filter((gear) => gear.type && !worn.has(gear.id))
  const bagRows = items.length ? items.map((gear) => {
    const inSlot = forgeSlots.includes(gear.id)
    const first = forgeSlotItems()[0]
    const compatible = !first || (first.type === 'fashion' || gear.type === 'fashion'
      ? first.type === 'fashion' && gear.type === 'fashion' && first.level === gear.level
      : first.level === gear.level)
    const typeLabel = gear.type === 'weapon' ? '武器' : gear.type === 'armor' ? '护甲' : '时装'
    const levelLabel = gear.type === 'fashion' ? fashionTierName(gear.level) : `${gear.level} 级`
    return `<article class="forge-item ${inSlot ? 'in-slot' : ''}"><span class="gear-glyph">${gearIcon(gear)}</span><span class="gear-copy"><b>${gear.name}</b><small>${typeLabel} · ${levelLabel}</small></span>${inSlot ? '<i class="forge-placed">已放入</i>' : `<button data-action="forge-add" data-id="${gear.id}" ${compatible && forgeSlots.length < slotLimit ? '' : 'disabled'}>放入</button>`}</article>`
  }).join('') : '<div class="empty-gear">没有可用的未穿戴装备<small>击败守卫与 Boss 会掉落装备</small></div>'
  return `<div class="forge-layout"><section class="forge-workbench"><h3>合成孔位</h3><div class="forge-slots" style="--slots:${slotLimit}">${slotMarkup}</div><div class="forge-arrow">▼</div><div class="forge-result ${recipe.valid ? 'ready' : ''}"><b>${recipe.resultName}</b><small>${recipe.reason}</small></div><div class="forge-meta"><span>材料 ${forgeSlots.length} / ${recipe.required}</span><span>消耗 ${cost} 灵魂 · 成功率 <b>100%</b></span></div><button class="forge-combine" data-action="forge-combine" ${canForge ? '' : 'disabled'}>合 成</button></section><aside class="forge-bag"><header><h3>背包装备</h3><small>点击“放入”加入左侧孔位</small></header><div class="forge-bag-list">${bagRows}</div></aside></div>`
}
function specialSlotsMax() { return 3 }
function specialAvailable(key: string) {
  const used = specialSlots.filter((slot) => slot === key).length
  return Math.max(0, materialCount(key) - used)
}
function specialRecipe() {
  const keys = specialSlots
  if (keys.length < 3) return { valid: false, maxStage: 0, cost: 0, tiers: [] as number[], resultText: '生成物', reason: `放入同一关卡的 3 种不同专属材料（当前 ${keys.length} / 3）` }
  const infos = keys.map(materialInfo).filter((info): info is { stage: number; variant: number; name: string } => Boolean(info))
  if (infos.length < 3) return { valid: false, maxStage: 0, cost: 0, tiers: [] as number[], resultText: '生成物', reason: '材料数据异常' }
  // 必须来自同一关卡，且三种材料互不相同。
  if (infos.some((info) => info.stage !== infos[0].stage)) {
    return { valid: false, maxStage: 0, cost: 0, tiers: [] as number[], resultText: '生成物', reason: '只能使用同一关卡的专属材料' }
  }
  if (new Set(infos.map((info) => info.variant)).size < 3) {
    return { valid: false, maxStage: 0, cost: 0, tiers: [] as number[], resultText: '生成物', reason: '需要 3 种不同的专属材料' }
  }
  const stage = infos[0].stage
  const cost = stage * 1000
  const canPay = (game?.soul ?? 0) >= cost
  return {
    valid: canPay,
    maxStage: stage,
    cost,
    tiers: [stage],
    resultText: `第 ${stage} 关装备 ×1（武器 / 护甲随机）`,
    reason: canPay ? `第 ${stage} 关专属合成 · 消耗 ${cost} 灵魂` : `还需要 ${cost - (game?.soul ?? 0)} 灵魂`,
  }
}
function specialAdd(key: string) {
  if (!game) return
  if (specialSlots.length >= specialSlotsMax()) { toast('专属合成只能放入 3 个材料。'); return }
  if (specialAvailable(key) <= 0) { toast('这种材料数量不足。'); return }
  const info = materialInfo(key)
  if (!info) return
  if (specialSlots.includes(key)) { toast('同一种专属材料只能放入一个。'); return }
  const first = specialSlots.map(materialInfo).find((entry): entry is { stage: number; variant: number; name: string } => Boolean(entry))
  if (first && first.stage !== info.stage) { toast('只能放入同一关卡的专属材料。'); return }
  specialSlots.push(key)
  renderGame()
}
function specialRemove(index: number) {
  if (index < 0 || index >= specialSlots.length) return
  specialSlots.splice(index, 1)
  renderGame()
}
function specialCombine() {
  if (!game) return
  const recipe = specialRecipe()
  if (!recipe.valid || specialSlots.length !== 3) return
  if ((game.soul ?? 0) < recipe.cost) { toast('灵魂不足。'); return }
  const keys = [...specialSlots]
  game.soul = (game.soul ?? 0) - recipe.cost
  for (const key of keys) addMaterial(key, -1)
  const results: Gear[] = []
  for (const tier of recipe.tiers) {
    const type: GearType = Math.random() < .5 ? 'weapon' : 'armor'
    const gear = makeGear(type, Math.max(1, tier))
    game.gear.unshift(gear)
    results.push(gear)
  }
  specialSlots = []
  save(); craftingOpen = true; renderGame()
  toast(`专属合成成功：${results.map((gear) => `${gear.level} 级${gear.name}`).join('、')}`)
}
function forgeSpecialMarkup() {
  if (!game) return ''
  const recipe = specialRecipe()
  const slotMarkup = Array.from({ length: 3 }, (_, index) => {
    const key = specialSlots[index]
    const info = key ? materialInfo(key) : null
    if (!info) return `<div class="forge-slot empty"><b>+</b><small>专属材料</small></div>`
    return `<button class="forge-slot filled material-slot" data-action="special-remove" data-slot="${index}" title="点击取出"><span class="gear-glyph">${itemIcon('fragment')}</span><b>${info.name}</b><small>第 ${info.stage} 关</small><i>取出</i></button>`
  }).join('')
  const rows: string[] = []
  const selectedStage = specialSlots.map(materialInfo).find((info): info is { stage: number; variant: number; name: string } => Boolean(info))?.stage
  STAGE_MATERIALS.forEach((materials, stageIndex) => {
    const stage = stageIndex + 1
    materials.forEach((name, variant) => {
      const key = materialKey(stage, variant)
      const count = materialCount(key)
      if (count <= 0) return
      const available = specialAvailable(key)
      const sameStage = selectedStage === undefined || stage === selectedStage
      const duplicate = specialSlots.includes(key)
      const canAdd = available > 0 && specialSlots.length < 3 && sameStage && !duplicate
      const hint = duplicate ? '已放入' : !sameStage ? '关卡不符' : `第 ${stage} 关 · 持有 ${count}`
      rows.push(`<article class="forge-item ${canAdd ? '' : 'in-slot'}"><span class="gear-glyph">${itemIcon('fragment')}</span><span class="gear-copy"><b>${name}</b><small>${hint}</small></span><button data-action="special-add" data-key="${key}" ${canAdd ? '' : 'disabled'}>放入</button></article>`)
    })
  })
  return `<div class="forge-layout"><section class="forge-workbench"><h3>专属合成孔位</h3><p class="forge-note">需要同一关卡的 3 种不同专属掉落物，合成该关卡等级的装备。</p><div class="forge-slots" style="--slots:3">${slotMarkup}</div><div class="forge-arrow">▼</div><div class="forge-result ${recipe.valid ? 'ready' : ''}"><b>${recipe.resultText}</b><small>${recipe.reason}</small></div><div class="forge-meta"><span>材料 ${specialSlots.length} / 3</span><span>消耗 ${recipe.cost || 0} 灵魂 · 成功率 <b>100%</b></span></div><button class="forge-combine" data-action="special-combine" ${recipe.valid && specialSlots.length === 3 ? '' : 'disabled'}>合 成</button></section><aside class="forge-bag"><header><h3>专属材料</h3><small>小怪专属掉落 · 靠近按 S 拾取</small></header><div class="forge-bag-list">${rows.join('') || '<div class="empty-gear">还没有专属材料<small>击败各关小怪有概率掉落</small></div>'}</div></aside></div>`
}
function stoneCombine(tier: number) {
  if (!game || tier < 1 || tier >= 5) return
  if (stoneCount(tier) < 4) { toast('需要 4 个同阶强化石。'); return }
  addStone(tier, -4)
  addStone(tier + 1, 1)
  save(); craftingOpen = true; renderGame()
  toast(`合成成功：${stoneName(tier + 1)} ×1`)
}
function forgeStoneMarkup() {
  if (!game) return ''
  const rows = STONE_NAMES.map((name, index) => {
    const tier = index + 1
    const count = stoneCount(tier)
    const nextTier = tier + 1
    const canCombine = tier < 5 && count >= 4
    const bonus = tier === 1 ? '基础强化概率' : `比一阶强化石 +${(tier - 1) * 20}% 概率`
    return `<article class="forge-item"><span class="gear-glyph">${itemIcon('enhance')}</span><span class="gear-copy"><b>${name}</b><small>持有 ${count} · ${bonus}${tier < 5 ? ` · 4 个合成 1 个${stoneName(nextTier)}` : ''}</small></span>${tier < 5 ? `<button data-action="stone-combine" data-tier="${tier}" ${canCombine ? '' : 'disabled'}>合成</button>` : '<i class="forge-placed">最高阶</i>'}</article>`
  }).join('')
  return `<div class="forge-layout stone-layout"><section class="forge-workbench"><h3>强化石合成</h3><p class="forge-note">4 个同阶强化石合成 1 个高一阶强化石。强化石可在「铸魂师·霍恩」处用于强化装备位置。</p><div class="forge-result ready"><b>强化石规则</b><small>一阶为基础概率；二阶 +20%，三阶 +40%，四阶 +60%，五阶 +80%。</small></div></section><aside class="forge-bag"><header><h3>强化石库存</h3><small>击败噩梦 Boss 获得</small></header><div class="forge-bag-list">${rows}</div></aside></div>`
}
function punchGear(id: string) {
  if (!game || scene !== 'town') return
  const gear = game.gear.find((entry) => entry.id === id)
  if (!gear || (gear.type !== 'weapon' && gear.type !== 'armor')) return
  const sockets = Math.max(0, Math.min(2, gear.sockets ?? 0))
  if (sockets >= 2) { toast('该装备已经有两个孔位。'); return }
  const cost = sockets + 1
  if ((game.punchStones ?? 0) < cost) { toast(`需要 ${cost} 个打孔石。`); return }
  game.punchStones = (game.punchStones ?? 0) - cost
  gear.sockets = sockets + 1
  gear.socketGems = [...(gear.socketGems ?? []).slice(0, sockets), null]
  save(); craftingOpen = true; forgeTab = 'punch'; renderGame()
  toast(`打孔成功：${gear.name} 现在有 ${gear.sockets} 个孔位。`)
}
function forgePunchMarkup() {
  if (!game) return ''
  const items = game.gear.filter((gear) => gear.type === 'weapon' || gear.type === 'armor')
  const rows = items.map((gear) => {
    const sockets = Math.max(0, Math.min(2, gear.sockets ?? 0))
    const cost = sockets >= 2 ? 0 : sockets + 1
    const equipped = gear.id === game!.weaponId || gear.id === game!.armorId
    const dots = Array.from({ length: 2 }, (_, index) => index < sockets ? '●' : '○').join('')
    return `<article class="forge-item"><span class="gear-glyph">${gearIcon(gear)}</span><span class="gear-copy"><b>${gear.name}${equipped ? ' · 已装备' : ''}</b><small>孔位 ${dots}（${sockets} / 2） · ${sockets >= 2 ? '已满孔' : `开下一孔需要 ${cost} 个打孔石`}</small></span><button data-action="punch-open" data-id="${gear.id}" ${sockets < 2 && (game!.punchStones ?? 0) >= cost ? '' : 'disabled'}>${sockets >= 2 ? '已满孔' : '打孔'}</button></article>`
  }).join('')
  return `<div class="forge-layout"><section class="forge-workbench"><h3>装备打孔</h3><p class="forge-note">所有武器与护甲在获得时随机拥有 0 / 1 / 2 个孔位（30% / 50% / 20%）。0 孔开第一孔消耗 1 个打孔石，1 孔开第二孔消耗 2 个打孔石。</p><div class="forge-result ready"><b>${itemIcon('punch')} 打孔石 ×${game.punchStones ?? 0}</b><small>打孔石可在灵魂商店每周购买 1 个（2000 灵魂）。</small></div></section><aside class="forge-bag"><header><h3>武器与护甲</h3><small>选择装备进行打孔</small></header><div class="forge-bag-list">${rows || '<div class="empty-gear">背包里还没有武器或护甲</div>'}</div></aside></div>`
}
function craftingMarkup() {
  if (!game) return ''
  const body = forgeTab === 'special' ? forgeSpecialMarkup() : forgeTab === 'stone' ? forgeStoneMarkup() : forgeTab === 'punch' ? forgePunchMarkup() : forgeGearMarkup()
  return `<div class="bag-scrim craft-scrim"><section class="bag-dialog craft-dialog"><header><div><small>FORGE · 冒险者小镇</small><h2>合成台</h2></div><button data-action="close-crafting" aria-label="关闭合成台">×</button></header>${forgeTabsMarkup()}${body}</section></div>`
}
function openSecondNpcMenu() {
  if (!game || scene !== 'town' || !secondNpcUnlocked()) return
  resetPanels(); secondNpcOpen = true; secondView = 'menu'; renderGame()
}
function enhanceSlotData(slot: 'weapon' | 'weapon2' | 'armor' | 'armor2') {
  const enh = game?.enhance ?? { weapon: 0, armor: 0, armor2: 0, weapon2: 0, failWeapon: 0, failArmor: 0, failArmor2: 0, failWeapon2: 0 }
  const level = slot === 'weapon' ? enh.weapon : slot === 'weapon2' ? enh.weapon2 : slot === 'armor2' ? enh.armor2 : enh.armor
  const fail = slot === 'weapon' ? enh.failWeapon : slot === 'weapon2' ? enh.failWeapon2 : slot === 'armor2' ? enh.failArmor2 : enh.failArmor
  const item = slot === 'armor'
    ? game?.gear.find((gear) => gear.id === game?.armorId)
    : slot === 'armor2'
      ? game?.gear.find((gear) => gear.id === game?.armor2Id)
      : game?.gear.find((gear) => gear.id === (slot === 'weapon' ? game?.weaponId : game?.weapon2Id))
  return { level, fail, item }
}
function enhancementMarkup() {
  if (!game) return ''
  const slots: Array<{ slot: 'weapon' | 'weapon2' | 'armor' | 'armor2'; label: string }> = [
    { slot: 'weapon', label: '主武器槽' },
    { slot: 'armor', label: '护甲槽' },
  ]
  if (dualWieldUnlocked()) slots.push({ slot: 'weapon2', label: '副武器槽' })
  if (extraArmorUnlocked()) slots.push({ slot: 'armor2', label: '副护甲槽' })
  if (!slots.some((entry) => entry.slot === enhanceSlot)) enhanceSlot = slots[0].slot
  const slotRows = slots.map((entry) => {
    const data = enhanceSlotData(entry.slot)
    const active = enhanceSlot === entry.slot
    const bonus = entry.slot === 'armor' || entry.slot === 'armor2'
      ? `生命 +${data.level * 2}% · 防御 +${data.level * 2 + 3}%`
      : `攻击 +${data.level * 2}% · 蓝量 +${data.level * 2 + 3}%`
    return `<button class="enhance-slot ${active ? 'active' : ''}" data-action="enhance-slot" data-slot="${entry.slot}"><span><b>${entry.label} <i>+${data.level}</i></b><small>${data.item?.name ?? '未装备'} · ${bonus}</small></span><i>选择</i></button>`
  }).join('')
  const data = enhanceSlotData(enhanceSlot)
  const chance = enhanceChance(data.level, enhanceStoneTier, data.fail)
  const tierButtons = STONE_NAMES.map((name, index) => {
    const tier = index + 1
    return `<button class="${enhanceStoneTier === tier ? 'active' : ''}" data-action="enhance-stone" data-tier="${tier}" ${stoneCount(tier) > 0 ? '' : 'disabled'}>${name}<small>×${stoneCount(tier)}</small></button>`
  }).join('')
  const bonusPreview = enhanceSlot === 'armor' || enhanceSlot === 'armor2'
    ? `当前强化：生命 +${data.level * 2}%、防御 +${data.level * 2 + 3}%`
    : `当前强化：攻击 +${data.level * 2}%、蓝量 +${data.level * 2 + 3}%`
  return `<p>强化的是装备槽位而不是具体装备，更换装备后强化等级会保留。</p><div class="enhance-slots">${slotRows}</div><div class="enhance-chance"><span>当前槽位：<b>+${data.level}</b> · ${bonusPreview}</span><span>成功概率 <b>${chance}%</b>${data.fail > 0 ? `（失败加成 +${data.fail * 5}%）` : ''}</span></div><div class="enhance-stones">${tierButtons}</div><button class="forge-combine" data-action="enhance-do" ${stoneCount(enhanceStoneTier) > 0 ? '' : 'disabled'}>使用${stoneName(enhanceStoneTier)}强化</button><p class="bag-note">一阶强化石基础概率：+0→+1 100%、之后 90/80/70/60/50/40/30/20%，再往后每次 -5% 直到 1%。二阶 +20%、三阶 +40%、四阶 +60%、五阶 +80%。失败后下一次成功概率 +5%，成功后重置。</p><button class="secondary npc-back" data-action="npc-menu">返回</button>`
}
function dungeonMarkup() {
  if (!game) return ''
  // 只显示已经解锁的噩梦关卡；前一关未通关时不提前暴露后续关卡。
  const unlockedStages = Array.from({ length: 10 }, (_, index) => index + 1).filter((stage) => nightmareUnlocked(stage))
  const rows = unlockedStages.map((stage) => {
    const cleared = game!.nightmareCleared?.includes(stage)
    const config = STAGE_CONFIG[stage - 1]
    return `<article class="forge-item"><span class="gear-glyph">${itemIcon('stamp')}</span><span class="gear-copy"><b>第 ${stage} 关 · ${stageNames[stage - 1]}</b><small>噩梦守关者 · 生命 ${displayNumber(config.bossHp * 2)} · 攻击 ${displayNumber(config.bossAtk * 1.5)}${cleared ? ' · 已通关' : ''}</small></span><button data-action="nightmare-enter" data-stage="${stage}">挑战</button></article>`
  }).join('')
  const list = rows || '<div class="empty-gear">暂无已解锁的噩梦副本<small>通关普通关卡后，噩梦副本会逐关解锁</small></div>'
  return `<p>直接挑战对应普通关卡的 Boss。噩梦守关者生命为普通 Boss 的 2 倍、攻击为 1.5 倍；通关前一关噩梦后才会显示下一关。</p><div class="forge-bag-list dungeon-list">${list}</div>`
}
function secondNpcMarkup() {
  if (!game || !secondNpcOpen) return ''
  const title = secondView === 'dungeon' ? '噩梦副本' : secondView === 'gems' ? '宝石镶嵌' : SECOND_NPC_NAME
  const content = secondView === 'dungeon' ? dungeonMarkup() : secondView === 'gems' ? gemsMarkup() : `<p>“噩梦试炼与宝石镶嵌，都交给我。强化槽位去找阿岩吧。”</p><div class="npc-menu"><button data-action="second-dungeon"><b>◈</b><span><strong>副本挑战</strong><small>挑战十位噩梦守关者，赢取宝石</small></span></button><button data-action="second-gems"><b>${itemIcon('gem')}</b><span><strong>宝石</strong><small>镶嵌、取出与合成宝石</small></span></button></div><div class="npc-currency"><span>${itemIcon('gem')} 宝石 ${game.gems?.length ?? 0}</span><span>${itemIcon('punch')} 打孔石 ${game.punchStones ?? 0}</span></div>`
  return `<div class="bag-scrim npc-scrim"><section class="bag-dialog npc-dialog second-npc-dialog"><header><div><small>SOULSMITH · 冒险者小镇</small><h2>${title}</h2></div><button data-action="close-second-npc" aria-label="关闭">×</button></header>${content}${secondView === 'menu' ? '<button class="secondary npc-back" data-action="close-second-npc">离开</button>' : '<button class="secondary npc-back" data-action="second-menu">返回</button>'}</section></div>`
}
function performEnhance() {
  if (!game) return
  if (stoneCount(enhanceStoneTier) <= 0) { toast('没有这种强化石。'); return }
  const data = enhanceSlotData(enhanceSlot)
  const chance = enhanceChance(data.level, enhanceStoneTier, data.fail)
  addStone(enhanceStoneTier, -1)
  const enh = game.enhance ??= { weapon: 0, armor: 0, armor2: 0, weapon2: 0, failWeapon: 0, failArmor: 0, failArmor2: 0, failWeapon2: 0 }
  const success = Math.random() * 100 < chance
  const levelKey = enhanceSlot
  const failKey = enhanceSlot === 'weapon' ? 'failWeapon' : enhanceSlot === 'weapon2' ? 'failWeapon2' : enhanceSlot === 'armor2' ? 'failArmor2' : 'failArmor'
  if (success) {
    enh[levelKey] += 1
    enh[failKey] = 0
    const slotLabel = enhanceSlot === 'armor' ? '护甲槽' : enhanceSlot === 'armor2' ? '副护甲槽' : enhanceSlot === 'weapon2' ? '副武器槽' : '主武器槽'
    toast(`强化成功：${slotLabel} +${enh[levelKey]}`)
  } else {
    enh[failKey] += 1
    toast(`强化失败，下次成功概率 +5%（当前 ${Math.min(100, enhanceChance(enh[levelKey], enhanceStoneTier, enh[failKey]))}%）。`)
  }
  const s = stats(); game.hp = Math.min(game.hp, s.hp); game.mp = Math.min(game.mp, s.mp)
  save(); npcOpen = true; npcView = 'enhance'; renderGame()
}
function beginNightmare(stage: number) {
  if (!game || !secondNpcUnlocked() || !nightmareUnlocked(stage)) return
  resetPanels()
  battleTime = 0
  resetCombo()
  hiddenBattle = false; tutorialMode = false; bossChest = null; lootReveal = null; nightmareStage = null; invisibleTimer = 0; cloneTimer = 0; cloneAttackPulse = 0; cloneCastPulse = 0; cloneStealthTimer = 0; bowCharging = false; bowCharge = 0; bowChargeSource = null; bowAirLocked = false; flowerBomb = null; skyBow = null; bombClones = []; arcaneOrb = null
  nightmareStage = stage
  game.stage = stage
  game.kills = 0; game.bossDefeated = false; game.dead = false; game.town = true
  const s = stats(); game.hp = s.hp; game.mp = s.mp
  scene = 'battle'; paused = false
  heroX = 480; heroY = 0; velocityY = 0; grounded = true; heroSupportTop = world.floor; jumpCount = 0; facing = 1
  unlockedWidth = BASE_MAP_WIDTH; cameraX = 0
  projectiles = []; foeShots = []; effects = []; burst = 0; burstTargetId = null; shake = 0
  const boss = spawnFoe(heroX + 320, true, false)
  boss.hp = boss.maxHp = STAGE_CONFIG[stage - 1].bossHp * 2
  foes = [boss]; waveReady = false; bossPending = false
  save(); renderGame()
}
function drawSecondNpc(c: CanvasRenderingContext2D) {
  if (!game || scene !== 'town' || !secondNpcUnlocked()) return
  const x = SECOND_NPC_X
  const now = performance.now()
  const bob = Math.sin(now / 480) * 1.1
  const near = Math.abs(heroX - x) <= 75
  c.save()
  c.fillStyle = 'rgba(8, 17, 17, .3)'; c.beginPath(); c.ellipse(x, world.floor + 2, 22, 6, 0, 0, Math.PI * 2); c.fill()
  c.translate(x, world.floor + bob)
  // 铁砧与铁锤
  c.fillStyle = '#3a3a3c'; c.fillRect(-34, -14, 28, 8); c.fillRect(-28, -30, 16, 16)
  c.fillStyle = '#6f5234'; c.fillRect(-22, -6, 6, 6)
  c.strokeStyle = '#7a5a35'; c.lineWidth = 3; c.beginPath(); c.moveTo(26, -6); c.lineTo(30, -56); c.stroke()
  c.fillStyle = '#c9c9c9'; c.fillRect(17, -66, 26, 12)
  // 人物
  const apron = c.createLinearGradient(0, -66, 0, -4)
  apron.addColorStop(0, '#8a5b3e'); apron.addColorStop(.6, '#5a3a26'); apron.addColorStop(1, '#2f2118')
  c.fillStyle = apron; c.beginPath(); c.moveTo(-18, -58); c.lineTo(18, -58); c.lineTo(22, -6); c.lineTo(-22, -6); c.closePath(); c.fill()
  c.strokeStyle = 'rgba(20, 12, 8, .6)'; c.lineWidth = 1.2; c.stroke()
  c.fillStyle = '#d1a374'; c.fillRect(-22, -52, 8, 26); c.fillRect(14, -52, 8, 24)
  c.fillStyle = '#3a2b1f'; c.fillRect(-16, -8, 14, 8); c.fillRect(2, -8, 14, 8)
  c.fillStyle = '#c9a06f'; c.beginPath(); c.arc(0, -70, 11, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#2b2119'; c.beginPath(); c.moveTo(-12, -72); c.quadraticCurveTo(0, -86, 12, -72); c.lineTo(9, -76); c.lineTo(-9, -76); c.closePath(); c.fill()
  c.fillStyle = '#d8d2c2'; c.beginPath(); c.moveTo(-9, -64); c.quadraticCurveTo(0, -46, 9, -64); c.quadraticCurveTo(0, -56, -9, -64); c.fill()
  glint(c, -4, -71, 1.8, '#ffd27a'); glint(c, 4, -71, 1.8, '#ffd27a')
  c.restore()
  drawCompanionNameplates(c, SECOND_NPC_NAME, x, near, world.floor - 118 + bob)
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
  return `<div class="bag-scrim attr-scrim"><section class="bag-dialog attr-dialog"><header><div><small>ATTRIBUTES · 剩余 ${points} 点</small><h2>属性分配</h2></div><button data-action="close-attributes" aria-label="关闭属性面板">×</button></header><p>击杀小怪每满 10 只获得本关关卡数等量的属性点，单关最多 20 点。加点和减点都会立即生效；长按 +/− 可以连续调整。</p><div class="attr-summary"><span>可用属性点 <b>${points}</b></span><small>本关已获得 ${progress.pointsClaimed ?? 0} / ${ATTRIBUTE_POINT_CAP_PER_STAGE}</small></div><div class="attr-list">${rows.map((row) => `<article class="attr-row"><span class="attr-copy"><b>${row.label}</b><small>${row.hint} · 已投入 ${row.count} 点</small></span><b class="attr-total">+${row.count * ATTRIBUTE_STEP[row.stat]}</b><div class="attr-actions"><button class="attr-minus" data-action="allocate-attr" data-stat="${row.stat}" data-delta="-1" aria-label="减少${row.label}" ${row.count > 0 ? '' : 'disabled'}>−</button><button class="attr-plus" data-action="allocate-attr" data-stat="${row.stat}" data-delta="1" aria-label="增加${row.label}" ${points > 0 ? '' : 'disabled'}>＋</button></div></article>`).join('')}</div></section></div>`
}
function townPanelMarkup() {
  if (!game) return ''
  const current = game
  const options = Array.from({ length: current.unlockedStage }, (_, i) => `<option value="${i + 1}" ${current.stage === i + 1 ? 'selected' : ''}>第 ${String(i + 1).padStart(2, '0')} 关 · ${stageNames[i]}</option>`).join('')
  const forgeButton = forgeUnlocked()
    ? '<button class="secondary" data-action="open-crafting">⚒ 合成台</button>'
    : '<button class="secondary" disabled title="通关第一关后解锁">⚒ 合成台 · 第1关解锁</button>'
  const npcButton = npcUnlocked()
    ? `<button class="secondary town-npc" data-action="open-npc">${itemIcon('npc')} ${TOWN_NPC_NAME} · 天赋/抽奖 · S</button>`
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
  // 每种武器使用独立图标，背包与装备框里可以直接分辨。
  sword: '<path d="M14.5 2.5h7v7L11 20l-3.5.5.5-3.5L18.5 6.5l-1-1L7 16l-3.5.5.5-3.5L14.5 2.5Z"/>',
  axe: '<path d="M14 2c3 0 6 1.1 7.5 3.2l-2.2 2.2C18.2 6.2 16.2 5.4 14 5.4v3L9.2 6.6 11.5 4.3C12.4 3.1 13.2 2.5 14 2ZM9.6 8.7l3.2 1.4L7.4 22l-3.2-1.4L9.6 8.7Z"/>',
  blade: '<path d="M21 2.5 8.4 15.1 6 21.2l-2.3-.6.7-3L17 4.2l4-1.7ZM7.1 16.4l-1.7 3.3.9.9 3.3-1.7-2.5-2.5Z"/>',
  bow: '<path d="M4.5 2c6.4 3.3 9.5 6.9 9.5 10s-3.1 6.7-9.5 10V2Zm2.2 3.6v12.8C9.9 16.6 11.2 14.4 11.2 12S9.9 7.4 6.7 5.6ZM14 4h7v2h-3.2v2.8h-2V6H14V4Zm1.2 5.4h7.3v2h-7.3v-2Z"/>',
  staff: '<path d="M11.5 2 13.3 5.6 17 7.4l-3.7 1.8L11.5 13 9.7 9.2 6 7.4l3.7-1.8L11.5 2ZM7 13.8l2.2 1.1L4.6 22 2.4 20.8 7 13.8Z"/>',
  book: '<path d="M4 3h6.5c1.9 0 3.5 1.5 3.5 3.4V21c-.8-.9-2-1.4-3.2-1.4H4V3Zm12.5 0H18c1.7 0 3 1.3 3 3v15c-.8-.9-2-1.4-3.2-1.4h-1.3V3ZM6 5v12.4h4.2c.7 0 1.3.1 1.8.3V5.4c0-.8-.6-1.4-1.4-1.4H6Z"/>',
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
  revive: '<path d="M12 21c-4.4-3.2-8-6.2-8-10.2A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 8 3.8c0 4-3.6 7-8 10.2Zm0-12.3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/>',
  enhance: '<path d="m12 2 6 5-2.2 12H8.2L6 7l6-5Zm0 3.2L8.6 9l1.7 8h3.4l1.7-8L12 5.2Z"/>',
  gem: '<path d="m12 2 7 6-7 14-7-14 7-6Zm0 3.1L7.4 8.6 12 18.4l4.6-9.8L12 5.1Z"/>',
  punch: '<path d="M5 3h3v6h2V5h3v4h2V3h3v9a5 5 0 0 1-5 5v4h-3v-4a5 5 0 0 1-5-5V3Zm3 11h8v-1H8v1Z"/>',
  // 号角：卷曲的兽角与吹口，统一使用金色描边风格。
  horn: '<path d="M3 21C5.5 12.5 10.5 6.5 18 3.5l2.8 6C14.5 11.8 10.8 16 9.3 21L3 21Z M18 3.5l4.8-2.3.7 8.6-2.7-.3L18 3.5Z M2.4 19.8 9.3 21l-.5 2H2v-3.2Z"/>',
}
function itemIcon(name: string, className = '') {
  const path = ITEM_ICON_PATHS[name] ?? ITEM_ICON_PATHS.coin
  return `<span class="item-icon ${className}" aria-hidden="true"><svg viewBox="0 0 24 24">${path}</svg></span>`
}
// 根据装备类型与武器款式取图标：剑、斧、刃、弓、法杖、魔法书各不相同。
function gearIcon(gear?: Gear) {
  if (!gear) return itemIcon('weapon')
  if (gear.type === 'weapon') return itemIcon(weaponStyleOf(gear))
  return itemIcon(gear.type ?? 'legacy')
}
function gemIcon(gem: Gem) { return itemIcon('gem', `gem-${gem.kind}`) }
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
    { speaker: '旁白', text: '合成台与阿岩：通关第一关后解锁。合成台可用 5 件同阶装备（可混搭不同品种）或 3 件同阶时装合成，也可用同关卡 3 种不同专属材料合成装备；阿岩在营火集市用灵魂交易。' },
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
    { speaker: '旁白', text: '合成台：5 件同阶装备（武器与护甲可以混搭，不要求同品种）可以合成高一级装备；3 件同阶时装可以合成下一阶时装。' },
    { speaker: '旁白', text: '专属合成：使用同一关卡的 3 种不同专属掉落物，可以合成该关卡等级的装备。' },
    { speaker: '旁白', text: '合成品不会自动穿戴。装备等级和时装阶级没有上限。' },
  ] }
}
function shopIntroStoryData(): StoryData {
  return { id: 'shop-intro', title: '功能介绍 · 阿岩', lines: [
    { speaker: '旁白', text: '灵魂来自击杀小怪和 Boss，可以在灵魂商店购买装备、天赋币碎片、复活币和时装。' },
    { speaker: '旁白', text: '第一关通关后，商店会在小镇开放。' },
  ] }
}
function lotteryIntroStoryData(): StoryData {
  return { id: 'lottery-intro', title: '功能介绍 · 抽奖', lines: [
    { speaker: '旁白', text: '首次通关每个关卡会获得一次抽奖机会。重复通关已经通过的关卡不会再次获得。' },
    { speaker: '旁白', text: '奖池包含属性点、装备、天赋币、灵魂和时装。祝你好运。' },
  ] }
}
function bagEquipSlot(slot: 'weapon' | 'armor' | 'fashion' | 'extra', gear: Gear | undefined, label: string, hint: string) {
  const icon = gear ? gearIcon(gear) : '<b>+</b>'
  const name = gear?.name ?? label
  const detail = gear ? (gear.type === 'fashion' ? fashionTierName(gear.level) : `${gear.level} 级 · 点击卸下`) : hint
  const action = gear ? ` data-action="unequip-slot" data-slot="${slot}" title="点击卸下，放回背包"` : ''
  return `<div class="equip-slot ${gear ? 'filled' : ''}" data-drop-slot="${slot}"${action}><span class="equip-slot-icon">${icon}</span><span class="equip-slot-copy"><b>${name}</b><small>${detail}</small></span></div>`
}
function bagMarkup() {
  if (!game) return ''
  const s = stats()
  const main = game.gear.find((gear) => gear.id === game?.weaponId)
  const off = dualWieldUnlocked() ? game.gear.find((gear) => gear.id === game?.weapon2Id) : undefined
  const armor = game.gear.find((gear) => gear.id === game?.armorId)
  const armor2 = extraArmorUnlocked() ? game.gear.find((gear) => gear.id === game?.armor2Id) : undefined
  const fashion = game.gear.find((gear) => gear.id === game?.fashionId)
  const chips = [
    `${gearIcon(main)} ${main?.name ?? '无武器'}`,
    off ? `${gearIcon(off)} ${off.name}（副手）` : '',
    `${gearIcon(armor)} ${armor?.name ?? '无护甲'}`,
    armor2 ? `${gearIcon(armor2)} ${armor2.name}（副护甲）` : '',
    `${gearIcon(fashion)} ${fashion?.name ?? '无时装'}`,
  ].filter(Boolean).map((text) => `<span>${text}</span>`).join('')
  const tabs = [['gear', `${itemIcon('weapon')} 装备`], ['gems', `${itemIcon('gem')} 宝石`], ['talent', `${itemIcon('coin')} 天赋币`], ['other', `${itemIcon('soul')} 其他`]] as const
  const tabButtons = tabs.map(([id, label]) => `<button class="${bagTab === id ? 'active' : ''}" data-action="bag-tab" data-tab="${id}" type="button">${label}</button>`).join('')
  const filters: Array<{ id: 'all' | 'weapon' | 'armor' | 'fashion'; label: string }> = [
    { id: 'all', label: '全部' }, { id: 'weapon', label: '武器' }, { id: 'armor', label: '护甲' }, { id: 'fashion', label: '时装' },
  ]
  const filterMarkup = `<div class="bag-filters">${filters.map((entry) => `<button class="${bagGearFilter === entry.id ? 'active' : ''}" data-action="bag-filter" data-filter="${entry.id}" type="button">${entry.label}</button>`).join('')}</div>`
  const content = bagTab === 'gear'
    ? `${filterMarkup}<div class="bag-list">${gearMarkup(scene === 'town', bagGearFilter)}</div>`
    : bagTab === 'gems' ? gemBagMarkup() : bagTab === 'talent' ? talentBagMarkup() : otherBagMarkup()
  // 高级天赋（双持专精）额外开放第 4 个装备框；该框只提供属性，不改变武器技能与时装外观。
  const extraUnlocked = game.advancedTalent === 3 && advancedTalentLevel() >= 1
  const extraGear = game.extraSlot === 'armor' ? armor2 : (game.extraSlot === 'weapon' && dualWieldUnlocked() ? off : undefined)
  const extraLabel = game.extraSlot === 'armor' ? '额外护甲' : '额外武器'
  return `<div class="bag-scrim"><section class="bag-dialog bag-dialog-wide"><header><div><small>INVENTORY · ${game.gear.length} 件物品</small><h2>远征背包</h2></div><button data-action="close-bag" aria-label="关闭背包">×</button></header><div class="bag-body"><section class="bag-figure"><div class="bag-preview"><canvas id="bag-portrait" width="300" height="420" aria-label="角色全身预览"></canvas></div><div class="equip-slots">${bagEquipSlot('weapon', main, '主武器', '拖入武器')}${bagEquipSlot('armor', armor, '护甲', '拖入护甲')}${bagEquipSlot('fashion', fashion, '时装', '拖入时装')}${extraUnlocked ? bagEquipSlot('extra', extraGear, extraLabel, '拖入装备（仅属性）') : ''}</div></section><section class="bag-side"><div class="bag-stats"><span>♥ 生命 ${displayNumber(game.hp)} / ${displayNumber(s.hp)}</span><span>✦ 法力 ${displayNumber(game.mp)} / ${displayNumber(s.mp)}</span><span>⚔ 攻击 ${displayNumber(s.attack)}</span><span>▰ 防御 ${displayNumber(s.defense)}</span><span>★ 等级 ${game.level ?? 1}</span></div><div class="bag-equipped">${chips}</div><div class="bag-tabs">${tabButtons}</div><div class="bag-content">${content}</div></section></div></section></div>`
}
// 将右侧装备拖入左侧装备框：武器 / 护甲 / 时装 / 高级天赋的额外属性框。
function dropGearToSlot(id: string | undefined, slot: string | undefined) {
  if (!game || !id || !slot) return
  if (scene !== 'town') { toast('请回到小镇后更换装备。'); return }
  const gear = game.gear.find((entry) => entry.id === id)
  if (!gear) return
  if (slot === 'weapon') {
    if (gear.type !== 'weapon') { toast('武器框只能放入武器。'); return }
    if (!canUseWeapon(gear)) { toast(`当前职业无法使用${gear.name}。`); return }
    equipSlot(id, 'main')
  } else if (slot === 'armor') {
    if (gear.type !== 'armor') { toast('护甲框只能放入护甲。'); return }
    equip(id)
  } else if (slot === 'fashion') {
    if (gear.type !== 'fashion') { toast('时装框只能放入时装。'); return }
    equip(id)
  } else if (slot === 'extra') {
    if (!game.advancedTalent || game.advancedTalent !== 3 || advancedTalentLevel() < 1) { toast('需要高级天赋「双持专精」才能使用额外装备框。'); return }
    if (game.extraSlot === 'weapon') {
      if (gear.type !== 'weapon') { toast('当前额外框只能放入武器。'); return }
      equipSlot(id, 'off')
    } else {
      if (gear.type !== 'armor') { toast('当前额外框只能放入护甲。'); return }
      equipArmor2(id)
    }
  }
}
function talentBagMarkup() {
  if (!game) return ''
  const levels = normalTalentLevels()
  const normalText = NORMAL_TALENTS.filter((talent) => (levels[talent.id - 1] ?? 0) > 0).map((talent) => `${talent.name} Lv.${levels[talent.id - 1]}`).join('、') || '未激活'
  const advanced = ADVANCED_TALENTS.find((talent) => talent.id === game?.advancedTalent)
  const advancedText = advanced ? `${advanced.name} Lv.${advancedTalentLevel()}` : '未激活'
  return `<div class="bag-info-list"><article class="info-row"><span>${itemIcon('fragment')} 天赋币碎片</span><b>${displayCurrency(game.talentFragments ?? 0)}</b></article><article class="info-row"><span>${itemIcon('coin')} 天赋币</span><b>${displayCurrency(game.talentCoins ?? 0)}</b></article><article class="info-row"><span>${itemIcon('attribute')} 普通天赋</span><b>${normalText}</b></article><article class="info-row"><span>${itemIcon('coin')} 高级天赋</span><b>${advancedText}</b></article></div><p class="bag-note">普通天赋可以全部激活并分别升级；高级天赋只能激活一个。前往小镇商人处研究、升级或撤销天赋。</p>`
}
function gemBagMarkup() {
  if (!game) return ''
  const groups = new Map<string, Gem[]>()
  for (const gem of game.gems ?? []) {
    const key = `${gem.kind}-${gem.tier}`
    const list = groups.get(key) ?? []
    list.push(gem)
    groups.set(key, list)
  }
  const rows = [...groups.entries()]
    .sort((a, b) => (a[1][0].tier - b[1][0].tier) || a[1][0].kind.localeCompare(b[1][0].kind))
    .map(([, list]) => {
      const gem = list[0]
      return `<article class="gem-row"><span class="gear-glyph">${gemIcon(gem)}</span><span class="gear-copy"><b>${gemName(gem)} ×${list.length}</b><small>${gemSummary(gem)} · ${gemSlotForKind(gem.kind) === 'armor' ? '护甲孔位' : '武器孔位'}</small></span></article>`
    }).join('')
  return `<div class="forge-bag-list">${rows || '<div class="empty-gear">还没有宝石<small>噩梦副本的守关者会掉落宝石</small></div>'}</div><p class="bag-note">前往铸魂师·霍恩处可以镶嵌、取出和合成宝石。</p>`
}
function otherBagMarkup() {
  if (!game) return ''
  const horns = game.horns ?? 0
  const hornActive = game.hornBuff && hornBuffRemaining() > 0 ? HORN_BUFFS[game.hornBuff] : null
  return `<div class="bag-info-list"><article class="info-row"><span>${itemIcon('soul')} 灵魂</span><b>${displayCurrency(game.soul ?? 0)}</b></article><article class="info-row"><span>${itemIcon('revive')} 复活币</span><b>${displayCurrency(game.reviveCoins ?? 0)}</b></article><article class="info-row horn-row"><span>${itemIcon('horn')} 号角</span><b>×${horns}${horns > 0 ? ` <button class="horn-use" data-action="use-horn">使用</button>` : ''}</b></article>${hornActive ? `<article class="info-row"><span>${itemIcon('horn')} 当前号角增益</span><b>${hornActive.name} · ${formatHornTime(hornBuffRemaining())}</b></article>` : ''}<article class="info-row"><span>${itemIcon('punch')} 打孔石</span><b>${game.punchStones ?? 0}</b></article><article class="info-row"><span>${itemIcon('stamp')} 王印印章</span><b>${displayCurrency(game.stamps ?? 0)} / ${STAMP_UNLOCK}</b></article><article class="info-row"><span>${itemIcon('ticket')} 抽奖机会</span><b>${displayCurrency(game.lotteryChances ?? 0)}</b></article><article class="info-row"><span>${itemIcon('attribute')} 属性点</span><b>${displayCurrency(game.attributePoints ?? 0)}</b></article></div><p class="bag-note">灵魂可以在小镇商人处购买装备、材料和复活币；集齐 ${STAMP_UNLOCK} 枚王印印章可开启隐藏关卡。</p>`
}
// ── 号角 ─────────────────────────────────────────────
function hornPickerMarkup() {
  if (!hornPickerOpen || !game) return ''
  const options = (Object.keys(HORN_BUFFS) as Array<'material' | 'attack' | 'gear'>).map((kind) => {
    const buff = HORN_BUFFS[kind]
    return `<button class="horn-option" data-action="horn-buff" data-buff="${kind}" type="button"><b>${itemIcon('horn')} ${buff.name}</b><small>${buff.desc}</small></button>`
  }).join('')
  return `<div class="bag-scrim horn-scrim"><section class="bag-dialog horn-dialog"><header><div><small>HORN · 号角</small><h2>选择一种号角增益</h2></div><button data-action="close-horn-picker" aria-label="关闭">×</button></header><p class="horn-tip">吹响号角后增益持续 30 分钟；再次使用会覆盖当前的号角增益。</p><div class="horn-options">${options}</div></section></div>`
}
function hornAnimationMarkup() {
  if (!game || Date.now() >= hornAnimUntil) return ''
  const buff = game.hornBuff ? HORN_BUFFS[game.hornBuff] : null
  return `<div class="horn-animation" aria-hidden="true"><div class="horn-animation-glow"></div><div class="horn-animation-icon">${itemIcon('horn')}</div><b>号角吹响</b><small>${buff?.name ?? '增益已生效'} · 30 分钟</small></div>`
}
function openHornPicker() {
  if (!game || (game.horns ?? 0) <= 0) { toast('背包里没有号角，可以在商城每月购买一次。'); return }
  hornPickerOpen = true
  renderGame()
}
function applyHornBuff(kind: 'material' | 'attack' | 'gear') {
  if (!game) return
  if ((game.horns ?? 0) <= 0) { toast('背包里没有号角了。'); hornPickerOpen = false; renderGame(); return }
  const buff = HORN_BUFFS[kind]
  game.horns = Math.max(0, (game.horns ?? 0) - 1)
  game.hornBuff = kind
  game.hornBuffUntil = Date.now() + HORN_BUFF_DURATION
  hornPickerOpen = false
  bagOpen = false
  hornAnimUntil = Date.now() + 2000
  save()
  playSfx('level')
  renderGame()
  toast(`号角吹响：${buff.name}，持续 30 分钟。`)
  if (hornAnimTimeout !== null) window.clearTimeout(hornAnimTimeout)
  hornAnimTimeout = window.setTimeout(() => {
    hornAnimTimeout = null
    hornAnimUntil = 0
    if (game) renderGame()
  }, 2000)
}
function npcMarkup() {
  if (!game || !npcOpen) return ''
  const title = npcView === 'shop' ? '灵魂商店' : npcView === 'talent' ? '天赋研究' : npcView === 'enhance' ? '装备强化' : npcView === 'quests' ? '任务列表' : `${TOWN_NPC_NAME} · 小镇伙伴`
  const content = npcView === 'shop' ? shopMarkup() : npcView === 'talent' ? talentMarkup() : npcView === 'enhance' ? enhancementMarkup() : npcView === 'quests' ? questsMarkup() : npcMenuMarkup()
  return `<div class="bag-scrim npc-scrim"><section class="bag-dialog npc-dialog"><header><div><small>MERCHANT · 冒险者小镇</small><h2>${title}</h2></div><button data-action="close-npc">×</button></header>${content}</section></div>`
}
function npcMenuMarkup() {
  if (!game) return ''
  return `<p>“任务、天赋、强化和运气，都在我这儿。想做主线就通关关卡，想做支线就来挑一个地点。”</p><div class="npc-menu"><button data-action="npc-quests"><b>${itemIcon('stamp')}</b><span><strong>任务</strong><small>主线任务与支线任务</small></span></button><button data-action="npc-enhance"><b>${itemIcon('enhance')}</b><span><strong>装备强化</strong><small>用强化石强化装备槽位</small></span></button><button data-action="npc-talent"><b>${itemIcon('coin')}</b><span><strong>天赋</strong><small>${talentUnlocked() ? '研究普通与高级天赋' : '角色 5 级后开放'}</small></span></button><button data-action="open-lottery"><b>${itemIcon('ticket')}</b><span><strong>抽奖</strong><small>${game.lotteryChances ?? 0} 次机会</small></span></button></div><div class="npc-currency"><span>${itemIcon('soul')} 灵魂 ${displayCurrency(game.soul ?? 0)}</span><span>${itemIcon('fragment')} 碎片 ${displayCurrency(game.talentFragments ?? 0)}</span><span>${itemIcon('coin')} 天赋币 ${displayCurrency(game.talentCoins ?? 0)}</span></div>`
}
// ── 任务 ─────────────────────────────────────────────
// 噩梦通关宝石奖励（按关卡）。首通会再发一次同样的奖励。
const NIGHTMARE_GEM_REWARDS: Array<Array<{ tier: number; count: number }>> = [
  [{ tier: 1, count: 1 }],
  [{ tier: 1, count: 2 }],
  [{ tier: 2, count: 1 }],
  [{ tier: 2, count: 1 }, { tier: 1, count: 1 }],
  [{ tier: 2, count: 2 }],
  [{ tier: 2, count: 2 }, { tier: 1, count: 1 }],
  [{ tier: 2, count: 3 }],
  [{ tier: 2, count: 3 }, { tier: 1, count: 1 }],
  [{ tier: 3, count: 1 }],
  [{ tier: 3, count: 1 }, { tier: 2, count: 2 }],
]
const SIDE_QUEST_REWARDS: Array<Array<{ tier: number; count: number }>> = [
  [{ tier: 1, count: 1 }],
  [{ tier: 1, count: 2 }],
  [{ tier: 1, count: 3 }],
  [{ tier: 2, count: 1 }],
  [{ tier: 2, count: 1 }, { tier: 1, count: 2 }],
  [{ tier: 2, count: 2 }],
  [{ tier: 2, count: 3 }],
  [{ tier: 2, count: 4 }],
  [{ tier: 3, count: 1 }],
  [{ tier: 3, count: 1 }, { tier: 2, count: 2 }],
]
function mainQuestClaimed(stage: number) { return Boolean(game?.mainQuestsClaimed?.includes(stage)) }
function mainQuestExp(stage: number) { return 600 * 2 ** (stage - 1) }
function sideQuestRewardText(stage: number) {
  return (SIDE_QUEST_REWARDS[stage - 1] ?? []).map((reward) => `${stoneName(reward.tier)} ×${reward.count}`).join(' + ')
}
function claimMainQuest(stage: number) {
  if (!game || stage < 1 || stage > 10 || mainQuestClaimed(stage)) return
  if (!getStageProgress(stage).bossDefeated) { toast('尚未通关该关卡，无法领取主线奖励。'); return }
  game.mainQuestsClaimed = [...(game.mainQuestsClaimed ?? []), stage]
  game.soul = (game.soul ?? 0) + stage * 1000
  for (let variant = 0; variant < 3; variant += 1) addMaterial(materialKey(stage, variant), 1)
  awardExperience(mainQuestExp(stage))
  save(); npcOpen = true; npcView = 'quests'; questTab = 'main'; renderGame()
  toast(`主线任务奖励：${stage * 1000} 灵魂、3 种第 ${stage} 关专属材料、经验 ${displayNumber(mainQuestExp(stage))}`)
}
function acceptSideQuest(stage: number) {
  if (!game) return
  if (game.sideQuest) { toast('已经有进行中的支线任务。'); return }
  if (game.sideQuestDay === todayKey()) { toast('今天已经完成过一个支线任务，明天再来吧。'); return }
  if (stage < 1 || stage > Math.min(10, game.unlockedStage)) { toast('该关卡尚未解锁。'); return }
  game.sideQuest = { stage, clears: 0 }
  save(); npcOpen = true; npcView = 'quests'; questTab = 'side'; renderGame()
  toast(`已接取支线任务：通关第 ${stage} 关两次。`)
}
function claimSideQuest() {
  if (!game?.sideQuest) return
  const quest = game.sideQuest
  if (quest.clears < 2) { toast('支线任务尚未完成。'); return }
  for (const reward of SIDE_QUEST_REWARDS[quest.stage - 1] ?? []) addStone(reward.tier, reward.count)
  const rewardText = sideQuestRewardText(quest.stage)
  game.sideQuest = null
  game.sideQuestDay = todayKey()
  save(); npcOpen = true; npcView = 'quests'; questTab = 'side'; renderGame()
  toast(`支线任务完成：${rewardText}。今天还可以继续挑战关卡，但明天才能再接支线任务。`)
}
function abandonSideQuest() {
  if (!game?.sideQuest) return
  game.sideQuest = null
  save(); npcOpen = true; npcView = 'quests'; questTab = 'side'; renderGame()
  toast('已放弃支线任务。')
}
function questsMarkup() {
  if (!game) return ''
  const tabs = `<div class="quest-tabs"><button class="${questTab === 'main' ? 'active' : ''}" data-action="quest-tab" data-tab="main" type="button">主线任务</button><button class="${questTab === 'side' ? 'active' : ''}" data-action="quest-tab" data-tab="side" type="button">支线任务</button></div>`
  let body = ''
  if (questTab === 'main') {
    body = `<p class="bag-note">每通关一个关卡，就可以在这里领取一次主线奖励：灵魂、该关卡的 3 种不同专属材料，以及击败 50 只小怪 + Boss 的经验。</p><div class="quest-list">${Array.from({ length: 10 }, (_, index) => index + 1).map((stage) => {
      const progress = getStageProgress(stage)
      const config = STAGE_CONFIG[stage - 1]
      const claimed = mainQuestClaimed(stage)
      const cleared = progress.bossDefeated
      return `<article class="quest-row ${claimed ? 'done' : cleared ? 'ready' : ''}"><span class="quest-copy"><b>第 ${String(stage).padStart(2, '0')} 关 · ${stageNames[stage - 1]}</b><small>守关者生命 ${displayNumber(config.bossHp)} · 攻击 ${displayNumber(config.bossAtk)} · ${claimed ? '已领取' : cleared ? '已通关，可领取' : '未通关'}</small><small class="quest-reward">奖励：${stage * 1000} 灵魂 · ${(STAGE_MATERIALS[stage - 1] ?? []).join('、')} 各 1 · 经验 ${displayNumber(mainQuestExp(stage))}</small></span>${claimed ? '<i class="quest-state">已领取</i>' : `<button data-action="main-claim" data-stage="${stage}" ${cleared ? '' : 'disabled'}>领取</button>`}</article>`
    }).join('')}</div>`
  } else {
    const quest = game.sideQuest
    if (quest) {
      const cleared = quest.clears >= 2
      body = `<article class="side-quest-card ${cleared ? 'ready' : ''}"><header><div><small>进行中的支线任务</small><h3>第 ${String(quest.stage).padStart(2, '0')} 关 · ${stageNames[quest.stage - 1]}</h3></div><i>${quest.clears} / 2</i></header><p>通关第 ${quest.stage} 关两次。当前进度 ${quest.clears} / 2。</p><p class="quest-reward">完成奖励：${sideQuestRewardText(quest.stage)}</p><div class="side-quest-actions">${cleared ? '<button class="primary" data-action="side-claim">领取奖励</button>' : '<button class="secondary" disabled>尚未完成</button>'}<button class="secondary quest-abandon" data-action="side-abandon">放弃任务</button></div></article>`
    } else if (game.sideQuestDay === todayKey()) {
      body = `<article class="side-quest-card"><header><div><small>今日支线任务</small><h3>今天已完成</h3></div><i>1 / 1</i></header><p>每天只能完成一个支线任务，已完成的支线任务明天可以再次接取。</p><p class="bag-note">明天再来可以选择新的关卡。</p></article>`
    } else {
      const stages = Array.from({ length: Math.max(1, Math.min(10, game.unlockedStage)) }, (_, index) => index + 1)
      body = `<p class="bag-note">选择一个已解锁关卡接取支线任务。接取后，通关该关卡两次即可领取奖励。一次只能进行一个支线任务，每天只能完成一个。</p><div class="quest-list">${stages.map((stage) => `<article class="quest-row"><span class="quest-copy"><b>第 ${String(stage).padStart(2, '0')} 关 · ${stageNames[stage - 1]}</b><small>守关者生命 ${displayNumber(STAGE_CONFIG[stage - 1].bossHp)} · 攻击 ${displayNumber(STAGE_CONFIG[stage - 1].bossAtk)} · 通关两次</small><small class="quest-reward">奖励：${sideQuestRewardText(stage)}</small></span><button data-action="side-accept" data-stage="${stage}">接取</button></article>`).join('')}</div>`
    }
  }
  return `${tabs}${body}<button class="secondary npc-back" data-action="npc-menu">返回</button>`
}
// ── 宝石镶嵌与合成 ───────────────────────────────────
function gemSlotForKind(kind: GemKind): 'weapon' | 'armor' {
  return kind === 'life' || kind === 'defense' ? 'armor' : 'weapon'
}
function mainGearForGem(slot: 'weapon' | 'armor') {
  return game?.gear.find((gear) => gear.id === (slot === 'weapon' ? game?.weaponId : game?.armorId))
}
function firstEmptySocket(gear?: Gear) {
  if (!gear) return -1
  const sockets = Math.max(0, Math.min(2, gear.sockets ?? 0))
  for (let index = 0; index < sockets; index += 1) if (!gear.socketGems?.[index]) return index
  return -1
}
function socketGem(kind: GemKind, tier: number) {
  if (!game) return
  game.gems ??= []
  const gemIndex = game.gems.findIndex((gem) => gem.kind === kind && gem.tier === tier)
  if (gemIndex < 0) { toast('没有这种宝石。'); return }
  const slot = gemSlotForKind(kind)
  const gear = mainGearForGem(slot)
  if (!gear) { toast(slot === 'weapon' ? '请先装备主武器。' : '请先装备主护甲。'); return }
  const index = firstEmptySocket(gear)
  if (index < 0) { toast('该装备没有可用空孔位，可在合成台打孔。'); return }
  const gem = game.gems[gemIndex]
  game.gems.splice(gemIndex, 1)
  gear.socketGems ??= []
  gear.socketGems[index] = gem
  const s = stats(); game.hp = Math.min(game.hp, s.hp); game.mp = Math.min(game.mp, s.mp)
  save(); secondNpcOpen = true; secondView = 'gems'; renderGame()
  toast(`已镶嵌 ${gemName(gem)}。`)
}
function removeGem(slot: string, index: number) {
  if (!game || (slot !== 'weapon' && slot !== 'armor')) return
  const gear = mainGearForGem(slot)
  const gem = gear?.socketGems?.[index]
  if (!gear || !gem) return
  gear.socketGems![index] = null
  game.gems ??= []
  game.gems.push(gem)
  const s = stats(); game.hp = Math.min(game.hp, s.hp); game.mp = Math.min(game.mp, s.mp)
  save(); secondNpcOpen = true; secondView = 'gems'; renderGame()
  toast(`已取出 ${gemName(gem)}。`)
}
function combineGems(kind: GemKind, tier: number) {
  if (!game || tier >= 6) return
  game.gems ??= []
  const matching = game.gems.filter((gem) => gem.kind === kind && gem.tier === tier)
  if (matching.length < 3) { toast('需要 3 个同阶同类宝石。'); return }
  let removed = 0
  game.gems = game.gems.filter((gem) => {
    if (removed < 3 && gem.kind === kind && gem.tier === tier) { removed += 1; return false }
    return true
  })
  const result = makeGem(kind, tier + 1)
  game.gems.push(result)
  save(); secondNpcOpen = true; secondView = 'gems'; renderGame()
  toast(`合成成功：${gemName(result)}`)
}
function gemSocketMarkup(gear: Gear | undefined, slot: 'weapon' | 'armor') {
  if (!gear) return `<article class="gem-equip-card empty"><b>${slot === 'weapon' ? '主武器' : '主护甲'}</b><small>未装备</small></article>`
  const sockets = Math.max(0, Math.min(2, gear.sockets ?? 0))
  const list = Array.from({ length: 2 }, (_, index) => {
    if (index >= sockets) return '<div class="gem-socket locked"><b>·</b><small>未开孔</small></div>'
    const gem = gear.socketGems?.[index]
    if (!gem) return '<div class="gem-socket empty"><b>＋</b><small>空孔位</small></div>'
    return `<button class="gem-socket filled" data-action="gem-remove" data-slot="${slot}" data-index="${index}">${gemIcon(gem)}<b>${gemName(gem)}</b><small>${gemSummary(gem)} · 点击取出</small></button>`
  }).join('')
  return `<article class="gem-equip-card"><header>${gearIcon(gear)}<b>${gear.name}</b><small>${sockets} / 2 孔位</small></header><div class="gem-sockets">${list}</div></article>`
}
function gemsMarkup() {
  if (!game) return ''
  const weapon = mainGearForGem('weapon')
  const armor = mainGearForGem('armor')
  const groups = new Map<string, Gem[]>()
  for (const gem of game.gems ?? []) {
    const key = `${gem.kind}-${gem.tier}`
    const list = groups.get(key) ?? []
    list.push(gem)
    groups.set(key, list)
  }
  const inventory = [...groups.entries()]
    .sort((a, b) => (a[1][0].tier - b[1][0].tier) || a[1][0].kind.localeCompare(b[1][0].kind))
    .map(([, list]) => {
      const gem = list[0]
      const slot = gemSlotForKind(gem.kind)
      const gear = mainGearForGem(slot)
      const canSocket = Boolean(gear && firstEmptySocket(gear) >= 0)
      const canCombine = list.length >= 3 && gem.tier < 6
      return `<article class="gem-row"><span class="gear-glyph">${gemIcon(gem)}</span><span class="gear-copy"><b>${gemName(gem)} ×${list.length}</b><small>${gemSummary(gem)} · ${slot === 'armor' ? '护甲孔位' : '武器孔位'}</small></span><span class="gem-actions"><button data-action="gem-socket" data-kind="${gem.kind}" data-tier="${gem.tier}" ${canSocket ? '' : 'disabled'}>镶嵌</button>${canCombine ? `<button data-action="gem-combine" data-kind="${gem.kind}" data-tier="${gem.tier}">合成 3→1</button>` : ''}</span></article>`
    }).join('')
  return `<p class="bag-note">护甲只能镶嵌生命/防御宝石，武器只能镶嵌攻击/能量宝石；天赋的额外武器/护甲不能镶嵌。没有孔位时先去合成台打孔。</p><div class="gem-equips">${gemSocketMarkup(weapon, 'weapon')}${gemSocketMarkup(armor, 'armor')}</div><h3 class="gem-title">宝石背包</h3><div class="forge-bag-list">${inventory || '<div class="empty-gear">还没有宝石<small>噩梦副本的守关者会掉落宝石</small></div>'}</div><h3 class="gem-title">宝石合成</h3><p class="bag-note">3 个同阶同类宝石可以合成 1 个更高一阶的同类宝石（最高六阶）。</p>`
}
function todayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
}
function cooldownText(ms: number) {
  if (ms <= 0) return ''
  const totalMinutes = Math.ceil(ms / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days} 天 ${hours} 小时`
  if (hours > 0) return `${hours} 小时 ${minutes} 分`
  return `${minutes} 分钟`
}
function soulShopMarkup() {
  if (!game) return ''
  const demo = DEMO_MODE
  const all = shopItems()
  const categories = (['equipment', 'fashion', 'gem', 'material', 'other'] as ShopCategory[]).filter((category) => all.some((item) => item.category === category))
  const active: 'all' | ShopCategory = shopCategory !== 'all' && categories.includes(shopCategory) ? shopCategory : 'all'
  const items = active === 'all' ? all : all.filter((item) => item.category === active)
  const rows = items.map((item) => {
    // 体验版：所有道具都可用 1 灵魂购买，不受限购与冷却约束。
    const uniqueSold = !demo && Boolean(item.unique && game!.shopFashionBought)
    const dailySold = !demo && item.id === 'fragments1' && game!.fragmentBuyDay === todayKey()
    const reviveLeft = !demo && item.id === 'revive1' ? Math.max(0, 3 * 24 * 3600 * 1000 - (Date.now() - (game!.reviveBuyAt ?? 0))) : 0
    const punchLeft = !demo && item.id === 'punch1' ? Math.max(0, 7 * 24 * 3600 * 1000 - (Date.now() - (game!.punchBuyAt ?? 0))) : 0
    const hornLeft = !demo && item.id === 'horn1' ? Math.max(0, 30 * 24 * 3600 * 1000 - (Date.now() - (game!.hornBuyAt ?? 0))) : 0
    const limited = uniqueSold || dailySold || reviveLeft > 0 || punchLeft > 0 || hornLeft > 0
    const price = demo ? 1 : item.cost
    const canBuy = !limited && (game!.soul ?? 0) >= price
    const label = uniqueSold ? '已购买' : dailySold ? '今日已购' : reviveLeft > 0 || punchLeft > 0 || hornLeft > 0 ? '冷却中' : '购买'
    const extra = demo ? ' · 体验版 1 灵魂' : reviveLeft > 0 ? ` · 剩余 ${cooldownText(reviveLeft)}` : punchLeft > 0 ? ` · 剩余 ${cooldownText(punchLeft)}` : hornLeft > 0 ? ` · 剩余 ${cooldownText(hornLeft)}` : dailySold ? ' · 明天刷新' : ''
    return `<article class="shop-row"><span class="gear-glyph">${itemIcon(item.icon, item.iconClass ?? '')}</span><span class="gear-copy"><b>${item.name}</b><small>${item.desc}${extra}</small></span><b class="shop-price">${itemIcon('soul')} ${price}</b><button data-action="shop-buy" data-id="${item.id}" ${canBuy ? '' : 'disabled'}>${label}</button></article>`
  }).join('')
  const categoryBar = `<div class="shop-categories"><button class="${active === 'all' ? 'active' : ''}" data-action="shop-category" data-category="all" type="button">全部</button>${categories.map((category) => `<button class="${active === category ? 'active' : ''}" data-action="shop-category" data-category="${category}" type="button">${SHOP_CATEGORY_LABELS[category]}</button>`).join('')}</div>`
  return `${categoryBar}<div class="npc-currency"><span>${itemIcon('soul')} 灵魂 ${displayCurrency(game.soul ?? 0)}</span><span>${itemIcon('fragment')} 碎片 ${displayCurrency(game.talentFragments ?? 0)}</span><span>${itemIcon('revive')} 复活币 ${displayCurrency(game.reviveCoins ?? 0)}</span></div><div class="bag-list shop-list">${rows || '<div class="empty-gear">该分类暂时没有道具</div>'}</div>`
}
function shopMarkup() {
  if (!game) return ''
  return `${soulShopMarkup()}<button class="secondary npc-back" data-action="close-npc">关闭商店</button>`
}
function talentMarkup() {
  if (!game) return ''
  if (!talentUnlocked()) return `<div class="talent-locked"><b>天赋尚未解锁</b><p>角色达到 5 级后可以研究天赋。</p><button class="secondary npc-back" data-action="npc-menu">返回商人</button></div>`
  const coins = game.talentCoins ?? 0
  const levels = normalTalentLevels()
  const normalRows = NORMAL_TALENTS.map((talent) => {
    const level = levels[talent.id - 1] ?? 0
    const cost = normalTalentUpgradeCost(level)
    const refund = normalTalentRefund(level)
    const current = level > 0 ? normalTalentEffect(talent.id, level) : '未激活'
    const next = level > 0 ? `下一级：${normalTalentEffect(talent.id, level + 1)}` : `激活后：${normalTalentEffect(talent.id, 1)}`
    return `<article class="talent-row ${level > 0 ? 'active' : ''}"><span class="gear-glyph">${itemIcon('attribute')}</span><span class="gear-copy"><b>${talent.name}${level > 0 ? ` <i>Lv.${level}</i>` : ''}</b><small>${current} · ${next}</small></span><span class="talent-actions"><button data-action="talent-normal-up" data-id="${talent.id}" ${coins >= cost ? '' : 'disabled'}>${level > 0 ? '升级' : '激活'} ${itemIcon('coin')}${cost}</button>${level > 0 ? `<button class="talent-undo" data-action="talent-normal-undo" data-id="${talent.id}">撤销 ${itemIcon('coin')}${refund}</button>` : ''}</span></article>`
  }).join('')
  const advId = game.advancedTalent ?? 0
  const advLevel = advancedTalentLevel()
  const advancedRows = ADVANCED_TALENTS.map((talent) => {
    if (advId === talent.id) {
      const cost = advancedTalentUpgradeCost(advLevel)
      const refund = advancedTalentRefund(advLevel)
      return `<article class="talent-row active"><span class="gear-glyph">${itemIcon('coin')}</span><span class="gear-copy"><b>${talent.name} <i>Lv.${advLevel}</i></b><small>${advancedEffectText(talent.id, advLevel)} · 下一级：${advancedEffectText(talent.id, advLevel + 1)}</small></span><span class="talent-actions">${talent.id === 3 ? `<button data-action="extra-slot" data-slot="weapon" class="${(game!.extraSlot ?? 'weapon') === 'weapon' ? 'active' : ''}">额外武器</button><button data-action="extra-slot" data-slot="armor" class="${game!.extraSlot === 'armor' ? 'active' : ''}">额外护甲</button>` : ''}<button data-action="talent-advanced-up" ${coins >= cost ? '' : 'disabled'}>升级 ${itemIcon('coin')}${cost}</button><button class="talent-undo" data-action="talent-advanced-undo">撤销 ${itemIcon('coin')}${refund}</button><button class="talent-undo" data-action="talent-advanced-reset">重置 ${itemIcon('coin')}${advancedTalentSpent(advLevel)}</button></span></article>`
    }
    const can = advId === 0 && coins >= ADVANCED_TALENT_COST
    const hint = advId !== 0 ? `请先重置当前高级天赋 · 激活后：${advancedEffectText(talent.id, 1)}` : `激活后：${advancedEffectText(talent.id, 1)}`
    return `<article class="talent-row"><span class="gear-glyph">${itemIcon('coin')}</span><span class="gear-copy"><b>${talent.name}</b><small>${hint}</small></span><span class="talent-actions"><button data-action="talent-advanced-select" data-id="${talent.id}" ${can ? '' : 'disabled'}>激活 ${itemIcon('coin')}${ADVANCED_TALENT_COST}</button></span></article>`
  }).join('')
  const canCraft = (game.talentFragments ?? 0) >= TALENT_FRAGMENTS_PER_COIN && (game.soul ?? 0) >= 500
  return `<div class="npc-currency"><span>${itemIcon('fragment')} 碎片 ${displayCurrency(game.talentFragments ?? 0)}</span><span>${itemIcon('coin')} 天赋币 ${displayCurrency(game.talentCoins ?? 0)}</span><span>${itemIcon('soul')} 灵魂 ${displayCurrency(game.soul ?? 0)}</span><span>${itemIcon('attribute')} 等级 ${displayNumber(game.level ?? 1)}</span></div><section class="talent-block"><h3>普通天赋 <small>可以全部激活，分别升级</small></h3>${normalRows}</section><section class="talent-block"><h3>高级天赋 <small>只能激活一个，可升级与重置</small></h3>${advancedRows}</section><div class="talent-footer"><button class="secondary" data-action="talent-craft" ${canCraft ? '' : 'disabled'}>${itemIcon('coin')} 合成天赋币（${displayCurrency(game.talentFragments ?? 0)} / ${TALENT_FRAGMENTS_PER_COIN} · 500 灵魂）</button><button class="secondary npc-back" data-action="npc-menu">返回商人</button></div><p class="bag-note">撤销或重置天赋会返还已投入的天赋币；每级普通天赋的升级费用依次为 1、2、3…，高级天赋升级费用依次为 3、5、7…。</p>`
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
  const pendingChest = Boolean(bossChest && !bossChest.opened)
  const nightmare = Boolean(bossVictory.nightmare)
  return `<div class="boss-victory-overlay"><div class="victory-rays"></div><div class="victory-flash"></div><div class="victory-particles">${particles}</div><div class="victory-copy"><small>— ${nightmare ? 'NIGHTMARE CLEARED' : 'BOSS DEFEATED'} —</small><h2>${nightmare ? '噩梦守关者已击败' : '守关者已击败'}</h2><p>${nightmare ? `噩梦副本 · ${stageNames[bossVictory.stage - 1]}` : `${stageNames[bossVictory.stage - 1]} · 第 ${String(bossVictory.stage).padStart(2, '0')} 章`}</p><ul class="victory-rewards">${rewardRows}</ul><button class="primary victory-continue" data-action="continue-victory">${pendingChest ? '前往宝箱　▶' : nightmare ? '返回小镇　▶' : bossVictory.ending ? '远征完成　▶' : '返回小镇　▶'}</button></div><div class="victory-timer"><i style="animation-duration:${bossVictory.time.toFixed(2)}s"></i></div></div>`
}
function lootRevealMarkup() {
  if (!lootReveal) return ''
  const rows = lootReveal.rewards.map((reward, index) => `<li style="animation-delay:${(.15 + index * .08).toFixed(2)}s">${reward}</li>`).join('')
  return `<div class="overlay loot-overlay"><small>LOOT · 守关者宝箱</small><h2>宝箱开启</h2><p>守关者的战利品已经收进背包。</p><ul class="victory-rewards loot-rewards">${rows}</ul><button class="primary" data-action="collect-loot">收下奖励　▶</button></div>`
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
// 商城入口已移到小镇合成台旁边，直接打开商城页面。
function openShopMenu() {
  if (!game || scene !== 'town' || !npcUnlocked()) return
  if (!game.shopIntroSeen) {
    startStory(shopIntroStoryData(), () => {
      if (!game) return
      game.shopIntroSeen = true
      save()
      resetPanels(); npcOpen = true; npcView = 'shop'; renderGame()
    })
    return
  }
  resetPanels(); npcOpen = true; npcView = 'shop'; renderGame()
}
function openLottery() {
  if (!game || scene !== 'town') return
  // 先收起功能菜单等弹窗，否则抽奖引导剧情会被更高层级的菜单挡住而卡住。
  resetPanels()
  if (!game.lotteryIntroSeen) {
    startStory(lotteryIntroStoryData(), () => {
      if (!game) return
      game.lotteryIntroSeen = true
      save()
      openLottery()
    })
    return
  }
  bagOpen = false; craftingOpen = false; attributesOpen = false; npcOpen = false; stageCircleOpen = false; gameMenuOpen = false; settingsOpen = false
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
  bagOpen = false; hornPickerOpen = false; craftingOpen = false; attributesOpen = false; npcOpen = false; secondNpcOpen = false; lotteryOpen = false; stageCircleOpen = false; gameMenuOpen = false; settingsOpen = false; creditsOpen = false; quitConfirmOpen = false; storyLogOpen = false; skillPanelOpen = false; listeningBind = null; forgeSlots = []; specialSlots = []
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
function grantShopItem(grant: ShopGrant) {
  if (!game) return
  if (grant.kind === 'gear') game.gear.unshift(makeGear(grant.gearType, grant.level))
  else if (grant.kind === 'fashion') game.gear.unshift(makeFashion(grant.tier))
  else if (grant.kind === 'gem') { game.gems ??= []; game.gems.push(makeGem(grant.gemKind, grant.tier)) }
  else if (grant.kind === 'material') addMaterial(grant.key, 1)
  else if (grant.kind === 'stone') addStone(grant.tier, 1)
  else if (grant.kind === 'punch') game.punchStones = (game.punchStones ?? 0) + grant.amount
  else if (grant.kind === 'fragments') game.talentFragments = (game.talentFragments ?? 0) + grant.amount
  else if (grant.kind === 'revive') game.reviveCoins = (game.reviveCoins ?? 0) + grant.amount
  else if (grant.kind === 'talentCoin') game.talentCoins = (game.talentCoins ?? 0) + grant.amount
  else if (grant.kind === 'soul') game.soul = (game.soul ?? 0) + grant.amount
  else if (grant.kind === 'lottery') game.lotteryChances = (game.lotteryChances ?? 0) + grant.amount
  else if (grant.kind === 'horn') game.horns = (game.horns ?? 0) + grant.amount
}
function buyShopItem(id: string) {
  if (!game || !npcUnlocked()) return
  const item = shopItems().find((entry) => entry.id === id)
  if (!item) return
  if (item.demoOnly && !DEMO_MODE) return
  // 体验版没有限购与冷却，只要灵魂足够即可购买所有道具。
  if (!DEMO_MODE) {
    if (item.unique && game.shopFashionBought) { toast('这件时装已经购买过。'); return }
    if (item.id === 'fragments1' && game.fragmentBuyDay === todayKey()) { toast('天赋币碎片每天只能购买一次，明天再来吧。'); return }
    if (item.id === 'revive1') {
      const left = 3 * 24 * 3600 * 1000 - (Date.now() - (game.reviveBuyAt ?? 0))
      if (left > 0) { toast(`复活币每 3 天限购一次，还需等待 ${cooldownText(left)}。`); return }
    }
    if (item.id === 'punch1') {
      const left = 7 * 24 * 3600 * 1000 - (Date.now() - (game.punchBuyAt ?? 0))
      if (left > 0) { toast(`打孔石每周限购一次，还需等待 ${cooldownText(left)}。`); return }
    }
    if (item.id === 'horn1') {
      const left = 30 * 24 * 3600 * 1000 - (Date.now() - (game.hornBuyAt ?? 0))
      if (left > 0) { toast(`号角每月限购一次，还需等待 ${cooldownText(left)}。`); return }
    }
  }
  const cost = DEMO_MODE ? 1 : item.cost
  if ((game.soul ?? 0) < cost) { toast('灵魂不足。'); return }
  game.soul = (game.soul ?? 0) - cost
  grantShopItem(item.grant)
  if (item.id === 'fragments1') game.fragmentBuyDay = todayKey()
  if (item.id === 'revive1') game.reviveBuyAt = Date.now()
  if (item.id === 'punch1') game.punchBuyAt = Date.now()
  if (item.id === 'horn1') game.hornBuyAt = Date.now()
  if (item.id === 'fashion1') game.shopFashionBought = true
  save(); npcOpen = true; npcView = 'shop'; renderGame(); toast(`已购买：${item.name}`)
}
function applyTalentVitals(before: { hp: number; mp: number }) {
  if (!game) return
  const after = stats()
  game.hp = Math.min(after.hp, game.hp + Math.max(0, after.hp - before.hp))
  game.mp = Math.min(after.mp, game.mp + Math.max(0, after.mp - before.mp))
}
function upgradeNormalTalent(id: number) {
  if (!game || !talentUnlocked()) return
  const levels = [...normalTalentLevels()]
  const level = levels[id - 1] ?? 0
  const cost = normalTalentUpgradeCost(level)
  if ((game.talentCoins ?? 0) < cost) { toast(`升级需要 ${cost} 个天赋币。`); return }
  const before = stats()
  game.talentCoins = (game.talentCoins ?? 0) - cost
  levels[id - 1] = level + 1
  game.normalTalentLevels = levels
  applyTalentVitals(before)
  save(); npcOpen = true; npcView = 'talent'; renderGame(); toast(`${NORMAL_TALENTS[id - 1].name} 已提升到 Lv.${level + 1}。`)
}
function undoNormalTalent(id: number) {
  if (!game || !talentUnlocked()) return
  const levels = [...normalTalentLevels()]
  const level = levels[id - 1] ?? 0
  if (level <= 0) return
  const refund = normalTalentRefund(level)
  const before = stats()
  levels[id - 1] = level - 1
  game.normalTalentLevels = levels
  game.talentCoins = (game.talentCoins ?? 0) + refund
  applyTalentVitals(before)
  save(); npcOpen = true; npcView = 'talent'; renderGame(); toast(`已撤销 ${NORMAL_TALENTS[id - 1].name}，返还 ${refund} 个天赋币。`)
}
function selectAdvancedTalent(id: number) {
  if (!game || !talentUnlocked() || game.advancedTalent === id) return
  if ((game.advancedTalent ?? 0) !== 0) { toast('高级天赋只能激活一个，请先重置当前高级天赋。'); return }
  if ((game.talentCoins ?? 0) < ADVANCED_TALENT_COST) { toast(`激活高级天赋需要 ${ADVANCED_TALENT_COST} 个天赋币。`); return }
  const before = stats()
  game.talentCoins = (game.talentCoins ?? 0) - ADVANCED_TALENT_COST
  game.advancedTalent = id
  game.advancedTalentLevel = 1
  applyTalentVitals(before)
  save(); npcOpen = true; npcView = 'talent'; renderGame(); toast('高级天赋已激活。')
}
function upgradeAdvancedTalent() {
  if (!game || !talentUnlocked() || !game.advancedTalent) return
  const level = advancedTalentLevel()
  if (level < 1) return
  const cost = advancedTalentUpgradeCost(level)
  if ((game.talentCoins ?? 0) < cost) { toast(`升级需要 ${cost} 个天赋币。`); return }
  const before = stats()
  game.talentCoins = (game.talentCoins ?? 0) - cost
  game.advancedTalentLevel = level + 1
  applyTalentVitals(before)
  save(); npcOpen = true; npcView = 'talent'; renderGame(); toast(`高级天赋已提升到 Lv.${level + 1}。`)
}
function undoAdvancedTalent() {
  if (!game || !game.advancedTalent) return
  const level = advancedTalentLevel()
  if (level <= 0) return
  const refund = advancedTalentRefund(level)
  const before = stats()
  game.talentCoins = (game.talentCoins ?? 0) + refund
  game.advancedTalentLevel = level - 1
  if (level - 1 <= 0) { game.advancedTalent = 0; game.advancedTalentLevel = 0 }
  applyTalentVitals(before)
  save(); npcOpen = true; npcView = 'talent'; renderGame(); toast(`已撤销一级高级天赋，返还 ${refund} 个天赋币。`)
}
function resetAdvancedTalent() {
  if (!game || !game.advancedTalent) return
  const level = advancedTalentLevel()
  const refund = advancedTalentSpent(level)
  const before = stats()
  game.talentCoins = (game.talentCoins ?? 0) + refund
  game.advancedTalent = 0
  game.advancedTalentLevel = 0
  applyTalentVitals(before)
  save(); npcOpen = true; npcView = 'talent'; renderGame(); toast(`已重置高级天赋，返还 ${refund} 个天赋币。`)
}
function craftTalentCoin() {
  if (!game || (game.talentFragments ?? 0) < TALENT_FRAGMENTS_PER_COIN) return
  if ((game.soul ?? 0) < 500) { toast('合成天赋币需要 500 灵魂。'); return }
  game.soul = (game.soul ?? 0) - 500
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
  if (game.rescuedXiaoman) list.push({ id: 'xiaoman', name: '小满', x: 280 })
  if (game.rescuedZhou) list.push({ id: 'zhou', name: '老周', x: 740 })
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
const SKILL_DESCRIPTIONS: Record<SkillSetKey, string[]> = {
  sword: [
    '向前挥出剑气，造成 150% 攻击伤害，并小幅击退命中的敌人。',
    '旋转斩击范围内全部敌人，造成 150% 攻击伤害。',
    '向当前方向突进 2.5 个身位，对路径上的敌人造成 100% 攻击伤害，并把非 Boss 敌人带到落点前方。',
    '蓄力后斩出巨型剑气，对范围内全部敌人造成 200% 攻击伤害。',
  ],
  bow: [
    '按住技能 1 蓄力，最长 2 秒，松开射出穿透箭；蓄力越久伤害越高，消耗 30 MP。普通攻击不再蓄力。',
    '向下方连续射出 6 支带追踪的箭雨，同时让角色腾空约 1.5 个身位；落地前不能再次使用，消耗 30 MP。',
    '在当前位置放置花炸弹，0.7 秒后爆炸，造成 150% 攻击伤害；施放后向上翻滚并向前突进 2.5 个身位，消耗 40 MP。',
    '向敌人上方丢出旋转的弓并锁定目标，连续向下射出 6 支满蓄力追踪箭，消耗 60 MP。',
  ],
  staff: [
    '攻击力 +10%、攻击速度 +10%，持续 7 秒；角色头顶会显示剩余时间。',
    '在固定前方距离生成双生火柱，造成 160% 攻击伤害，并把范围内的非 Boss 敌人拉向火柱中间。',
    '向当前方向瞬间移动 2.5 个身位，并在瞬移前与瞬移后的位置各向中点释放一道横向闪电，合计造成 100% 攻击伤害。',
    '禁锢目标 1 秒，并立刻打出 5 次带命中特效的普通攻击。',
  ],
  book: [
    '隐身 5 秒，身体完全透明，攻击力 +5%，敌人无法看到或攻击；命中敌人后隐身立即解除，消耗 30 MP。',
    '在身边召唤一个拥有本体 10% 生命的分身，持续 10 秒，复制移动、攻击和技能，造成本体 40% 的伤害；分身存在时施放技能额外消耗 50% 法力，消耗 20 MP。',
    '召唤一个实体分身向最近的怪物跑去，接触或超时后爆炸，造成 150% 攻击伤害；爆炸会眩晕周围敌人并吸引仇恨，消耗 10 MP。',
    '向目标方向掷出远程法球，命中或飞行结束时爆炸，对范围内敌人造成 200% 攻击伤害，消耗 50 MP。',
  ],
}
function hudMarkup() {
  if (!game) return ''
  const isTown = scene === 'town'
  const s = stats()
  const level = game.level ?? 1
  const exp = game.exp ?? 0
  const needed = xpToNext(level)
  const maxed = !Number.isFinite(needed)
  const areaName = tutorialMode ? '新手试炼场' : hiddenBattle ? '宿敌对决' : nightmareStage ? `噩梦副本 · ${stageNames[game.stage - 1]}` : stageNames[game.stage - 1]
  const location = isTown ? '营火集市' : areaName
  const sub = isTown ? '冒险者小镇' : tutorialMode ? 'NEW PLAYER' : hiddenBattle ? 'SECRET BATTLE' : nightmareStage ? 'NIGHTMARE' : `第 ${String(game.stage).padStart(2, '0')} 章`
  const count = isTown ? `开放至第 ${game.unlockedStage} 关` : hiddenBattle ? '宿敌对决 · 没有退路' : tutorialMode ? '完成训练目标' : foes.some((foe) => foe.boss) ? '守关者战斗' : `已击杀 ${game.kills} / ${MAX_SMALL_KILLS}`
  const boss = foes.find((foe) => foe.boss)
  const enemyName = isTown ? '' : bossVictory ? '守关者已击败' : tutorialMode ? '训练傀儡' : hiddenBattle ? '宿敌' : boss ? foeLabel(boss) : `${foes.length} 名敌人`
  const hornBuff = !isTown && game.hornBuff && hornBuffRemaining() > 0 ? game.hornBuff : null
  return `<div class="hud">
    <section class="hud-player">
      <div class="hud-portrait-col">
        <div class="hud-portrait"><canvas id="hud-portrait" width="192" height="192" aria-label="角色头像"></canvas></div>
        ${hornBuff ? `<div class="hud-horn-buff" id="hud-horn-buff" title="号角增益">${itemIcon('horn')}<b>${HORN_BUFFS[hornBuff].name}</b><small id="hud-horn-time">${formatHornTime(hornBuffRemaining())}</small></div>` : ''}
      </div>
      <div class="hud-player-info">
        <div class="hud-name"><b id="hud-level">Lv.${level}</b><span>${maxed ? 'MAX' : `${displayNumber(exp)} / ${displayNumber(needed)} EXP`}</span></div>
        <div class="hud-bar hp"><i id="hud-hp-fill" style="width:${Math.max(0, Math.min(100, game.hp / s.hp * 100))}%"></i><span id="hud-hp-text">${displayNumber(game.hp)} / ${displayNumber(s.hp)}</span></div>
        <div class="hud-bar mp"><i id="hud-mp-fill" style="width:${Math.max(0, Math.min(100, game.mp / s.mp * 100))}%"></i><span id="hud-mp-text">${displayNumber(game.mp)} / ${displayNumber(s.mp)}</span></div>
        <div class="hud-bar xp"><i id="hud-xp-fill" style="width:${maxed ? 100 : Math.min(100, exp / needed * 100)}%"></i><span id="hud-xp-label">${maxed ? '经验 MAX' : `经验 ${displayNumber(exp)} / ${displayNumber(needed)}`}</span></div>
      </div>
    </section>
    <section class="hud-center">
      ${isTown ? '' : `<div class="hud-battle-time"><span>战斗用时</span><b id="hud-battle-time">${formatBattleTime(battleTime)}</b></div>`}
      <small>${sub}</small>
      <h1>${location}</h1>
      <p id="hud-kills">${count}</p>
      <div class="hud-enemy ${foes.some((foe) => foe.boss) ? 'boss' : ''}" id="hud-enemy" style="display:${isTown ? 'none' : 'grid'}">
        <span id="hud-enemy-name">${enemyName}</span>
        <div><i id="hud-foe-fill" style="width:${boss ? Math.max(0, boss.hp / boss.maxHp * 100) : 100}%"></i></div>
      </div>
    </section>
    ${isTown ? '' : '<div class="combo-display" id="combo-display" style="display:none"><small>连击</small><b id="combo-count">0</b><span id="combo-buff"></span></div>'}
    <section class="hud-tools">
      <div class="hud-currency"><span>${itemIcon('soul')} <b id="hud-soul">${displayCurrency(game.soul ?? 0)}</b></span></div>
      <div class="hud-buttons">
        ${scene === 'battle' && !bossVictory ? `<button data-action="pause" title="暂停或继续">${paused ? '▶' : 'Ⅱ'}</button>` : ''}
        <button data-action="toggle-audio" title="音效与音乐开关">${audioEnabled() ? '♪' : '×'}</button>
        <button data-action="open-game-menu" title="功能菜单">☰ 功能</button>
        <button data-action="open-settings" title="设置">⚙ 设置</button>
      </div>
    </section>
    <div class="hud-fabs">
      <button class="hud-bag" data-action="bag" title="打开背包">${itemIcon('bag')}<b>背包</b><span id="hud-bag-count">${game.gear.length}</span></button>
      <button class="hud-bag hud-skill" data-action="open-skill-panel" title="查看技能">${itemIcon('attribute')}<b>技能</b></button>
      ${scene === 'town' && npcUnlocked() ? `<button class="hud-bag hud-shop" data-action="open-shop" title="打开商城">${itemIcon('soul')}<b>商城</b></button>` : ''}
      ${scene === 'town' && forgeUnlocked() ? `<button class="hud-forge" data-action="open-crafting" title="打开合成台">⚒<b>合成台</b></button>` : ''}
    </div>
  </div>`
}
function gameMenuMarkup() {
  if (!game || !gameMenuOpen) return ''
  const isTown = scene === 'town'
  const items: Array<{ action: string; icon: string; title: string; desc: string; disabled?: boolean }> = [
    { action: 'open-story-log', icon: '❖', title: '剧情', desc: `第 ${game.stage} 关 · ${stageNames[Math.min(9, Math.max(0, game.stage - 1))]}` },
    { action: 'open-credits', icon: '✎', title: '制作人', desc: '查看游戏制作人员' },
  ]
  if (isTown) {
    items.push(
      { action: 'open-attributes', icon: itemIcon('attribute'), title: '属性分配', desc: `${game.attributePoints ?? 0} 点可用属性点` },
      { action: 'open-lottery', icon: itemIcon('ticket'), title: '抽奖', desc: `${game.lotteryChances ?? 0} 次抽奖机会`, disabled: (game.lotteryChances ?? 0) <= 0 },
    )
    // 集齐 10 枚王印印章后才显示隐藏关卡入口。
    if (hiddenUnlocked()) items.push({ action: 'open-hidden', icon: '◈', title: '隐藏关卡', desc: '挑战宿敌' })
  }
  return `<div class="bag-scrim game-menu-scrim"><section class="bag-dialog game-menu-dialog"><header><div><small>MENU · ${isTown ? '冒险者小镇' : '远征中'}</small><h2>功能菜单</h2></div><button data-action="close-game-menu" aria-label="关闭菜单">×</button></header><div class="game-menu-grid">${items.map((item) => `<button class="game-menu-item" data-action="${item.action}" ${item.disabled ? 'disabled' : ''}><b>${item.icon}</b><span><strong>${item.title}</strong><small>${item.desc}</small></span><i>→</i></button>`).join('')}</div></section></div>`
}
function performQuitGame() {
  if (game) save()
  quitConfirmOpen = false
  gameClosed = true
  resetPanels()
  try { window.open('', '_self'); window.close() } catch { /* 浏览器可能禁止关闭标签页 */ }
  window.setTimeout(() => {
    // 浏览器阻止 window.close() 时，至少把整个游戏界面替换掉。
    document.body.innerHTML = '<main class="quit-screen"><section><small>GAME CLOSED</small><h1>游戏已关闭</h1><p>进度已保存，可以安全关闭此标签页。</p></section></main>'
  }, 220)
}
function quitConfirmMarkup() {
  if (!quitConfirmOpen) return ''
  return `<div class="bag-scrim quit-scrim"><section class="bag-dialog quit-dialog"><header><div><small>EXIT · 退出游戏</small><h2>是否关闭游戏界面？</h2></div><button data-action="cancel-quit" aria-label="取消退出">×</button></header><p>退出后会关闭整个游戏界面。当前进度会自动保存，下次打开游戏可以继续。</p><div class="quit-actions"><button class="secondary" data-action="cancel-quit">取消</button><button class="primary" data-action="confirm-quit">退出并关闭</button></div></section></div>`
}
function creditsMarkup() {
  if (!creditsOpen) return ''
  return `<div class="bag-scrim credits-scrim"><section class="bag-dialog credits-dialog"><header><div><small>CREDITS · 制作人员</small><h2>制作人</h2></div><button data-action="close-credits" aria-label="关闭制作人信息">×</button></header><div class="credits-body"><small>PRODUCER</small><h3>制作人：郑浩南</h3><p>感谢每一位踏上元素远征的冒险者。</p></div><button class="primary credits-confirm" data-action="close-credits">确定</button></section></div>`
}
// 在剧情回顾中查看过的章节视为已读，之后挑战该关卡不再自动播放剧情。
function markStoryRead(stage: number) {
  if (!game) return
  const data = stageStoryData(stage)
  if (!data) return
  game.seenStories ??= []
  if (!game.seenStories.includes(data.id)) {
    game.seenStories.push(data.id)
    save()
  }
}
function storyLogMarkup() {
  if (!game || !storyLogOpen) return ''
  const maxStage = Math.max(1, Math.min(10, game.unlockedStage))
  const current = Math.max(1, Math.min(maxStage, storyLogStage))
  const data = stageStoryData(current)
  const read = data ? seenStory(data.id) : false
  const rows = Array.from({ length: maxStage }, (_, index) => index + 1).map((stage) => {
    const info = stageStoryData(stage)
    const isRead = Boolean(info && seenStory(info.id))
    const isCurrent = stage === game!.stage
    return `<button class="story-log-row ${stage === current ? 'active' : ''}" data-action="story-log-stage" data-stage="${stage}"><span><b>第 ${String(stage).padStart(2, '0')} 关</b><small>${stageNames[stage - 1]}</small></span><i>${isCurrent ? '当前' : isRead ? '已读' : '未读'}</i></button>`
  }).join('')
  const lines = data
    ? data.lines.map((line) => `<article class="story-log-line"><b>${escapeHtml(line.speaker)}</b><p>${escapeHtml(line.text)}</p></article>`).join('')
    : '<p class="bag-note">该章节暂无剧情。</p>'
  return `<div class="bag-scrim story-log-scrim"><section class="bag-dialog story-log-dialog"><header><div><small>STORY ARCHIVE · ${read ? '已读剧情' : '当前剧情'}</small><h2>${escapeHtml(data?.title ?? '剧情回顾')}</h2></div><button data-action="close-story-log" aria-label="关闭剧情">×</button></header><div class="story-log-body"><aside class="story-log-list">${rows}</aside><section class="story-log-content"><p class="story-log-note">在剧情回顾中查看后，该章节将标记为已读；再次挑战不会自动进入剧情。</p>${lines}</section></div></section></div>`
}
function settingsMarkup() {
  if (!game || !settingsOpen) return ''
  const rows = BIND_ACTIONS.map((action) => `<button class="bind-row ${listeningBind === action ? 'listening' : ''}" data-action="bind-key" data-bind="${action}" type="button"><span>${BIND_LABELS[action]}</span><b>${listeningBind === action ? '按下新按键…' : keyLabel(keyBinds[action])}</b><i>改键</i></button>`).join('')
  return `<div class="bag-scrim settings-scrim"><section class="bag-dialog settings-dialog"><header><div><small>SETTINGS · 成王之路</small><h2>设置</h2></div><button data-action="close-settings" aria-label="关闭设置">×</button></header>
    <section class="settings-block"><h3>游戏</h3><div class="settings-grid">
      <button data-action="settings-town"><b>⌂</b><span><strong>返回小镇</strong><small>保存进度并回到安全区</small></span></button>
      <button data-action="settings-role-select"><b>◈</b><span><strong>角色选择</strong><small>返回存档与职业选择页</small></span></button>
      <button data-action="quit-game"><b>⏻</b><span><strong>退出游戏</strong><small>结束当前远征并返回标题</small></span></button>
      <button data-action="settings-audio"><b>${audioEnabled() ? '♪' : '×'}</b><span><strong>音效与音乐</strong><small>当前：${audioEnabled() ? '开启' : '关闭'}</small></span></button>
    </div></section>
    <section class="settings-block"><h3>按键设置 <small>点击任意一项后按下新按键</small></h3><div class="bind-list">${rows}</div>
      <div class="settings-footer"><button data-action="reset-binds">恢复默认按键</button><span>固定按键：方向键左右移动 · S 拾取/对话 · L 护盾 · P 暂停</span></div>
    </section></section></div>`
}
function skillBagMarkup() {
  if (!game) return ''
  const set = activeSkillSet()
  return `<div class="skill-bag">${SKILL_LABELS[set].map((name, index) => {
    const level = skillLevel(index, set)
    const max = skillMaxLevel(index)
    const cost = skillUpgradeCost(level)
    const required = skillRequiredLevel(index, level)
    const canUpgrade = level < max
    const hasSoul = (game!.soul ?? 0) >= cost
    const button = canUpgrade
      ? hasSoul
        ? `<button class="skill-upgrade" type="button" data-action="skill-upgrade" data-index="${index}">升级 · ${itemIcon('soul')}${cost}</button>`
        : `<button class="skill-upgrade" type="button" disabled>灵魂不足 · ${cost}</button>`
      : `<button class="skill-upgrade" type="button" disabled>角色 Lv.${required} 解锁</button>`
    return `<article class="skill-card"><header><b>${index + 1}</b><strong>${name}</strong><small>Lv.${level} · ${keyLabel(keyBinds[`skill${index + 1}` as BindAction])}</small></header><p>${SKILL_DESCRIPTIONS[set][index]}</p><footer><span>${skillSummary(index, set)}</span><small class="skill-next">下一级：伤害/效果 +${index === 3 ? 20 : 10}% · 蓝耗 +10</small>${button}</footer></article>`
  }).join('')}<p class="bag-note">角色等级 Lv.${game.level ?? 1} · 灵魂 ${displayCurrency(game.soul ?? 0)}。技能组由装备的武器决定；技能 1/2/3/4 分别在角色 2/3/4/5 级解锁升级，之后每 4 级可以再升一级。升级消耗 500、1000、1500… 灵魂。</p></div>`
}
const SKILL_SET_NAMES: Record<SkillSetKey, string> = { sword: '剑术技能', bow: '弓术技能', staff: '法杖技能', book: '魔典技能' }
function skillPanelMarkup() {
  if (!game || !skillPanelOpen) return ''
  const set = activeSkillSet()
  return `<div class="bag-scrim skill-panel-scrim"><section class="bag-dialog skill-panel-dialog"><header><div><small>SKILLS · 技能</small><h2>${SKILL_SET_NAMES[set]}</h2></div><button data-action="close-skill-panel" aria-label="关闭技能面板">×</button></header>${skillBagMarkup()}</section></div>`
}
function upgradeSkill(index: number) {
  if (!game || index < 0 || index > 3) return
  const set = activeSkillSet()
  const level = skillLevel(index, set)
  if (level >= skillMaxLevel(index)) {
    toast(`角色达到 ${skillRequiredLevel(index, level)} 级后才能继续升级技能 ${index + 1}。`)
    return
  }
  const cost = skillUpgradeCost(level)
  if ((game.soul ?? 0) < cost) { toast(`升级技能需要 ${cost} 灵魂。`); return }
  game.soul = (game.soul ?? 0) - cost
  game.skillLevels ??= {}
  game.skillLevels[`${set}:${index}`] = level + 1
  save(); skillPanelOpen = true; renderGame()
  toast(`技能 ${index + 1} 升级到 Lv.${level + 1}，伤害/效果提升，蓝耗 +10。`)
}
function paintHudPortrait() {
  const canvas = document.querySelector<HTMLCanvasElement>('#hud-portrait')
  if (!canvas || !game) return
  const context = canvas.getContext('2d')
  if (!context) return
  const width = canvas.width
  const height = canvas.height
  context.clearRect(0, 0, width, height)
  context.save()
  context.beginPath(); context.arc(width / 2, height / 2, width / 2 - 2, 0, Math.PI * 2); context.clip()
  const bg = context.createLinearGradient(0, 0, 0, height)
  bg.addColorStop(0, game.role === 'warrior' ? '#2d4540' : '#26314a'); bg.addColorStop(1, '#0d1717')
  context.fillStyle = bg; context.fillRect(0, 0, width, height)
  context.translate(width / 2, height * 2.2)
  context.scale(width / 48, width / 48)
  if (game.role === 'warrior') drawWarriorHero(context, performance.now(), 0)
  else drawMageHero(context, performance.now(), 0)
  context.restore()
  context.save()
  context.strokeStyle = game.role === 'warrior' ? '#d9b96f' : '#9fe8ff'
  context.lineWidth = 6
  context.beginPath(); context.arc(width / 2, height / 2, width / 2 - 3, 0, Math.PI * 2); context.stroke()
  context.restore()
}
function paintBagPreview() {
  const canvas = document.querySelector<HTMLCanvasElement>('#bag-portrait')
  if (!canvas || !game) return
  const context = canvas.getContext('2d')
  if (!context) return
  const width = canvas.width
  const height = canvas.height
  context.clearRect(0, 0, width, height)
  const bg = context.createLinearGradient(0, 0, 0, height)
  bg.addColorStop(0, game.role === 'warrior' ? '#1d3230' : '#1a2438')
  bg.addColorStop(1, '#0a1313')
  context.fillStyle = bg; context.fillRect(0, 0, width, height)
  context.strokeStyle = 'rgba(201, 178, 115, .18)'; context.lineWidth = 2
  context.beginPath(); context.arc(width / 2, height * 0.56, Math.min(width, height) * 0.4, 0, Math.PI * 2); context.stroke()
  context.fillStyle = 'rgba(0, 0, 0, .38)'
  context.beginPath(); context.ellipse(width / 2, height * 0.93, 88, 15, 0, 0, Math.PI * 2); context.fill()
  context.save()
  context.translate(width / 2, height * 0.93)
  context.scale(3, 3)
  if (game.role === 'warrior') drawWarriorHero(context, performance.now(), 0)
  else drawMageHero(context, performance.now(), 0)
  context.restore()
  context.strokeStyle = game.role === 'warrior' ? 'rgba(255, 210, 122, .38)' : 'rgba(159, 232, 255, .38)'
  context.lineWidth = 2
  context.beginPath(); context.ellipse(width / 2, height * 0.93, 104, 17, 0, 0, Math.PI * 2); context.stroke()
}
function renderGame() {
  if (!game) return renderTitle()
  const s = stats()
  const isTown = scene === 'town'
  const canControl = (scene === 'battle' || scene === 'town') && !paused && !bossVictory && !lootReveal
  if (isTown) { heroX = Math.max(TOWN_LEFT, Math.min(TOWN_RIGHT, heroX)); cameraX = 0 }
  const boss = foes.some((foe) => foe.boss)
  setMusicMode(isTown ? 'town' : boss ? 'boss' : 'battle', isTown ? 0 : Math.max(0, Math.min(9, game.stage - 1)))
  const areaName = tutorialMode ? '新手试炼场' : hiddenBattle ? '隐藏关卡 · 挑战宿敌' : nightmareStage ? `噩梦副本 · ${stageNames[game.stage - 1]}` : stageNames[game.stage - 1]
  const bossLabel = tutorialMode ? '训练傀儡' : hiddenBattle ? '宿敌' : nightmareStage ? '噩梦守关者' : '守关者'
  const chapterLabel = tutorialMode ? 'NEW PLAYER' : hiddenBattle ? 'SECRET BATTLE' : nightmareStage ? 'NIGHTMARE' : `第 ${String(game.stage).padStart(2, '0')} 章`
  const countText = tutorialMode ? '训练' : hiddenBattle ? '宿敌' : nightmareStage ? '噩梦' : boss ? bossLabel : `${game.kills} / ${MAX_SMALL_KILLS}`
  const townOverlay = ''
  const deathOverlay = scene === 'defeat' ? `<div class="overlay death-overlay"><small>EXPEDITION PAUSED</small><h2>你倒在了遗迹深处</h2><p>继续战斗会以半血复活并保留当前进度；复活币可以满状态复活，每个关卡限用一次；重新开始会恢复满状态并从本关第一波重新挑战；回到小镇会恢复满状态。</p><div class="death-actions">${(game.reviveCoins ?? 0) > 0 && !game.reviveUsed ? `<button data-action="revive-coin" class="revive-button">${itemIcon('revive')} 使用复活币（满状态） · ${game.reviveCoins}</button>` : ''}<button data-action="respawn-fight" class="primary">继续战斗（半血）</button><button data-action="restart-stage" class="secondary">重新开始（满状态）</button><button data-action="respawn-town" class="secondary">回到小镇</button></div></div>` : ''
  const endingOverlay = scene === 'ending' ? '<div class="overlay"><small>THE FRONTIER IS YOURS</small><h2>十片遗迹，皆已沉寂</h2><p>你完成了元素远征。</p><button data-action="town" class="primary">返回小镇　↗</button></div>' : ''
  app.innerHTML = `<main class="game-shell ${isTown ? 'town-mode' : ''}"><header class="game-header"><a data-action="town" class="wordmark"><b>A</b> 成王之路 <i>／</i> ${isTown ? '冒险者小镇' : '元素远征'}</a>${DEMO_MODE ? '<span class="demo-badge">体验版 · 全关卡</span>' : ''}<span class="save-state"><i></i>${isTown ? '小镇安全区' : '进度已自动保存'}</span><span class="soul-badge" title="灵魂">${itemIcon('soul')} ${displayNumber(game.soul ?? 0)}</span><button class="bag-button" data-action="bag">${itemIcon('bag')} 背包 <span>${game.gear.length}</span></button><button class="save-button" data-action="save" title="保存进度">▣</button></header><section class="overview"><div><small>${isTown ? '冒险者小镇' : chapterLabel}</small><h1>${isTown ? '营火集市' : areaName}</h1><p>${isTown ? '缓冲区 · 整备装备与选择关卡' : tutorialMode ? '新手试炼 · 完成引导目标' : hiddenBattle ? '宿敌对决 · 没有退路' : `遗迹入口 · 击败 ${MAX_SMALL_KILLS} 只守卫后迎战 Boss`}</p></div><div class="metrics"><div><small>职业</small><b>${roleLabels[game.role]}</b></div><div><small>已击杀</small><b>${isTown ? `开放至第 ${game.unlockedStage} 关` : countText}</b></div><div><small>当前装备</small><b>${item()?.name ?? '无'}</b></div></div></section><section class="game-grid"><div class="battle-column"><div class="arena-label"><span>◆ ${isTown ? '冒险者小镇 · 补给站' : `${areaName} · 深层区域`}</span><b id="enemy-name">${isTown ? '安全区域' : tutorialMode ? '训练傀儡正在等待' : hiddenBattle ? '宿敌正在等待' : boss ? `${bossLabel}冲刺准备中` : `${foes.length} 只守卫正在逼近`}</b></div><div class="arena-stage"><div class="arena"><canvas id="arena" aria-label="横版战斗场景"></canvas><div class="coords"><span>${isTown ? 'TOWN · SAFE ZONE' : tutorialMode ? 'NEW PLAYER · TRAINING' : hiddenBattle ? 'SECRET · RIVAL' : `遗迹远征 · ${String(game.stage).padStart(2, '0')}`}</span><span>${boss ? 'BOSS ENCOUNTER' : isTown ? 'REST & PREPARE' : 'WAVE ENCOUNTER'}</span></div>${townOverlay}${deathOverlay}${endingOverlay}${bossVictoryMarkup()}${lootRevealMarkup()}${tutorialHintMarkup()}<div class="mobile-control-deck"><div class="mobile-rail mobile-move-rail"><div class="mobile-joystick" data-joystick ${canControl ? '' : 'data-disabled="true"'} aria-label="移动摇杆"><span class="joystick-knob"></span></div></div><div class="mobile-rail mobile-action-rail"><div class="mobile-skills">${[2, 3, 0, 1].map((index) => `<button class="mobile-skill" data-action="skill" data-index="${index}" aria-label="技能 ${index + 1}" ${canControl ? '' : 'disabled'}>${index + 1}</button>`).join('')}</div><div class="mobile-utils"><button class="mobile-skill mobile-pickup" data-action="pickup" aria-label="拾取" title="拾取药水 / 与商人对话" ${canControl ? '' : 'disabled'}>S</button><button class="mobile-skill mobile-shield" data-shield aria-label="护盾" title="按住生成护盾" ${canControl ? '' : 'disabled'}>L</button></div><button class="mobile-pad attack-pad" data-action="attack" aria-label="攻击" title="攻击" ${canControl ? '' : 'disabled'}>⚔</button><button class="mobile-pad jump-pad" data-action="jump" aria-label="跳跃" title="跳跃" ${canControl ? '' : 'disabled'}>↟</button></div></div></div></div><div class="foe-health"><div><span>${isTown ? '冒险者状态' : boss ? bossLabel : '本批守卫'}</span><b id="foe-hp">${isTown ? '安全休整' : boss ? `${Math.ceil(foes[0]?.hp ?? 0)} / ${foes[0]?.maxHp ?? 0}` : `${foes.length} 名敌人 · 已击败 ${game.kills} / ${MAX_SMALL_KILLS}`}</b></div><div><i id="foe-fill" style="width:${boss ? `${Math.max(0, foes[0].hp / foes[0].maxHp * 100)}%` : '100%'}"></i></div></div><div class="combat-bar"><button data-action="attack" class="attack" ${canControl ? '' : 'disabled'}><b>${game.role === 'warrior' ? '⚔' : '✦'}</b><span><strong>${game.role === 'warrior' ? '剑刃斩击' : '法杖射击'}</strong><small>J · ${game.role === 'warrior' ? '近战' : '远程'}</small></span></button><button data-action="jump" ${canControl ? '' : 'disabled'}><b>↟</b><span><strong>跳跃</strong><small>K ×2</small></span></button>${SKILL_LABELS[activeSkillSet()].map((label, i) => `<button data-action="skill" data-index="${i}" ${canControl ? '' : 'disabled'}><i>${i + 1}</i><span><strong>${label}</strong><small>${skillSummary(i)}</small></span></button>`).join('')}</div><div class="combat-log"><b>✦</b><span>${logText}</span></div></div><aside class="side-column">${isTown ? townPanelMarkup() : ''}<section class="panel status-panel"><header><span>角色状态</span><small>${String(game.stage).padStart(2, '0')}</small></header><div class="hero-card"><b class="avatar ${game.role}">${game.role === 'warrior' ? '刃' : '✦'}</b><span><strong>${roleLabels[game.role]}</strong><small>${game.role === 'warrior' ? '钢铁誓约 · 剑士' : '星辉学派 · 法杖'}</small></span></div><div class="resource-label"><span>生命</span><b id="hp-text">${displayNumber(game.hp)} <i>/ ${displayNumber(s.hp)}</i></b><em>♥</em></div><div class="resource"><i id="hp-fill" style="width:${game.hp / s.hp * 100}%"></i></div><div class="resource-label mana-label"><span>法力</span><b id="mp-text">${displayNumber(game.mp)} <i>/ ${displayNumber(s.mp)}</i></b><em>✦</em></div><div class="resource"><i id="mp-fill" style="width:${game.mp / s.mp * 100}%"></i></div><div class="stats"><div><small>攻击</small><b>${displayNumber(s.attack)}</b></div><div><small>防御</small><b>${displayNumber(s.defense)}</b></div><div><small>增益</small><b id="buff-stat">${buffTime > 0 ? `${buffTime.toFixed(1)}s` : '—'}</b></div></div></section><section class="panel gear-panel"><header><span>装备栏</span><small>${item()?.name ?? '未装备'}</small></header><div class="gear-summary">${item() ? `生命 +${item()!.hp}　攻击 +${item()!.attack}　防御 +${item()!.defense}` : '装备不会自动穿戴，请在小镇打开背包手动更换。'}</div><button class="open-bag" data-action="bag">打开背包　↗</button><div class="camp-hint">⌂　${isTown ? '安全区内可自由更换装备' : '击败 Boss 后回到小镇整备'}</div></section></aside></section><footer class="game-footer"><span>WASD / ← → 移动　·　J 攻击　·　K 跳跃 / 二段跳　·　1–4 技能　·　L 护盾</span><b>LOCAL SAVE　●</b></footer>${bagOpen ? bagMarkup() : ''}</main>`
  if (craftingOpen && isTown) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', craftingMarkup())
  if (attributesOpen && isTown) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', attributeMarkup())
  document.querySelector('.arena')?.insertAdjacentHTML('beforeend', hudMarkup())
  if (npcOpen) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', npcMarkup())
  if (secondNpcOpen) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', secondNpcMarkup())
  if (stageCircleOpen) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', stageCircleMarkup())
  if (lotteryOpen) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', lotteryMarkup())
  if (gameMenuOpen) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', gameMenuMarkup())
  if (settingsOpen) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', settingsMarkup())
  if (quitConfirmOpen) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', quitConfirmMarkup())
  if (creditsOpen) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', creditsMarkup())
  if (storyLogOpen) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', storyLogMarkup())
  if (skillPanelOpen) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', skillPanelMarkup())
  if (hornPickerOpen) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', hornPickerMarkup())
  if (storyState) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', storyMarkup())
  // 号角全屏动画放在最上层，持续 2 秒后由定时器移除。
  const hornAnimation = hornAnimationMarkup()
  if (hornAnimation) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', hornAnimation)
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
    if (detail) detail.textContent = `${skillSummary(index)} · ${index + 1}`
  })
  if (paused) document.querySelector<HTMLButtonElement>('.combat-bar button[data-action="attack"]')!.disabled = true
  if (paused) document.querySelector<HTMLButtonElement>('.combat-bar button[data-action="jump"]')!.disabled = true
  const controls = document.querySelector<HTMLElement>('.game-footer span')
  if (controls) controls.textContent = 'WASD / ← → 移动　·　J 攻击　·　K 跳跃 / 二段跳　·　1–4 技能　·　L 按住护盾（防御 ×10，耗蓝 3/秒）　·　S 拾取药水　·　P 暂停'
  setupCanvas()
  paintHudPortrait()
  if (bagOpen) paintBagPreview()
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
  return `${((viewOffsetY + world.floor - offset) / viewHeight) * 100}%`
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
  const offWeapon = dualWieldUnlocked() ? game.gear.find((gear) => gear.id === game?.weapon2Id) : undefined
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
  setWidth('#hud-hp-fill', game.hp / s.hp * 100); setWidth('#hud-mp-fill', game.mp / s.mp * 100)
  setWidth('#hud-xp-fill', maxed ? 100 : exp / needed * 100)
  const hudXpLabel = document.querySelector<HTMLElement>('#hud-xp-label')
  if (hudXpLabel) hudXpLabel.textContent = maxed ? '经验 MAX' : `经验 ${displayNumber(exp)} / ${displayNumber(needed)}`
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
  // 沉浸式 HUD
  const hudHpText = document.querySelector<HTMLElement>('#hud-hp-text'); if (hudHpText) hudHpText.textContent = `${displayNumber(game.hp)} / ${displayNumber(s.hp)}`
  const hudMpText = document.querySelector<HTMLElement>('#hud-mp-text'); if (hudMpText) hudMpText.textContent = `${displayNumber(game.mp)} / ${displayNumber(s.mp)}`
  const hudBattleTime = document.querySelector<HTMLElement>('#hud-battle-time'); if (hudBattleTime) hudBattleTime.textContent = formatBattleTime(battleTime)
  const hudLevel = document.querySelector<HTMLElement>('#hud-level'); if (hudLevel) hudLevel.textContent = `Lv.${level}`
  const hudSoul = document.querySelector<HTMLElement>('#hud-soul'); if (hudSoul) hudSoul.textContent = displayCurrency(game.soul ?? 0)
  const hudBagCount = document.querySelector<HTMLElement>('#hud-bag-count'); if (hudBagCount) hudBagCount.textContent = String(game.gear.length)
  // 号角增益：战斗中实时刷新剩余时间，到期后隐藏图标。
  const hudHornTime = document.querySelector<HTMLElement>('#hud-horn-time')
  if (hudHornTime) {
    const left = hornBuffRemaining()
    hudHornTime.textContent = formatHornTime(left)
    const box = document.querySelector<HTMLElement>('#hud-horn-buff')
    if (box) box.style.display = left > 0 ? '' : 'none'
  }
  const hudKills = document.querySelector<HTMLElement>('#hud-kills')
  if (hudKills) hudKills.textContent = scene === 'town' ? `开放至第 ${game.unlockedStage} 关` : hiddenBattle ? '宿敌对决 · 没有退路' : nightmareStage ? '噩梦守关者战斗' : tutorialMode ? '完成训练目标' : bossChest && !bossChest.opened && !bossVictory ? '守关者宝箱已出现 · 靠近按 S 开启' : foes.some((foe) => foe.boss) ? '守关者战斗' : `已击杀 ${game.kills} / ${MAX_SMALL_KILLS}`
  const hudEnemy = document.querySelector<HTMLElement>('#hud-enemy')
  if (hudEnemy) {
    hudEnemy.style.display = scene === 'town' || (bossChest && !bossChest.opened && !bossVictory) ? 'none' : 'grid'
    hudEnemy.classList.toggle('boss', scene !== 'town' && foes.some((foe) => foe.boss))
  }
  const hudEnemyName = document.querySelector<HTMLElement>('#hud-enemy-name')
  if (hudEnemyName && scene !== 'town') {
    const bossFoe = foes.find((foe) => foe.boss)
    hudEnemyName.textContent = bossVictory ? '守关者已击败' : nightmareStage ? '噩梦守关者' : tutorialMode ? '训练傀儡' : hiddenBattle ? '宿敌' : bossFoe ? foeLabel(bossFoe) : `${foes.length} 名敌人`
  }
  const hudFoeFill = document.querySelector<HTMLElement>('#hud-foe-fill')
  if (hudFoeFill && scene !== 'town') {
    const bossFoe = foes.find((foe) => foe.boss)
    hudFoeFill.style.width = `${bossFoe ? Math.max(0, Math.min(100, bossFoe.hp / bossFoe.maxHp * 100)) : 100}%`
  }
  syncComboHud()
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
function skillLevel(index: number, set: SkillSetKey = activeSkillSet()) {
  return Math.max(1, Math.floor(Number(game?.skillLevels?.[`${set}:${index}`] ?? 1)))
}
function skillMaxLevel(index: number) {
  const level = game?.level ?? 1
  const unlockLevel = 2 + index
  return level >= unlockLevel ? 2 + Math.floor((level - unlockLevel) / 4) : 1
}
function skillRequiredLevel(index: number, currentLevel: number) {
  return 2 + index + 4 * (currentLevel - 1)
}
function skillUpgradeCost(currentLevel: number) { return 500 * currentLevel }
function skillDamageBonus(index: number, set: SkillSetKey = activeSkillSet()) {
  return (index === 3 ? .2 : .1) * (skillLevel(index, set) - 1)
}
function skillCostFor(index: number, set: SkillSetKey = activeSkillSet()) {
  return SKILL_COSTS[set][index] + 10 * (skillLevel(index, set) - 1)
}
function skillPower(index: number, set: SkillSetKey = activeSkillSet()) {
  const multiplier = SKILL_MULTIPLIERS[set][index] + skillDamageBonus(index, set)
  const advLevel = advancedTalentLevel()
  const talentMultiplier = game?.advancedTalent === 1 && advLevel ? 1 + advancedSkillDamagePct(advLevel) : 1
  return Math.round(stats().attack * multiplier * talentMultiplier)
}
function mirrorDamageRatio() {
  return .4 + .1 * (skillLevel(1, 'book') - 1)
}
function skillSummary(index: number, set: SkillSetKey = activeSkillSet()) {
  const cost = skillCostFor(index, set)
  const level = skillLevel(index, set)
  const pct = Math.round((SKILL_MULTIPLIERS[set][index] + skillDamageBonus(index, set)) * 100)
  if (set === 'sword') return `${pct}% 攻击 · ${cost} MP`
  if (set === 'staff' && index === 0) return `攻击 +${10 * level}% · 7s · ${cost} MP`
  if (set === 'staff' && index === 1) return `双生火柱 ${pct}% · ${cost} MP`
  if (set === 'staff' && index === 2) return `瞬移闪电 ${pct}% · ${cost} MP`
  if (set === 'staff' && index === 3) return `眩晕 1s · 5 连击 ×${100 + 20 * (level - 1)}% · ${cost} MP`
  if (set === 'bow' && index === 0) return `蓄力穿透箭 · 最长 2s · 蓄力伤害 +${10 * (level - 1)}% · ${cost} MP`
  if (set === 'bow' && index === 1) return `6 连追踪箭 · 每箭 +${10 * (level - 1)}% · ${cost} MP`
  if (set === 'bow' && index === 2) return `花炸弹 ${pct}% · ${cost} MP`
  if (set === 'bow' && index === 3) return `6 支追踪箭 · 每箭 +${20 * (level - 1)}% · ${cost} MP`
  if (set === 'book' && index === 0) return `隐身 5s · 攻击 +${5 + 10 * (level - 1)}% · ${cost} MP`
  if (set === 'book' && index === 1) return `分身 10s · ${Math.round(mirrorDamageRatio() * 100)}% 伤害 · ${cost} MP`
  if (set === 'book' && index === 2) return `爆裂分身 ${pct}% · 嘲讽/眩晕 · ${cost} MP`
  if (set === 'book' && index === 3) return `远程爆炸 ${pct}% · ${cost} MP`
  return `${pct}% 攻击 · ${cost} MP`
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
function strike(target: Foe, damage: number, label: string, fromClone = false) {
  if (!game || !foes.includes(target)) return
  if (target.tutorial && tutorialStep < 4) {
    setLog('先完成训练目标，训练傀儡暂时不会受伤。')
    addFx('impact', target.x, world.floor - 58, -1, .22)
    return
  }
  playSfx('hit')
  // 宿敌换武器前摇期间金光护体，但受到伤害增加 10%。
  const switchExposed = Boolean(target.mirror && (target.mirrorSwitch ?? 0) > 0)
  const dealt = Math.max(1, Math.round(damage * (switchExposed ? 1.1 : 1)))
  target.hp -= dealt; target.flash = .18
  addComboHit()
  addDamageText(target, dealt)
  const impactY = target.flying ? foeWorldY(target) - 14 : target.mirror ? world.floor - 68 : target.tutorial ? world.floor - 100 : world.floor - (target.boss ? 120 : 58)
  addFx('impact', target.x, impactY, -1, .22)
  addSparks(target.x, impactY + 8, 4, ['#ffe6a8', '#e8b56f'], 110)
  if (invisibleTimer > 0 && !fromClone) {
    invisibleTimer = 0
    cloneStealthTimer = 0
    addFx('blink-rift', heroX, world.floor - 65 + heroY, 1, .4)
    setLog('命中敌人，隐身解除。')
  }
  if (target.hp <= 0) defeatFoe(target)
  else syncHud()
  setLog(`${label} · 命中${target.boss ? '守关者' : '守卫'}`)
}
function strikeNearby(damage: number, label: string, range: number, all = false) {
  const targets = all ? foes.filter((foe) => Math.abs(foe.x - heroX) <= range) : [targetForFacing(range)].filter((foe): foe is Foe => Boolean(foe))
  if (!targets.length) { setLog(foes.length ? '距离太远，攻击没有命中。' : '剑气划过空气。'); return 0 }
  targets.forEach((target) => strike(target, damage, label))
  return damage * targets.length
}
function startBowCharge(source: 'attack' | 'skill1') {
  if (bowCharging) return
  bowCharging = true
  bowCharge = 0
  bowChargeSource = source
  attackWait = .2
  attackSwing = .25
  addFx('bow-draw', heroX + facing * 28, world.floor - 56 + heroY, facing, .35, weaponFxColor())
  setLog('蓄力箭：按住技能 1 蓄力（最长 2 秒），松开射出。')
}
function fireBowProjectile(charged: boolean) {
  if (!game) return
  const attack = stats().attack
  const chargeRatio = bowCharge / BOW_CHARGE_MAX
  const upgradeBonus = .1 * (skillLevel(0, 'bow') - 1)
  const damage = Math.round(attack * (charged ? 1 + chargeRatio * .1 + upgradeBonus : 1))
  const dir = facing
  projectiles.push({
    x: heroX + dir * 24,
    y: world.floor - 56 + heroY,
    vx: dir * (charged ? 760 : 700),
    life: charged ? 1.5 : 1,
    damage,
    targetId: -1,
    kind: charged ? 'charged' : 'arrow',
    pierce: charged,
    hitIds: [],
    maxDistance: charged ? 680 : 430,
    startX: heroX + dir * 24,
    label: charged ? '蓄力箭' : '弓箭',
  })
  addFx('muzzle', heroX + dir * 24, world.floor - 56 + heroY, dir, .16, weaponFxColor())
  addSparks(heroX + dir * 24, world.floor - 56 + heroY, charged ? 9 : 4, [weaponFxColor(), '#e8ffe8'], charged ? 150 : 80)
  if (charged) {
    // 蓄力箭专属：释放冲击环、蓄力爆闪、额外箭气与轻微震屏。
    addFx('charged-arrow', heroX + dir * 42, world.floor - 56 + heroY, dir, .7, '#ffe28a')
    addSparks(heroX + dir * 34, world.floor - 58 + heroY, 20, ['#ffe28a', '#fff6c0', '#c8f0a0'], 240)
    addFlash(.13, '#ffe28a')
    addShake(4)
  }
}
function releaseBowCharge() {
  if (!bowCharging || !game || (scene !== 'battle' && scene !== 'town') || bagOpen || settingsOpen || gameMenuOpen || creditsOpen || storyState || lootReveal) { bowCharging = false; bowCharge = 0; bowChargeSource = null; return }
  const charged = bowChargeSource === 'skill1' && bowCharge > .08
  fireBowProjectile(charged)
  bowCharging = false
  bowCharge = 0
  bowChargeSource = null
  attackWait = .35
  attackSwing = .3
  syncHud(); save()
}
function staffLightningAttack() {
  if (!game) return
  const dir = facing
  const range = 230
  const y = world.floor - 62 + heroY
  // 法杖普攻只命中前方最近的一个目标，闪电在目标处收束，不再穿透。
  const target = foes
    .filter((foe) => (foe.x - heroX) * dir >= -30 && Math.abs(foe.x - heroX) <= range)
    .sort((a, b) => Math.abs(a.x - heroX) - Math.abs(b.x - heroX))[0]
  const span = target ? Math.max(48, Math.abs(target.x - heroX)) : range
  effects.push({ kind: 'staff-lightning', x: heroX + dir * span / 2, y, direction: dir, life: .5, color: '#ffd84a', radius: span })
  addSparks(target ? target.x : heroX + dir * 120, y, 14, ['#ffe66a', '#fff6b0', '#ffc21a'], 200)
  addFlash(.1, '#ffd84a')
  if (target) strike(target, stats().attack, '法杖闪电')
  else setLog('黄色横向闪电划过前方。')
}
function bookBoltAttack() {
  if (!game) return
  const target = targetForFacing(480)
  const dir = target ? Math.sign(target.x - heroX) || facing : facing
  projectiles.push({
    x: heroX + dir * 22,
    y: world.floor - 54 + heroY,
    vx: dir * 660,
    life: 1,
    damage: stats().attack,
    targetId: -1,
    kind: 'book',
    pierce: true,
    hitIds: [],
    maxDistance: 480,
    startX: heroX + dir * 22,
    label: '魔法弹',
  })
  addFx('muzzle', heroX + dir * 22, world.floor - 54 + heroY, dir, .16, weaponFxColor())
  if (!target) setLog('魔法弹没入前方的黑暗。')
}
function attack() {
  if ((scene !== 'battle' && scene !== 'town') || paused || bossVictory || storyState || lootReveal || !game || attackWait > 0) return
  const mode = activeSkillSet()
  attackWait = .42; attackSwing = .32
  const nearest = [...foes].sort((a, b) => Math.abs(a.x - heroX) - Math.abs(b.x - heroX))[0]
  if (nearest) facing = Math.sign(nearest.x - heroX) || facing
  if (mode === 'bow') {
    // 普通攻击不再蓄力：点按立即射出一支普通箭；长按技能 1 才会蓄力。
    bowCharge = 0
    fireBowProjectile(false)
    playSfx('slash')
    if (tutorialMode && tutorialStep === 1) advanceTutorialStep(2)
    return
  }
  if (mode === 'sword') {
    const style = weaponStyle()
    const fxColor = weaponFxColor()
    const swingY = world.floor - 53 + heroY
    addFx(`weapon-swing-${style}`, heroX + facing * 42, swingY, facing, .4, fxColor)
    if (!foes.length) addFx('slash-crescent', heroX + facing * 46, swingY - 3, facing, .5)
    addSparks(heroX + facing * 54, swingY + 4, style === 'axe' ? 9 : 5, [fxColor, '#fff2c0'], style === 'axe' ? 140 : 90)
    if (style === 'axe') addShake(3)
    strikeNearby(stats().attack, '剑刃斩击', 138)
  } else if (mode === 'staff') {
    staffLightningAttack()
  } else {
    bookBoltAttack()
  }
  cloneMirrorAttack()
  playSfx(mode === 'sword' ? 'slash' : 'magic')
  if (tutorialMode && tutorialStep === 1) advanceTutorialStep(2)
}
// 分身与本体同步普通攻击：按当前武器在分身位置播放同样的攻击特效并结算 40% 伤害。
function cloneMirrorAttack() {
  if (!game || cloneTimer <= 0) return
  const mode = activeSkillSet()
  const target = nearestFoeTo(cloneX)
  const dir = target ? Math.sign(target.x - cloneX) || facing : facing
  const y = world.floor - 56 + cloneY
  cloneAttackPulse = .32
  if (mode === 'sword') {
    const style = weaponStyle()
    addFx(`weapon-swing-${style}`, cloneX + dir * 42, y + 3, dir, .35, weaponFxColor())
    addSparks(cloneX + dir * 54, y + 4, 5, [weaponFxColor(), '#fff2c0'], 95)
    const damage = Math.round(stats().attack * mirrorDamageRatio())
    foes.filter((foe) => (foe.x - cloneX) * dir >= -30 && Math.abs(foe.x - cloneX) <= 138).forEach((foe) => strike(foe, damage, '分身斩击', true))
  } else if (mode === 'staff') {
    const range = 230
    const target = foes
      .filter((foe) => (foe.x - cloneX) * dir >= -30 && Math.abs(foe.x - cloneX) <= range)
      .sort((a, b) => Math.abs(a.x - cloneX) - Math.abs(b.x - cloneX))[0]
    const span = target ? Math.max(48, Math.abs(target.x - cloneX)) : range
    effects.push({ kind: 'staff-lightning', x: cloneX + dir * span / 2, y: y - 6, direction: dir, life: .45, color: '#c7b3ff', radius: span })
    addSparks(target ? target.x : cloneX + dir * 100, y, 8, ['#d6b4ff', '#fff2c0'], 150)
    const damage = Math.round(stats().attack * mirrorDamageRatio())
    if (target) strike(target, damage, '分身闪电', true)
  } else {
    // 魔法书：从分身手中射出一枚可见的紫色魔法弹，命中后结算伤害。
    projectiles.push({
      x: cloneX + dir * 22,
      y,
      vx: dir * 620,
      life: 1,
      damage: Math.max(1, Math.round(stats().attack * mirrorDamageRatio())),
      targetId: -1,
      kind: 'book',
      pierce: true,
      hitIds: [],
      maxDistance: 480,
      startX: cloneX + dir * 22,
      label: '分身魔法弹',
      fromClone: true,
    })
    addFx('muzzle', cloneX + dir * 22, y, dir, .18, '#d6b4ff')
    addFx('arcane-bolt-hit', cloneX + dir * 10, y, dir, .3, '#d6b4ff')
    addSparks(cloneX + dir * 26, y, 7, ['#d6b4ff', '#9fe8ff'], 120)
  }
  playSfx('magic')
}
// 分身与本体同步施放技能：播放对应特效，并按分身倍率结算。
function cloneMirrorSkill(index: number, power: number) {
  if (!game || cloneTimer <= 0) return
  const target = nearestFoeTo(cloneX)
  const dir = target ? Math.sign(target.x - cloneX) || facing : facing
  const y = world.floor - 64 + cloneY
  cloneCastPulse = .56
  const damage = Math.max(1, Math.round(power * mirrorDamageRatio()))
  if (index === 0) {
    // 同步隐匿：分身也被薄雾包裹。
    cloneStealthTimer = 5
    addFx('blink-rift', cloneX, y, dir, .55, '#9fe8ff')
    addSparks(cloneX, y, 16, ['#d6b4ff', '#9fe8ff'], 140)
  } else if (index === 1) {
    addFx('arcane-blessing', cloneX, world.floor - 88 + cloneY, dir, 1, '#d6b4ff')
    addSparks(cloneX, y, 16, ['#d6b4ff', '#9fe8ff'], 150)
  } else if (index === 2) {
    // 本体召唤爆裂分身，分身也召唤一个较小的爆裂分身，而不是改放技能 4。
    bombClones.push({ x: cloneX + dir * 30, y: cloneY, timer: 3.2, power: damage, source: 'clone' })
    addFx('arcane-blessing', cloneX + dir * 30, world.floor - 88 + cloneY, dir, .55, '#9fe8ff')
    addFx('blink-rift', cloneX + dir * 30, y, dir, .4, '#9fe8ff')
    addSparks(cloneX + dir * 30, y, 14, ['#9fe8ff', '#d6b4ff'], 160)
  } else {
    fireCloneBlast(180, damage, '分身魔典', dir, 640)
    addFx('blink-rift', cloneX, y, dir, .45, '#d6b4ff')
    addSparks(cloneX + dir * 26, y, 14, ['#d6b4ff', '#9fe8ff'], 160)
  }
}
// 分身投出的爆炸法球。
function fireCloneBlast(radius: number, damage: number, label: string, dir: number, speed: number) {
  const target = nearestFoeTo(cloneX)
  const startX = cloneX + dir * 24
  const startY = world.floor - 64 + cloneY
  projectiles.push({
    x: startX,
    y: startY,
    vx: dir * speed,
    life: 1.6,
    damage,
    targetId: -1,
    kind: 'blast',
    hitIds: [],
    maxDistance: target ? Math.abs(target.x - startX) + 24 : 520,
    startX,
    label,
    radius,
    fromClone: true,
  })
  addFx('muzzle', startX, startY, dir, .22, '#d6b4ff')
  addSparks(startX, startY, 9, ['#d6b4ff', '#9fe8ff'], 140)
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
function castBowSkill(index: number) {
  if (!game) return
  if (index === 1) {
    grounded = false; velocityY = -520; heroY = Math.min(heroY, -70); jumpCount = 2; bowAirLocked = true
    addFx('double-jump', heroX, world.floor + heroY, facing, .5)
    addFx('arrow-rain', heroX, world.floor - 250, facing, .9, '#ffe28a')
    addSparks(heroX, world.floor + heroY, 16, ['#c8f0a0', '#ffe28a'], 160)
    addFlash(.12, '#ffe28a')
    const aim = foes.slice().sort((a, b) => Math.abs(a.x - heroX) - Math.abs(b.x - heroX))[0]
    for (let i = 0; i < 6; i++) {
      const startX = heroX + (i - 2.5) * 24
      projectiles.push({ x: startX, y: world.floor - 260 - i * 16, vx: aim ? Math.max(-130, Math.min(130, (aim.x - startX) * .55)) : 0, vy: 640, life: 1.6, damage: Math.round(stats().attack * (1 + .1 * (skillLevel(1, 'bow') - 1))), targetId: -1, kind: 'fall', hitIds: [], label: '箭雨' })
    }
    setLog('箭雨腾空：6 支追踪箭向下坠落，落地前无法再次使用。')
  } else if (index === 2) {
    const startY = world.floor + heroY
    flowerBomb = { x: heroX, y: startY, timer: .7 }
    addFx('great-quake', heroX, startY, facing, .4)
    heroY = Math.min(heroY, 0) - 50; velocityY = -360; grounded = false; jumpCount = Math.max(jumpCount, 1)
    heroX = scene === 'town' ? Math.max(TOWN_LEFT, Math.min(TOWN_RIGHT, heroX + facing * SKILL3_DISTANCE)) : clampHeroX(heroX + facing * SKILL3_DISTANCE)
    addFx('thrust-dash', heroX, world.floor - 72 + heroY, facing, .45, '#c8f0a0')
    addSparks(heroX, world.floor - 60 + heroY, 10, ['#c8f0a0', '#ffe28a'], 150)
    setLog('花炸弹已放置，向上翻滚并向前突进。')
  } else if (index === 3) {
    const target = foes.slice().sort((a, b) => Number(b.boss) - Number(a.boss) || Math.abs(a.x - heroX) - Math.abs(b.x - heroX))[0]
    const x = target?.x ?? heroX + facing * 200
    skyBow = { x, timer: 0, shots: 0 }
    addFx('sky-bow', x, world.floor - 240, facing, 1.6, '#ffe28a')
    addFx('arrow-rain', x, world.floor - 200, facing, 1.2, '#ffe28a')
    addSparks(x, world.floor - 180, 26, ['#ffe28a', '#f7ffd8', '#c8f0a0'], 230)
    addShake(5)
    addFlash(.14, '#ffe28a')
    setLog('猎鹰坠击：旋转的巨弓锁定敌人，满蓄力追踪箭将从天而降。')
  }
}
function castBookSkill(index: number, power: number) {
  if (!game) return
  if (index === 0) {
    invisibleTimer = 5
    addFx('blink-rift', heroX, world.floor - 65 + heroY, facing, .5, '#d6b4ff')
    addSparks(heroX, world.floor - 60 + heroY, 12, ['#d6b4ff', '#9fe8ff'], 110)
    setLog('隐匿：身体完全透明，5 秒内敌人看不到也打不到你；命中敌人会解除隐身。')
  } else if (index === 1) {
    cloneTimer = 10
    cloneMaxHp = Math.max(1, Math.round(stats().hp * .1))
    cloneHp = cloneMaxHp
    cloneX = heroX + (facing > 0 ? -46 : 46)
    cloneY = heroY
    cloneStealthTimer = invisibleTimer
    addFx('arcane-blessing', cloneX, world.floor - 88, facing, 1, '#d6b4ff')
    addSparks(cloneX, world.floor - 60, 14, ['#d6b4ff', '#9fe8ff'], 130)
    setLog('镜像分身已召唤，持续 10 秒；分身存在时技能法力消耗 +50%。')
  } else if (index === 2) {
    // 召唤实体分身：锁定最近的怪物并冲过去，接触或超时后自爆。
    bombClones.push({ x: heroX + facing * 40, y: heroY, timer: 4, power, source: 'main' })
    addFx('arcane-blessing', heroX + facing * 40, world.floor - 88, facing, 1, '#d6b4ff')
    addFx('blink-rift', heroX + facing * 40, world.floor - 65, facing, .45, '#d6b4ff')
    addSparks(heroX + facing * 40, world.floor - 55, 18, ['#d6b4ff', '#ff9ae0', '#9fe8ff'], 170)
    addShake(3)
    setLog('实体分身已召唤：它会冲向怪物并爆炸，造成 150% 攻击伤害并眩晕周围敌人。')
  } else {
    // 远程爆炸法球：飞向目标并在落点炸开。
    const target = foes.slice().sort((a, b) => Number(b.boss) - Number(a.boss) || Math.abs(a.x - heroX) - Math.abs(b.x - heroX))[0]
    arcaneOrb = {
      x: heroX + facing * 34,
      y: world.floor - 70 + heroY,
      targetX: target?.x ?? heroX + facing * 340,
      timer: 1.8,
      power,
    }
    addFx('arcane-blessing', heroX + facing * 30, world.floor - 88, facing, .7, '#d6b4ff')
    addSparks(heroX + facing * 34, world.floor - 64 + heroY, 12, ['#d6b4ff', '#9fe8ff'], 140)
    setLog('魔典法球已掷出，将在目标处爆炸。')
  }
}
function cast(index: number) {
  if ((scene !== 'battle' && scene !== 'town') || paused || bossVictory || storyState || lootReveal || !game || index < 0 || index > 3) return
  const skillSet = activeSkillSet()
  if (skillSet === 'bow' && index === 0) {
    if (bowCharging) return
    if (!spend(skillCostFor(0, 'bow'))) return
    startBowCharge('skill1')
    syncHud(); save(); return
  }
  if (skillSet === 'bow' && index === 1 && (!grounded || bowAirLocked)) { toast('落地后才能再次使用箭雨腾空。'); return }
  if (skillWait[index] > 0) { toast('技能还在冷却中。'); return }
  const cost = skillCostFor(index, skillSet) * (cloneTimer > 0 ? 1.5 : 1)
  if (!spend(Math.ceil(cost))) return
  skillWait[index] = SKILL_COOLDOWNS[index]
  attackSwing = .32
  playSkillSfx(game.role, index)
  const power = skillPower(index, skillSet)
  // 技能 3：按 A + 3 向左、D + 3 向右；没按方向键时沿当前视角方向。
  if (index === 2) {
    const left = keys.has(keyBinds.left) || keys.has('arrowleft')
    const right = keys.has(keyBinds.right) || keys.has('arrowright')
    if (left !== right) facing = right ? 1 : -1
  } else if (!(skillSet === 'staff' && index === 1)) {
    // 法师双生火柱固定在当前朝向前方，不再自动转向最近的敌人。
    const nearest = [...foes].sort((a, b) => Math.abs(a.x - heroX) - Math.abs(b.x - heroX))[0]
    if (nearest) facing = Math.sign(nearest.x - heroX) || facing
  }
  if (skillSet === 'bow') {
    castBowSkill(index)
  } else if (skillSet === 'book') {
    castBookSkill(index, power)
  } else if (skillSet === 'sword') {
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
        ? Math.max(TOWN_LEFT, Math.min(TOWN_RIGHT, heroX + facing * SKILL3_DISTANCE))
        : clampHeroX(heroX + facing * SKILL3_DISTANCE)
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
    const color = weaponFxColor()
    addFx('arcane-empower', heroX, world.floor - 8 + heroY, facing, 1.2, color)
    addFx('arcane-blessing', heroX, world.floor - 88, facing, 1, color)
    addSparks(heroX, world.floor - 70, 24, [color, '#e6ddb0', '#ffffff'], 210)
    addFlash(.16, color)
    addShake(4)
    setLog('奥术强化：7 秒内攻击与攻速提升 10%。')
  } else if (index === 1) {
    const center = heroX + facing * 150
    addFx('twin-fire-pillars', center, world.floor - 2, facing, 1.05, '#ff9a5c')
    addFx('fire-nova', center, world.floor - 62, facing, 1, '#ffd27a')
    addFx('great-quake', center, world.floor - 8, facing, .9, '#ff7a3d')
    addSparks(heroX + facing * 120, world.floor - 40, 32, ['#ff9a5c', '#ffd27a', '#fff2c0', '#ff6a3d'], 280)
    addFlash(.18, '#ff9a5c')
    addShake(9)
    const targets = foes.filter((foe) => Math.abs(foe.x - heroX) <= 320)
    // 火柱之间的吸力：非 Boss 敌人被拉向两根火柱的中点。
    targets.forEach((foe) => { if (!foe.boss) foe.x = clampFoeX(foe.x + (center - foe.x) * .8) })
    if (targets.length) targets.forEach((foe) => strike(foe, power, '双生火柱'))
    else setLog('双生火柱在空地上燃起。')
  } else if (index === 2) {
    const startX = heroX
    addFx('blink-burst', startX, world.floor - 65 + heroY, facing, .7, '#b7f0ff')
    heroX = scene === 'town'
      ? Math.max(TOWN_LEFT, Math.min(TOWN_RIGHT, heroX + facing * SKILL3_DISTANCE))
      : clampHeroX(heroX + facing * SKILL3_DISTANCE)
    const distance = Math.abs(heroX - startX)
    effects.push({ kind: 'blink-trail', x: (startX + heroX) / 2, y: world.floor - 65 + heroY, direction: facing, life: .55, color: '#b7e8ff', radius: distance })
    addFx('blink-burst', heroX, world.floor - 65 + heroY, -facing, .7, '#d6b4ff')
    addSparks(startX, world.floor - 65 + heroY, 18, ['#b7e8ff', '#d6b4ff', '#ffffff'], 200)
    addSparks(heroX, world.floor - 65 + heroY, 18, ['#b7e8ff', '#d6b4ff', '#ffffff'], 200)
    addFlash(.14, '#b7e8ff')
    addShake(3)
    // 瞬移前与瞬移后的位置各向中点发射一道横向闪电，合计 100%（随技能等级提升）。
    const midX = (startX + heroX) / 2
    const halfPower = Math.max(1, Math.round(power / 2))
    const strikeFrom = (fromX: number) => {
      const dirToMid = Math.sign(midX - fromX) || facing
      const segment = Math.max(48, Math.abs(midX - fromX))
      const target = foes
        .filter((foe) => (foe.x - fromX) * dirToMid >= -20 && Math.abs(foe.x - fromX) <= segment + 20)
        .sort((a, b) => Math.abs(a.x - fromX) - Math.abs(b.x - fromX))[0]
      effects.push({ kind: 'staff-lightning', x: (fromX + midX) / 2, y: world.floor - 62 + heroY, direction: dirToMid, life: .45, color: '#ffd84a', radius: segment })
      addSparks(target ? target.x : midX, world.floor - 62 + heroY, 10, ['#ffe66a', '#fff6b0'], 170)
      if (target) strike(target, halfPower, '瞬移闪电')
    }
    strikeFrom(startX)
    strikeFrom(heroX)
    setLog('闪现后的前后位置各向中点释放横向闪电，合计造成 100% 攻击伤害。')
  } else {
    const target = foes.slice().sort((a, b) => Number(b.boss) - Number(a.boss) || Math.abs(a.x - heroX) - Math.abs(b.x - heroX))[0]
    const color = '#a8e0d0'
    if (!target) {
      const emptyX = heroX + facing * 140
      addFx('energy-prison', emptyX, world.floor - 80, facing, 1.2, color)
      addFx('arcane-seal', emptyX, world.floor - 6, facing, 1.2, color)
      addFx('energy-finale', emptyX, world.floor - 70, facing, .9, color)
      addSparks(emptyX, world.floor - 60, 26, [color, '#e8ffe8', '#b7f0ff'], 220)
      addFlash(.16, color)
      addShake(6)
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
    const targetY = world.floor - (target.boss ? 130 : 66)
    prisonTimer = 1.5; prisonX = target.x; prisonY = targetY; prisonColor = color
    addFx('energy-prison', target.x, targetY, facing, 1.5, color)
    addFx('arcane-seal', target.x, world.floor - 6, facing, 1.4, color)
    effects.push({ kind: 'energy-chain', x: (heroX + target.x) / 2, y: world.floor - 72 + heroY, direction: Math.sign(target.x - heroX) || facing, life: .8, color, radius: Math.abs(target.x - heroX) })
    addSparks(target.x, world.floor - 70, 36, [color, '#e8fff2', '#b7f0ff', '#ffffff'], 300)
    addFlash(.3, color)
    addShake(14)
    setLog('能量禁锢展开 · 六芒法阵封锁目标 1 秒，并瞬发 5 次奥术轰击。')
  }
  // 魔法书的分身会与本体同步施放同一个技能。
  if (skillSet === 'book') cloneMirrorSkill(index, power)
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
    // 隐藏关卡奖励：一阶时装、灵魂 10000、天赋币碎片 ×5，可重复挑战重复获得。
    // 宿敌同样视为 Boss：号角的装备掉率增益按 Boss 的 +10% 结算。
    const mirrorGear = dropBossGear()
    game.gear.unshift(makeFashion(1))
    game.soul = (game.soul ?? 0) + 10000
    game.talentFragments = (game.talentFragments ?? 0) + 5
    for (const gear of mirrorGear) game.gear.unshift(gear)
    const mirrorGearText = mirrorGear.length ? `、${mirrorGear.map((gear) => gear.name).join('、')}` : ''
    toast(`隐藏关卡奖励：一阶时装 ×1、灵魂 ×10000、天赋币碎片 ×5${mirrorGearText}`)
    save()
    // 已经看过的结局剧情不再重复弹出。
    if (!seenStory('hidden-complete')) startStory(hiddenCompleteStoryData(), () => { save(); renderGame() })
    else renderGame()
    return
  }
  if (wasBoss && nightmareStage !== null) {
    const stage = nightmareStage
    const first = !(game.nightmareCleared ?? []).includes(stage)
    const table = NIGHTMARE_GEM_REWARDS[stage - 1] ?? []
    const results: Gem[] = []
    // 通关奖励：每个档位随机一种宝石。首通再发放一次同样的奖励。
    for (let round = 0; round < (first ? 2 : 1); round += 1) {
      for (const entry of table) {
        for (let count = 0; count < entry.count; count += 1) {
          const gem = makeGem(randomGemKind(), entry.tier)
          game.gems ??= []
          game.gems.push(gem)
          results.push(gem)
        }
      }
    }
    if (first) { game.nightmareCleared ??= []; game.nightmareCleared.push(stage) }
    const rewards = results.map((gem) => `${gemIcon(gem)} ${gemName(gem)}`)
    if (first) rewards.unshift(`${itemIcon('gem')} 噩梦首通 · 奖励翻倍`)
    foes = []; projectiles = []; foeShots = []
    bossVictory = { stage, bossX: target.x, rewards, time: 3.2, ending: false, nightmare: true }
    game.town = true
    addFx('victory-shockwave', target.x, world.floor - 92, 1, 1.5)
    addSparks(target.x, world.floor - 88, 46, ['#fff4c4', '#f5cf7a', '#ffd27a', '#ffffff'], 380)
    addShake(18)
    playSfx('victory')
    save(); renderGame(); return
  }
  const bossExperience = (wasBoss ? 100 : 10) * 2 ** (game.stage - 1)
  awardExperience(bossExperience)
  const droppedGear = wasBoss ? dropBossGear() : []
  if (!wasBoss) dropMobLoot(target.x)
  if (wasBoss) {
    const clearedStage = game.stage
    const soulGain = 200 + 50 * (clearedStage - 1) * clearedStage
    game.bossDefeated = true
    game.unlockedStage = Math.max(game.unlockedStage, Math.min(10, clearedStage + 1))
    game.stageProgress ??= {}
    const clearedProgress = game.stageProgress[String(clearedStage)]
    const wasFirstClear = !clearedProgress?.bossDefeated
    game.stageProgress[String(clearedStage)] = { kills: game.kills, bossDefeated: true, pointsClaimed: clearedProgress?.pointsClaimed ?? 0 }
    // 支线任务：通关所选关卡时累计次数。
    if (game.sideQuest && game.sideQuest.stage === clearedStage) {
      game.sideQuest.clears = Math.min(2, game.sideQuest.clears + 1)
      toast(game.sideQuest.clears >= 2 ? `支线任务完成：第 ${clearedStage} 关 2 / 2，可回小镇领取奖励。` : `支线任务进度：第 ${clearedStage} 关 ${game.sideQuest.clears} / 2。`)
    }
    // Boss 掉落先放入宝箱，靠近后按 S 开启。
    const rewards = [`${itemIcon('soul')} 灵魂 +${soulGain}`]
    for (const gear of droppedGear) rewards.push(`${itemIcon(gear.type === 'armor' ? 'armor' : 'weapon')} ${gear.name}`)
    const stamps = Math.random() < STAMP_DROP_CHANCE ? 1 : 0
    if (stamps) rewards.push(`${itemIcon('stamp')} 王印印章 +1`)
    const lottery = wasFirstClear ? 1 : 0
    if (lottery) rewards.push(`${itemIcon('ticket')} 抽奖机会 +1`)
    let fragments = 0
    const fragmentChance = (clearedStage + 3) * .025
    if (Math.random() < fragmentChance) {
      fragments = 1
      rewards.push(`${itemIcon('fragment')} 天赋币碎片 +1`)
    }
    foeShots = []
    projectiles = []
    bossChest = {
      x: Math.min(unlockedWidth - 40, Math.max(MAP_LEFT + 40, target.x)),
      stage: clearedStage,
      ending: clearedStage >= 10,
      loot: { soul: soulGain, gear: droppedGear, stamps, lottery, fragments, rewards },
      opened: false,
      opening: 0,
    }
    lootReveal = null
    // 先播放胜利演出，结束后宝箱留在战场上等待开启。
    bossVictory = { stage: clearedStage, bossX: target.x, rewards: [`${itemIcon('legacy')} 守关者宝箱已出现`, '靠近宝箱后按 S 开启'], time: 2.8, ending: clearedStage >= 10 }
    game.town = true
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
  const nightmare = Boolean(bossVictory.nightmare)
  bossVictory = null
  keys.clear()
  // 有未开启的宝箱时只关闭胜利演出，留在战场上等待玩家开启。
  if (bossChest && !bossChest.opened) { paused = false; save(); renderGame(); return }
  advanceAfterBoss(clearedStage, ending, nightmare)
}
function advanceAfterBoss(clearedStage: number, ending: boolean, nightmare = false) {
  if (!game) return
  resetCombo()
  bossChest = null
  lootReveal = null
  keys.clear()
  if (nightmare) {
    nightmareStage = null
    scene = 'town'; game.town = true; game.dead = false
    heroX = 480; cameraX = 0; heroY = 0; velocityY = 0; grounded = true; jumpCount = 0; heroSupportTop = world.floor
    restoreTownVitals()
    save(); renderGame(); return
  }
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
function openBossChest() {
  if (!game || !bossChest || bossChest.opened) return
  const chest = bossChest
  chest.opened = true; chest.opening = 0
  game.soul = (game.soul ?? 0) + chest.loot.soul
  for (const gear of chest.loot.gear) game.gear.unshift(gear)
  game.stamps = (game.stamps ?? 0) + chest.loot.stamps
  game.lotteryChances = (game.lotteryChances ?? 0) + chest.loot.lottery
  game.talentFragments = (game.talentFragments ?? 0) + chest.loot.fragments
  lootReveal = { rewards: chest.loot.rewards, stage: chest.stage, ending: chest.ending }
  playSfx('victory')
  save(); renderGame()
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
function weaponStyleRole(style: WeaponStyle): Role { return style === 'staff' || style === 'book' ? 'mage' : 'warrior' }
function weaponStyleMultiplier(style: WeaponStyle) { return style === 'bow' ? .9 : style === 'book' ? .95 : 1 }
function styleSkillSet(style: WeaponStyle): SkillSetKey {
  if (style === 'bow') return 'bow'
  if (style === 'book') return 'book'
  if (style === 'staff') return 'staff'
  return 'sword'
}
function randomWeaponStyle(role: Role): WeaponStyle {
  const styles: WeaponStyle[] = role === 'mage' ? ['staff', 'book'] : ['sword', 'axe', 'bow']
  return styles[Math.floor(Math.random() * styles.length)]
}
function weaponStyleOf(gear?: Gear): WeaponStyle {
  if (gear?.style) return gear.style
  const name = gear?.name ?? ''
  if (name.includes('战斧')) return 'axe'
  if (name.includes('法杖')) return 'staff'
  if (name.includes('之刃')) return 'blade'
  if (name.includes('长弓') || name.includes('猎弓') || name.includes('弓')) return 'bow'
  if (name.includes('魔典') || name.includes('之书')) return 'book'
  return 'sword'
}
function activeWeaponStyle(): WeaponStyle {
  const weapon = equippedWeapon()
  if (weapon) return weaponStyleOf(weapon)
  return game?.role === 'mage' ? 'staff' : 'sword'
}
function activeSkillSet(): SkillSetKey { return styleSkillSet(activeWeaponStyle()) }
function canUseWeapon(gear: Gear) { return !game || weaponStyleRole(weaponStyleOf(gear)) === game.role }
function makeGear(type: GearType, level: number, style?: WeaponStyle): Gear {
  const values = gearStats(level)
  const sockets = type === 'fashion' ? 0 : randomSocketCount()
  if (type === 'weapon') {
    const weaponStyle = style ?? randomWeaponStyle(game?.role ?? 'warrior')
    const names = WEAPON_NAMES[weaponStyle]
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: names[Math.floor(Math.random() * names.length)],
      level,
      type,
      style: weaponStyle,
      hp: 0,
      mp: values.mp,
      attack: Math.round(values.attack * weaponStyleMultiplier(weaponStyle)),
      defense: 0,
      sockets,
      socketGems: Array(sockets).fill(null),
    }
  }
  const names = gearNames[type]
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: names[Math.floor(Math.random() * names.length)],
    level,
    type,
    hp: type === 'armor' ? values.hp : 0,
    mp: 0,
    attack: 0,
    defense: type === 'armor' ? values.defense : 0,
    sockets,
    socketGems: Array(sockets).fill(null),
  }
}
function makeFashion(tier: number): Gear {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: fashionTierName(tier), level: tier, type: 'fashion', hp: 0, mp: 0, attack: 0, defense: 0, sockets: 0, socketGems: [] }
}
function fashionSummary(tier: number) {
  const stats = fashionTierStats(tier)
  return `生命 +${Math.round(stats.hpPct * 100)}% · 攻击 +${stats.atkFlat} + ${Math.round(stats.atkPct * 100)}% · 防御 +${stats.defFlat} + ${Math.round(stats.defPct * 100)}% · 蓝量 +${stats.mpFlat} + ${Math.round(stats.mpPct * 100)}%`
}
function gearLevelChances(stage: number): Array<{ level: number; weight: number }> {
  const list: Array<{ level: number; weight: number }> = []
  let remain = 1
  for (let candidate = stage; candidate >= 1; candidate -= 1) {
    const chance = Math.max(0, .035 - candidate * .005)
    const weight = remain * chance
    if (weight > 0) list.push({ level: candidate, weight })
    remain *= 1 - chance
  }
  return list
}
function gearLevelSuccess(stage: number) {
  return gearLevelChances(stage).reduce((sum, entry) => sum + entry.weight, 0)
}
// 按原等级权重随机一个装备等级，避免“先判定掉落类别、再判定等级”重复扣概率。
function rollGearLevel(stage: number) {
  const list = gearLevelChances(stage)
  const total = list.reduce((sum, entry) => sum + entry.weight, 0)
  if (!total) return 0
  let roll = Math.random() * total
  for (const entry of list) {
    roll -= entry.weight
    if (roll <= 0) return entry.level
  }
  return list[list.length - 1].level
}
// 原小怪任意装备掉落率 × 20，并限制一只怪最多掉一件。
function mobEquipmentChance(stage: number) {
  const perType = .03 * gearLevelSuccess(stage)
  const anyGear = 1 - (1 - perType) ** 2
  return Math.min(1, anyGear * 20)
}
function dropMobLoot(x: number) {
  if (!game) return
  const stage = game.stage
  // 号角增益：装备掉率整体 +20%，关卡材料掉率翻倍。
  const gearChance = Math.min(1, mobEquipmentChance(stage) * (hornBuffActive('gear') ? 1.2 : 1))
  const potionChance = .10
  const materialChance = .15 * (hornBuffActive('material') ? 2 : 1)
  const fragmentChance = Math.min(1, stage * .01)
  const dropX = Math.max(MAP_LEFT, Math.min(unlockedWidth - 35, x))
  const roll = Math.random()
  if (roll < gearChance) {
    const type: GearType = Math.random() < .5 ? 'weapon' : 'armor'
    const level = rollGearLevel(stage)
    if (!level) return
    const gear = makeGear(type, level)
    game.gear.unshift(gear)
    toast(`小怪掉落：${level} 级${type === 'weapon' ? '武器' : '护甲'}「${gear.name}」`)
    setLog(`${gear.name}已放入背包，穿戴后生效。`)
    return
  }
  if (roll < gearChance + potionChance) {
    const type: 'hp-potion' | 'mp-potion' = Math.random() < .5 ? 'hp-potion' : 'mp-potion'
    game.drops ??= []
    game.drops.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, x: dropX })
    return
  }
  if (roll < gearChance + potionChance + materialChance) {
    const variant = Math.floor(Math.random() * 3)
    game.drops ??= []
    game.drops.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type: 'material', x: dropX, materialKey: materialKey(stage, variant) })
    return
  }
  if (roll < gearChance + potionChance + materialChance + fragmentChance) {
    game.talentFragments = (game.talentFragments ?? 0) + 1
    toast('小怪掉落：天赋币碎片 ×1')
    setLog('小怪掉落：天赋币碎片 ×1')
  }
}
function dropBossGear(): Gear[] {
  if (!game) return []
  // Boss 的装备掉率也受号角影响，但只提高 10%（0.4 → 0.44）。
  if (Math.random() >= .4 * (hornBuffActive('gear') ? 1.1 : 1)) return []
  const type: GearType = Math.random() < .5 ? 'weapon' : 'armor'
  // Boss 装备等级：1~3 关固定 1/2/3 级；4 关起从 [关卡-3, 关卡] 中随机。
  // 括号内等级从低到高权重 4:3:2:1，越高的等级越难获得。
  const stage = Math.max(1, Math.min(10, game.stage))
  let level = stage
  if (stage > 3) {
    const minLevel = stage - 3
    const weights = [4, 3, 2, 1]
    let roll = Math.random() * 10
    level = minLevel
    for (let rank = 0; rank < weights.length; rank += 1) {
      roll -= weights[rank]
      if (roll <= 0) { level = minLevel + rank; break }
    }
  }
  return [makeGear(type, level)]
}
function pickupDrop() {
  if (!game) return
  if (scene === 'town') {
    const companion = townCompanions().find((entry) => Math.abs(heroX - entry.x) <= 70)
    if (companion) {
      const thanks = companionThanksStoryData(companion.id)
      // 已经看过的剧情不再重复弹出，可以到“功能 · 剧情”里回顾。
      if (!seenStory(thanks.id)) startStory(thanks)
      else toast('这段剧情已经看过了，可在「功能 · 剧情」中回顾。')
      return
    }
    if (Math.abs(heroX - TOWN_CIRCLE_X) <= 60) { openStageCircle(); return }
    if (secondNpcUnlocked() && Math.abs(heroX - SECOND_NPC_X) <= 75) { openSecondNpcMenu(); return }
    if (npcUnlocked() && Math.abs(heroX - TOWN_NPC_X) <= 80) openNpcMenu()
    return
  }
  if (scene !== 'battle') return
  if (bossVictory || lootReveal) return
  if (bossChest && !bossChest.opened && Math.abs(heroX - bossChest.x) <= 95) {
    if (bossChest.opening <= 0) {
      bossChest.opening = 1.2
      playSfx('level')
      setLog('守关者宝箱正在开启…')
      addFx('victory-shockwave', bossChest.x, world.floor - 44, 1, .9)
      addSparks(bossChest.x, world.floor - 34, 26, ['#ffe6a8', '#f5cf7a', '#ffffff'], 230)
      syncHud()
    }
    return
  }
  const nearest = game.drops?.map((drop) => ({ drop, distance: Math.abs(drop.x - heroX) })).filter((entry) => entry.distance <= 105).sort((a, b) => a.distance - b.distance)[0]
  if (!nearest) { toast('附近没有可拾取的东西。'); return }
  game.drops = game.drops!.filter((drop) => drop.id !== nearest.drop.id)
  if (nearest.drop.type === 'material') {
    const key = nearest.drop.materialKey
    const info = key ? materialInfo(key) : null
    if (key) addMaterial(key, 1)
    toast(`拾取专属材料：${info?.name ?? '未知材料'} ×1`)
    setLog(`获得 ${info?.name ?? '专属材料'}，可在合成台进行专属合成。`)
  } else if (nearest.drop.type === 'hp-potion') {
    const recovered = Math.min(stats().hp - game.hp, Math.ceil(stats().hp * .175))
    game.hp = Math.min(stats().hp, game.hp + recovered)
    // 角色身上浮现恢复数字与绿色治疗光环。
    effects.push({ kind: 'damage-number', x: heroX, y: world.floor - 96 + heroY, life: 1.1, duration: 1.1, text: `+${displayNumber(recovered)}`, damage: 0 })
    addFx('arcane-blessing', heroX, world.floor - 70 + heroY, 1, .7, '#9ff0a8')
    addSparks(heroX, world.floor - 48 + heroY, 12, ['#9ff0a8', '#d6ffb0'], 120)
    setLog(`拾取并使用血瓶，恢复 ${recovered} 点生命。`)
  } else {
    const recovered = Math.min(stats().mp - game.mp, Math.ceil(stats().mp * .175))
    game.mp = Math.min(stats().mp, game.mp + recovered)
    effects.push({ kind: 'damage-number', x: heroX, y: world.floor - 96 + heroY, life: 1.1, duration: 1.1, text: `+${displayNumber(recovered)}`, damage: 0 })
    addFx('arcane-blessing', heroX, world.floor - 70 + heroY, 1, .7, '#7fd4ff')
    addSparks(heroX, world.floor - 48 + heroY, 12, ['#7fd4ff', '#b0e8ff'], 120)
    setLog(`拾取并使用蓝瓶，恢复 ${recovered} 点法力。`)
  }
  playSfx('potion')
  syncHud(); save()
}
function allocateAttribute(stat: AttributeStat, delta = 1) {
  if (!game || scene !== 'town') { toast('只能在冒险者小镇分配属性点。'); return false }
  const allocation = game.attributeAllocation ??= { hp: 0, attack: 0, mp: 0, defense: 0 }
  if (delta > 0) {
    if ((game.attributePoints ?? 0) <= 0) { toast('没有可用的属性点。'); return false }
  } else if (allocation[stat] <= 0) {
    toast('该属性没有可减少的点数。'); return false
  }
  const before = stats()
  allocation[stat] = Math.max(0, allocation[stat] + (delta > 0 ? 1 : -1))
  game.attributePoints = Math.max(0, (game.attributePoints ?? 0) - (delta > 0 ? 1 : -1))
  const after = stats()
  if (stat === 'hp') game.hp = delta > 0 ? Math.min(after.hp, game.hp + after.hp - before.hp) : Math.min(game.hp, after.hp)
  if (stat === 'mp') game.mp = delta > 0 ? Math.min(after.mp, game.mp + after.mp - before.mp) : Math.min(game.mp, after.mp)
  save(); attributesOpen = true; renderGame()
  return true
}
function equip(id: string) {
  if (!game || scene !== 'town') { toast('请回到小镇后更换装备。'); return }
  const gear = game.gear.find((entry) => entry.id === id)
  if (!gear) return
  if (gear.type === 'weapon' && !canUseWeapon(gear)) { toast(`当前职业无法使用${gear.name}。`); return }
  const before = stats()
  game.equipped = id
  if (gear.type === 'fashion') game.fashionId = id
  else if (gear.type === 'weapon') {
    if (dualWieldUnlocked() && game.weaponId && game.weaponId !== id) {
      if (game.weapon2Id === id) game.weapon2Id = null
      game.weapon2Id = id
    } else {
      if (game.weapon2Id === id) game.weapon2Id = null
      game.weaponId = id
    }
  } else if (gear.type === 'armor') { if (game.armor2Id === id) game.armor2Id = null; game.armorId = id }
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
  if (!canUseWeapon(gear)) { toast(`当前职业无法使用${gear.name}。`); return }
  if (slot === 'off' && !dualWieldUnlocked()) { toast('需要双持专精天赋才能装备副武器。'); return }
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
function equipArmor2(id: string) {
  if (!game || scene !== 'town') { toast('请回到小镇后更换装备。'); return }
  if (!extraArmorUnlocked()) { toast('需要双持专精的额外护甲能力。'); return }
  const gear = game.gear.find((entry) => entry.id === id)
  if (!gear || gear.type !== 'armor') return
  const before = stats()
  if (game.armorId === id) game.armorId = null
  game.armor2Id = id
  game.equipped = id
  const after = stats()
  game.hp = Math.min(after.hp, game.hp + after.hp - before.hp)
  game.mp = Math.min(after.mp, game.mp + after.mp - before.mp)
  save(); bagOpen = true; renderGame(); toast(`已装备 ${gear.name}（副护甲）`)
}
// 点击背包里的装备：自动放进对应装备框；再次点击已穿戴的装备则卸下。
function equipGearFromBag(id: string) {
  if (!game) return
  if (scene !== 'town') { toast('请回到小镇后更换装备。'); return }
  const gear = game.gear.find((entry) => entry.id === id)
  if (!gear) return
  if (gear.type === 'weapon') {
    if (!canUseWeapon(gear)) { toast(`当前职业无法使用${gear.name}。`); return }
    if (game.weaponId === id) unequipSlot('weapon')
    else if (game.weapon2Id === id) unequipSlot('extra')
    else equipSlot(id, 'main')
  } else if (gear.type === 'armor') {
    if (game.armorId === id) unequipSlot('armor')
    else if (game.armor2Id === id) unequipSlot('extra')
    else equip(id)
  } else if (gear.type === 'fashion') {
    if (game.fashionId === id) unequipSlot('fashion')
    else equip(id)
  } else equip(id)
}
// 点击装备框卸下装备，物品会放回背包列表。
function unequipSlot(slot: string) {
  if (!game) return
  if (scene !== 'town') { toast('请回到小镇后更换装备。'); return }
  const before = stats()
  let removedId: string | null = null
  let removedName = '装备'
  const take = (id: string | null | undefined) => {
    if (!id) return false
    const gear = game!.gear.find((entry) => entry.id === id)
    if (gear) removedName = gear.name
    removedId = id
    return true
  }
  if (slot === 'weapon') { if (!take(game.weaponId)) return; game.weaponId = null }
  else if (slot === 'armor') { if (!take(game.armorId)) return; game.armorId = null }
  else if (slot === 'fashion') { if (!take(game.fashionId)) return; game.fashionId = null }
  else if (slot === 'extra') {
    if (game.extraSlot === 'weapon') { if (!take(game.weapon2Id)) return; game.weapon2Id = null }
    else { if (!take(game.armor2Id)) return; game.armor2Id = null }
  } else return
  if (removedId && game.equipped === removedId) game.equipped = null
  const after = stats()
  game.hp = Math.max(1, Math.min(after.hp, game.hp + (after.hp - before.hp)))
  game.mp = Math.max(0, Math.min(after.mp, game.mp + (after.mp - before.mp)))
  save(); bagOpen = true; renderGame()
  toast(`已卸下 ${removedName}，放回背包。`)
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
  resetCombo()
  hiddenBattle = false
  bossChest = null; lootReveal = null; nightmareStage = null; invisibleTimer = 0; cloneTimer = 0; cloneAttackPulse = 0; cloneCastPulse = 0; cloneStealthTimer = 0; bowCharging = false; bowCharge = 0; bowChargeSource = null; bowAirLocked = false; flowerBomb = null; skyBow = null; bombClones = []; arcaneOrb = null
  if (tutorialMode) { tutorialMode = false; tutorialStep = 0; game.tutorialDone = true }
  scene = 'town'; game.town = true; game.dead = false
  restoreTownVitals()
  heroX = 480; cameraX = 0; heroY = 0; velocityY = 0; grounded = true; heroSupportTop = world.floor; jumpCount = 0
  foes = []; projectiles = []; foeShots = []; burst = 0; burstTargetId = null; resetPanels(); save(); renderGame()
}
function useReviveCoin() {
  if (!game || scene !== 'defeat') return
  resetCombo()
  if (game.reviveUsed) { toast('本关已经使用过复活币了。'); return }
  if ((game.reviveCoins ?? 0) <= 0) { toast('没有复活币，可以在小镇商人处购买。'); return }
  game.reviveCoins = (game.reviveCoins ?? 0) - 1
  game.reviveUsed = true
  paused = false
  const s = stats()
  game.hp = s.hp; game.mp = s.mp
  scene = 'battle'; game.dead = false
  if (hiddenBattle) {
    game.town = true
    heroX = 480; heroY = 0; velocityY = 0; grounded = true; heroSupportTop = world.floor; jumpCount = 0
    projectiles = []; foeShots = []; burst = 0; burstTargetId = null
  } else {
    game.town = false
    heroX = 480; heroY = 0; velocityY = 0; grounded = true; heroSupportTop = world.floor; jumpCount = 0
    projectiles = []; foeShots = []; burst = 0; burstTargetId = null; enterBattlefield()
  }
  save(); renderGame(); toast('复活币生效：满状态复活。')
}
function resumeBattle() {
  if (!game) return
  paused = false
  resetCombo()
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
  if (name === 'collect-loot' && lootReveal) {
    const reveal = lootReveal
    lootReveal = null
    advanceAfterBoss(reveal.stage, reveal.ending)
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
        resetPanels(); forgeTab = 'gear'; craftingOpen = true; renderGame()
      })
      return
    }
    resetPanels(); forgeTab = 'gear'; craftingOpen = true; renderGame()
  }
  if (name === 'close-crafting') { craftingOpen = false; forgeSlots = []; renderGame() }
  if (name === 'forge-tab' && target.dataset.tab) {
    const tab = target.dataset.tab
    if (tab === 'gear' || tab === 'special' || tab === 'stone' || tab === 'punch') { forgeTab = tab; forgeSlots = []; specialSlots = []; renderGame() }
  }
  if (name === 'forge-add' && target.dataset.id) forgeAddItem(target.dataset.id)
  if (name === 'forge-remove' && target.dataset.slot) forgeRemoveSlot(Number(target.dataset.slot))
  if (name === 'forge-combine') forgeCombine()
  if (name === 'special-add' && target.dataset.key) specialAdd(target.dataset.key)
  if (name === 'special-remove' && target.dataset.slot) specialRemove(Number(target.dataset.slot))
  if (name === 'special-combine') specialCombine()
  if (name === 'stone-combine' && target.dataset.tier) stoneCombine(Number(target.dataset.tier))
  if (name === 'punch-open' && target.dataset.id) punchGear(target.dataset.id)
  if (name === 'open-attributes' && game && scene === 'town') { resetPanels(); attributesOpen = true; renderGame() }
  if (name === 'close-attributes') { attributesOpen = false; renderGame() }
  if (name === 'allocate-attr' && target.dataset.stat) {
    const stat = target.dataset.stat
    if (stat === 'hp' || stat === 'attack' || stat === 'mp' || stat === 'defense') allocateAttribute(stat, Number(target.dataset.delta ?? 1))
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
  if (name === 'close-bag') { bagOpen = false; hornPickerOpen = false; renderGame() }
  if (name === 'use-horn') { openHornPicker(); return }
  if (name === 'close-horn-picker') { hornPickerOpen = false; renderGame(); return }
  if (name === 'horn-buff' && target.dataset.buff) {
    const buff = target.dataset.buff
    if (buff === 'material' || buff === 'attack' || buff === 'gear') applyHornBuff(buff)
    return
  }
  if (name === 'bag-tab' && target.dataset.tab) {
    const tab = target.dataset.tab
    if (tab === 'gear' || tab === 'gems' || tab === 'talent' || tab === 'other') { bagTab = tab; bagOpen = true; renderGame() }
  }
  if (name === 'bag-filter' && target.dataset.filter) {
    const filter = target.dataset.filter
    if (filter === 'all' || filter === 'weapon' || filter === 'armor' || filter === 'fashion') { bagGearFilter = filter; bagOpen = true; renderGame() }
  }
  if (name === 'equip' && target.dataset.id) equip(target.dataset.id)
  if (name === 'equip-gear' && target.dataset.id) equipGearFromBag(target.dataset.id)
  if (name === 'unequip-slot' && target.dataset.slot) unequipSlot(target.dataset.slot)
  if (name === 'equip-armor2' && target.dataset.id) equipArmor2(target.dataset.id)
  if (name === 'equip-main' && target.dataset.id) equipSlot(target.dataset.id, 'main')
  if (name === 'equip-off' && target.dataset.id) equipSlot(target.dataset.id, 'off')
  if (name === 'open-npc' && game && scene === 'town' && npcUnlocked()) { openNpcMenu() }
  if (name === 'open-shop' && game && scene === 'town') { openShopMenu() }
  if (name === 'close-npc') { npcOpen = false; renderGame() }
  if (name === 'close-second-npc') { secondNpcOpen = false; renderGame() }
  if (name === 'second-menu') { secondView = 'menu'; renderGame() }
  if (name === 'second-dungeon') { secondView = 'dungeon'; renderGame() }
  if (name === 'second-gems') { secondView = 'gems'; renderGame() }
  if (name === 'nightmare-enter' && target.dataset.stage) { beginNightmare(Number(target.dataset.stage)); }
  if (name === 'enhance-slot' && target.dataset.slot) {
    const slot = target.dataset.slot
    if (slot === 'weapon' || slot === 'weapon2' || slot === 'armor') { enhanceSlot = slot; renderGame() }
  }
  if (name === 'enhance-stone' && target.dataset.tier) { enhanceStoneTier = Math.max(1, Math.min(5, Number(target.dataset.tier))); renderGame() }
  if (name === 'enhance-do') performEnhance()
  if (name === 'close-stage-circle') { stageCircleOpen = false; renderGame() }
  if (name === 'circle-enter-stage' && game && target.dataset.stage) {
    stageCircleOpen = false
    beginStage(Math.max(1, Math.min(game.unlockedStage, Number(target.dataset.stage))))
  }
  if (name === 'open-game-menu') { resetPanels(); gameMenuOpen = true; renderGame() }
  if (name === 'close-game-menu') { gameMenuOpen = false; renderGame() }
  if (name === 'open-settings') { resetPanels(); settingsOpen = true; renderGame() }
  if (name === 'close-settings') { settingsOpen = false; listeningBind = null; renderGame() }
  if (name === 'open-credits') { resetPanels(); creditsOpen = true; renderGame() }
  if (name === 'close-credits') { creditsOpen = false; renderGame() }
  if (name === 'open-story-log' && game) {
    resetPanels(); storyLogOpen = true; storyLogStage = Math.max(1, Math.min(10, game.stage))
    markStoryRead(storyLogStage)
    renderGame()
  }
  if (name === 'close-story-log') { storyLogOpen = false; renderGame() }
  if (name === 'story-log-stage' && target.dataset.stage) {
    storyLogStage = Math.max(1, Math.min(10, Number(target.dataset.stage)))
    storyLogOpen = true
    markStoryRead(storyLogStage)
    renderGame()
  }
  if (name === 'open-skill-panel') { resetPanels(); skillPanelOpen = true; renderGame() }
  if (name === 'close-skill-panel') { skillPanelOpen = false; renderGame() }
  if (name === 'skill-upgrade' && target.dataset.index) { upgradeSkill(Number(target.dataset.index)) }
  if (name === 'bind-key' && target.dataset.bind && BIND_ACTIONS.includes(target.dataset.bind as BindAction)) {
    listeningBind = target.dataset.bind as BindAction
    renderGame()
  }
  if (name === 'reset-binds') {
    keyBinds = { ...DEFAULT_BINDS }
    saveKeyBinds()
    listeningBind = null
    toast('已恢复默认按键。')
    renderGame()
  }
  if (name === 'settings-town') {
    if (scene === 'town') { settingsOpen = false; renderGame(); toast('已经在小镇中。') }
    else retreatToTown()
  }
  if (name === 'settings-role-select') {
    settingsOpen = false; listeningBind = null
    performAction('role-select', target)
  }
  if (name === 'settings-audio') {
    const on = toggleAudio()
    toast(on ? '音效与音乐已开启。' : '音效与音乐已关闭。')
    renderGame()
  }
  if (name === 'quit-game') { quitConfirmOpen = true; renderGame() }
  if (name === 'cancel-quit') { quitConfirmOpen = false; renderGame() }
  if (name === 'confirm-quit') performQuitGame()
  if (name === 'npc-menu') { npcView = 'menu'; renderGame() }
  if (name === 'npc-shop') { npcView = 'shop'; renderGame() }
  if (name === 'shop-category' && target.dataset.category) {
    const category = target.dataset.category
    shopCategory = category === 'equipment' || category === 'fashion' || category === 'gem' || category === 'material' || category === 'other' ? category : 'all'
    npcOpen = true; npcView = 'shop'; renderGame()
  }
  if (name === 'npc-talent') { npcView = 'talent'; renderGame() }
  if (name === 'npc-enhance') { npcView = 'enhance'; renderGame() }
  if (name === 'npc-quests') { npcView = 'quests'; questTab = 'main'; renderGame() }
  if (name === 'quest-tab' && target.dataset.tab) {
    questTab = target.dataset.tab === 'side' ? 'side' : 'main'
    renderGame()
  }
  if (name === 'main-claim' && target.dataset.stage) claimMainQuest(Number(target.dataset.stage))
  if (name === 'side-accept' && target.dataset.stage) acceptSideQuest(Number(target.dataset.stage))
  if (name === 'side-claim') claimSideQuest()
  if (name === 'side-abandon') abandonSideQuest()
  if (name === 'gem-socket' && target.dataset.kind) socketGem(target.dataset.kind as GemKind, Number(target.dataset.tier))
  if (name === 'gem-remove' && target.dataset.slot && target.dataset.index) removeGem(target.dataset.slot, Number(target.dataset.index))
  if (name === 'gem-combine' && target.dataset.kind && target.dataset.tier) combineGems(target.dataset.kind as GemKind, Number(target.dataset.tier))
  if (name === 'shop-buy' && target.dataset.id) buyShopItem(target.dataset.id)
  if (name === 'talent-normal-up' && target.dataset.id) upgradeNormalTalent(Number(target.dataset.id))
  if (name === 'talent-normal-undo' && target.dataset.id) undoNormalTalent(Number(target.dataset.id))
  if (name === 'talent-advanced-select' && target.dataset.id) selectAdvancedTalent(Number(target.dataset.id))
  if (name === 'talent-advanced-up') upgradeAdvancedTalent()
  if (name === 'talent-advanced-undo') undoAdvancedTalent()
  if (name === 'talent-advanced-reset') resetAdvancedTalent()
  if (name === 'extra-slot' && (target.dataset.slot === 'weapon' || target.dataset.slot === 'armor')) {
    if (!game || game.advancedTalent !== 3 || advancedTalentLevel() < 1) return
    const before = stats()
    game.extraSlot = target.dataset.slot
    if (game.extraSlot === 'weapon') game.armor2Id = null
    else game.weapon2Id = null
    const after = stats()
    game.hp = Math.min(after.hp, game.hp + Math.max(0, after.hp - before.hp))
    game.mp = Math.min(after.mp, game.mp + Math.max(0, after.mp - before.mp))
    save(); npcOpen = true; npcView = 'talent'; renderGame()
    toast(game.extraSlot === 'weapon' ? '双持专精：额外武器槽已启用。' : '双持专精：额外护甲槽已启用。')
  }
  if (name === 'talent-craft') craftTalentCoin()
  if (name === 'open-lottery') openLottery()
  if (name === 'close-lottery') closeLottery()
  if (name === 'lottery-spin') startLottery()
  if (name === 'enter-stage' && game) {
    const selected = Number(document.querySelector<HTMLSelectElement>('#stage-select')?.value ?? game.stage)
    beginStage(Math.max(1, Math.min(game.unlockedStage, selected)))
  }
  if (name === 'respawn-town') retreatToTown()
  if (name === 'revive-coin') useReviveCoin()
  if (name === 'respawn-fight') resumeBattle()
  if (name === 'town' && game) retreatToTown()
  if (name === 'save') { save(); toast('远征进度已保存。') }
}
app.addEventListener('click', (event) => {
  const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-action]') : null
  if (target && !target.hasAttribute('disabled')) {
    // 手机战斗按键在 pointerdown 时立即响应，避免多指触控时 click 丢失或重复触发。
    if (target.closest('.mobile-control-deck')) return
    // 长按属性按钮时已经连续加点，忽略松手后补发的 click。
    if (target.dataset.action === 'allocate-attr' && attrSuppressClick) { attrSuppressClick = false; return }
    playSfx('ui')
    performAction(target.dataset.action ?? '', target)
  }
})
// 背包拖拽：把右侧装备拖入左侧人物旁的装备框。
app.addEventListener('dragstart', (event) => {
  const row = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-drag-id]') : null
  if (!row || !event.dataTransfer) return
  event.dataTransfer.setData('text/plain', row.dataset.dragId ?? '')
  event.dataTransfer.effectAllowed = 'move'
  row.classList.add('dragging')
})
app.addEventListener('dragend', (event) => {
  if (event.target instanceof HTMLElement) event.target.closest<HTMLElement>('[data-drag-id]')?.classList.remove('dragging')
  document.querySelectorAll('.equip-slot.drag-over').forEach((slot) => slot.classList.remove('drag-over'))
})
app.addEventListener('dragover', (event) => {
  const slot = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-drop-slot]') : null
  if (!slot) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  slot.classList.add('drag-over')
})
app.addEventListener('dragleave', (event) => {
  const slot = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-drop-slot]') : null
  slot?.classList.remove('drag-over')
})
app.addEventListener('drop', (event) => {
  const slot = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-drop-slot]') : null
  if (!slot) return
  event.preventDefault()
  slot.classList.remove('drag-over')
  dropGearToSlot(event.dataTransfer?.getData('text/plain'), slot.dataset.dropSlot)
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
    noteMoveTap(key === 'arrowleft' ? -1 : 1)
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
  // 属性加减按钮：长按 420ms 后连续调整，按住越久速度越快。
  const attrButton = event.target.closest<HTMLElement>('[data-action="allocate-attr"]')
  if (attrButton && !attrButton.hasAttribute('disabled')) {
    const stat = attrButton.dataset.stat
    if (stat === 'hp' || stat === 'attack' || stat === 'mp' || stat === 'defense') {
      const delta = Number(attrButton.dataset.delta ?? 1)
      attrSuppressClick = false
      stopAttributeHold()
      attrHoldTimer = window.setTimeout(() => {
        attrSuppressClick = true
        let wait = 90
        const tick = () => {
          if (!game) return
          if (delta > 0 && (game.attributePoints ?? 0) <= 0) { stopAttributeHold(); return }
          if (delta < 0 && (game.attributeAllocation?.[stat] ?? 0) <= 0) { stopAttributeHold(); return }
          if (!allocateAttribute(stat, delta)) { stopAttributeHold(); return }
          wait = Math.max(38, wait - 7)
          attrRepeatTimer = window.setTimeout(tick, wait)
        }
        tick()
      }, 420)
    }
  }
})
// 手机端移动摇杆：左右拖动控制移动，推到边缘进入奔跑。
function updateJoystick(event: PointerEvent) {
  const base = document.querySelector<HTMLElement>('[data-joystick]')
  if (!base) return
  const rect = base.getBoundingClientRect()
  if (!rect.width) return
  const centerX = rect.left + rect.width / 2
  const max = rect.width * .32
  const dx = Math.max(-max, Math.min(max, event.clientX - centerX))
  const knob = base.querySelector<HTMLElement>('.joystick-knob')
  if (knob) knob.style.transform = `translate(${dx}px, 0px)`
  const deadzone = rect.width * .07
  const direction = dx > deadzone ? 1 : dx < -deadzone ? -1 : 0
  keys.delete('arrowleft'); keys.delete('arrowright')
  if (direction > 0) keys.add('arrowright')
  else if (direction < 0) keys.add('arrowleft')
  runActive = direction !== 0 && Math.abs(dx) > max * .78
}
function endJoystick() {
  joystickPointerId = null
  keys.delete('arrowleft'); keys.delete('arrowright')
  runActive = false
  const knob = document.querySelector<HTMLElement>('[data-joystick] .joystick-knob')
  if (knob) knob.style.transform = 'translate(0px, 0px)'
}
app.addEventListener('pointerdown', (event) => {
  if (!(event.target instanceof HTMLElement)) return
  const base = event.target.closest<HTMLElement>('[data-joystick]')
  if (!base) return
  event.preventDefault()
  if (base.dataset.disabled === 'true') return
  joystickPointerId = event.pointerId
  try { base.setPointerCapture(event.pointerId) } catch { /* ignore */ }
  updateJoystick(event)
})
window.addEventListener('pointermove', (event) => {
  if (joystickPointerId !== event.pointerId) return
  event.preventDefault()
  updateJoystick(event)
}, { passive: false })
window.addEventListener('pointerup', (event) => {
  if (joystickPointerId === event.pointerId) endJoystick()
})
window.addEventListener('pointercancel', (event) => {
  if (joystickPointerId === event.pointerId) endJoystick()
})
window.addEventListener('blur', endJoystick)
function stopAttributeHold() {
  if (attrHoldTimer !== null) { window.clearTimeout(attrHoldTimer); attrHoldTimer = null }
  if (attrRepeatTimer !== null) { window.clearTimeout(attrRepeatTimer); attrRepeatTimer = null }
}
window.addEventListener('pointerup', stopAttributeHold)
window.addEventListener('pointercancel', stopAttributeHold)
window.addEventListener('blur', stopAttributeHold)
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
window.addEventListener('pointerup', () => { if (bowCharging) releaseBowCharge() })
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase()
  if (listeningBind) {
    event.preventDefault()
    if (key === 'escape') { listeningBind = null; renderGame(); return }
    if (['shift', 'control', 'alt', 'meta', 'capslock', 'tab'].includes(key)) return
    if (FIXED_KEYS.has(key)) { toast('该按键为固定功能键，请换一个。'); return }
    const conflict = BIND_ACTIONS.find((action) => action !== listeningBind && keyBinds[action] === key)
    if (conflict) { toast(`该按键已被“${BIND_LABELS[conflict]}”占用。`); return }
    keyBinds[listeningBind] = key
    listeningBind = null
    saveKeyBinds()
    toast('按键已更新。')
    renderGame()
    return
  }
  if (pendingDeleteId && key === 'escape') { pendingDeleteId = null; document.querySelector('.delete-confirm')?.remove(); return }
  if (lotteryOpen && key === 'escape') { closeLottery(); return }
  if (hornPickerOpen && key === 'escape') { hornPickerOpen = false; renderGame(); return }
  if (quitConfirmOpen && key === 'escape') { quitConfirmOpen = false; renderGame(); return }
  if (settingsOpen && key === 'escape') { settingsOpen = false; listeningBind = null; renderGame(); return }
  if (creditsOpen && key === 'escape') { creditsOpen = false; renderGame(); return }
  if (storyLogOpen && key === 'escape') { storyLogOpen = false; renderGame(); return }
  if (skillPanelOpen && key === 'escape') { skillPanelOpen = false; renderGame(); return }
  if (gameMenuOpen && key === 'escape') { gameMenuOpen = false; renderGame(); return }
  if (stageCircleOpen && key === 'escape') { stageCircleOpen = false; renderGame(); return }
  if (npcOpen && key === 'escape') { npcOpen = false; renderGame(); return }
  if (secondNpcOpen && key === 'escape') { secondNpcOpen = false; renderGame(); return }
  if (bagOpen && key === 'escape') { bagOpen = false; renderGame(); return }
  if (attributesOpen && key === 'escape') { attributesOpen = false; renderGame(); return }
  if (craftingOpen && key === 'escape') { craftingOpen = false; renderGame(); return }
  if (bagOpen || hornPickerOpen || craftingOpen || attributesOpen || npcOpen || secondNpcOpen || lotteryOpen || stageCircleOpen || settingsOpen || gameMenuOpen || creditsOpen || storyLogOpen || skillPanelOpen) return
  if (lootReveal) return
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
  if (!event.repeat) {
    if (key === keyBinds.left || key === 'arrowleft') noteMoveTap(-1)
    else if (key === keyBinds.right || key === 'arrowright') noteMoveTap(1)
  }
  if (event.repeat) return
  if (key === keyBinds.attack) attack()
  if (key === 's') pickupDrop()
  if (key === keyBinds.jump) jump()
  const index = bindSkillIndex(key); if (index >= 0) cast(index)
})
window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase()
  if (bowCharging && (key === keyBinds.attack || key === keyBinds.skill1)) releaseBowCharge()
  keys.delete(key)
  if (key === 'l') shieldLocked = false
})
window.addEventListener('blur', () => { keys.clear(); touchPointers.clear(); shieldActive = false; shieldLocked = false; bowCharging = false; bowCharge = 0; bowChargeSource = null })
function setupCanvas() {
  canvas = document.querySelector<HTMLCanvasElement>('#arena')
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const ratio = rect.width > 1 ? rect.height / rect.width : world.height / world.width
  viewHeight = Math.max(world.height, Math.min(2600, Math.round(world.width * ratio)))
  const dpr = window.devicePixelRatio || 1
  renderScale = dpr > 1 ? Math.min(2.5, dpr) : 2
  canvas.width = Math.round(world.width * renderScale)
  canvas.height = Math.round(viewHeight * renderScale)
  viewOffsetY = Math.round((viewHeight - world.height) / 2)
  ctx = canvas.getContext('2d')
}
function nearestFoeTo(x: number): Foe | undefined {
  return foes.filter((foe) => !foe.tutorial).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0]
}
// 花炸弹、猎鹰坠击、爆裂分身与远程法球在小镇与战斗中都会继续推进。
function updateSkillObjects(dt: number) {
  if (!game) return
  if (flowerBomb) {
    flowerBomb.timer -= dt
    flowerBomb.y += (world.floor - flowerBomb.y) * Math.min(1, dt * 3)
    if (flowerBomb.timer <= 0) {
      const bombX = flowerBomb.x
      const bombPower = skillPower(2, 'bow')
      addFx('great-quake', bombX, world.floor - 8, 1, .9)
      addSparks(bombX, world.floor - 20, 30, ['#ff9a5c', '#ffd27a', '#fff2c0'], 260)
      addShake(8)
      foes.filter((foe) => Math.abs(foe.x - bombX) <= 150).forEach((foe) => strike(foe, bombPower, '花炸弹'))
      flowerBomb = null
    }
  }
  if (skyBow) {
    skyBow.timer -= dt
    // 旋转的弓会持续追踪最近的敌人。
    const aim = nearestFoeTo(skyBow.x)
    if (aim) skyBow.x += (aim.x - skyBow.x) * Math.min(1, dt * 4)
    if (skyBow.shots < 6 && skyBow.timer <= 0) {
      skyBow.shots += 1
      skyBow.timer = .17
      const x = skyBow.x + (skyBow.shots - 3.5) * 26
      const target = aim
      projectiles.push({ x, y: world.floor - 280, vx: target ? Math.max(-190, Math.min(190, (target.x - x) * .55)) : 0, vy: 760, life: 1.4, damage: Math.round(stats().attack * (1.1 + .2 * (skillLevel(3, 'bow') - 1))), targetId: -1, kind: 'fall', hitIds: [], label: '满蓄力箭' })
      addFx('muzzle', x, world.floor - 280, 1, .18, '#ffe28a')
    }
    if (skyBow.shots >= 6 && skyBow.timer <= -.4) skyBow = null
  }
  for (const clone of [...bombClones]) {
    clone.timer -= dt
    const target = nearestFoeTo(clone.x)
    const goalX = target ? target.x : clone.x + facing * 260
    const dx = goalX - clone.x
    if (Math.abs(dx) > 6) clone.x += Math.sign(dx) * Math.min(Math.abs(dx), (clone.source === 'main' ? 330 : 300) * dt)
    if ((target && Math.abs(target.x - clone.x) < 40) || clone.timer <= 0) explodeBombClone(clone)
  }
  if (arcaneOrb) {
    const orb = arcaneOrb
    orb.timer -= dt
    const target = nearestFoeTo(orb.x)
    const goalX = target ? target.x : orb.targetX
    const dx = goalX - orb.x
    orb.x += Math.sign(dx) * Math.min(Math.abs(dx), 620 * dt)
    orb.y = world.floor - 70 + Math.sin(performance.now() / 90) * 7
    if (Math.abs(dx) < 26 || orb.timer <= 0) explodeArcaneOrb()
  }
}
function explodeBombClone(clone: BombClone) {
  bombClones = bombClones.filter((entry) => entry !== clone)
  const { x, power } = clone
  const main = clone.source === 'main'
  const color = main ? '#d6b4ff' : '#9fe8ff'
  addFx('arcane-explosion', x, world.floor - 58, 1, main ? 1 : .8, color)
  addFx('great-quake', x, world.floor - 8, 1, main ? .85 : .65, color)
  addSparks(x, world.floor - 46, main ? 38 : 26, [color, '#ff9ae0', '#9fe8ff', '#ffffff'], main ? 320 : 250)
  addShake(main ? 13 : 8)
  addFlash(main ? .22 : .14, color)
  playSfx('magic')
  const radius = main ? 170 : 140
  const targets = foes.filter((foe) => Math.abs(foe.x - x) <= radius)
  targets.forEach((foe) => {
    // 爆炸附带控制：短暂眩晕，并让敌人停止追击本体。
    foe.stunTimer = Math.max(foe.stunTimer ?? 0, main ? 1.2 : .8)
    foe.dashWindup = undefined; foe.rangedWindup = undefined; foe.skillWindup = undefined; foe.specialWindup = undefined
    strike(foe, power, main ? '爆裂分身' : '分身爆裂')
  })
  setLog(targets.length
    ? (main ? '实体分身冲入敌阵自爆：造成 150% 攻击伤害并眩晕周围敌人。' : '分身同步召唤的爆裂分身炸开，眩晕周围敌人。')
    : (main ? '实体分身在远处炸开。' : '分身召唤的爆裂分身在远处炸开。'))
}
function explodeArcaneOrb() {
  if (!arcaneOrb) return
  const { x, power } = arcaneOrb
  arcaneOrb = null
  addFx('arcane-explosion', x, world.floor - 64, 1, 1.1, '#d6b4ff')
  addFx('great-quake', x, world.floor - 8, 1, .9, '#d6b4ff')
  addSparks(x, world.floor - 50, 40, ['#d6b4ff', '#9fe8ff', '#fff2c0', '#ffffff'], 330)
  addShake(13)
  addFlash(.26, '#d6b4ff')
  const targets = foes.filter((foe) => Math.abs(foe.x - x) <= 180)
  targets.forEach((foe) => strike(foe, power, '魔典爆炸'))
  setLog(targets.length ? '魔典法球在远处炸开，造成 200% 攻击伤害。' : '魔典法球在远处炸开。')
}
// 分身的爆炸法球命中或到期时在落点炸开。
function explodeBlastProjectile(projectile: Projectile) {
  const x = projectile.x
  const y = projectile.y
  const radius = projectile.radius ?? 150
  const color = '#d6b4ff'
  addFx('arcane-explosion', x, y, 1, 1, color)
  addFx('great-quake', x, world.floor - 8, 1, .75, color)
  addSparks(x, y + 8, 28, [color, '#9fe8ff', '#fff2c0'], 280)
  addShake(8)
  const targets = foes.filter((foe) => Math.abs(foe.x - x) <= radius)
  targets.forEach((foe) => strike(foe, projectile.damage, projectile.label ?? '分身爆炸', projectile.fromClone ?? false))
}
// 敌人失去攻击目标（例如玩家隐身）时，随机在地图上走动或原地停留。
function updateFoeWander(foe: Foe, dt: number) {
  foe.wanderTimer = (foe.wanderTimer ?? 0) - dt
  if (foe.wanderTimer <= 0) {
    const walk = Math.random() < .72
    foe.wanderTimer = walk ? .7 + Math.random() * 1.3 : .5 + Math.random() * .9
    foe.wanderTargetX = walk ? clampFoeX(foe.x + (Math.random() < .5 ? -1 : 1) * (45 + Math.random() * 95)) : null
    foe.attackAnim = 0
  }
  if (typeof foe.wanderTargetX === 'number') {
    const dx = foe.wanderTargetX - foe.x
    if (Math.abs(dx) > 5) foe.x = clampFoeX(foe.x + Math.sign(dx) * Math.min(Math.abs(dx), (foe.boss ? 62 : 48) * dt))
    else foe.wanderTargetX = null
  }
  foe.timer = Math.max(foe.timer, .4)
  foe.skillTimer = Math.max(foe.skillTimer, .4)
  foe.rangedTimer = Math.max(foe.rangedTimer, .4)
  if (foe.boss) foe.specialTimer = Math.max(foe.specialTimer ?? 0, .4)
}
function update(dt: number) {
  shake = Math.max(0, shake - dt * 30)
  flashTime = Math.max(0, flashTime - dt * 1.6)
  if (paused) { shieldActive = false; return }
  if (storyState || lootReveal) return
  // 打开背包、设置、功能菜单或制作人信息时暂停战斗与计时。
  if (bagOpen || settingsOpen || gameMenuOpen || creditsOpen || storyLogOpen || skillPanelOpen) { shieldActive = false; return }
  if (scene !== 'battle' || bossVictory) shieldActive = false
  if (scene !== 'battle') cameraX = 0
  attackWait = Math.max(0, attackWait - dt); attackSwing = Math.max(0, attackSwing - dt); buffTime = Math.max(0, buffTime - dt)
  invisibleTimer = Math.max(0, invisibleTimer - dt)
  prisonTimer = Math.max(0, prisonTimer - dt)
  comboPop = Math.max(0, comboPop - dt)
  if (comboCount > 0) {
    comboTimer = Math.max(0, comboTimer - dt)
    if (comboTimer <= 0) resetCombo()
  }
  cloneAttackPulse = Math.max(0, cloneAttackPulse - dt)
  cloneCastPulse = Math.max(0, cloneCastPulse - dt)
  cloneStealthTimer = Math.max(0, cloneStealthTimer - dt)
  if (cloneTimer > 0) {
    cloneTimer = Math.max(0, cloneTimer - dt)
    const offset = facing > 0 ? -46 : 46
    cloneX += (heroX + offset - cloneX) * Math.min(1, dt * 6)
    cloneY = heroY
    if (cloneTimer <= 0) { cloneHp = 0; cloneStealthTimer = 0 }
  }
  if (bowCharging && bowChargeSource) bowCharge = Math.min(BOW_CHARGE_MAX, bowCharge + dt)
  if (grounded) bowAirLocked = false
  skillWait = skillWait.map((time) => Math.max(0, time - dt))
  if (scene === 'town' && game) {
    const left = keys.has(keyBinds.left) || keys.has('arrowleft')
    const right = keys.has(keyBinds.right) || keys.has('arrowright')
    if (left !== right) {
      const direction = right ? 1 : -1
      heroX = Math.max(TOWN_LEFT, Math.min(TOWN_RIGHT, heroX + direction * townMoveSpeed(runActive) * dt))
      facing = direction
      if (runActive && grounded && Math.random() < dt * 10) addFx('dust', heroX - direction * 14, world.floor + heroY - 2, 1, .22)
    } else runActive = false
    if (keys.has(keyBinds.attack) && attackWait <= 0) attack()
    if (!grounded) {
      heroY += velocityY * dt; velocityY += 1450 * dt
      if (heroY >= 0) { heroY = 0; velocityY = 0; grounded = true; jumpCount = 0 }
    }
    for (const projectile of [...projectiles]) {
      projectile.x += projectile.vx * dt
      projectile.y += (projectile.vy ?? 0) * dt
      projectile.life -= dt
      const landed = projectile.kind === 'fall' && projectile.y >= world.floor - 6
      if (landed) {
        addFx('great-quake', projectile.x, world.floor - 8, 1, .32, '#ffe28a')
        addSparks(projectile.x, world.floor - 8, 5, ['#ffe28a', '#f7ffd8'], 110)
      }
      const expired = projectile.life <= 0 || projectile.x < TOWN_LEFT - 120 || projectile.x > TOWN_RIGHT + 120
      if (projectile.kind === 'blast' && (expired || landed)) explodeBlastProjectile(projectile)
      if (landed || expired) {
        projectiles = projectiles.filter((entry) => entry !== projectile)
      }
    }
    updateSkillObjects(dt)
    cameraX = 0
    syncHud()
  }
  if (bossVictory) {
    bossVictory.time -= dt
    if (bossVictory.time <= 0) finishBossVictory()
  } else if (scene === 'battle' && game) {
    battleTime += dt
    // 宝箱开启动画结束后发放奖励。
    if (bossChest && !bossChest.opened && bossChest.opening > 0) {
      bossChest.opening -= dt
      if (bossChest.opening <= 0) { openBossChest(); return }
    }
    updateSkillObjects(dt)
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
    const left = keys.has(keyBinds.left) || keys.has('arrowleft'); const right = keys.has(keyBinds.right) || keys.has('arrowright')
    if (left !== right) {
      const d = right ? 1 : -1
      heroX = clampHeroX(heroX + d * battleMoveSpeed(runActive) * dt)
      facing = d
      if (runActive && grounded && Math.random() < dt * 10) addFx('dust', heroX - d * 14, world.floor + heroY - 2, 1, .22)
    } else runActive = false
    if (tutorialMode && tutorialStep === 0 && left !== right) advanceTutorialStep(1)
    if (keys.has(keyBinds.attack) && attackWait <= 0) attack()
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
      // 隐匿期间敌人看不到玩家：找不到攻击目标时改为在地图上自由走动。
      if (invisibleTimer > 0 && bombClones.length === 0) { updateFoeWander(foe, dt); continue }
      // 爆裂分身存在时，非镜像敌人会被吸引向其冲锋。
      const taunt = bombClones[0] ?? null
      const taunted = Boolean(taunt) && !foe.mirror
      const distance = (taunted ? taunt!.x : heroX) - foe.x
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
            takeComboHit()
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
        if (Math.abs(distance) < (foe.boss ? 138 : 112) && foe.timer <= 0 && (taunted || heroY > -36)) {
          foe.timer = foe.boss ? Math.max(1, 1.5 - game.stage * .035) : 1.7 + Math.random() * .5
          foe.attackAnim = .35
          const theme = STAGE_THEMES[stageIndex]
          if (taunted) {
            // 仇恨被分身吸引：攻击分身而不是玩家。
            addFx('enemy-swipe', taunt!.x, world.floor - 52, -directionToHero, .38)
            addSparks(taunt!.x, world.floor - 48, foe.boss ? 8 : 5, [theme.accent, theme.glow], foe.boss ? 150 : 110)
            playSfx(foe.boss ? 'boss' : 'slash')
            setLog('实体分身吸引了敌人的仇恨。')
          } else {
            const damage = foeDamage(foe)
            game.hp = Math.max(0, game.hp - damage)
            takeComboHit()
            playSfx(foe.boss ? 'boss' : 'slash')
            playSfx('hurt')
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
      if (projectile.kind) {
        projectile.x += projectile.vx * dt
        projectile.y += (projectile.vy ?? 0) * dt
        projectile.life -= dt
        let remove = projectile.life <= 0
        if (projectile.maxDistance && Math.abs(projectile.x - (projectile.startX ?? projectile.x)) > projectile.maxDistance) remove = true
        if (projectile.x < MAP_LEFT - 100 || projectile.x > unlockedWidth + 100 || projectile.y > world.floor + 60 || projectile.y < -300) remove = true
        let touched = false
        for (const foe of [...foes]) {
          if (projectile.hitIds?.includes(foe.id)) continue
          const foeY = foe.flying ? foeWorldY(foe) - 8 : world.floor - (foe.boss ? 96 : 46)
          const hit = projectile.kind === 'fall'
            ? Math.abs(foe.x - projectile.x) < (foe.boss ? 58 : 30) && projectile.y >= foeY - 90 && projectile.y <= foeY + 78
            : Math.abs(foe.x - projectile.x) < (foe.boss ? 56 : 28) && Math.abs(foeY - projectile.y) < (foe.boss ? 110 : 66)
          if (!hit) continue
          if (projectile.kind === 'blast') { touched = true; break }
          if (projectile.kind === 'charged') {
            addFx('charged-arrow', foe.x, foeY, Math.sign(projectile.vx) || 1, .55, '#ffe28a')
            addFx('great-quake', foe.x, world.floor - 8, 1, .65, '#ffe28a')
            addSparks(foe.x, foeY, 22, ['#ffe28a', '#fff6c0', '#c8f0a0'], 250)
            addShake(6); addFlash(.1, '#ffe28a')
          }
          strike(foe, projectile.damage, projectile.label ?? '箭矢', projectile.fromClone ?? false)
          if (projectile.pierce) { projectile.hitIds ??= []; projectile.hitIds.push(foe.id) }
          else { remove = true; break }
        }
        if (projectile.kind === 'blast' && (touched || remove)) {
          explodeBlastProjectile(projectile)
          remove = true
        }
        if (remove) projectiles = projectiles.filter((entry) => entry !== projectile)
      } else {
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
    }
    for (const shot of [...foeShots]) {
      shot.x += shot.vx * dt
      shot.y += shot.vy * dt
      shot.life -= dt
      const heroBottom = world.floor + heroY
      const heroTop = heroBottom - 70
      if (invisibleTimer <= 0 && Math.abs(shot.x - heroX) < 24 && shot.y > heroTop && shot.y < heroBottom + 6) {
        const shotDamage = Math.max(3, Math.round(shot.damage - effectiveDefense()))
        game.hp = Math.max(0, game.hp - shotDamage)
        takeComboHit()
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
        burstWait = .09
        const target = foes.find((foe) => foe.id === burstTargetId)
        if (target) {
          burst -= 1
          prisonX = target.x
          prisonY = target.flying ? foeWorldY(target) - 24 : world.floor - (target.boss ? 120 : 58)
          strike(target, Math.round(stats().attack * (1 + .2 * (skillLevel(3, 'staff') - 1))), `能量禁锢 ${5 - burst} / 5`)
          const hitColor = prisonColor
          addFx('energy-prison-hit', target.x, prisonY, 1, .38, hitColor)
          addFx('arcane-bolt-hit', target.x, prisonY, Math.sign(target.x - heroX) || 1, .42, hitColor)
          addSparks(target.x, prisonY + 8, 14, [hitColor, '#e8fff2', '#ffffff', '#b7f0ff'], 190)
          addShake(3)
          if (burst <= 0) {
            addFx('energy-finale', target.x, world.floor - 70, 1, 1.05, hitColor)
            addFx('great-quake', target.x, world.floor - 8, 1, .8, hitColor)
            addSparks(target.x, world.floor - 60, 42, [hitColor, '#e8fff2', '#b7f0ff', '#ffffff'], 340)
            addFlash(.3, hitColor)
            addShake(15)
            burstTargetId = null
          }
        } else {
          burst = 0
          burstTargetId = null
          addFx('energy-finale', prisonX, prisonY || world.floor - 60, 1, 1, prisonColor)
          addSparks(prisonX, prisonY || world.floor - 60, 30, [prisonColor, '#e8fff2', '#ffffff'], 280)
          addFlash(.2, prisonColor)
          addShake(10)
        }
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
function sceneBackground() {
  const stageIndex = Math.max(0, Math.min(9, (game?.stage ?? 1) - 1))
  return scene === 'town' ? TOWN_BACKGROUND : STAGE_BACKGROUNDS[stageIndex]
}
// 全屏竖屏时在游戏世界上下补足天空与地面，避免拉伸画面。
function fillExtendedBackdrop(c: CanvasRenderingContext2D) {
  const bg = sceneBackground()
  const height = viewHeight
  if (viewOffsetY > 0) {
    c.fillStyle = bg.skyTop
    c.fillRect(0, 0, world.width, viewOffsetY)
    c.fillStyle = 'rgba(230, 225, 255, .16)'
    for (let i = 0; i < 46; i++) {
      const x = (i * 137 + 41) % world.width
      const y = (i * 89 + 23) % Math.max(1, viewOffsetY)
      c.fillRect(x, y, 1.5, 1.5)
    }
  }
  const bottomStart = viewOffsetY + world.height
  if (height > bottomStart) {
    const ground = c.createLinearGradient(0, bottomStart, 0, height)
    ground.addColorStop(0, bg.ground); ground.addColorStop(1, '#081110')
    c.fillStyle = ground
    c.fillRect(0, bottomStart, world.width, height - bottomStart)
  }
}
function drawBackground(c: CanvasRenderingContext2D) {
  const town = scene === 'town'
  const stageIndex = Math.max(0, Math.min(9, (game?.stage ?? 1) - 1))
  const bg = sceneBackground()
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
  const walking = grounded && (keys.has(keyBinds.left) || keys.has(keyBinds.right) || keys.has('arrowleft') || keys.has('arrowright'))
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
function weaponStyle(): WeaponStyle { return activeWeaponStyle() }
function weaponFxColor() {
  const weapon = equippedWeapon()
  const level = weapon?.level ?? 1
  const style = weaponStyle()
  const colors: Record<string, string[]> = {
    sword: ['#ffe6a8', '#ffd27a', '#f5cf7a', '#ffe9b0', '#ffc46b', '#fff2c8'],
    axe: ['#ffb066', '#ff9a4d', '#ffc78a', '#ff7a3d', '#ffd6a0', '#ffb066'],
    staff: ['#c7b3ff', '#9fe8ff', '#ffb3e6', '#b3ffcf', '#fff0a8', '#c7b3ff'],
    blade: ['#9fe8ff', '#c7b3ff', '#b3ffcf', '#ffd6a0', '#ffb3e6', '#9fe8ff'],
    bow: ['#c8f0a0', '#8fdf7a', '#ffe28a', '#a7f0d2', '#d4f5a8', '#9fe8b0'],
    book: ['#d6b4ff', '#9fe8ff', '#ffb3e6', '#c7f0ff', '#e6d0ff', '#b3f0d8'],
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
  if (tier >= 6) return { top: '#3b2f6b', bottom: '#16122b', trim: '#8ff4ff' }
  if (tier >= 5) return { top: '#e8e2cf', bottom: '#6b6f8f', trim: '#ffd76a' }
  if (tier >= 4) return { top: '#7fc7d9', bottom: '#2b3f6e', trim: '#fff2b0' }
  if (tier >= 3) return { top: '#c25a3f', bottom: '#4a1f1c', trim: '#ffd18a' }
  if (tier >= 2) return { top: '#8a5cc2', bottom: '#3b245c', trim: '#f0c9ff' }
  if (tier >= 1) return { top: '#3e8f87', bottom: '#17413f', trim: '#e7d18f' }
  return null
}
// 时装背部光效：三阶起出现能量翼，五阶叠加第二层。
function drawFashionBack(c: CanvasRenderingContext2D, tier: number, palette: { top: string; bottom: string; trim: string }, now: number) {
  if (tier < 3) return
  c.save()
  c.globalAlpha = (.13 + Math.min(.12, tier * .018)) * (.9 + Math.sin(now / 520) * .1)
  c.fillStyle = palette.trim
  for (const side of [-1, 1]) {
    c.beginPath()
    c.moveTo(side * 9, -60)
    c.quadraticCurveTo(side * (30 + tier * 3), -96, side * (46 + tier * 4), -38)
    c.quadraticCurveTo(side * (28 + tier * 2), -56, side * 7, -44)
    c.closePath(); c.fill()
  }
  if (tier >= 5) {
    c.globalAlpha = .1 + Math.min(.1, (tier - 4) * .02)
    c.fillStyle = palette.top
    for (const side of [-1, 1]) {
      c.beginPath()
      c.moveTo(side * 12, -56)
      c.quadraticCurveTo(side * (40 + tier * 3), -88, side * (58 + tier * 3), -30)
      c.quadraticCurveTo(side * (34 + tier * 2), -48, side * 10, -40)
      c.closePath(); c.fill()
    }
  }
  c.globalAlpha = .16 + tier * .012
  c.strokeStyle = palette.trim; c.lineWidth = 1.1
  for (const side of [-1, 1]) {
    c.beginPath(); c.arc(side * (18 + tier * 2), -55, 20 + tier * 2, 0, Math.PI * 2); c.stroke()
  }
  c.restore()
}
// 时装正面装饰：腰带、肩部晶体、胸口徽记、光环与高阶符文。
function drawFashionFront(c: CanvasRenderingContext2D, tier: number, palette: { top: string; bottom: string; trim: string }, now: number) {
  if (tier < 2) return
  c.save()
  c.globalAlpha = .8; c.strokeStyle = palette.trim; c.lineWidth = 1.3
  c.beginPath(); c.moveTo(-15, -38); c.quadraticCurveTo(0, -32, 15, -38); c.stroke()
  if (tier >= 3) {
    for (const side of [-1, 1]) {
      const bob = Math.sin(now / 400 + side) * 1.5
      c.save(); c.translate(side * (19 + Math.min(6, tier)), -64 + bob); c.rotate(now / 900 * side)
      c.fillStyle = palette.trim; c.shadowColor = palette.trim; c.shadowBlur = 8
      c.beginPath(); c.moveTo(0, -4); c.lineTo(3, 0); c.lineTo(0, 4); c.lineTo(-3, 0); c.closePath(); c.fill()
      c.restore()
    }
    c.fillStyle = palette.trim
    c.beginPath(); c.moveTo(0, -52); c.lineTo(3.5, -47); c.lineTo(0, -42); c.lineTo(-3.5, -47); c.closePath(); c.fill()
  }
  if (tier >= 4) {
    c.globalAlpha = .55; c.strokeStyle = palette.trim; c.lineWidth = 1.4
    c.beginPath(); c.ellipse(0, -105, 12 + tier * 1.5, 4 + tier * .5, 0, 0, Math.PI * 2); c.stroke()
    if (tier >= 5) {
      c.globalAlpha = .32
      c.beginPath(); c.ellipse(0, -112, 16 + tier, 5 + tier * .4, 0, 0, Math.PI * 2); c.stroke()
    }
  }
  if (tier >= 5) {
    c.globalAlpha = .7
    for (let i = 0; i < 4; i += 1) {
      const angle = now / 850 + i * Math.PI / 2
      const px = Math.cos(angle) * (24 + tier * 2)
      const py = -60 + Math.sin(angle) * (10 + tier)
      c.save(); c.translate(px, py); c.rotate(angle)
      c.fillStyle = i % 2 ? palette.trim : palette.top
      c.beginPath(); c.moveTo(0, -3); c.lineTo(2.2, 0); c.lineTo(0, 3); c.lineTo(-2.2, 0); c.closePath(); c.fill()
      c.restore()
    }
  }
  if (tier >= 6) {
    c.globalAlpha = .14 + Math.sin(now / 300) * .04
    c.fillStyle = palette.trim
    c.beginPath(); c.ellipse(0, -52, 25, 50, 0, 0, Math.PI * 2); c.fill()
  }
  c.restore()
}
// 时装环绕特效：阶级越高，光环、地面法阵与粒子越丰富。
function drawFashionOrbit(c: CanvasRenderingContext2D, jumpHeight: number) {
  if (!game) return
  const tier = equippedLevel('fashion')
  const palette = fashionPalette(tier)
  if (!tier || !palette) return
  const now = performance.now()
  const centerX = heroX
  const centerY = world.floor - jumpHeight - 37
  const count = Math.min(14, 2 + tier * 2)
  const radiusX = 24 + Math.min(18, tier * 3)
  const radiusY = 13 + Math.min(12, tier * 2)
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
  // 四阶起：地面法阵与旋转刻度。
  if (tier >= 4) {
    const groundY = world.floor - jumpHeight + 2
    c.globalAlpha = .24; c.strokeStyle = palette.trim; c.lineWidth = 1.4
    c.beginPath(); c.ellipse(centerX, groundY, 34 + tier * 4, 10 + tier, 0, 0, Math.PI * 2); c.stroke()
    c.globalAlpha = .18
    c.beginPath(); c.ellipse(centerX, groundY, 46 + tier * 4, 14 + tier, 0, 0, Math.PI * 2); c.stroke()
    c.globalAlpha = .4; c.fillStyle = palette.trim
    for (let i = 0; i < 8; i += 1) {
      const angle = now / 1400 + i * Math.PI / 4
      const px = centerX + Math.cos(angle) * (34 + tier * 4)
      const py = groundY + Math.sin(angle) * (10 + tier)
      c.fillRect(px - 1, py - 1, 2, 2)
    }
  }
  // 五阶起：身后光柱与光翼。
  if (tier >= 5) {
    const beam = c.createLinearGradient(centerX, centerY - 90, centerX, centerY + 46)
    beam.addColorStop(0, `${palette.trim}00`); beam.addColorStop(.5, `${palette.trim}2e`); beam.addColorStop(1, `${palette.trim}00`)
    c.globalAlpha = 1; c.fillStyle = beam
    c.fillRect(centerX - 12 - tier, centerY - 90, 24 + tier * 2, 136)
    c.globalAlpha = .2; c.fillStyle = palette.trim
    for (const side of [-1, 1]) {
      c.beginPath()
      c.moveTo(centerX + side * 8, centerY - 20)
      c.quadraticCurveTo(centerX + side * (48 + tier * 4), centerY - 62, centerX + side * (62 + tier * 5), centerY + 16)
      c.quadraticCurveTo(centerX + side * (34 + tier * 3), centerY + 2, centerX + side * 8, centerY + 10)
      c.closePath(); c.fill()
    }
  }
  // 六阶起：双层光环。
  if (tier >= 6) {
    c.globalAlpha = .45; c.strokeStyle = palette.trim; c.lineWidth = 1.6
    c.beginPath(); c.ellipse(centerX, centerY - 78, 26, 8, 0, 0, Math.PI * 2); c.stroke()
    c.globalAlpha = .25
    c.beginPath(); c.ellipse(centerX, centerY - 88, 34, 10, 0, 0, Math.PI * 2); c.stroke()
  }
  for (let i = 0; i < count; i++) {
    const speed = 900 - Math.min(380, tier * 55)
    const angle = now / speed + (i * Math.PI * 2) / count
    const x = centerX + Math.cos(angle) * radiusX
    const y = centerY + Math.sin(angle) * radiusY
    c.save(); c.translate(x, y); c.rotate(angle)
    c.shadowColor = palette.trim; c.shadowBlur = 8 + tier
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
    drawFashionBack(c, fashionTier, fashion, now)
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
  // 三阶起披风分叉；四阶起叠加飘带。
  if (fashion && fashionTier >= 3) {
    c.save(); c.globalAlpha = .55; c.fillStyle = fashion.bottom
    c.beginPath(); c.moveTo(6, -60); c.quadraticCurveTo(30, -42, 24 + capeWave * .6, -8); c.lineTo(10, -14); c.closePath(); c.fill()
    c.strokeStyle = fashion.trim; c.lineWidth = 1.1; c.stroke(); c.restore()
  }
  if (fashion && fashionTier >= 4) {
    c.save(); c.strokeStyle = fashion.trim; c.lineWidth = 1.2; c.globalAlpha = .5
    for (let ribbon = 0; ribbon < 3; ribbon += 1) {
      const offset = ribbon * 8
      c.beginPath(); c.moveTo(-14 - offset, -52); c.quadraticCurveTo(-38 - offset, -28, -30 - offset + capeWave, -4); c.stroke()
    }
    c.restore()
  }
  // 双持专精：背后的副武器
  if (dualWieldUnlocked() && game?.weapon2Id) {
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
  if (fashion) drawFashionFront(c, fashionTier, fashion, now)
  // 弓箭
  if (weaponStyle() === 'bow') {
    c.save(); c.translate(15, -54); if (attackSwing > 0) c.rotate(-.32)
    c.strokeStyle = bladeTint.dark; c.lineWidth = 3.2
    c.beginPath(); c.arc(7, -1, 28, -Math.PI / 2.4, Math.PI / 2.4); c.stroke()
    c.strokeStyle = bladeTint.light; c.lineWidth = 1.2
    c.beginPath(); c.moveTo(17, -27); c.lineTo(17, 25); c.stroke()
    c.fillStyle = bladeTint.glow || '#e7cf8e'; c.fillRect(2, -4, 5, 9)
    if (bowCharging) { c.strokeStyle = '#f7ffd8'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(2, 0); c.lineTo(34, 0); c.stroke() }
    c.restore()
    return
  }
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
    drawFashionBack(c, fashionTier, fashion, now)
  }
  // 披风：装备时装后更换配色
  const cape = c.createLinearGradient(0, -64, 0, -4)
  cape.addColorStop(0, fashion?.top ?? '#2f6b60'); cape.addColorStop(1, fashion?.bottom ?? '#183a35')
  c.fillStyle = cape; c.beginPath(); c.moveTo(-12, -62); c.quadraticCurveTo(-30, -36, -26 + wave, -6); c.lineTo(-4, -12); c.lineTo(10, -8); c.lineTo(12, -60); c.closePath(); c.fill()
  c.strokeStyle = 'rgba(8, 20, 18, .62)'; c.lineWidth = 1.3; c.stroke()
  c.fillStyle = 'rgba(197, 255, 232, .12)'; c.beginPath(); c.moveTo(-10, -58); c.quadraticCurveTo(-21, -32, -19 + wave, -12); c.lineTo(-11, -16); c.closePath(); c.fill()
  if (fashion) { c.strokeStyle = fashion.trim; c.globalAlpha = .7; c.lineWidth = 1; c.stroke(); c.globalAlpha = 1 }
  if (fashion && fashionTier >= 3) {
    c.save(); c.globalAlpha = .55; c.fillStyle = fashion.bottom
    c.beginPath(); c.moveTo(6, -60); c.quadraticCurveTo(28, -40, 22 + wave * .6, -8); c.lineTo(9, -14); c.closePath(); c.fill()
    c.strokeStyle = fashion.trim; c.lineWidth = 1.1; c.stroke(); c.restore()
  }
  if (fashion && fashionTier >= 4) {
    c.save(); c.strokeStyle = fashion.trim; c.lineWidth = 1.2; c.globalAlpha = .5
    for (let ribbon = 0; ribbon < 3; ribbon += 1) {
      const offset = ribbon * 8
      c.beginPath(); c.moveTo(-14 - offset, -54); c.quadraticCurveTo(-34 - offset, -28, -28 - offset + wave, -4); c.stroke()
    }
    c.restore()
  }
  // 双持专精：背后的副法杖
  if (dualWieldUnlocked() && game?.weapon2Id) {
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
  if (fashion) drawFashionFront(c, fashionTier, fashion, now)
  // 魔法书
  if (weaponStyle() === 'book') {
    c.save(); c.translate(18, -38 + Math.sin(now / 420) * 2); c.rotate(-.12)
    c.shadowColor = gem; c.shadowBlur = 14
    c.fillStyle = '#3a2c55'; c.fillRect(-11, -14, 22, 28)
    c.fillStyle = gem; c.fillRect(-9, -12, 18, 24)
    c.fillStyle = '#f4eaff'; c.fillRect(-5, -8, 10, 16)
    c.strokeStyle = trim; c.lineWidth = 1.2; c.strokeRect(-11, -14, 22, 28)
    for (let i = 0; i < 3; i++) c.fillRect(-3, -5 + i * 5, 6, 1)
    c.restore()
    return
  }
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
// 宿敌换武器时在头顶显示金色武器轮廓与提示文字。
function drawMirrorSwitchHint(c: CanvasRenderingContext2D, foe: Foe, now: number) {
  const nextRole = foe.mirrorNextRole ?? (foe.mirrorRole === 'warrior' ? 'mage' : 'warrior')
  const x = foe.x
  const y = world.floor - 150 + Math.sin(now / 240) * 4
  c.save()
  c.translate(x, y)
  c.strokeStyle = '#ffe08a'; c.fillStyle = 'rgba(255, 224, 138, .92)'; c.lineWidth = 2
  if (nextRole === 'warrior') {
    c.beginPath(); c.moveTo(0, -22); c.lineTo(0, 8); c.stroke()
    c.beginPath(); c.moveTo(-7, 8); c.lineTo(7, 8); c.stroke()
    c.beginPath(); c.moveTo(-2.5, 10); c.lineTo(-2.5, 19); c.lineTo(2.5, 19); c.lineTo(2.5, 10); c.closePath(); c.fill()
  } else {
    c.beginPath(); c.moveTo(0, 22); c.lineTo(0, -8); c.stroke()
    c.beginPath(); c.arc(0, -13, 6, 0, Math.PI * 2); c.stroke()
    c.beginPath(); c.arc(0, -13, 3, 0, Math.PI * 2); c.fill()
  }
  c.font = 'bold 11px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'
  c.fillStyle = '#ffe9a8'; c.shadowColor = 'rgba(0,0,0,.7)'; c.shadowBlur = 4
  c.fillText('更换武器', 0, 34)
  c.restore()
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
  // 宿敌更换武器前摇：全身散发金光，并显示即将换上的武器。
  if (foe.mirror && (foe.mirrorSwitch ?? 0) > 0) {
    const gold = c.createRadialGradient(foe.x, world.floor - 60, 6, foe.x, world.floor - 60, 92)
    gold.addColorStop(0, 'rgba(255, 240, 170, .55)'); gold.addColorStop(.55, 'rgba(255, 205, 80, .24)'); gold.addColorStop(1, 'rgba(255, 205, 80, 0)')
    c.save()
    c.fillStyle = gold; c.beginPath(); c.arc(foe.x, world.floor - 60, 92, 0, Math.PI * 2); c.fill()
    c.strokeStyle = 'rgba(255, 230, 150, .85)'; c.lineWidth = 2
    c.beginPath(); c.ellipse(foe.x, world.floor - 60, 36 + Math.sin(now / 140) * 4, 48, 0, 0, Math.PI * 2); c.stroke()
    drawMirrorSwitchHint(c, foe, now)
    c.restore()
  }
  c.save(); c.translate(foe.x + lunge * dir, world.floor - flyHeight + bob); c.rotate(sway); c.scale(scale * dir, scale)
  if (foe.flash > 0) c.filter = 'brightness(2)'
  else { c.shadowColor = theme.glow; c.shadowBlur = foe.boss ? 14 : 6 }
  if (foe.tutorial) drawTutorialBossModel(c)
  else if (foe.mirror) {
    c.save()
    c.shadowColor = (foe.mirrorSwitch ?? 0) > 0 ? '#ffe08a' : '#c9a7e8'
    c.shadowBlur = (foe.mirrorSwitch ?? 0) > 0 ? 30 : 16
    c.globalAlpha = .95
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
    c.fillStyle = fx.text?.startsWith('-') ? '#ffe09a' : fx.text?.startsWith('+') ? '#9ff0a8' : '#ffc3a7'; c.fillText(fx.text ?? '', fx.x, fx.y - progress * 38)
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
    const now = performance.now()
    c.shadowColor = '#ff7a3d'; c.shadowBlur = 26
    // 地面灼烧法阵
    c.globalAlpha = alpha * .55; c.fillStyle = 'rgba(232, 120, 74, .28)'
    c.beginPath(); c.ellipse(fx.x, fx.y + 8, 150 + progress * 36, 18, 0, 0, Math.PI * 2); c.fill()
    c.globalAlpha = alpha * .7; c.strokeStyle = '#ffb066'; c.lineWidth = 2
    c.beginPath(); c.ellipse(fx.x, fx.y + 8, 64 + progress * 34, 15 + progress * 6, 0, 0, Math.PI * 2); c.stroke()
    for (const [offset, warm] of [[-80, false], [80, true]] as const) {
      const px = fx.x + offset
      // 外层火焰
      c.globalAlpha = alpha
      c.fillStyle = warm ? '#f2a35c' : '#e86e4a'
      c.beginPath(); c.moveTo(px - 24, fx.y + 10); c.quadraticCurveTo(px - 16, fx.y - 65, px + 4, fx.y - 150 - progress * 18); c.quadraticCurveTo(px + 24, fx.y - 56, px + 22, fx.y + 10); c.closePath(); c.fill()
      // 内焰
      c.fillStyle = warm ? '#ffe0a0' : '#ffd07a'
      c.beginPath(); c.moveTo(px - 10, fx.y + 8); c.quadraticCurveTo(px - 4, fx.y - 46, px + 3, fx.y - 96 - progress * 12); c.quadraticCurveTo(px + 12, fx.y - 40, px + 11, fx.y + 8); c.closePath(); c.fill()
      // 螺旋火舌
      c.globalAlpha = alpha * .85; c.strokeStyle = warm ? '#ffd27a' : '#ff9a5c'; c.lineWidth = 3
      for (let swirl = 0; swirl < 3; swirl += 1) {
        c.beginPath()
        for (let i = 0; i < 9; i += 1) {
          const yy = fx.y + 8 - i * 15
          const xx = px + Math.sin(now / 140 + swirl * 2.1 + i * .65) * (12 + progress * 8 + swirl * 3)
          if (i === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy)
        }
        c.stroke()
      }
      // 上升余烬
      c.fillStyle = '#fff2c0'
      for (let ember = 0; ember < 7; ember += 1) {
        const ey = fx.y - ((now / 7 + ember * 41) % 170)
        const ex = px + Math.sin(ember * 2 + now / 320) * (20 + progress * 16)
        c.globalAlpha = alpha * (.45 + (ember % 3) * .18)
        c.beginPath(); c.arc(ex, ey, 1.6 + (ember % 2), 0, Math.PI * 2); c.fill()
      }
      // 火柱底部冲击环
      c.globalAlpha = alpha * .55; c.strokeStyle = '#ffd27a'; c.lineWidth = 2.5
      c.beginPath(); c.ellipse(px, fx.y + 7, 28 + progress * 40, 9 + progress * 12, 0, 0, Math.PI * 2); c.stroke()
    }
    // 两根火柱之间的火焰弧
    c.globalAlpha = alpha * .7; c.strokeStyle = '#ffe0a0'; c.lineWidth = 3
    c.beginPath(); c.moveTo(fx.x - 80, fx.y - 42); c.quadraticCurveTo(fx.x, fx.y - 128 - progress * 24, fx.x + 80, fx.y - 42); c.stroke()
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
    const color = fx.color ?? '#a8e0d0'
    const spin = performance.now() / 400
    c.shadowColor = color; c.shadowBlur = 22
    // 双层旋转笼柱
    for (let layer = 0; layer < 2; layer += 1) {
      const sides = layer === 0 ? 6 : 4
      c.save(); c.translate(fx.x, fx.y); c.rotate(spin * (layer ? -1 : 1))
      c.globalAlpha = alpha * (layer ? .48 : .92)
      c.strokeStyle = layer ? '#e8fff2' : color; c.lineWidth = layer ? 2 : 3.6
      for (let side = 0; side < sides; side += 1) {
        c.rotate((Math.PI * 2) / sides)
        c.beginPath(); c.moveTo(0, -78); c.lineTo(20, -22); c.lineTo(0, 34); c.lineTo(-20, -22); c.closePath(); c.stroke()
      }
      c.restore()
    }
    // 垂直光柱与地面法阵
    c.globalAlpha = alpha * .5; c.strokeStyle = color; c.lineWidth = 1.5
    for (let i = 0; i < 6; i += 1) {
      const angle = spin + (i * Math.PI) / 3
      const px = fx.x + Math.cos(angle) * 44
      c.beginPath(); c.moveTo(px, fx.y + 46); c.lineTo(px, fx.y - 96); c.stroke()
    }
    c.globalAlpha = alpha * .75; c.strokeStyle = color; c.lineWidth = 2
    c.beginPath(); c.ellipse(fx.x, world.floor - 4, 60 + Math.sin(spin) * 4, 16, 0, 0, Math.PI * 2); c.stroke()
    c.fillStyle = '#e8fff2'
    for (let i = 0; i < 6; i += 1) {
      const angle = spin * .6 + (i * Math.PI) / 3
      c.beginPath(); c.arc(fx.x + Math.cos(angle) * 54, world.floor - 4 + Math.sin(angle) * 13, 2.6, 0, Math.PI * 2); c.fill()
    }
    c.globalAlpha = alpha; c.fillStyle = '#ffffff'
    c.beginPath(); c.arc(fx.x, fx.y, 6 + Math.sin(spin * 2) * 2, 0, Math.PI * 2); c.fill()
  } else if (fx.kind === 'arcane-seal') {
    const color = fx.color ?? '#a8e0d0'
    const now = performance.now()
    const groundY = world.floor - 4
    c.save()
    c.shadowColor = color; c.shadowBlur = 18
    c.globalAlpha = alpha * .8; c.strokeStyle = color; c.lineWidth = 2.5
    c.beginPath(); c.ellipse(fx.x, groundY, 60 + progress * 20, 16 + progress * 5, 0, 0, Math.PI * 2); c.stroke()
    for (let layer = 0; layer < 2; layer += 1) {
      c.save(); c.translate(fx.x, groundY); c.rotate(now / 700 * (layer ? -1 : 1)); c.scale(1, .3)
      c.globalAlpha = alpha * (layer ? .35 : .65); c.lineWidth = layer ? 1.4 : 2
      c.beginPath()
      for (let k = 0; k < 6; k += 1) {
        const angle = (k * Math.PI) / 3
        const px = Math.cos(angle) * (46 + progress * 22)
        const py = Math.sin(angle) * (46 + progress * 22)
        if (k === 0) c.moveTo(px, py); else c.lineTo(px, py)
      }
      c.closePath(); c.stroke(); c.restore()
    }
    c.globalAlpha = alpha * .9; c.fillStyle = '#e8fff2'
    for (let i = 0; i < 8; i += 1) {
      const angle = now / 900 + (i * Math.PI) / 4
      c.beginPath(); c.arc(fx.x + Math.cos(angle) * (56 + progress * 16), groundY + Math.sin(angle) * (14 + progress * 4), 2.2, 0, Math.PI * 2); c.fill()
    }
    c.restore()
  } else if (fx.kind === 'energy-chain') {
    const dir = fx.direction ?? 1
    const span = fx.radius ?? 220
    const color = fx.color ?? '#a8e0d0'
    const now = performance.now()
    const startX = fx.x - dir * span / 2
    const endX = fx.x + dir * span / 2
    c.shadowColor = color; c.shadowBlur = 26
    c.globalAlpha = alpha * .9; c.strokeStyle = color; c.lineWidth = 6
    c.beginPath(); c.moveTo(startX, fx.y)
    const segments = 14
    for (let i = 1; i <= segments; i += 1) {
      const t = i / segments
      const px = startX + (endX - startX) * t
      const py = fx.y + Math.sin(now / 70 + i * 1.4) * 7 * (1 - t * .3)
      c.lineTo(px, py)
    }
    c.stroke()
    c.globalAlpha = alpha; c.strokeStyle = '#ffffff'; c.lineWidth = 2
    c.beginPath(); c.moveTo(startX, fx.y); c.lineTo(endX, fx.y); c.stroke()
    c.globalAlpha = alpha * .7; c.strokeStyle = '#e8fff2'; c.lineWidth = 1.6
    for (let i = 0; i < 9; i += 1) {
      const px = startX + (endX - startX) * (i / 8)
      c.beginPath(); c.ellipse(px, fx.y, 5, 3, 0, 0, Math.PI * 2); c.stroke()
    }
    const pulseX = startX + (endX - startX) * ((now / 260) % 1)
    c.globalAlpha = alpha; c.fillStyle = '#ffffff'
    c.beginPath(); c.arc(pulseX, fx.y, 5.5, 0, Math.PI * 2); c.fill()
  } else if (fx.kind === 'energy-finale') {
    const color = fx.color ?? '#a8e0d0'
    const now = performance.now()
    c.shadowColor = color; c.shadowBlur = 30
    for (let ring = 0; ring < 3; ring += 1) {
      const p = Math.min(1, progress + ring * .08)
      c.globalAlpha = alpha * (.9 - ring * .22)
      c.strokeStyle = ring === 0 ? '#ffffff' : color; c.lineWidth = 5 - ring
      c.beginPath(); c.arc(fx.x, fx.y, 20 + p * 130, 0, Math.PI * 2); c.stroke()
    }
    const radius = 50 + progress * 70
    c.globalAlpha = alpha * .85; c.strokeStyle = color; c.lineWidth = 3
    for (let layer = 0; layer < 2; layer += 1) {
      c.save(); c.translate(fx.x, fx.y); c.rotate(now / 400 + layer * Math.PI / 6)
      c.beginPath()
      for (let k = 0; k < 6; k += 1) {
        const angle = (k * Math.PI) / 3
        const px = Math.cos(angle) * radius
        const py = Math.sin(angle) * radius
        if (k === 0) c.moveTo(px, py); else c.lineTo(px, py)
      }
      c.closePath(); c.stroke(); c.restore()
    }
    c.globalAlpha = alpha * .7
    for (let i = 0; i < 16; i += 1) {
      const angle = (i / 16) * Math.PI * 2 + progress
      const inner = 20 + progress * 50
      const outer = 60 + progress * 150
      c.beginPath(); c.moveTo(fx.x + Math.cos(angle) * inner, fx.y + Math.sin(angle) * inner)
      c.lineTo(fx.x + Math.cos(angle) * outer, fx.y + Math.sin(angle) * outer); c.stroke()
    }
    c.globalAlpha = alpha; c.fillStyle = '#ffffff'
    c.beginPath(); c.arc(fx.x, fx.y, 10 + progress * 28, 0, Math.PI * 2); c.fill()
  } else if (fx.kind === 'arcane-empower') {
    const color = fx.color ?? '#b9e0d2'
    const now = performance.now()
    c.shadowColor = color; c.shadowBlur = 24
    c.globalAlpha = alpha * .8; c.strokeStyle = color; c.lineWidth = 2.5
    c.beginPath(); c.ellipse(fx.x, fx.y + 8, 40 + progress * 54, 14 + progress * 18, 0, 0, Math.PI * 2); c.stroke()
    c.globalAlpha = alpha * .55; c.lineWidth = 1.5
    for (let ring = 0; ring < 2; ring += 1) {
      c.save(); c.translate(fx.x, fx.y - 28); c.rotate(now / 600 + ring * Math.PI / 3)
      c.beginPath()
      for (let k = 0; k < 6; k += 1) {
        const angle = (k * Math.PI) / 3
        const px = Math.cos(angle) * (38 + progress * 26)
        const py = Math.sin(angle) * (38 + progress * 26) * .55
        if (k === 0) c.moveTo(px, py); else c.lineTo(px, py)
      }
      c.closePath(); c.stroke(); c.restore()
    }
    c.globalAlpha = alpha * .5
    for (let i = 0; i < 6; i += 1) {
      const angle = now / 800 + (i * Math.PI) / 3
      const px = fx.x + Math.cos(angle) * 36
      c.beginPath(); c.moveTo(px, fx.y - 6); c.lineTo(px, fx.y - 140 - progress * 50); c.stroke()
    }
    c.fillStyle = color
    for (let i = 0; i < 8; i += 1) {
      const angle = now / 700 + (i * Math.PI) / 4
      const px = fx.x + Math.cos(angle) * (44 + progress * 20)
      const py = fx.y - 55 + Math.sin(angle) * (18 + progress * 10)
      c.beginPath(); c.moveTo(px, py - 3); c.lineTo(px + 2.4, py); c.lineTo(px, py + 3); c.lineTo(px - 2.4, py); c.closePath(); c.fill()
    }
    c.globalAlpha = alpha; c.fillStyle = '#ffffff'
    c.beginPath(); c.arc(fx.x, fx.y - 60, 10 + progress * 26, 0, Math.PI * 2); c.fill()
  } else if (fx.kind === 'blink-burst') {
    const color = fx.color ?? '#b7e8ff'
    c.shadowColor = color; c.shadowBlur = 26
    for (let ring = 0; ring < 3; ring += 1) {
      c.globalAlpha = alpha * (.85 - ring * .2)
      c.strokeStyle = ring === 0 ? '#ffffff' : color; c.lineWidth = 4 - ring
      c.beginPath(); c.arc(fx.x, fx.y, 18 + progress * 70 + ring * 8, 0, Math.PI * 2); c.stroke()
    }
    c.globalAlpha = alpha * .7; c.strokeStyle = color; c.lineWidth = 3
    for (let slit = -1; slit <= 1; slit += 1) {
      c.beginPath(); c.moveTo(fx.x + slit * 10, fx.y - 72)
      c.quadraticCurveTo(fx.x + slit * 26, fx.y, fx.x + slit * 10, fx.y + 62); c.stroke()
    }
    c.fillStyle = '#ffffff'
    for (let i = 0; i < 8; i += 1) {
      const angle = performance.now() / 300 + (i * Math.PI) / 4
      c.beginPath(); c.arc(fx.x + Math.cos(angle) * (30 + progress * 24), fx.y + Math.sin(angle) * (30 + progress * 18), 2, 0, Math.PI * 2); c.fill()
    }
  } else if (fx.kind === 'blink-trail') {
    const dir = fx.direction ?? 1
    const span = fx.radius ?? 140
    const color = fx.color ?? '#b7e8ff'
    c.shadowColor = color; c.shadowBlur = 20
    c.globalAlpha = alpha * .8; c.strokeStyle = color; c.lineWidth = 7
    c.beginPath(); c.moveTo(fx.x - dir * span / 2, fx.y); c.lineTo(fx.x + dir * span / 2, fx.y); c.stroke()
    c.globalAlpha = alpha; c.strokeStyle = '#ffffff'; c.lineWidth = 2
    c.beginPath(); c.moveTo(fx.x - dir * span / 2, fx.y); c.lineTo(fx.x + dir * span / 2, fx.y); c.stroke()
    c.globalAlpha = alpha * .6; c.strokeStyle = color; c.lineWidth = 2
    for (let i = 0; i < 6; i += 1) {
      const px = fx.x - dir * span / 2 + dir * ((i + 1) * span / 7)
      c.beginPath(); c.moveTo(px, fx.y - 20); c.lineTo(px, fx.y + 20); c.stroke()
    }
  } else if (fx.kind === 'fire-nova') {
    const color = fx.color ?? '#ffd27a'
    c.shadowColor = '#ff7a3d'; c.shadowBlur = 26
    for (let ring = 0; ring < 3; ring += 1) {
      const p = Math.min(1, progress + ring * .1)
      c.globalAlpha = alpha * (.9 - ring * .22)
      c.strokeStyle = ring === 0 ? '#fff2c0' : '#ff9a5c'; c.lineWidth = 5 - ring
      c.beginPath(); c.ellipse(fx.x, fx.y, 30 + p * 150, 15 + p * 56, 0, 0, Math.PI * 2); c.stroke()
    }
    c.globalAlpha = alpha * .85; c.fillStyle = '#fff6d0'
    c.beginPath(); c.arc(fx.x, fx.y, 14 + progress * 22, 0, Math.PI * 2); c.fill()
    for (let i = 0; i < 24; i += 1) {
      const angle = (i / 24) * Math.PI * 2 + progress
      const radius = 20 + progress * 140
      c.globalAlpha = alpha * (.4 + (i % 3) * .18)
      c.fillStyle = i % 2 ? color : '#ff9a5c'
      c.beginPath(); c.arc(fx.x + Math.cos(angle) * radius, fx.y + Math.sin(angle) * radius * .6, 2 + (i % 3), 0, Math.PI * 2); c.fill()
    }
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
  } else if (fx.kind === 'charged-arrow') {
    const dir = fx.direction ?? 1
    const color = fx.color ?? '#ffe28a'
    c.shadowColor = color; c.shadowBlur = 26
    for (let ring = 0; ring < 3; ring++) {
      const p = Math.min(1, progress + ring * .1)
      c.globalAlpha = alpha * (.9 - ring * .22)
      c.strokeStyle = ring === 0 ? '#fff6c0' : color
      c.lineWidth = 7 - ring * 2
      c.beginPath(); c.ellipse(fx.x + dir * p * 70, fx.y, 30 + p * 90, 18 + p * 46, 0, 0, Math.PI * 2); c.stroke()
    }
    c.globalAlpha = alpha * .85; c.strokeStyle = '#fff6c0'; c.lineWidth = 4
    c.beginPath(); c.moveTo(fx.x - dir * (20 + progress * 80), fx.y); c.lineTo(fx.x + dir * (80 + progress * 160), fx.y); c.stroke()
    c.fillStyle = color
    for (let rune = 0; rune < 6; rune++) {
      const px = fx.x + dir * (rune * 30 + progress * 60)
      const py = fx.y + Math.sin(rune * 1.7 + progress * 4) * 18
      c.beginPath(); c.moveTo(px, py - 4); c.lineTo(px + 3, py); c.lineTo(px, py + 4); c.lineTo(px - 3, py); c.closePath(); c.fill()
    }
    c.globalAlpha = alpha; c.fillStyle = '#ffffff'
    c.beginPath(); c.arc(fx.x, fx.y, 10 + progress * 18, 0, Math.PI * 2); c.fill()
  } else if (fx.kind === 'staff-lightning') {
    // 横向黄色闪电：命中单个目标时在目标处收束，带分叉与白色核心。
    const dir = fx.direction ?? 1
    const half = (fx.radius ?? 230) / 2
    const startX = fx.x - dir * half
    const reach = Math.min(1, progress * 2.4)
    const endX = startX + dir * half * 2 * reach
    const nodes = 9
    const points: Array<[number, number]> = []
    for (let i = 0; i <= nodes; i++) {
      const t = i / nodes
      const px = startX + (endX - startX) * t
      const jitter = i === 0 || i === nodes ? 0 : (Math.random() - .5) * 22
      points.push([px, fx.y + jitter])
    }
    c.shadowColor = '#ffdf5a'; c.shadowBlur = 26
    c.globalAlpha = alpha * .55; c.strokeStyle = '#ffc21a'; c.lineWidth = 12
    c.beginPath(); points.forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py)); c.stroke()
    c.globalAlpha = alpha; c.shadowBlur = 18; c.strokeStyle = '#ffe66a'; c.lineWidth = 6
    c.beginPath(); points.forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py)); c.stroke()
    c.globalAlpha = alpha; c.shadowBlur = 8; c.strokeStyle = '#fffbe0'; c.lineWidth = 2.2
    c.beginPath(); points.forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py)); c.stroke()
    // 分叉小闪电
    c.globalAlpha = alpha * .8; c.strokeStyle = '#ffd84a'; c.lineWidth = 2
    for (let branch = 1; branch < nodes - 1; branch += 2) {
      const [px, py] = points[branch]
      const tipX = px + dir * (18 + Math.random() * 26)
      const tipY = py + (Math.random() < .5 ? -1 : 1) * (14 + Math.random() * 20)
      c.beginPath(); c.moveTo(px, py); c.lineTo(tipX, tipY); c.stroke()
    }
    const glowRadius = Math.max(60, half * 1.4)
    const glow = c.createRadialGradient(fx.x, fx.y, 4, fx.x, fx.y, glowRadius)
    glow.addColorStop(0, `rgba(255, 240, 150, ${.28 * alpha})`); glow.addColorStop(1, 'rgba(255, 220, 80, 0)')
    c.globalAlpha = 1; c.fillStyle = glow
    c.beginPath(); c.ellipse(fx.x, fx.y, Math.max(70, half * 1.5), Math.max(30, half * .4), 0, 0, Math.PI * 2); c.fill()
  } else if (fx.kind === 'bow-draw') {
    const dir = fx.direction ?? 1
    c.strokeStyle = fx.color ?? '#c8f0a0'; c.lineWidth = 3; c.shadowColor = fx.color ?? '#c8f0a0'; c.shadowBlur = 12
    c.beginPath(); c.arc(fx.x + dir * 6, fx.y, 24 + progress * 8, -1.2 * dir, 1.2 * dir, dir < 0); c.stroke()
    c.strokeStyle = '#f7ffd8'; c.lineWidth = 1.4
    c.beginPath(); c.moveTo(fx.x + dir * 16, fx.y - 20); c.lineTo(fx.x + dir * (4 + progress * 10), fx.y); c.lineTo(fx.x + dir * 16, fx.y + 20); c.stroke()
  } else if (fx.kind === 'muzzle') {
    const color = fx.color ?? '#ffe6a8'
    const dir = fx.direction ?? 1
    c.fillStyle = color; c.shadowColor = color; c.shadowBlur = 18
    c.beginPath(); c.arc(fx.x, fx.y, 8 + progress * 12, 0, Math.PI * 2); c.fill()
    c.globalAlpha = alpha * .7; c.strokeStyle = '#ffffff'; c.lineWidth = 2
    c.beginPath(); c.moveTo(fx.x - dir * 8, fx.y); c.lineTo(fx.x + dir * (24 + progress * 26), fx.y); c.stroke()
  } else if (fx.kind === 'arrow-rain') {
    c.globalAlpha = alpha * .8; c.strokeStyle = fx.color ?? '#ffe28a'; c.lineWidth = 3
    c.shadowColor = fx.color ?? '#ffe28a'; c.shadowBlur = 16
    c.beginPath(); c.ellipse(fx.x, fx.y + 40, 40 + progress * 150, 14 + progress * 40, 0, 0, Math.PI * 2); c.stroke()
    c.globalAlpha = alpha * .55
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + progress
      const px = fx.x + Math.cos(angle) * (30 + progress * 90)
      const py = fx.y + 40 + Math.sin(angle) * (12 + progress * 24)
      c.beginPath(); c.moveTo(px, py - 30); c.lineTo(px, py + 30); c.stroke()
    }
  } else if (fx.kind === 'sky-bow') {
    const now = performance.now()
    c.save(); c.translate(fx.x, fx.y); c.rotate(now / 200)
    c.strokeStyle = fx.color ?? '#ffe28a'; c.lineWidth = 4; c.shadowColor = fx.color ?? '#ffe28a'; c.shadowBlur = 22
    c.globalAlpha = alpha
    c.beginPath(); c.arc(0, 0, 44, -Math.PI / 2.2, Math.PI / 2.2); c.stroke()
    c.strokeStyle = '#fffbe0'; c.lineWidth = 2
    c.beginPath(); c.arc(0, 0, 30, -Math.PI / 2.2, Math.PI / 2.2); c.stroke()
    c.beginPath(); c.moveTo(20, -40); c.lineTo(20, 40); c.stroke()
    c.restore()
    c.globalAlpha = alpha * .5; c.strokeStyle = fx.color ?? '#ffe28a'; c.lineWidth = 2
    for (let ring = 0; ring < 3; ring++) {
      c.beginPath(); c.arc(fx.x, fx.y + 40, 30 + progress * 100 + ring * 22, 0, Math.PI * 2); c.stroke()
    }
  } else if (fx.kind === 'arcane-explosion') {
    const color = fx.color ?? '#d6b4ff'
    const radius = 30 + progress * 150
    c.shadowColor = color; c.shadowBlur = 28
    c.globalAlpha = alpha * .85; c.fillStyle = color
    c.beginPath(); c.arc(fx.x, fx.y, radius * .55, 0, Math.PI * 2); c.fill()
    c.globalAlpha = alpha; c.fillStyle = '#ffffff'
    c.beginPath(); c.arc(fx.x, fx.y, radius * .24, 0, Math.PI * 2); c.fill()
    c.globalAlpha = alpha * .8; c.strokeStyle = color; c.lineWidth = 5
    c.beginPath(); c.arc(fx.x, fx.y, radius, 0, Math.PI * 2); c.stroke()
    c.globalAlpha = alpha * .55; c.strokeStyle = '#ffe1ff'; c.lineWidth = 2
    for (let ray = 0; ray < 12; ray++) {
      const angle = (ray / 12) * Math.PI * 2 + progress * .8
      c.beginPath(); c.moveTo(fx.x + Math.cos(angle) * radius * .5, fx.y + Math.sin(angle) * radius * .5)
      c.lineTo(fx.x + Math.cos(angle) * radius * 1.15, fx.y + Math.sin(angle) * radius * 1.15); c.stroke()
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
    if (drop.type === 'material') {
      const info = drop.materialKey ? materialInfo(drop.materialKey) : null
      const theme = STAGE_THEMES[(info?.stage ?? 1) - 1] ?? STAGE_THEMES[0]
      const variant = info?.variant ?? 0
      const color = variant === 0 ? theme.glow : variant === 1 ? theme.light : theme.accent
      c.save(); c.translate(x, y - 4)
      c.shadowColor = color; c.shadowBlur = 16
      c.fillStyle = color; c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1
      if (variant === 0) {
        c.beginPath(); c.moveTo(0, -10); c.lineTo(7, 0); c.lineTo(0, 10); c.lineTo(-7, 0); c.closePath(); c.fill(); c.stroke()
      } else if (variant === 1) {
        c.beginPath(); c.arc(0, 0, 8, 0, Math.PI * 2); c.fill(); c.stroke()
        c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(-2.5, -2.5, 2.4, 0, Math.PI * 2); c.fill()
      } else {
        c.beginPath(); c.moveTo(0, -9); c.lineTo(7, -4.5); c.lineTo(7, 4.5); c.lineTo(0, 9); c.lineTo(-7, 4.5); c.lineTo(-7, -4.5); c.closePath(); c.fill(); c.stroke()
        c.fillStyle = 'rgba(18,26,26,.55)'; c.fillRect(-3, -1, 6, 2)
      }
      c.restore()
      continue
    }
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
function drawBowCharge(c: CanvasRenderingContext2D) {
  if (!bowCharging) return
  const ratio = Math.max(0, Math.min(1, bowCharge / BOW_CHARGE_MAX))
  const x = heroX
  const y = world.floor - 128 + heroY
  // 蓄力时向弓身汇聚的光点与满蓄力光核。
  c.save()
  const now = performance.now()
  const centerY = world.floor - 56 + heroY
  for (let i = 0; i < 10; i++) {
    const angle = now / 300 + i * Math.PI / 5
    const radius = 48 - ratio * 24 + Math.sin(now / 210 + i) * 4
    c.globalAlpha = .22 + ratio * .55
    c.fillStyle = i % 2 ? '#ffe28a' : '#c8f0a0'
    c.beginPath(); c.arc(x + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius * .55, 1.4 + ratio * 2, 0, Math.PI * 2); c.fill()
  }
  if (ratio > .5) {
    const glow = c.createRadialGradient(x + facing * 18, centerY, 2, x + facing * 18, centerY, 46)
    glow.addColorStop(0, `rgba(255, 246, 192, ${.38 * ratio})`); glow.addColorStop(1, 'rgba(255, 226, 138, 0)')
    c.globalAlpha = 1; c.fillStyle = glow
    c.beginPath(); c.arc(x + facing * 18, centerY, 46, 0, Math.PI * 2); c.fill()
  }
  c.restore()
  c.save()
  c.fillStyle = 'rgba(13, 28, 28, .88)'; c.fillRect(x - 52, y - 14, 104, 24)
  c.strokeStyle = 'rgba(200, 240, 160, .65)'; c.lineWidth = 1; c.strokeRect(x - 52, y - 14, 104, 24)
  c.fillStyle = 'rgba(30, 46, 32, .9)'; c.fillRect(x - 46, y + 2, 92, 4)
  c.fillStyle = ratio >= 1 ? '#ffe28a' : '#c8f0a0'; c.fillRect(x - 46, y + 2, 92 * ratio, 4)
  c.fillStyle = '#e7f5d4'; c.font = "700 10px 'Microsoft YaHei', sans-serif"; c.textAlign = 'center'
  c.fillText(`蓄力 ${bowCharge.toFixed(1)} / ${BOW_CHARGE_MAX.toFixed(1)}`, x, y - 2)
  c.restore()
}
function drawBowSkillObjects(c: CanvasRenderingContext2D) {
  const now = performance.now()
  if (flowerBomb) {
    const x = flowerBomb.x
    const y = flowerBomb.y
    const pulse = .7 + Math.sin(now / 90) * .3
    c.save(); c.translate(x, y)
    c.shadowColor = '#ff9a5c'; c.shadowBlur = 16
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + now / 900
      c.fillStyle = i % 2 ? '#ffd27a' : '#e46f5a'
      c.beginPath(); c.ellipse(Math.cos(angle) * 10, Math.sin(angle) * 7 - 4, 4.5, 7, angle, 0, Math.PI * 2); c.fill()
    }
    c.fillStyle = '#fff2c0'; c.beginPath(); c.arc(0, -4, 5 * pulse, 0, Math.PI * 2); c.fill()
    c.strokeStyle = '#ffd27a'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 20, -Math.PI / 2, -Math.PI / 2 + (flowerBomb.timer / .7) * Math.PI * 2); c.stroke()
    c.restore()
  }
  if (skyBow) {
    const x = skyBow.x
    const y = world.floor - 235
    // 宏大特效：旋转巨弓 + 多层光轮 + 瞄准光柱。
    c.save()
    const beam = c.createLinearGradient(x, y - 40, x, world.floor)
    beam.addColorStop(0, 'rgba(255, 226, 138, 0)'); beam.addColorStop(.55, 'rgba(255, 226, 138, .18)'); beam.addColorStop(1, 'rgba(255, 242, 192, .4)')
    c.fillStyle = beam; c.fillRect(x - 58, y - 40, 116, world.floor - y + 40)
    c.save(); c.translate(x, y); c.rotate(now / 220)
    c.strokeStyle = '#ffe28a'; c.lineWidth = 5; c.shadowColor = '#ffe28a'; c.shadowBlur = 22
    c.beginPath(); c.arc(0, 0, 38, -Math.PI / 2.2, Math.PI / 2.2); c.stroke()
    c.strokeStyle = '#fffbe0'; c.lineWidth = 2
    c.beginPath(); c.arc(0, 0, 26, -Math.PI / 2.2, Math.PI / 2.2); c.stroke()
    c.strokeStyle = 'rgba(255, 242, 192, .8)'; c.lineWidth = 1.6
    c.beginPath(); c.moveTo(18, -35); c.lineTo(18, 35); c.stroke()
    c.restore()
    c.globalAlpha = .45; c.strokeStyle = '#ffe28a'; c.lineWidth = 2
    for (let ring = 0; ring < 3; ring++) {
      const radius = 58 + ring * 26 + Math.sin(now / 260 + ring) * 4
      c.beginPath(); c.ellipse(x, y + 36, radius, radius * .28, 0, 0, Math.PI * 2); c.stroke()
    }
    c.restore()
    c.save(); c.fillStyle = '#f7ffd8'; c.shadowColor = '#ffe28a'; c.shadowBlur = 12
    for (let i = 0; i < 6; i++) {
      const px = x + (i - 2.5) * 26
      c.fillRect(px - 1, y + 18, 2, 22)
      c.beginPath(); c.moveTo(px, y + 46); c.lineTo(px - 4, y + 38); c.lineTo(px + 4, y + 38); c.closePath(); c.fill()
    }
    c.restore()
  }
}
function drawBombClone(c: CanvasRenderingContext2D) {
  if (!game || bombClones.length === 0) return
  const now = performance.now()
  for (const clone of bombClones) {
    const main = clone.source === 'main'
    const color = main ? '#ff9ae0' : '#9fe8ff'
    const bob = Math.sin(now / 120) * 2
    const pulse = .6 + Math.sin(now / 90) * .35
    c.save()
    // 冲锋残影
    c.globalAlpha = main ? .18 : .13; c.fillStyle = main ? '#d6b4ff' : '#9fe8ff'
    for (let ghost = 1; ghost <= 3; ghost++) c.fillRect(clone.x - 14 - ghost * 16, world.floor - 62, 10, 56)
    c.globalAlpha = main ? .85 : .68
    const scale = main ? .9 : .74
    c.translate(clone.x, world.floor + clone.y + bob)
    c.scale(facing * scale, scale)
    c.shadowColor = color; c.shadowBlur = main ? 20 : 14
    drawMageHero(c, now, 0)
    c.restore()
    // 引信光环
    c.save(); c.translate(clone.x, world.floor - 60)
    c.globalAlpha = .55 + pulse * .3; c.strokeStyle = color; c.lineWidth = main ? 3 : 2; c.shadowColor = color; c.shadowBlur = main ? 16 : 10
    c.beginPath(); c.arc(0, 0, (main ? 30 : 22) + pulse * 8, 0, Math.PI * 2); c.stroke()
    c.restore()
    const barY = world.floor - (main ? 132 : 116)
    c.save(); c.fillStyle = 'rgba(24, 14, 30, .85)'; c.fillRect(clone.x - 46, barY, 92, 18)
    c.fillStyle = main ? '#f0c4ff' : '#c8f0ff'; c.font = "700 10px 'Microsoft YaHei', sans-serif"; c.textAlign = 'center'
    c.fillText(`${main ? '爆裂分身' : '分身爆裂'} ${clone.timer.toFixed(1)}s`, clone.x, barY + 12)
    c.restore()
  }
}
function drawArcaneOrb(c: CanvasRenderingContext2D) {
  if (!arcaneOrb) return
  const now = performance.now()
  const pulse = .7 + Math.sin(now / 70) * .3
  c.save()
  c.shadowColor = '#d6b4ff'; c.shadowBlur = 24
  const glow = c.createRadialGradient(arcaneOrb.x, arcaneOrb.y, 2, arcaneOrb.x, arcaneOrb.y, 34)
  glow.addColorStop(0, 'rgba(255, 236, 255, .95)'); glow.addColorStop(.4, 'rgba(214, 180, 255, .75)'); glow.addColorStop(1, 'rgba(214, 180, 255, 0)')
  c.fillStyle = glow; c.beginPath(); c.arc(arcaneOrb.x, arcaneOrb.y, 34, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#f4eaff'; c.beginPath(); c.arc(arcaneOrb.x, arcaneOrb.y, 6 + pulse * 2, 0, Math.PI * 2); c.fill()
  c.globalAlpha = .7; c.strokeStyle = '#d6b4ff'; c.lineWidth = 2
  for (let ring = 0; ring < 2; ring++) {
    c.beginPath(); c.arc(arcaneOrb.x, arcaneOrb.y, 16 + ring * 10 + pulse * 4, now / 300 + ring, now / 300 + ring + Math.PI * 1.4); c.stroke()
  }
  c.restore()
}
// 隐身特效：残影、薄雾光环与环绕符文，让隐匿状态一眼可见。
// 奥术强化持续期间的小型环绕符文，不叠加到隐身特效上。
function drawArcaneBuff(c: CanvasRenderingContext2D) {
  if (!game || game.role !== 'mage' || buffTime <= 0 || invisibleTimer > 0) return
  const now = performance.now()
  const color = weaponFxColor()
  const baseY = world.floor + heroY
  c.save()
  c.globalAlpha = .32; c.strokeStyle = color; c.lineWidth = 1.5; c.shadowColor = color; c.shadowBlur = 10
  c.beginPath(); c.ellipse(heroX, baseY - 4, 28 + Math.sin(now / 420) * 3, 9, 0, 0, Math.PI * 2); c.stroke()
  for (let i = 0; i < 5; i += 1) {
    const angle = now / 760 + (i * Math.PI * 2) / 5
    const px = heroX + Math.cos(angle) * 26
    const py = baseY - 52 + Math.sin(angle) * 14
    c.globalAlpha = .55
    c.fillStyle = i % 2 ? color : '#e6ddb0'
    c.beginPath(); c.moveTo(px, py - 3); c.lineTo(px + 2.4, py); c.lineTo(px, py + 3); c.lineTo(px - 2.4, py); c.closePath(); c.fill()
  }
  c.restore()
}
// 能量禁锢的残留法阵与笼柱。
function drawPrisonEffect(c: CanvasRenderingContext2D) {
  if (!game || scene !== 'battle' || prisonTimer <= 0) return
  const now = performance.now()
  const alpha = Math.min(1, prisonTimer / .6)
  const color = prisonColor
  c.save()
  c.shadowColor = color; c.shadowBlur = 18
  c.globalAlpha = .55 * alpha; c.strokeStyle = color; c.lineWidth = 2
  c.beginPath(); c.ellipse(prisonX, world.floor - 5, 56, 15, 0, 0, Math.PI * 2); c.stroke()
  c.beginPath(); c.ellipse(prisonX, world.floor - 5, 34, 9, 0, 0, Math.PI * 2); c.stroke()
  for (let i = 0; i < 6; i += 1) {
    const angle = now / 600 + (i * Math.PI) / 3
    c.beginPath(); c.moveTo(prisonX + Math.cos(angle) * 34, world.floor - 5 + Math.sin(angle) * 9)
    c.lineTo(prisonX + Math.cos(angle) * 56, world.floor - 5 + Math.sin(angle) * 15); c.stroke()
  }
  for (let layer = 0; layer < 2; layer += 1) {
    const sides = layer === 0 ? 6 : 4
    c.save(); c.translate(prisonX, prisonY); c.rotate(now / 500 * (layer ? -1 : 1))
    c.globalAlpha = alpha * (layer ? .3 : .5); c.strokeStyle = layer ? '#e8fff2' : color; c.lineWidth = layer ? 1.5 : 2.2
    for (let side = 0; side < sides; side += 1) {
      c.rotate((Math.PI * 2) / sides)
      c.beginPath(); c.moveTo(0, -72); c.lineTo(18, -20); c.lineTo(0, 30); c.lineTo(-18, -20); c.closePath(); c.stroke()
    }
    c.restore()
  }
  c.globalAlpha = alpha * .7; c.fillStyle = '#ffffff'
  c.beginPath(); c.arc(prisonX, prisonY, 5 + Math.sin(now / 160) * 2, 0, Math.PI * 2); c.fill()
  c.restore()
}
function drawStealthAura(c: CanvasRenderingContext2D) {
  if (!game || invisibleTimer <= 0) return
  // 只保留身体透明与剩余时间，不再叠加残影、光环与薄雾。
  const labelY = world.floor + heroY - 132
  c.save()
  c.fillStyle = 'rgba(13, 28, 28, .72)'; c.fillRect(heroX - 34, labelY - 13, 68, 18)
  c.fillStyle = '#c8f0ff'; c.font = "700 10px 'Microsoft YaHei', sans-serif"; c.textAlign = 'center'
  c.fillText(`隐匿 ${invisibleTimer.toFixed(1)}s`, heroX, labelY)
  c.restore()
}
function drawClone(c: CanvasRenderingContext2D) {
  if (!game || cloneTimer <= 0) return
  const now = performance.now()
  const bob = Math.sin(now / 380) * 1.6
  const stealth = cloneStealthTimer > 0
  // 分身同步施法时的扩散法环。
  if (cloneCastPulse > 0) {
    const p = 1 - cloneCastPulse / .56
    c.save(); c.globalAlpha = .45 * (1 - p)
    c.strokeStyle = '#d6b4ff'; c.lineWidth = 3; c.shadowColor = '#d6b4ff'; c.shadowBlur = 18
    c.beginPath(); c.ellipse(cloneX, world.floor + cloneY - 54, 26 + p * 46, 40 + p * 60, 0, 0, Math.PI * 2); c.stroke()
    c.restore()
  }
  // 分身同步普通攻击时的小型能量弧。
  if (cloneAttackPulse > 0) {
    const p = 1 - cloneAttackPulse / .32
    c.save(); c.globalAlpha = .6 * (1 - p); c.strokeStyle = '#9fe8ff'; c.lineWidth = 3
    c.beginPath(); c.arc(cloneX + facing * 18, world.floor + cloneY - 52, 18 + p * 24, facing > 0 ? -1 : 2.1, facing > 0 ? .9 : 4.2); c.stroke()
    c.restore()
  }
  c.save()
  // 同步隐匿时分身也会变得几乎透明，并浮起淡淡薄雾。
  c.globalAlpha = stealth ? .2 + Math.sin(now / 240) * .05 : .58 + Math.sin(now / 260) * .08
  c.translate(cloneX, world.floor + cloneY + bob); c.scale(facing * .8, .8)
  c.shadowColor = stealth ? '#9fe8ff' : '#d6b4ff'; c.shadowBlur = stealth ? 24 : 16
  drawMageHero(c, now, 0)
  c.restore()
  const barY = world.floor + cloneY - 116
  c.save(); c.fillStyle = 'rgba(13, 25, 25, .82)'; c.fillRect(cloneX - 34, barY, 68, 18)
  c.fillStyle = stealth ? '#9fe8ff' : '#d6b4ff'; c.font = "700 9px 'Microsoft YaHei', sans-serif"; c.textAlign = 'center'
  c.fillText(stealth ? `分身 · 隐匿 ${cloneTimer.toFixed(1)}s` : `分身 ${cloneTimer.toFixed(1)}s`, cloneX, barY + 8)
  c.fillStyle = 'rgba(40, 30, 50, .9)'; c.fillRect(cloneX - 30, barY + 11, 60, 3)
  c.fillStyle = '#d6b4ff'; c.fillRect(cloneX - 30, barY + 11, 60 * Math.max(0, cloneHp / Math.max(1, cloneMaxHp)), 3)
  c.restore()
}
function drawBossChest(c: CanvasRenderingContext2D) {
  if (!bossChest) return
  const x = bossChest.x
  const now = performance.now()
  const opening = bossChest.opened ? 1 : bossChest.opening > 0 ? 1 - bossChest.opening / 1.2 : 0
  const pulse = .7 + Math.sin(now / 360) * .3
  const near = Math.abs(heroX - x) <= 95
  c.save()
  c.fillStyle = 'rgba(8, 17, 17, .42)'
  c.beginPath(); c.ellipse(x, world.floor + 3, 34, 8, 0, 0, Math.PI * 2); c.fill()
  const glow = c.createRadialGradient(x, world.floor - 30, 4, x, world.floor - 30, 74 + opening * 34)
  glow.addColorStop(0, `rgba(255, 226, 150, ${.24 + opening * .26})`)
  glow.addColorStop(1, 'rgba(255, 210, 122, 0)')
  c.fillStyle = glow
  c.beginPath(); c.arc(x, world.floor - 30, 74 + opening * 34, 0, Math.PI * 2); c.fill()
  c.translate(x, world.floor)
  // 箱体
  const wood = c.createLinearGradient(0, -42, 0, 0)
  wood.addColorStop(0, '#a9753f'); wood.addColorStop(.55, '#7a4a26'); wood.addColorStop(1, '#4e2d17')
  c.fillStyle = wood
  c.beginPath(); c.moveTo(-30, -40); c.lineTo(30, -40); c.lineTo(30, -2); c.quadraticCurveTo(30, 2, 26, 2); c.lineTo(-26, 2); c.quadraticCurveTo(-30, 2, -30, -2); c.closePath(); c.fill()
  c.strokeStyle = '#e0bd73'; c.lineWidth = 3; c.stroke()
  c.fillStyle = '#e0bd73'; c.fillRect(-2, -40, 4, 42)
  c.fillRect(-26, -10, 52, 4)
  // 锁扣
  c.fillStyle = '#f2d896'; c.beginPath(); c.arc(0, -20, 6, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#5a3a1c'; c.beginPath(); c.arc(0, -20, 2.4, 0, Math.PI * 2); c.fill()
  // 箱盖（开启时向后翻）
  c.save()
  c.translate(0, -40); c.rotate(-opening * 1.22)
  const lid = c.createLinearGradient(0, -24, 0, 0)
  lid.addColorStop(0, '#c68a4c'); lid.addColorStop(1, '#7a4a26')
  c.fillStyle = lid
  c.beginPath(); c.moveTo(-31, 0); c.lineTo(-31, -14); c.quadraticCurveTo(-31, -24, -18, -24); c.lineTo(18, -24); c.quadraticCurveTo(31, -24, 31, -14); c.lineTo(31, 0); c.closePath(); c.fill()
  c.strokeStyle = '#e0bd73'; c.lineWidth = 3; c.stroke()
  c.strokeStyle = '#f2d896'; c.lineWidth = 2
  c.beginPath(); c.moveTo(-22, -24); c.lineTo(-22, 0); c.moveTo(22, -24); c.lineTo(22, 0); c.stroke()
  c.restore()
  // 开启光柱与粒子
  if (opening > 0) {
    const beam = c.createLinearGradient(0, -170, 0, -20)
    beam.addColorStop(0, 'rgba(255, 238, 178, 0)'); beam.addColorStop(1, `rgba(255, 238, 178, ${.32 * opening})`)
    c.fillStyle = beam
    c.beginPath(); c.moveTo(-16, -24); c.lineTo(-7, -174); c.lineTo(7, -174); c.lineTo(16, -24); c.closePath(); c.fill()
  }
  c.fillStyle = '#fff2c0'; c.shadowColor = '#ffd27a'; c.shadowBlur = 10
  for (let i = 0; i < 7; i++) {
    const angle = now / 500 + (i * Math.PI * 2) / 7
    const radius = 24 + opening * 26
    c.globalAlpha = .35 + pulse * .4
    c.beginPath(); c.arc(Math.cos(angle) * radius, -30 + Math.sin(angle) * radius * .6, 1.8, 0, Math.PI * 2); c.fill()
  }
  c.restore()
  // 名称与提示
  c.save()
  c.textAlign = 'center'
  c.fillStyle = 'rgba(16, 27, 27, .86)'; c.fillRect(x - 42, world.floor - 100, 84, 22)
  c.fillStyle = '#e6d7a4'; c.font = "700 11px 'Microsoft YaHei', sans-serif"; c.fillText('守关者宝箱', x, world.floor - 85)
  if (!bossChest.opened && near) {
    c.fillStyle = 'rgba(16, 27, 27, .86)'; c.fillRect(x - 34, world.floor - 72, 68, 20)
    c.fillStyle = '#b9e0d2'; c.font = '10px sans-serif'; c.fillText(bossChest.opening > 0 ? '开启中…' : 'S 开启', x, world.floor - 58)
  }
  c.restore()
}
function draw() {
  if (!ctx) return
  ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0)
  ctx.clearRect(0, 0, world.width, viewHeight)
  fillExtendedBackdrop(ctx)
  ctx.save()
  ctx.translate(0, viewOffsetY)
  drawBackground(ctx)
  ctx.save()
  if (shake > 0) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake)
  if (scene === 'battle') ctx.translate(-cameraX, 0)
  drawBattleScenery(ctx)
  drawPlatforms(ctx)
  drawPotionDrops(ctx)
  drawBowSkillObjects(ctx)
  if (scene === 'battle') drawBossChest(ctx)
  for (const foe of foes) drawFoe(ctx, foe)
  drawPrisonEffect(ctx)
  if (scene === 'town') { drawTownWaypoint(ctx); drawTownNpc(ctx); drawTownCompanions(ctx); drawSecondNpc(ctx) }
  ctx.save(); if (invisibleTimer > 0) ctx.globalAlpha = .16
  drawHero(ctx)
  ctx.restore()
  drawStealthAura(ctx)
  drawArcaneBuff(ctx)
  drawClone(ctx)
  drawBombClone(ctx)
  drawArcaneOrb(ctx)
  drawShield(ctx)
  drawBowCharge(ctx)
  for (const projectile of projectiles) {
    const projectileColor = weaponFxColor()
    ctx.save()
    if (projectile.kind === 'arrow' || projectile.kind === 'charged' || projectile.kind === 'fall') {
      const angle = projectile.kind === 'fall' ? Math.PI / 2 : Math.atan2(projectile.vy ?? 0, projectile.vx)
      const length = projectile.kind === 'charged' ? 26 : 20
      ctx.translate(projectile.x, projectile.y); ctx.rotate(angle)
      if (projectile.kind === 'charged') {
        // 蓄力箭飞行时带三层残影与脉动光晕。
        const pulse = .7 + Math.sin(performance.now() / 70) * .3
        for (let ghost = 1; ghost <= 3; ghost++) {
          ctx.globalAlpha = .16 / ghost
          ctx.strokeStyle = projectileColor; ctx.lineWidth = 8 - ghost * 1.5
          ctx.beginPath(); ctx.moveTo(-length - ghost * 18, 0); ctx.lineTo(2, 0); ctx.stroke()
        }
        ctx.globalAlpha = .5; ctx.fillStyle = projectileColor
        ctx.beginPath(); ctx.arc(4, 0, 10 * pulse, 0, Math.PI * 2); ctx.fill()
        ctx.globalAlpha = 1
      }
      ctx.shadowColor = projectileColor; ctx.shadowBlur = projectile.kind === 'charged' ? 16 : 8
      ctx.strokeStyle = projectile.kind === 'charged' ? '#f7ffd8' : projectileColor; ctx.lineWidth = projectile.kind === 'charged' ? 3 : 2
      ctx.beginPath(); ctx.moveTo(-length, 0); ctx.lineTo(4, 0); ctx.stroke()
      ctx.fillStyle = projectile.kind === 'charged' ? '#f7ffd8' : projectileColor
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-1, -4); ctx.lineTo(-1, 4); ctx.closePath(); ctx.fill()
      if (projectile.kind === 'charged') {
        ctx.globalAlpha = .35; ctx.strokeStyle = projectileColor; ctx.lineWidth = 6
        ctx.beginPath(); ctx.moveTo(-length - 8, 0); ctx.lineTo(2, 0); ctx.stroke()
      }
    } else if (projectile.kind === 'blast') {
      const dir = Math.sign(projectile.vx || 1)
      const now = performance.now()
      const pulse = .8 + Math.sin(now / 55) * .2
      const glow = ctx.createRadialGradient(projectile.x, projectile.y, 2, projectile.x, projectile.y, 26)
      glow.addColorStop(0, 'rgba(255, 240, 255, .95)'); glow.addColorStop(.45, 'rgba(214, 180, 255, .8)'); glow.addColorStop(1, 'rgba(214, 180, 255, 0)')
      ctx.fillStyle = glow
      ctx.beginPath(); ctx.arc(projectile.x, projectile.y, 26, 0, Math.PI * 2); ctx.fill()
      ctx.shadowColor = projectileColor; ctx.shadowBlur = 20
      ctx.fillStyle = '#f4eaff'
      ctx.beginPath(); ctx.arc(projectile.x, projectile.y, 6 * pulse, 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha = .55; ctx.strokeStyle = projectileColor; ctx.lineWidth = 5
      ctx.beginPath(); ctx.moveTo(projectile.x - dir * 48, projectile.y); ctx.lineTo(projectile.x, projectile.y); ctx.stroke()
      ctx.globalAlpha = .8; ctx.strokeStyle = '#ffe1ff'; ctx.lineWidth = 1.6
      ctx.beginPath(); ctx.arc(projectile.x, projectile.y, 12, 0, Math.PI * 2); ctx.stroke()
    } else if (projectile.kind === 'book') {
      ctx.shadowColor = projectileColor; ctx.shadowBlur = 16; ctx.fillStyle = projectileColor
      ctx.beginPath(); ctx.arc(projectile.x, projectile.y, 8, 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha = .4; ctx.strokeStyle = projectileColor; ctx.lineWidth = 4
      ctx.beginPath(); ctx.moveTo(projectile.x - Math.sign(projectile.vx || 1) * 26, projectile.y); ctx.lineTo(projectile.x, projectile.y); ctx.stroke()
    } else {
      ctx.fillStyle = projectileColor; ctx.shadowColor = projectileColor; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(projectile.x, projectile.y, 7, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
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
  ctx.restore()
  if (flashTime > 0) {
    ctx.save()
    ctx.globalAlpha = Math.min(.42, flashTime * .9)
    ctx.fillStyle = flashColor
    ctx.fillRect(0, 0, world.width, viewHeight)
    ctx.restore()
  }
  if (noticeTime > 0) {
    const noticeY = Math.max(84, viewOffsetY + 24)
    ctx.fillStyle = 'rgba(13, 28, 28, .86)'; ctx.fillRect(310, noticeY, 340, 38)
    ctx.fillStyle = '#e6d5a2'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(notice, 480, noticeY + 24, 320)
  }
}
function frame(now: number) { if (gameClosed) return; const dt = Math.min((now - lastTime) / 1000, .045); lastTime = now; update(dt); draw(); requestAnimationFrame(frame) }
document.querySelector('#rotate-lock')?.addEventListener('click', () => { void enterLandscape() })
window.addEventListener('resize', () => { if (canvas && scene !== 'title') { setupCanvas(); paintHudPortrait() } })
window.addEventListener('pointerdown', () => document.querySelector('#rotate-hint')?.classList.add('dismissed'), { once: true })
document.querySelector('#rotate-dismiss')?.addEventListener('click', () => document.querySelector('#rotate-hint')?.classList.add('dismissed'))
void boot(); requestAnimationFrame(frame)
