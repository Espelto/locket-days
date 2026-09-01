import { useEffect, useMemo, useRef, useState } from 'react'
import {
  avatarTone,
  daysInMonth,
  daysUntil,
  formatShortDate,
  greeting,
  groupByMonth,
  sortBySoonest,
  todayLabel,
  turningAge,
  untilPhrase,
} from './lib/dates'
import { makePinRecord, pinMatches } from './lib/pin'
import {
  exportBackup,
  importBackup,
  isOnboarded,
  isSessionUnlocked,
  loadPeople,
  loadPinRecord,
  markOnboarded,
  savePeople,
  savePinRecord,
  setSessionUnlocked,
} from './lib/storage'
import { MONTHS, RELATIONS } from './lib/types'
import type { Draft, Person } from './lib/types'

type Tab = 'home' | 'people' | 'settings'

const emptyDraft = (): Draft => ({
  name: '',
  month: new Date().getMonth() + 1,
  day: new Date().getDate(),
  year: '',
  relation: 'Family',
  notes: '',
  gifts: '',
})

function LocketMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#1E3A34" />
      <ellipse cx="32" cy="34" rx="14" ry="16" fill="none" stroke="#F3F6F4" strokeWidth="2.4" />
      <circle cx="32" cy="24" r="3.2" fill="#C45B6A" />
      <path d="M32 27.5 V32" stroke="#F3F6F4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6.5 10.5V19h11v-8.5" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="9" r="3" />
      <circle cx="16" cy="10" r="2.4" />
      <path d="M4.5 18c.7-2.6 2.6-4 4.5-4s3.8 1.4 4.5 4" />
      <path d="M13.2 16.2c.8-1.6 2.2-2.5 3.8-2.5 1.5 0 2.8.7 3.5 2.1" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.8v2.2M12 18v2.2M3.8 12h2.2M18 12h2.2M6.2 6.2l1.6 1.6M16.2 16.2l1.6 1.6M17.8 6.2l-1.6 1.6M7.8 16.2l-1.6 1.6" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 6 9 12l6 6" />
    </svg>
  )
}

function EmptyLocket() {
  return (
    <svg viewBox="0 0 88 88" aria-hidden="true">
      <rect width="88" height="88" rx="28" fill="#E7EEEA" />
      <ellipse cx="44" cy="48" rx="18" ry="21" fill="none" stroke="#1E3A34" strokeWidth="2.4" />
      <circle cx="44" cy="34" r="4" fill="#C45B6A" />
    </svg>
  )
}

function PinDots({ length, filled }: { length: number; filled: number }) {
  return (
    <div className="dots" aria-hidden="true">
      {Array.from({ length }, (_, index) => (
        <span className={index < filled ? 'dot filled' : 'dot'} key={index} />
      ))}
    </div>
  )
}

