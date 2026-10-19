import Bmob from 'hydrogen-js-sdk'

// Bmob 客户端应用参数。Secret Key / API 安全码会出现在前端，这是 Bmob 客户端 SDK 的正常用法。
// 请勿把 Master Key 放进这里。
export const CLOUD_CONFIG = {
  secretKey: 'c00772d5b516de0f',
  apiSafeCode: '3196532007112233',
  profileTable: 'GameProfile',
}

export type CloudUser = {
  objectId: string
  username: string
  email?: string
  sessionToken?: string
}

export type CloudProfile = {
  objectId?: string
  slots: string
  savedAt?: string
}

let initialized = false

export function cloudAvailable() {
  return typeof window !== 'undefined' && location.protocol !== 'file:' && Boolean(CLOUD_CONFIG.secretKey && CLOUD_CONFIG.apiSafeCode)
}

function ensureInitialized() {
  if (!initialized) {
    Bmob.initialize(CLOUD_CONFIG.secretKey, CLOUD_CONFIG.apiSafeCode)
    initialized = true
  }
}

function normalizeUser(raw: unknown): CloudUser | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const objectId = value.objectId ?? value.id
  if (!objectId) return null
  return {
    objectId: String(objectId),
    username: String(value.username ?? ''),
    email: value.email ? String(value.email) : undefined,
    sessionToken: value.sessionToken ? String(value.sessionToken) : undefined,
  }
}

export async function currentCloudUser(): Promise<CloudUser | null> {
  if (!cloudAvailable()) return null
  ensureInitialized()
  const maybe = (Bmob.User as unknown as { current?: () => unknown }).current?.()
  const raw = maybe && typeof (maybe as Promise<unknown>).then === 'function' ? await maybe : maybe
  return normalizeUser(raw)
}

export async function registerCloudUser(username: string, password: string, email: string) {
  ensureInitialized()
  return await (Bmob.User as unknown as { register: (params: object) => Promise<unknown> }).register({ username, password, email })
}

export async function loginCloudUser(username: string, password: string): Promise<CloudUser | null> {
  ensureInitialized()
  const raw = await (Bmob.User as unknown as { login: (username: string, password: string) => Promise<unknown> }).login(username, password)
  return normalizeUser(raw)
}

export async function logoutCloudUser() {
  ensureInitialized()
  ;(Bmob.User as unknown as { logout?: () => void }).logout?.()
}

export async function resetCloudPassword(email: string) {
  ensureInitialized()
  return await (Bmob.requestPasswordReset({ email }) as unknown as Promise<unknown>)
}

export async function fetchCloudProfile(user: CloudUser): Promise<CloudProfile | null> {
  ensureInitialized()
  const query = Bmob.Query(CLOUD_CONFIG.profileTable) as unknown as {
    equalTo: (key: string, operator: string, value: unknown) => void
    find: () => Promise<unknown>
  }
  query.equalTo('ownerId', '==', user.objectId)
  const result = (await query.find()) as { results?: unknown[] } | unknown[]
  const rows = Array.isArray(result) ? result : result?.results ?? []
  const row = rows[0] as Record<string, unknown> | undefined
  if (!row) return null
  return {
    objectId: row.objectId ? String(row.objectId) : undefined,
    slots: typeof row.slots === 'string' ? row.slots : '',
    savedAt: row.savedAt ? String(row.savedAt) : undefined,
  }
}

export async function saveCloudProfile(user: CloudUser, slots: string, objectId?: string): Promise<string | null> {
  ensureInitialized()
  const query = Bmob.Query(CLOUD_CONFIG.profileTable) as unknown as {
    set: (field: string, value: string) => void
    save: () => Promise<unknown>
  }
  if (objectId) query.set('id', objectId)
  query.set('ownerId', user.objectId)
  query.set('slots', slots)
  query.set('savedAt', new Date().toISOString())
  const result = (await query.save()) as Record<string, unknown> | undefined
  return result?.objectId ? String(result.objectId) : objectId ?? null
}
