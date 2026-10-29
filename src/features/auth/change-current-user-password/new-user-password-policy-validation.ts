export type NewUserPasswordPolicyError =
  | 'passwordMin'
  | 'passwordLower'
  | 'passwordDigit'
  | 'passwordByteLimit'
  | 'passwordWhitespace'
  | 'passwordFormat'

export function getNewUserPasswordPolicyError(
  password: string
): NewUserPasswordPolicyError | undefined {
  // Unicode White_Space plus BOM; identical to the server's boundary policy.
  if (/^[\p{White_Space}\uFEFF]|[\p{White_Space}\uFEFF]$/u.test(password))
    return 'passwordWhitespace'
  if (
    /^\$2[aby]\$/.test(password) ||
    Array.from(password).some((character) => {
      const codePoint = character.codePointAt(0)!
      return codePoint >= 0xd800 && codePoint <= 0xdfff
    })
  )
    return 'passwordFormat'
  if (Array.from(password).length < 8) return 'passwordMin'
  if (new TextEncoder().encode(password).length > 72) return 'passwordByteLimit'
  if (!/[a-z]/.test(password)) return 'passwordLower'
  if (!/[0-9]/.test(password)) return 'passwordDigit'
  return undefined
}