function Keypad({
  onDigit,
  onDelete,
}: {
  onDigit: (digit: string) => void
  onDelete: () => void
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']
  return (
    <div className="keys">
      {keys.map((key) => {
        if (!key) return <span key="blank" />
        if (key === 'del') {
          return (
            <button className="key ghost" key="del" type="button" onClick={onDelete} aria-label="Delete">
              ⌫
            </button>
          )
        }
        return (
          <button className="key" key={key} type="button" onClick={() => onDigit(key)}>
            {key}
          </button>
        )
      })}
    </div>
  )
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

export default function App() {
  const [hydrated, setHydrated] = useState(false)
  const [people, setPeople] = useState<Person[]>([])
  const [pinRecord, setPinRecord] = useState<{ salt: string; hash: string } | null>(null)
  const [unlocked, setUnlocked] = useState(true)
  const [welcome, setWelcome] = useState(false)
  const [tab, setTab] = useState<Tab>('home')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinMode, setPinMode] = useState<'off' | 'create' | 'confirm' | 'remove'>('off')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const record = loadPinRecord()
    setPeople(loadPeople())
    setPinRecord(record)
    setWelcome(!isOnboarded())
    setUnlocked(!record || isSessionUnlocked())
    if (isStandalone()) document.body.classList.add('standalone')
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    savePeople(people)
  }, [hydrated, people])

  const soonest = useMemo(() => sortBySoonest(people), [people])
  const todayPeople = soonest.filter((person) => daysUntil(person.month, person.day) === 0)
  const upcoming = soonest.filter((person) => daysUntil(person.month, person.day) > 0).slice(0, 8)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? people.filter(
          (person) =>
            person.name.toLowerCase().includes(q) ||
            person.relation.toLowerCase().includes(q),
        )
      : people
    return groupByMonth(list)
  }, [people, query])

  function openCreate() {
    setEditingId(null)
    setDraft(emptyDraft())
  }

  function openEdit(person: Person) {
    setEditingId(person.id)
    setDraft({
      name: person.name,
      month: person.month,
      day: person.day,
      year: person.year ? String(person.year) : '',
      relation: person.relation || 'Friend',
      notes: person.notes,
      gifts: person.gifts,
    })
  }

  function saveDraft() {
    if (!draft) return
    const name = draft.name.trim()
    if (!name) return
    const year = draft.year.trim() ? Number(draft.year) : null
    if (year && (year < 1900 || year > new Date().getFullYear())) return
    const now = new Date().toISOString()
    const next: Person = {
      id: editingId ?? crypto.randomUUID(),
      name,
      month: draft.month,
      day: Math.min(draft.day, daysInMonth(year || 2024, draft.month)),
      year,
      relation: draft.relation.trim(),
      notes: draft.notes.trim(),
      gifts: draft.gifts.trim(),
      createdAt: people.find((person) => person.id === editingId)?.createdAt ?? now,
      updatedAt: now,
    }
    setPeople((current) => {
      const without = current.filter((person) => person.id !== next.id)
      return [...without, next]
    })
    setDraft(null)
    setEditingId(null)
    setTab('home')
  }

  function removePerson(id: string) {
    if (!confirm('Remove this person from Locket?')) return
    setPeople((current) => current.filter((person) => person.id !== id))
    setDraft(null)
    setEditingId(null)
  }

  async function tryUnlock(next: string) {
    setPinInput(next)
    setPinError('')
    if (next.length < 4 || !pinRecord) return
    if (await pinMatches(next, pinRecord)) {
      setSessionUnlocked(true)
      setUnlocked(true)
      setPinInput('')
    } else {
      setPinError('That PIN does not match.')
      setPinInput('')
    }
  }

  async function handlePinSetup(digit: string) {
    const target = pinMode === 'confirm' ? confirmPin : newPin
    const next = (target + digit).slice(0, 4)
    if (pinMode === 'create' || pinMode === 'remove') setNewPin(next)
    else setConfirmPin(next)
    if (next.length < 4) return

    if (pinMode === 'create') {
      setPinMode('confirm')
      return
    }
    if (pinMode === 'confirm') {
      if (next !== newPin) {
        setPinError('PINs did not match. Try again.')
        setNewPin('')
        setConfirmPin('')
        setPinMode('create')
        return
      }
      const record = await makePinRecord(next)
      savePinRecord(record)
      setPinRecord(record)
      setSessionUnlocked(true)
      setPinMode('off')
      setNewPin('')
      setConfirmPin('')
      setPinError('')
      return
    }
    if (pinMode === 'remove' && pinRecord) {
      if (await pinMatches(next, pinRecord)) {
        savePinRecord(null)
        setPinRecord(null)
        setPinMode('off')
        setNewPin('')
        setPinError('')
      } else {
        setPinError('That PIN does not match.')
        setNewPin('')
      }
    }
  }

  function downloadBackup() {
    const blob = new Blob([exportBackup(people)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'locket-backup.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  function onImportFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const imported = importBackup(String(reader.result || ''))
        setPeople(imported)
        alert(`Imported ${imported.length} ${imported.length === 1 ? 'person' : 'people'}.`)
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Could not read that backup.')
      }
    }
    reader.readAsText(file)
  }

  if (!hydrated) return <div className="app-frame" />

  if (!unlocked) {
    return (
      <div className="app-frame">
        <div className="shell">
          <div className="lock">
            <div>
              <LocketMark className="mark" />
              <p className="kicker">Private</p>
              <h1>Locket</h1>
              <p>Enter your PIN to open the dates you keep.</p>
            </div>
            <div>
              <PinDots length={4} filled={pinInput.length} />
              <p className="error">{pinError}</p>
              <Keypad
                onDigit={(digit) => {
                  const next = (pinInput + digit).slice(0, 4)
                  void tryUnlock(next)
                }}
                onDelete={() => setPinInput((value) => value.slice(0, -1))}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const formOpen = Boolean(draft)
  const maxDay = daysInMonth(Number(draft?.year) || 2024, draft?.month || 1)

  return (
    <div className="app-frame">
      <div className="shell">
        {welcome && (
          <div className="welcome">
            <LocketMark className="mark" />
            <h1>The people you keep close</h1>
            <p>
              Locket remembers birthdays on this phone. Nothing is sent to an account.
              Add it to your Home Screen so it opens like an app.
            </p>
            <button
              className="save-btn"
              type="button"
              onClick={() => {
                markOnboarded()
                setWelcome(false)
              }}
            >
              Open Locket
            </button>
          </div>
        )}

        {formOpen && draft ? (
          <div className="screen tight">
            <div className="top">
              <div>
                <p className="kicker">{editingId ? 'Edit' : 'New'}</p>
                <h1>{editingId ? 'Update' : 'Add someone'}</h1>
              </div>
              <button className="icon-btn" type="button" onClick={() => setDraft(null)} aria-label="Back">
                <BackIcon />
              </button>
            </div>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                autoComplete="name"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </div>
            <div className="row-2">
              <div className="field">
                <label htmlFor="month">Month</label>
                <select
                  id="month"
                  value={draft.month}
                  onChange={(event) =>
                    setDraft({ ...draft, month: Number(event.target.value), day: Math.min(draft.day, daysInMonth(2024, Number(event.target.value))) })
                  }
                >
                  {MONTHS.map((month, index) => (
                    <option key={month} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="day">Day</label>
                <select
                  id="day"
                  value={Math.min(draft.day, maxDay)}
                  onChange={(event) => setDraft({ ...draft, day: Number(event.target.value) })}
                >
                  {Array.from({ length: maxDay }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {index + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="year">Birth year (optional, for age)</label>
              <input
                id="year"
                inputMode="numeric"
                placeholder="1990"
                value={draft.year}
                onChange={(event) => setDraft({ ...draft, year: event.target.value.replace(/[^\d]/g, '').slice(0, 4) })}
              />
            </div>
            <div className="field">
              <label>Relation</label>
              <div className="chips">
                {RELATIONS.map((relation) => (
                  <button
                    className={draft.relation === relation ? 'chip on' : 'chip'}
                    key={relation}
                    type="button"
                    onClick={() => setDraft({ ...draft, relation })}
                  >
                    {relation}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="gifts">Gift ideas</label>
              <textarea
                id="gifts"
                value={draft.gifts}
                onChange={(event) => setDraft({ ...draft, gifts: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                value={draft.notes}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              />
            </div>
            <button className="save-btn" type="button" onClick={saveDraft} disabled={!draft.name.trim()}>
              Save
            </button>
            {editingId && (
              <button className="danger-btn" type="button" onClick={() => removePerson(editingId)}>
                Remove person
              </button>
            )}
          </div>
        ) : (
          <>
            {tab === 'home' && (
              <div className="screen">
                <div className="top">
                  <div>
                    <p className="kicker">{todayLabel()}</p>
                    <h1>{greeting()}</h1>
                  </div>
                  <button className="add-btn" type="button" onClick={openCreate}>
                    <PlusIcon /> Add
                  </button>
                </div>

                {todayPeople.length > 0 ? (
                  <div className="hero-card">
                    <p className="count">TODAY</p>
                    <h2>
                      {todayPeople.length === 1
                        ? `It is ${todayPeople[0].name}'s birthday`
                        : `${todayPeople.length} birthdays today`}
                    </h2>
                    <p>
                      {`${todayPeople
                        .map((person) => {
                          const age = turningAge(person)
                          return age ? `${person.name} turns ${age}` : person.name
                        })
                        .join(', ')}.`}
                    </p>
                  </div>
                ) : (
                  <div className="hero-card">
                    <p className="count">LOCKET</p>
                    <h2>{people.length ? 'No birthdays today' : 'Your private date book'}</h2>
                    <p>
                      {people.length
                        ? 'The next one is waiting below.'
                        : 'Add the people you never want to forget.'}
                    </p>
                  </div>
                )}

                {people.length === 0 ? (
                  <div className="empty">
                    <EmptyLocket />
                    <h2>It is quiet in here</h2>
                    <p>Start with family, then the friends whose dates you always mean to remember.</p>
                    <button className="add-btn" type="button" onClick={openCreate}>
                      Add someone
                    </button>
                  </div>
                ) : (
                  <>
                    <h2>Coming up</h2>
                    <div className="list" style={{ marginTop: 12 }}>
                      {upcoming.map((person) => {
                        const days = daysUntil(person.month, person.day)
                        const age = turningAge(person)
                        return (
                          <button className="person" key={person.id} type="button" onClick={() => openEdit(person)}>
                            <span className={`avatar ${avatarTone(person.name)}`}>
                              {person.name.slice(0, 1).toUpperCase()}
                            </span>
                            <span>
                              <strong>{person.name}</strong>
                              <span>
                                {formatShortDate(person.month, person.day)}
                                {person.relation ? ` · ${person.relation}` : ''}
                                {age ? ` · turning ${age}` : ''}
                              </span>
                            </span>
                            <span className={days <= 7 ? 'days hot' : 'days'}>{untilPhrase(days)}</span>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === 'people' && (
              <div className="screen">
                <div className="top">
                  <div>
                    <p className="kicker">{people.length} kept</p>
                    <h1>Everyone</h1>
                  </div>
                  <button className="add-btn" type="button" onClick={openCreate}>
                    <PlusIcon /> Add
                  </button>
                </div>
                <input
                  className="search"
                  value={query}
                  placeholder="Search names"
                  onChange={(event) => setQuery(event.target.value)}
                />
                {people.length === 0 ? (
                  <div className="empty">
                    <EmptyLocket />
                    <h2>No one yet</h2>
                    <p>Add a name and a date. Locket will sort the year for you.</p>
                  </div>
                ) : (
                  filtered.map((group) => (
                    <section key={group.month}>
                      <p className="month-label">{MONTHS[group.month - 1]}</p>
                      <div className="list">
                        {group.people.map((person) => (
                          <button className="person" key={person.id} type="button" onClick={() => openEdit(person)}>
                            <span className={`avatar ${avatarTone(person.name)}`}>
                              {person.name.slice(0, 1).toUpperCase()}
                            </span>
                            <span>
                              <strong>{person.name}</strong>
                              <span>
                                {formatShortDate(person.month, person.day)}
                                {person.relation ? ` · ${person.relation}` : ''}
                              </span>
                            </span>
                            <span className="days">{untilPhrase(daysUntil(person.month, person.day))}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))
                )}
              </div>
            )}

            {tab === 'settings' && (
              <div className="screen">
                <div className="top">
                  <div>
                    <p className="kicker">Locket</p>
                    <h1>Settings</h1>
                  </div>
                </div>

                <div className="panel install">
                  <h2>Add to iPhone</h2>
                  <ol>
                    <li>Open this page in Safari (the compass icon), not Chrome.</li>
                    <li>Tap the Share button (square with an arrow up).</li>
                    <li>Scroll and tap Add to Home Screen, then Add.</li>
                  </ol>
                  <p>It will sit next to your other apps and open full screen.</p>
                </div>

                <div className="panel">
                  <h2>PIN lock</h2>
                  <p>
                    {pinRecord
                      ? 'A 4-digit PIN hides the list when the app is closed.'
                      : 'Optional. Useful if other people use this phone.'}
                  </p>
                  {pinMode === 'off' ? (
                    <button
                      className={pinRecord ? 'ghost-btn' : 'unlock-btn'}
                      type="button"
                      onClick={() => {
                        setPinError('')
                        setNewPin('')
                        setConfirmPin('')
                        setPinMode(pinRecord ? 'remove' : 'create')
                      }}
                    >
                      {pinRecord ? 'Remove PIN' : 'Set a PIN'}
                    </button>
                  ) : (
                    <>
                      <p>
                        {pinMode === 'create' && 'Choose a 4-digit PIN.'}
                        {pinMode === 'confirm' && 'Type it once more.'}
                        {pinMode === 'remove' && 'Enter the current PIN to remove it.'}
                      </p>
                      <PinDots length={4} filled={(pinMode === 'confirm' ? confirmPin : newPin).length} />
                      <p className="error">{pinError}</p>
                      <Keypad
                        onDigit={(digit) => void handlePinSetup(digit)}
                        onDelete={() => {
                          if (pinMode === 'confirm') setConfirmPin((value) => value.slice(0, -1))
                          else setNewPin((value) => value.slice(0, -1))
                        }}
                      />
                      <button className="ghost-btn" type="button" onClick={() => setPinMode('off')}>
                        Cancel
                      </button>
                    </>
                  )}
                </div>

                <div className="panel">
                  <h2>Backup</h2>
                  <p>
                    Dates live on this device. Save a backup before changing phones, then import it there.
                  </p>
                  <button className="unlock-btn" type="button" onClick={downloadBackup}>
                    Download backup
                  </button>
                  <button className="ghost-btn" type="button" onClick={() => fileRef.current?.click()}>
                    Import backup
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/json"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) onImportFile(file)
                      event.target.value = ''
                    }}
                  />
                </div>

                <div className="panel">
                  <h2>Privacy</h2>
                  <p>
                    Names and dates stay in this browser. There is no account and no public list.
                    {pinRecord ? ' Lock it with the PIN when you step away.' : ''}
                  </p>
                </div>
              </div>
            )}

            <nav className="tabbar">
              <button className={tab === 'home' ? 'tab active' : 'tab'} type="button" onClick={() => setTab('home')}>
                <HomeIcon />
                Home
              </button>
              <button className={tab === 'people' ? 'tab active' : 'tab'} type="button" onClick={() => setTab('people')}>
                <PeopleIcon />
                People
              </button>
              <button
                className={tab === 'settings' ? 'tab active' : 'tab'}
                type="button"
                onClick={() => setTab('settings')}
              >
                <GearIcon />
                Settings
              </button>
            </nav>
          </>
        )}
      </div>
    </div>
  )
}
