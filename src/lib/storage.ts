import type { Person } from './types'

const PEOPLE_KEY = 'locket:people:v1'
const PIN_KEY = 'locket:pin:v1'
const ONBOARDED_KEY = 'locket:onboarded:v1'
const UNLOCK_KEY = 'locket:unlocked'

export function loadPeople(): Person[] {
  try {
    const raw = localStorage.getItem(PEOPLE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Person[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((person) => person && typeof person.name === 'string')
  } catch {
    return []
  }
}

export function savePeople(people: Person[]) {
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(people))
}

export function loadPinRecord() {
  try {
    const raw = localStorage.getItem(PIN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { salt: string; hash: string }
    if (!parsed?.salt || !parsed?.hash) return null
    return parsed
  } catch {
    return null
  }
}

export function savePinRecord(record: { salt: string; hash: string } | null) {
  if (!record) localStorage.removeItem(PIN_KEY)
  else localStorage.setItem(PIN_KEY, JSON.stringify(record))
}

export function isOnboarded() {
  return localStorage.getItem(ONBOARDED_KEY) === '1'
}

export function markOnboarded() {
  localStorage.setItem(ONBOARDED_KEY, '1')
}

export function isSessionUnlocked() {
  return sessionStorage.getItem(UNLOCK_KEY) === '1'
}

export function setSessionUnlocked(value: boolean) {
  if (value) sessionStorage.setItem(UNLOCK_KEY, '1')
  else sessionStorage.removeItem(UNLOCK_KEY)
}

export function exportBackup(people: Person[]) {
  return JSON.stringify(
    {
      app: 'locket',
      version: 1,
      exportedAt: new Date().toISOString(),
      people,
    },
    null,
    2,
  )
}

export function importBackup(raw: string): Person[] {
  const parsed = JSON.parse(raw) as { people?: Person[] } | Person[]
  const people = Array.isArray(parsed) ? parsed : parsed.people
  if (!Array.isArray(people)) throw new Error('No people found in that file.')
  return people
    .filter((person) => person && typeof person.name === 'string')
    .map((person) => ({
      id: person.id || crypto.randomUUID(),
      name: String(person.name).trim(),
      month: Number(person.month) || 1,
      day: Number(person.day) || 1,
      year: person.year ? Number(person.year) : null,
      relation: String(person.relation || '').trim(),
      notes: String(person.notes || ''),
      gifts: String(person.gifts || ''),
      createdAt: person.createdAt || new Date().toISOString(),
      updatedAt: person.updatedAt || new Date().toISOString(),
    }))
    .filter((person) => person.name && person.month >= 1 && person.month <= 12)
}
