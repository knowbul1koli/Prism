export function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp > Math.floor(Date.now() / 1000)
  } catch { return false }
}
export function getUsernameFromToken(token: string): string | null {
  try { return JSON.parse(atob(token.split('.')[1])).user ?? null }
  catch { return null }
}
