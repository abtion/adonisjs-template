type TimestampType = 'createdAt' | 'updatedAt'

export default function timestamps<T extends TimestampType>(
  types: T[] = ['createdAt', 'updatedAt'] as T[]
): Record<T, Date> {
  const entries = types.map((type) => [type, new Date()])
  return Object.fromEntries(entries)
}
