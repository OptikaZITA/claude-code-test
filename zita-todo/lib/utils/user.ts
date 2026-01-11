/**
 * User display name utilities
 *
 * Priority: nickname > full_name > fallback
 */

interface UserWithName {
  nickname?: string | null
  full_name?: string | null
}

/**
 * Get the display name for a user (nickname preferred)
 * @param user - User object with nickname and/or full_name
 * @param fallback - Fallback text if neither exists (default: 'Neznámy')
 * @returns Display name string
 */
export function getDisplayName(
  user: UserWithName | null | undefined,
  fallback: string = 'Neznámy'
): string {
  if (!user) return fallback
  return user.nickname || user.full_name || fallback
}

/**
 * Get the full display name for admin contexts (nickname + full_name in brackets)
 * @param user - User object with nickname and/or full_name
 * @param fallback - Fallback text if neither exists (default: 'Neznámy')
 * @returns Full display name string, e.g. "Dano (Daniel Grigar)"
 */
export function getFullDisplayName(
  user: UserWithName | null | undefined,
  fallback: string = 'Neznámy'
): string {
  if (!user) return fallback

  if (user.nickname && user.full_name && user.nickname !== user.full_name) {
    return `${user.nickname} (${user.full_name})`
  }

  return user.nickname || user.full_name || fallback
}
