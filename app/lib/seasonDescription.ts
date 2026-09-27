export type DescriptionLink = { label: string; url: string }
export type DescriptionStaff = { role: string; name: string }
export type DescriptionSection = {
  title: string | null
  links: DescriptionLink[]
  staff: DescriptionStaff[]
  text: string[]
  notes: { subtitle: string | null; items: string[] }[]
}

const linkPattern = /^-\[\[(.+?)\s+(https?:\/\/[^\]]+)\]\]$/

export function parseDescription(value: string): DescriptionSection[] {
  const sections: DescriptionSection[] = []
  let current: DescriptionSection = { title: null, links: [], staff: [], text: [], notes: [] }
  let currentNote: DescriptionSection['notes'][number] | null = null

  const pushCurrent = () => {
    if (
      current.title ||
      current.links.length ||
      current.staff.length ||
      current.text.length ||
      current.notes.length
    ) {
      sections.push(current)
    }
  }

  for (const rawLine of value.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    if (line.startsWith('**')) {
      currentNote = { subtitle: line.slice(2).trim() || null, items: [] }
      current.notes.push(currentNote)
      continue
    }
    if (line.startsWith('*')) {
      pushCurrent()
      current = { title: line.slice(1).trim() || null, links: [], staff: [], text: [], notes: [] }
      currentNote = null
      continue
    }
    const linkMatch = line.match(linkPattern)
    if (linkMatch) {
      current.links.push({ label: linkMatch[1].trim(), url: linkMatch[2].trim() })
      continue
    }
    if (line.startsWith(':')) {
      const [role, ...rest] = line.slice(1).split(':')
      const name = rest.join(':').trim()
      const roleText = (role ?? '').trim()
      if (roleText || name) current.staff.push({ role: roleText, name })
      continue
    }
    if (line.startsWith('-')) {
      const item = line.slice(1).trim()
      if (currentNote) currentNote.items.push(item)
      else current.text.push(item)
      continue
    }
    if (currentNote) currentNote.items.push(line)
    else current.text.push(line)
  }
  pushCurrent()
  return sections
}
