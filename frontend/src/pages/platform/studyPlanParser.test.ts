import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { parseLessonRows } from './studyPlanParser'

describe('parseLessonRows', () => {
  it('maps homework and notes from common Arabic header aliases', () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['عنوان الدرس', 'الواجب', 'ملاحظات'],
      ['الدرس الأول', 'حل الصفحة 10', 'راجِع الكتاب']
    ])

    expect(parseLessonRows(sheet)).toEqual([
      {
        lessonTopic: 'الدرس الأول',
        homework: 'حل الصفحة 10',
        notes: 'راجِع الكتاب'
      }
    ])
  })
})
