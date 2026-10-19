import './game.css'

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
type Foe = { id: number; x: number; hp: number; maxHp: number; boss: boolean; timer: number; skillTimer: number; flash: number; dashWindup?: number; dashDirection?: number; stunTimer?: number }
type Fx = { x: number; y: number; life: number; kind: string; direction?: number; text?: string; damage?: number; duration?: number; vx?: number; vy?: number; color?: string; radius?: number }
type Projectile = { x: number; y: number; vx: number; life: number; damage: number; targetId: number }

const SAVE_KEY = 'elemental-expedition-save-v2'
const GAME_VERSION = '1.51'
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
const MAX_SMALL_KILLS = 30
const app = document.querySelector<HTMLDivElement>('#app')!
const world = { width: 960, height: 480, floor: 390 }
let game: Save | null = null
let saveSlots: SaveSlot[] = readSaves()
let activeSlotId: string | null = null
let pendingRole: Role | null = null
let pendingDeleteId: string | null = null
let scene: Scene = 'title'
let paused = false
let foes: Foe[] = []
let projectiles: Projectile[] = []
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

function readSaves(): SaveSlot[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null') as unknown
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
  game.stageProgress[String(game.stage)] = { kills: game.kills, bossDefeated: game.bossDefeated ?? false, pointsClaimed: previous?.pointsClaimed ?? 0 }
  const slot = saveSlots.find((entry) => entry.id === activeSlotId)
  if (!slot) return
  slot.data = structuredClone(game)
  slot.updatedAt = Date.now()
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(saveSlots)) }
  catch { toast('无法保存，请检查浏览器存储空间。') }
}
function toast(message: string) { notice = message; noticeTime = 2.2 }
function setLog(message: string) {
  logText = message
  const line = document.querySelector<HTMLElement>('#combat-log span:last-child')
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
function spawnFoe(x: number, boss = false): Foe {
  const config = STAGE_CONFIG[Math.max(0, Math.min(9, (game?.stage ?? 1) - 1))]
  const hp = boss ? config.bossHp : config.mobHp
  return { id: nextFoeId++, x, hp, maxHp: hp, boss, timer: .7 + Math.random() * 1.2, skillTimer: 3.2, flash: 0, stunTimer: 0 }
}
function bossFx(action: 'charge' | 'dash' | 'melee') {
  const themes = ['ember', 'frost', 'storm', 'void', 'moss', 'sun', 'blood', 'tide', 'ash', 'star']
  return `boss-${action}-${themes[Math.max(0, Math.min(9, (game?.stage ?? 1) - 1))]}`
}
function spawnWave() {
  if (!game) return
  if (game.kills >= 30) { foes = [spawnFoe(850, true)]; return }
  const groupSize = game.kills < 12 ? 2 : 3
  const remaining = 30 - game.kills
  const leftCount = Math.min(groupSize, Math.ceil(remaining / 2))
  const rightCount = Math.min(groupSize, remaining - leftCount)
  foes = []
  for (let i = 0; i < leftCount; i++) foes.push(spawnFoe(Math.max(28, heroX - 142 - i * 46)))
  for (let i = 0; i < rightCount; i++) foes.push(spawnFoe(Math.min(932, heroX + 142 + i * 46)))
  setLog(`第 ${Math.floor(game.kills / (groupSize * 2)) + 1} 批守卫从两侧逼近。`)
}
function getStageProgress(stage: number): StageProgress {
  return game?.stageProgress?.[String(stage)] ?? (stage === game?.stage ? { kills: game.kills, bossDefeated: game.bossDefeated ?? false, pointsClaimed: 0 } : { kills: 0, bossDefeated: false, pointsClaimed: 0 })
}
function beginStage(stage: number, mode: 'continue' | 'restart' | 'boss' = 'continue') {
  if (!game) return
  const progress = getStageProgress(stage)
  game.stage = stage
  game.kills = mode === 'restart' ? 0 : mode === 'boss' ? 30 : progress.kills
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
  projectiles = []
  effects = []
  burst = 0; burstTargetId = null; shake = 0
  bagOpen = false; craftingOpen = false; attributesOpen = false
  spawnWave()
  save()
  renderGame()
}
function start(role: Role, previous?: Save) {
  game = previous ? structuredClone(previous) : freshSave(role)
  game.unlockedStage = Math.min(10, Math.max(game.unlockedStage ?? 1, game.stage))
  scene = game.completed ? 'ending' : game.dead ? 'defeat' : game.town ? 'town' : 'battle'
  paused = false
  heroX = 480; heroY = 0; velocityY = 0; grounded = true; buffTime = 0; burst = 0; burstTargetId = null; shake = 0
  skillWait = [0, 0, 0, 0]; effects = []; projectiles = []; bagOpen = false; craftingOpen = false; attributesOpen = false
  const caps = stats()
  game.hp = Math.min(Math.max(1, game.hp), caps.hp)
  game.mp = Math.min(Math.max(0, game.mp), caps.mp)
  if (scene === 'battle') spawnWave()
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
  if (levelsGained) toast(`升级至 ${game.level} 级：生命 +${hpGained}，攻击 +${attackGained}，防御 +${defenseGained}，法力 +${mpGained}。`)
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
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(remaining)) }
  catch { toast('删除失败，存档未更改。'); return }
  pendingDeleteId = null
  saveSlots = remaining
  document.querySelector('.delete-confirm')?.remove()
  if (activeSlotId === id) { activeSlotId = null; game = null; foes = []; projectiles = [] }
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
function renderTitle() {
  const slots = saveSlots.map((slot) => `<article class="save-slot"><span class="save-slot-info"><b>${slot.label}</b><small>${roleLabels[slot.data.role]} · ${slot.data.level ?? 1} 级 · ${slot.data.town ? '小镇' : `第 ${slot.data.stage} 关`} · 击败 ${slot.data.kills}</small></span><button class="save-resume" data-action="resume" data-slot="${slot.id}">继续　↗</button><button class="save-delete" data-action="delete-slot" data-slot="${slot.id}" aria-label="删除${slot.label}" title="删除存档">×</button></article>`).join('')
  const overwriteDialog = pendingRole ? `<div class="slot-scrim"><section class="slot-dialog"><small>存档槽已满 · 3 / 3</small><h2>新建${roleLabels[pendingRole]}存档</h2><p>请选择一个存档槽。覆盖前会再次确认，取消不会改动任何存档。</p>${saveSlots.map((slot) => `<button data-action="overwrite-slot" data-slot="${slot.id}"><span><b>${slot.label}</b><small>${roleLabels[slot.data.role]} · ${slot.data.town ? '小镇' : `第 ${slot.data.stage} 关`}</small></span><i>选择覆盖</i></button>`).join('')}<button class="slot-cancel" data-action="cancel-new">取消</button></section></div>` : ''
  app.innerHTML = `<main class="title-screen"><section class="title-copy"><div class="eyebrow"><i></i> 单机动作 RPG · 十章远征</div><h1>冒险王<span>：元素远征</span></h1><p class="intro">古老遗迹再度苏醒。选择你的职业，穿越十片失落之地，直面守关者。</p>${saveSlots.length ? `<section class="saved-slots"><div class="slots-heading"><span>远征存档</span><small>${saveSlots.length} / 3</small></div>${slots}</section>` : ''}<div class="rule"></div><div class="class-picks"><button class="class-card" data-action="role" data-role="warrior"><b class="role-mark">刃</b><span><strong>新建战士</strong><small>剑刃近战 · 创建独立存档</small></span><i>↗</i></button><button class="class-card" data-action="role" data-role="mage"><b class="role-mark mage-mark">✦</b><span><strong>新建法师</strong><small>法杖远程 · 创建独立存档</small></span><i>↗</i></button></div><footer><span>存档最多 3 个 · 覆盖前确认</span><span class="game-version">版本 ${GAME_VERSION}</span><span>01 — 10</span></footer></section><div class="title-art" aria-hidden="true"><div class="sun"></div><div class="mountains"></div><div class="ruins"><i></i><i></i><i></i></div><div class="silhouette"><b></b><i></i><span></span></div><small>THE LOST FRONTIER <span>遗迹之外，仍有远方</span></small></div></main>${overwriteDialog}`
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
function renderGame() {
  if (!game) return renderTitle()
  const s = stats()
  const isTown = scene === 'town'
  const boss = foes.some((foe) => foe.boss)
  const countText = boss ? '守关者' : `${game.kills} / 30`
  const townOverlay = isTown ? `<div class="overlay town-overlay"><small>SAFE HAVEN · 冒险者小镇</small><h2>${game.completed ? '十片遗迹皆已沉寂' : '旅途从这里继续'}</h2><p>${game.completed ? '你已完成元素远征，装备与记录仍保存在背包。' : '选择已开放的关卡，或在背包里更换装备。'}</p>${game.completed ? '<button class="primary" data-action="title">返回标题　↗</button>' : `<label class="stage-picker"><span>选择关卡</span><select id="stage-select">${Array.from({ length: game.unlockedStage }, (_, i) => `<option value="${i + 1}" ${game!.stage === i + 1 ? 'selected' : ''}>第 ${String(i + 1).padStart(2, '0')} 关 · ${stageNames[i]}</option>`).join('')}</select></label><button class="primary" data-action="enter-stage">进入遗迹　→</button>`}</div>` : ''
  const deathOverlay = scene === 'defeat' ? '<div class="overlay death-overlay"><small>EXPEDITION PAUSED</small><h2>你倒在了遗迹深处</h2><p>已获得的装备和关卡进度都会保留。</p><div class="death-actions"><button data-action="respawn-town" class="primary">重生到小镇</button><button data-action="respawn-fight" class="secondary">继续战斗</button></div></div>' : ''
  const endingOverlay = scene === 'ending' ? '<div class="overlay"><small>THE FRONTIER IS YOURS</small><h2>十片遗迹，皆已沉寂</h2><p>你完成了元素远征。</p><button data-action="town" class="primary">返回小镇　↗</button></div>' : ''
  app.innerHTML = `<main class="game-shell"><header class="game-header"><a data-action="town" class="wordmark"><b>A</b> 冒险王 <i>／</i> ${isTown ? '冒险者小镇' : '元素远征'}</a><span class="save-state"><i></i>${isTown ? '小镇安全区' : '进度已自动保存'}</span><button class="bag-button" data-action="bag">背包 <span>${game.gear.length}</span></button><button class="save-button" data-action="save" title="保存进度">▣</button></header><section class="overview"><div><small>${isTown ? '冒险者小镇' : `第 ${String(game.stage).padStart(2, '0')} 章`}</small><h1>${isTown ? '营火集市' : stageNames[game.stage - 1]}</h1><p>${isTown ? '缓冲区 · 整备装备与选择关卡' : '遗迹入口 · 击败 30 只守卫后迎战 Boss'}</p></div><div class="metrics"><div><small>职业</small><b>${roleLabels[game.role]}</b></div><div><small>已击杀</small><b>${isTown ? `开放至第 ${game.unlockedStage} 关` : countText}</b></div><div><small>当前装备</small><b>${item()?.name ?? '无'}</b></div></div></section><section class="game-grid"><div class="battle-column"><div class="arena-label"><span>◆ ${isTown ? '冒险者小镇 · 补给站' : `${stageNames[game.stage - 1]} · 深层区域`}</span><b id="enemy-name">${isTown ? '安全区域' : boss ? '守关者冲刺准备中' : `${foes.length} 只守卫正在逼近`}</b></div><div class="arena"><canvas id="arena" aria-label="横版战斗场景"></canvas><div class="coords"><span>${isTown ? 'TOWN · SAFE ZONE' : `遗迹远征 · ${String(game.stage).padStart(2, '0')}`}</span><span>${boss ? 'BOSS ENCOUNTER' : isTown ? 'REST & PREPARE' : 'WAVE ENCOUNTER'}</span></div>${townOverlay}${deathOverlay}${endingOverlay}</div><div class="foe-health"><div><span>${isTown ? '冒险者状态' : boss ? '守关者' : '本批守卫'}</span><b id="foe-hp">${isTown ? '安全休整' : boss ? `${Math.ceil(foes[0]?.hp ?? 0)} / ${foes[0]?.maxHp ?? 0}` : `${foes.length} 名敌人 · 已击败 ${game.kills} / 30`}</b></div><div><i id="foe-fill" style="width:${boss ? `${Math.max(0, foes[0].hp / foes[0].maxHp * 100)}%` : '100%'}"></i></div></div><div class="combat-bar"><button data-action="attack" class="attack" ${scene === 'battle' ? '' : 'disabled'}><b>${game.role === 'warrior' ? '⚔' : '✦'}</b><span><strong>${game.role === 'warrior' ? '剑刃斩击' : '法杖射击'}</strong><small>J · ${game.role === 'warrior' ? '近战' : '远程'}</small></span></button><button data-action="jump" ${scene === 'battle' ? '' : 'disabled'}><b>↟</b><span><strong>跳跃</strong><small>K</small></span></button>${skillLabels[game.role].map((label, i) => `<button data-action="skill" data-index="${i}" ${scene === 'battle' ? '' : 'disabled'}><i>${i + 1}</i><span><strong>${label}</strong><small>${skillSummary(game!.role, i)}</small></span></button>`).join('')}</div><div class="mobile-move"><button data-move="left" aria-label="向左移动">←</button><button data-move="right" aria-label="向右移动">→</button></div><div class="combat-log"><b>✦</b><span>${logText}</span></div></div><aside class="side-column"><section class="panel status-panel"><header><span>角色状态</span><small>${String(game.stage).padStart(2, '0')}</small></header><div class="hero-card"><b class="avatar ${game.role}">${game.role === 'warrior' ? '刃' : '✦'}</b><span><strong>${roleLabels[game.role]}</strong><small>${game.role === 'warrior' ? '钢铁誓约 · 剑士' : '星辉学派 · 法杖'}</small></span></div><div class="resource-label"><span>生命</span><b id="hp-text">${Math.ceil(game.hp)} <i>/ ${s.hp}</i></b><em>♥</em></div><div class="resource"><i id="hp-fill" style="width:${game.hp / s.hp * 100}%"></i></div><div class="resource-label mana-label"><span>法力</span><b id="mp-text">${Math.ceil(game.mp)} <i>/ ${s.mp}</i></b><em>✦</em></div><div class="resource"><i id="mp-fill" style="width:${game.mp / s.mp * 100}%"></i></div><div class="stats"><div><small>攻击</small><b>${s.attack}</b></div><div><small>防御</small><b>${s.defense}</b></div><div><small>增益</small><b id="buff-stat">${buffTime > 0 ? `${buffTime.toFixed(1)}s` : '—'}</b></div></div></section><section class="panel gear-panel"><header><span>装备栏</span><small>${item()?.name ?? '未装备'}</small></header><div class="gear-summary">${item() ? `生命 +${item()!.hp}　攻击 +${item()!.attack}　防御 +${item()!.defense}` : '装备不会自动穿戴，请在小镇打开背包手动更换。'}</div><button class="open-bag" data-action="bag">打开背包　↗</button><div class="camp-hint">⌂　${isTown ? '安全区内可自由更换装备' : '击败 Boss 后回到小镇整备'}</div></section></aside></section><footer class="game-footer"><span>WASD / ← → 移动　·　J 攻击　·　K 跳跃　·　1–4 技能</span><b>LOCAL SAVE　●</b></footer>${bagOpen ? `<div class="bag-scrim"><section class="bag-dialog"><header><div><small>INVENTORY · ${game.gear.length} ITEMS</small><h2>远征背包</h2></div><button data-action="close-bag" aria-label="关闭背包">×</button></header><p>${isTown ? '选择要装备的武器，属性会立即更新。' : '装备已安全保存。返回小镇后即可更换。'}</p><div class="bag-list">${gearMarkup(isTown)}</div></section></div>` : ''}</main>`
  if (craftingOpen && isTown) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', `<div class="bag-scrim craft-scrim"><section class="bag-dialog craft-dialog"><header><div><small>FORGE · 冒险者小镇</small><h2>合成台</h2></div><button data-action="close-crafting" aria-label="关闭合成台">×</button></header><p>只消耗未穿戴的材料：5 件同类同等级装备合成 1 件高一级装备。</p><div class="bag-list craft-list">${craftMarkup()}</div></section></div>`)
  if (attributesOpen && isTown) document.querySelector('.game-shell')?.insertAdjacentHTML('beforeend', attributeMarkup())
  mountBattleHud()
  mountLevelHud()
  mountEquipmentHud()
  if (isTown) {
    const bagHint = document.querySelector<HTMLElement>('.bag-dialog > p')
    if (bagHint) bagHint.textContent = '选择装备穿戴；武器和护甲分别使用独立槽位。'
  }
  if (isTown && !game.completed) {
    mountTownStageActions()
    const shortcuts = [
      '<button class="secondary town-rest" data-action="rest">在小镇休整　恢复生命与法力</button>',
      '<button class="secondary town-synthesis" data-action="open-crafting">合成台</button>',
      `<button class="secondary town-attributes" data-action="open-attributes">属性分配 · ${game.attributePoints ?? 0} 点</button>`,
    ].join('')
    document.querySelector('.town-overlay .stage-picker')?.insertAdjacentHTML('beforebegin', shortcuts)
  }
  const header = document.querySelector<HTMLElement>('.game-header')
  header?.insertAdjacentHTML('beforeend', '<button class="role-select-button" data-action="role-select">角色选择</button>')
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
  if (controls) controls.textContent = 'WASD / ← → 移动　·　J 攻击　·　K 跳跃　·　1–4 技能　·　S 拾取药水　·　P 暂停'
  setupCanvas()
  syncHud()
}
function render() { scene === 'title' ? renderTitle() : renderGame() }
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
    head.style.left = `${foe.x / world.width * 100}%`
    head.style.top = foe.boss ? '10%' : '49%'
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
    ? `<p class="stage-progress-copy">本关 Boss 已击败</p><div class="town-stage-choices"><button class="secondary" data-action="restart-stage">从第一波开始</button><button class="primary" data-action="challenge-boss">直接挑战 Boss</button></div>`
    : `<p class="stage-progress-copy">当前进度：已击杀 ${progress.kills} / 30</p><button class="primary town-continue-stage" data-action="continue-stage">${progress.kills >= 30 ? '继续挑战 Boss' : `继续第 ${game.stage} 关　→`}</button>`
  const choices = document.createElement('div')
  choices.className = 'town-stage-actions'
  choices.innerHTML = actionHtml
  existingButton.replaceWith(choices)
  for (const option of select.options) {
    const stage = Number(option.value)
    const stageProgress = getStageProgress(stage)
    option.textContent = `第 ${String(stage).padStart(2, '0')} 关 · ${stageNames[stage - 1]} · ${stageProgress.bossDefeated ? 'Boss 已击败' : `${stageProgress.kills}/30`}`
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
    if (head) { head.style.left = `${foe.x / world.width * 100}%`; head.style.top = foe.boss ? '10%' : '49%' }
    if (fill) fill.style.width = `${Math.max(0, foe.hp / foe.maxHp * 100)}%`
    if (label) label.textContent = String(Math.ceil(foe.hp))
  }
  const hp = document.querySelector<HTMLElement>('#hp-text'); if (hp) hp.innerHTML = `${Math.ceil(game.hp)} <i>/ ${s.hp}</i>`
  const mp = document.querySelector<HTMLElement>('#mp-text'); if (mp) mp.innerHTML = `${Math.ceil(game.mp)} <i>/ ${s.mp}</i>`
  const coreStats = document.querySelectorAll<HTMLElement>('.stats div b')
  if (coreStats[0]) coreStats[0].textContent = String(s.attack)
  if (coreStats[1]) coreStats[1].textContent = String(s.defense)
  const foeHp = document.querySelector<HTMLElement>('#foe-hp')
  if (foeHp && scene === 'battle') foeHp.textContent = foes[0]?.boss ? `${Math.ceil(foes[0].hp)} / ${foes[0].maxHp}` : `${foes.length} 名敌人 · 已击败 ${game.kills} / 30`
  const buff = document.querySelector<HTMLElement>('#buff-stat'); if (buff) buff.textContent = buffTime > 0 ? `${buffTime.toFixed(1)}s` : '—'
  const enemyName = document.querySelector<HTMLElement>('#enemy-name')
  if (enemyName && scene === 'battle') enemyName.textContent = foes[0]?.boss ? '守关者冲刺准备中' : `${foes.length} 只守卫正在逼近`
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
    head.style.left = `${foe.x / world.width * 100}%`
    head.style.top = `${(world.floor - (foe.boss ? 150 : 64)) / world.height * 100}%`
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
  if (!targets.length) { setLog('距离太远，攻击没有命中。'); return }
  targets.forEach((target) => strike(target, damage, label))
}
function attack() {
  if (scene !== 'battle' || paused || !game || attackWait > 0) return
  const hasted = game.role === 'mage' && buffTime > 0
  attackWait = hasted ? .42 / 1.1 : .42; attackSwing = .32
  const nearest = [...foes].sort((a, b) => Math.abs(a.x - heroX) - Math.abs(b.x - heroX))[0]
  if (nearest) facing = Math.sign(nearest.x - heroX) || facing
  if (game.role === 'warrior') {
    addFx('sword', heroX + facing * 50, world.floor - 75, facing, .3)
    strikeNearby(stats().attack, '剑刃斩击', 138)
  } else {
    const target = targetForFacing(world.width)
    if (!target) { setLog('法杖光弹没有找到目标。'); return }
    const projectileDirection = Math.sign(target.x - heroX) || facing
    projectiles.push({ x: heroX + projectileDirection * 25, y: world.floor - 68 + heroY, vx: projectileDirection * 620, life: 1.3, damage: stats().attack, targetId: target.id })
    addFx('muzzle', heroX + projectileDirection * 25, world.floor - 68 + heroY, projectileDirection, .16)
  }
}
function jump() {
  if (scene !== 'battle' || paused || !grounded) return
  grounded = false; velocityY = -570; addFx('dust', heroX, world.floor - 2, 1, .3)
}
function cast(index: number) {
  if (scene !== 'battle' || paused || !game || index < 0 || index > 3) return
  if (skillWait[index] > 0) { toast('技能还在冷却中。'); return }
  if (game.role === 'mage' && index === 3 && !foes.length) { setLog('能量禁锢没有找到目标。'); return }
  if (!spend(SKILL_COSTS[game.role][index])) return
  skillWait[index] = SKILL_COOLDOWNS[index]
  const power = skillPower(index)
  // 技能 3（突刺/闪现）保持当前朝向，方便向远离敌人的方向位移。
  if (index !== 2) {
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
    if (!target) { setLog('能量禁锢没有找到目标。'); return }
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
  const wasBoss = target.boss
  foes = foes.filter((foe) => foe.id !== target.id)
  awardExperience((wasBoss ? 100 : 10) * 2 ** (game.stage - 1))
  dropGear(wasBoss)
  if (!wasBoss) dropPotions(target.x)
  if (wasBoss) {
    game.bossDefeated = true
    game.unlockedStage = Math.max(game.unlockedStage, Math.min(10, game.stage + 1))
    if (game.stage >= 10) { game.completed = true; scene = 'ending'; game.town = false }
    else { scene = 'town'; game.town = true; game.hp = Math.min(stats().hp, game.hp + Math.round(stats().hp * .35)); game.mp = Math.min(stats().mp, game.mp + 180) }
    save(); renderGame(); return
  }
  game.kills += 1
  awardKillPoints()
  if (foes.length === 0) {
    if (game.kills >= MAX_SMALL_KILLS) { foes = [spawnFoe(heroX < 480 ? 880 : 80, true)]; setLog('三十名守卫已清除，守关者冲入战场！') }
    else spawnWave()
  }
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
    if (Math.random() < .25) game.drops!.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, x: Math.max(35, Math.min(925, x)) })
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
  projectiles = []; effects = []; burst = 0; burstTargetId = null; spawnWave(); save(); renderGame()
}
function retreatToTown() {
  if (!game) return
  paused = false
  scene = 'town'; game.town = true; game.dead = false; game.hp = Math.max(1, Math.round(stats().hp * .55)); game.mp = stats().mp
  foes = []; projectiles = []; burst = 0; burstTargetId = null; bagOpen = false; save(); renderGame()
}
function resumeBattle() {
  if (!game) return
  paused = false
  scene = 'battle'; game.town = false; game.dead = false; game.hp = Math.max(1, Math.round(stats().hp * .55)); game.mp = Math.min(stats().mp, game.mp)
  heroX = 480; heroY = 0; velocityY = 0; grounded = true; projectiles = []; burst = 0; burstTargetId = null; spawnWave(); save(); renderGame()
}
function performAction(name: string, target: HTMLElement) {
  if (name === 'role') createRole(target.dataset.role as Role)
  if (name === 'resume' && target.dataset.slot) {
    const slot = saveSlots.find((entry) => entry.id === target.dataset.slot)
    if (slot) { activeSlotId = slot.id; start(slot.data.role, slot.data) }
  }
  if (name === 'role-select' && game) {
    save()
    scene = 'title'; paused = false; pendingRole = null; foes = []; projectiles = []; bagOpen = false; craftingOpen = false; attributesOpen = false
    saveSlots = readSaves()
    renderTitle()
  }
  if (name === 'delete-slot' && target.dataset.slot) deleteSaveSlot(target.dataset.slot)
  if (name === 'cancel-delete') { pendingDeleteId = null; document.querySelector('.delete-confirm')?.remove() }
  if (name === 'confirm-delete') confirmDeleteSave()
  if (name === 'overwrite-slot' && pendingRole && target.dataset.slot) createRole(pendingRole, target.dataset.slot)
  if (name === 'cancel-new') { pendingRole = null; renderTitle() }
  if (name === 'rest' && game && scene === 'town') { game.hp = stats().hp; game.mp = stats().mp; save(); renderGame(); toast('休整完成，生命与法力已恢复。') }
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
  if (name === 'town' && game) { scene = 'town'; game.town = true; foes = []; save(); renderGame() }
  if (name === 'save') { save(); toast('远征进度已保存。') }
}
app.addEventListener('click', (event) => {
  const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-action]') : null
  if (target && !target.hasAttribute('disabled')) performAction(target.dataset.action ?? '', target)
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
  if (scene === 'battle' && game) {
    attackWait = Math.max(0, attackWait - dt); attackSwing = Math.max(0, attackSwing - dt); buffTime = Math.max(0, buffTime - dt)
    skillWait = skillWait.map((time) => Math.max(0, time - dt)); game.mp = Math.min(stats().mp, game.mp + dt * 4)
    const left = keys.has('a') || keys.has('arrowleft'); const right = keys.has('d') || keys.has('arrowright')
    if (left !== right) { const d = right ? 1 : -1; heroX = Math.max(35, Math.min(925, heroX + d * 245 * dt)); facing = d }
    if (keys.has('j') && attackWait <= 0) attack()
    if (!grounded) {
      heroY += velocityY * dt; velocityY += 1450 * dt
      if (heroY >= 0) { heroY = 0; velocityY = 0; grounded = true }
    }
    for (const foe of [...foes]) {
      foe.flash = Math.max(0, foe.flash - dt)
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
          foe.x = Math.max(30, Math.min(930, foe.x + (foe.dashDirection ?? directionToHero) * 300))
          foe.dashWindup = undefined
          addFx(bossFx('dash'), (startX + foe.x) / 2, world.floor - 70, foe.dashDirection ?? directionToHero, .55)
          if (Math.abs(heroX - foe.x) < 105 && (grounded || heroY > -35)) {
            game.hp = Math.max(0, game.hp - foeDamage(foe, true))
            addFx('hurt', heroX, world.floor - 68, 1, .32)
            addShake(9)
            setLog('守关者冲刺命中 · 提前后退或跳跃可躲避。')
          } else setLog('守关者冲刺落空！')
        }
      } else if (foe.boss && foe.skillTimer <= 0 && Math.abs(distance) < 470) {
        foe.dashWindup = .72; foe.dashDirection = directionToHero; foe.skillTimer = 4.7; foe.flash = .18
        addFx(bossFx('charge'), foe.x, world.floor - 72, directionToHero, .72)
        setLog('守关者正在蓄力冲刺，拉开距离或跳跃躲避！')
      } else {
        foe.skillTimer -= dt
        if (Math.abs(distance) > 78) foe.x += directionToHero * Math.min(Math.abs(distance) - 78, (foe.boss ? 44 : 82) * dt)
        foe.timer -= dt
        if (Math.abs(distance) < (foe.boss ? 138 : 112) && foe.timer <= 0 && (grounded || heroY > -36)) {
          const damage = foeDamage(foe)
          game.hp = Math.max(0, game.hp - damage); foe.timer = foe.boss ? 1.5 : 1.7 + Math.random() * .5
          addFx(foe.boss ? bossFx('melee') : 'enemy-swipe', heroX, world.floor - 65, -directionToHero, .38)
          effects.push({ kind: 'damage-number', x: heroX, y: world.floor - 112, life: .82, duration: .82, text: `-${damage}` })
          addShake(foe.boss ? 8 : 3)
          if (game.hp <= 0) { scene = 'defeat'; paused = false; game.dead = true; save(); renderGame(); break }
        }
      }
    }
    for (const projectile of [...projectiles]) {
      const target = foes.find((foe) => foe.id === projectile.targetId)
      if (target) {
        const distance = target.x - projectile.x
        projectile.x += Math.sign(distance) * Math.min(Math.abs(distance), Math.abs(projectile.vx) * dt)
      } else projectile.x += projectile.vx * dt
      projectile.life -= dt
      if (!target || projectile.life <= 0 || Math.abs(target.x - projectile.x) < 22) {
        if (target) strike(target, projectile.damage, '法杖光弹')
        projectiles = projectiles.filter((entry) => entry !== projectile)
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
  const gradient = c.createLinearGradient(0, 0, 0, world.height); gradient.addColorStop(0, scene === 'town' ? '#324d4b' : '#172d31'); gradient.addColorStop(.6, scene === 'town' ? '#68806b' : '#395a53'); gradient.addColorStop(1, '#83916a'); c.fillStyle = gradient; c.fillRect(0, 0, world.width, world.height)
  c.fillStyle = 'rgba(225, 216, 167, .8)'; c.beginPath(); c.arc(755, 116, 39, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#263f40'; c.beginPath(); c.moveTo(0, 305); c.lineTo(125, 201); c.lineTo(240, 279); c.lineTo(388, 166); c.lineTo(548, 294); c.lineTo(692, 215); c.lineTo(830, 296); c.lineTo(960, 199); c.lineTo(960, 402); c.lineTo(0, 402); c.fill()
  c.fillStyle = scene === 'town' ? '#53654a' : '#38564a'; c.beginPath(); c.moveTo(0, 345); c.lineTo(145, 270); c.lineTo(273, 333); c.lineTo(425, 251); c.lineTo(573, 342); c.lineTo(722, 267); c.lineTo(865, 334); c.lineTo(960, 291); c.lineTo(960, 404); c.lineTo(0, 404); c.fill()
  c.fillStyle = scene === 'town' ? '#624b37' : '#293b32'; c.fillRect(0, world.floor, 960, 90); c.fillStyle = '#798158'; c.fillRect(0, world.floor, 960, 6)
  c.fillStyle = 'rgba(201, 189, 129, .35)'; for (let n = 0; n < 48; n++) c.fillRect((n * 87 + 13) % 960, 411 + (n * 37) % 63, 3, 2)
  if (scene === 'town') {
    c.fillStyle = '#947751'; c.fillRect(674, 282, 7, 108); c.fillRect(842, 282, 7, 108); c.fillRect(674, 282, 175, 8); c.fillStyle = 'rgba(211, 176, 107, .32)'; c.fillRect(688, 296, 147, 94)
    c.fillStyle = '#df8a58'; c.beginPath(); c.moveTo(450, 389); c.lineTo(480, 327); c.lineTo(512, 389); c.fill(); c.fillStyle = '#f4d28d'; c.beginPath(); c.arc(480, 365, 13, 0, Math.PI * 2); c.fill()
  }
}
function drawHero(c: CanvasRenderingContext2D) {
  if (!game) return
  const jumpHeight = Math.max(0, Math.min(175, -heroY))
  c.fillStyle = 'rgba(8, 17, 17, .36)'; c.beginPath(); c.ellipse(heroX, world.floor + 2, Math.max(14, 29 - jumpHeight * .045), 7, 0, 0, Math.PI * 2); c.fill()
  c.save(); c.translate(heroX, world.floor - jumpHeight + Math.sin(performance.now() / 150) * (grounded ? 1.5 : 0)); c.scale(facing, 1)
  c.fillStyle = '#934c3c'; c.beginPath(); c.moveTo(-13, -62); c.lineTo(-29, -16); c.lineTo(-8, -28); c.lineTo(10, -10); c.lineTo(13, -62); c.fill()
  c.fillStyle = game.role === 'warrior' ? '#637467' : '#496c63'; c.fillRect(-14, -60, 29, 37); c.fillStyle = '#d0c4a0'; c.fillRect(-11, -83, 23, 27); c.fillStyle = '#534239'; c.fillRect(-14, -87, 29, 10)
  c.fillStyle = '#253532'; c.fillRect(-13, -24, 11, 21); c.fillRect(3, -24, 11, 21); c.fillStyle = '#c3b893'; c.fillRect(-16, -5, 17, 5); c.fillRect(1, -5, 17, 5)
  if (game.role === 'warrior') {
    c.save(); c.translate(14, -57); if (attackSwing > 0) c.rotate(-.72)
    c.fillStyle = '#c6a967'; c.fillRect(-2, -6, 5, 14); c.fillStyle = '#d9ddd0'; c.beginPath(); c.moveTo(1, -4); c.lineTo(46, 0); c.lineTo(1, 4); c.closePath(); c.fill(); c.restore()
  } else {
    c.strokeStyle = '#c6a967'; c.lineWidth = 4; c.beginPath(); c.moveTo(16, -52); c.lineTo(28, -11); c.stroke(); c.fillStyle = '#b9d7c7'; c.beginPath(); c.arc(29, -12, 7, 0, Math.PI * 2); c.fill(); c.fillStyle = '#e6ddaa'; c.beginPath(); c.arc(29, -12, 3, 0, Math.PI * 2); c.fill()
  }
  c.restore()
}
function drawFoe(c: CanvasRenderingContext2D, foe: Foe) {
  const scale = foe.boss ? 2.25 : 1
  c.save(); c.translate(foe.x, world.floor); c.scale(scale, scale); if (foe.flash > 0) c.filter = 'brightness(2)'
  c.fillStyle = foe.boss ? '#87483e' : '#54794c'; c.beginPath(); c.moveTo(-24, -7); c.lineTo(-22, -39); c.lineTo(-10, -56); c.lineTo(10, -56); c.lineTo(23, -37); c.lineTo(25, -7); c.closePath(); c.fill()
  c.fillStyle = '#bca96d'; c.beginPath(); c.moveTo(-17, -47); c.lineTo(-27, -71); c.lineTo(-4, -55); c.lineTo(17, -47); c.lineTo(27, -71); c.lineTo(5, -55); c.closePath(); c.fill(); c.fillStyle = '#e5c87a'; c.fillRect(-13, -42, 6, 4); c.fillRect(7, -42, 6, 4); c.fillStyle = '#d0bd88'; c.fillRect(-15, -27, 30, 7)
  if (foe.boss) { c.fillStyle = '#d5b979'; c.fillRect(-21, -17, 42, 7); c.fillStyle = '#593936'; c.fillRect(-6, -84, 12, 11) }
  c.restore()
  if ((foe.stunTimer ?? 0) > 0) {
    const orbitY = world.floor - (foe.boss ? 192 : 96)
    c.save(); c.strokeStyle = '#c7f0de'; c.lineWidth = 2
    for (let i = 0; i < 3; i++) {
      const angle = performance.now() / 260 + (i * Math.PI * 2) / 3
      c.beginPath(); c.arc(foe.x + Math.cos(angle) * 20, orbitY + Math.sin(angle) * 7, 3, 0, Math.PI * 2); c.stroke()
    }
    c.restore()
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
  } else if (fx.kind === 'spark') {
    c.fillStyle = fx.color ?? '#ffe09a'
    c.beginPath(); c.arc(fx.x, fx.y, fx.radius ?? 2, 0, Math.PI * 2); c.fill()
  } else if (fx.kind.startsWith('boss-')) {
    const theme = fx.kind.split('-')[2]
    const charging = fx.kind.includes('charge')
    const colors: Record<string, string> = { ember: '#f49b58', frost: '#a9e2e5', storm: '#f2dc79', void: '#d78fb4', moss: '#a7cf77', sun: '#ffe28a', blood: '#ec6464', tide: '#69c7d2', ash: '#c9c2b0', star: '#b8a4f4' }
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
  drawPotionDrops(ctx)
  for (const foe of foes) drawFoe(ctx, foe)
  drawHero(ctx)
  for (const projectile of projectiles) {
    ctx.fillStyle = game?.role === 'mage' ? '#b6e0d0' : '#f2dc9e'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(projectile.x, projectile.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
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
render(); requestAnimationFrame(frame)
