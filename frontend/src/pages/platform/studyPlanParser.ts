import * as XLSX from 'xlsx'

export type LessonRow = {
  lessonTopic: string
  homework: string
  notes: string
}

const normalizeHeader = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]/g, '')

const headerAliases = {
  lessonTopic: ['موضوع الدرس', 'عنوان الدرس', 'lessontopic', 'topic', 'الدرس', 'الدرس'],
  homework: ['الواجبات', 'الواجب', 'homework', 'assignment', 'الواجبات المنزلية', 'المهمة'],
  notes: ['الملاحظات', 'ملاحظات', 'notes', 'note', 'الملاحظة']
}

const getCellValue = (headers: string[], row: string[], candidates: string[], fallbackIndex: number) => {
  const normalizedCandidates = candidates.map(normalizeHeader)
  const index = headers.findIndex((header) => normalizedCandidates.includes(normalizeHeader(header)))
  if (index >= 0 && row[index]) return row[index]
  return row[fallbackIndex] || ''
}

export const parseLessonRows = (sheet: XLSX.WorkSheet): LessonRow[] => {
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as Array<Array<unknown>>
  const rows = rawRows.map((row) => row.map((value) => String(value ?? '').trim()))

  if (!rows.length) return []

  const firstRow = rows[0]
  const hasHeaderRow = firstRow.some((cell) => {
    const normalized = normalizeHeader(cell)
    return [
      'موضوعالدرس',
      'lessontopic',
      'topic',
      'الواجبات',
      'homework',
      'assignment',
      'الملاحظات',
      'notes',
      'note',
      'عنوانالدرس',
      'الواجب',
      'ملاحظات'
    ].includes(normalized)
  })

  const headerRow = hasHeaderRow ? firstRow : ['موضوع الدرس', 'الواجبات', 'الملاحظات']
  const dataRows = hasHeaderRow ? rows.slice(1) : rows

  return dataRows
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => ({
      lessonTopic: getCellValue(headerRow, row, headerAliases.lessonTopic, 0),
      homework: getCellValue(headerRow, row, headerAliases.homework, 1),
      notes: getCellValue(headerRow, row, headerAliases.notes, 2)
    }))
}
