let configCache: { API_BASE_URL: string } | null = null

export async function getApiBaseUrl(): Promise<string> {
  if (configCache) return configCache.API_BASE_URL
  const res = await fetch('/config.json', { cache: 'no-store' })
  configCache = await res.json()
  return configCache!.API_BASE_URL
}
