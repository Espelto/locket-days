function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function randomSalt() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return bytesToHex(bytes)
}

export async function hashPin(pin: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(new Uint8Array(digest))
}

export async function makePinRecord(pin: string) {
  const salt = randomSalt()
  return { salt, hash: await hashPin(pin, salt) }
}

export async function pinMatches(
  pin: string,
  record: { salt: string; hash: string },
) {
  return (await hashPin(pin, record.salt)) === record.hash
}
