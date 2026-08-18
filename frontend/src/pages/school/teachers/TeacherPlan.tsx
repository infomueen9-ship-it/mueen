import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import api from '../../../api/axios'
import toast from 'react-hot-toast'

interface Props {
  classroomId: number
  classroomName: string
  schemaName: string
  teacherId: number
}

interface Subject {
  id: number
  name: string
  teacherId: number | null
}

interface ScheduleRow {
  day: string
  period: string
  subject_name: string
}

interface LessonCatalogItem {
  id: number
  subject_name: string
  lesson_topic: string
}

interface WeekEntry {
  day: string
  period: string
  subjectName: string
  lessonTopic?: string
  homework?: string
}

interface AllWeekEntry extends WeekEntry {
  weekNumber: number
}

interface RowDraft {
  lessonTopic: string
  homework: string
}

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
const WEEKS = Array.from({ length: 20 }, (_, i) => i + 1)

const dayIndex = (day: string) => {
  const index = DAYS.indexOf(day)
  return index === -1 ? DAYS.length : index
}

// المادة "period" مخزّنة كنص كامل مثل "الحصة 3" (راجع PERIODS في ClassroomSchedule.tsx)
const periodNumber = (period: string) => parseInt(period.replace(/\D/g, ''), 10) || 0

const rowKey = (row: { day: string; period: string }) => `${row.day}__${row.period}`
const weekRowKey = (row: { weekNumber: number; day: string; period: string }) => `${row.weekNumber}__${row.day}__${row.period}`

export default function TeacherPlan({ classroomId, classroomName, schemaName, teacherId }: Props) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [schedule, setSchedule] = useState<ScheduleRow[]>([])
  const [lessonCatalog, setLessonCatalog] = useState<LessonCatalogItem[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [weekLoading, setWeekLoading] = useState(false)
  const [rowDrafts, setRowDrafts] = useState<Record<string, RowDraft>>({})
  const [saving, setSaving] = useState(false)

  const [allWeekPlans, setAllWeekPlans] = useState<AllWeekEntry[]>([])
  const [allWeekPlansLoading, setAllWeekPlansLoading] = useState(true)
  const [homeworkDrafts, setHomeworkDrafts] = useState<Record<string, string>>({})
  const [savingHomeworkKey, setSavingHomeworkKey] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [subjectsRes, scheduleRes, catalogRes] = await Promise.all([
          api.get<Subject[]>(`/api/school/${schemaName}/classrooms/${classroomId}/subjects`),
          api.get<ScheduleRow[]>(`/api/school/${schemaName}/classrooms/${classroomId}/schedule`),
          api.get<LessonCatalogItem[]>('/api/platform/admin/study-plans/plans'),
        ])
        // تصفية المواد المسندة لهذا المعلم فقط
        setSubjects(subjectsRes.data.filter(s => s.teacherId === teacherId))
        setSchedule(scheduleRes.data)
        setLessonCatalog(catalogRes.data)
      } catch {
        toast.error('تعذر تحميل بيانات الخطة')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [schemaName, classroomId, teacherId])

  const fetchAllWeekPlans = async () => {
    setAllWeekPlansLoading(true)
    try {
      const res = await api.get<AllWeekEntry[]>(`/api/school/${schemaName}/classrooms/${classroomId}/week-plans`)
      setAllWeekPlans(res.data)
    } catch {
      toast.error('تعذر تحميل سجل الواجبات')
    } finally {
      setAllWeekPlansLoading(false)
    }
  }

  useEffect(() => {
    fetchAllWeekPlans()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaName, classroomId])

  const mySubjectNames = new Set(subjects.map(s => s.name))

  const myScheduleRows = schedule
    .filter(row => row.subject_name && mySubjectNames.has(row.subject_name))
    .sort((a, b) => {
      const dayDiff = dayIndex(a.day) - dayIndex(b.day)
      if (dayDiff !== 0) return dayDiff
      return periodNumber(a.period) - periodNumber(b.period)
    })

  const myAllWeekPlans = allWeekPlans
    .filter(entry => mySubjectNames.has(entry.subjectName))
    .sort((a, b) => {
      if (a.weekNumber !== b.weekNumber) return a.weekNumber - b.weekNumber
      const dayDiff = dayIndex(a.day) - dayIndex(b.day)
      if (dayDiff !== 0) return dayDiff
      return periodNumber(a.period) - periodNumber(b.period)
    })

  const handleSaveHomework = async (entry: AllWeekEntry) => {
    const key = weekRowKey(entry)
    setSavingHomeworkKey(key)
    try {
      const homework = homeworkDrafts[key] ?? entry.homework ?? ''
      await api.post(`/api/school/${schemaName}/classrooms/${classroomId}/week-plans/${entry.weekNumber}`, [{
        day: entry.day,
        period: entry.period,
        subjectName: entry.subjectName,
        lessonTopic: entry.lessonTopic,
        homework,
      }])
      setAllWeekPlans(current =>
        current.map(item => (weekRowKey(item) === key ? { ...item, homework } : item))
      )
      toast.success('تم حفظ الواجب')
    } catch {
      toast.error('تعذر حفظ الواجب')
    } finally {
      setSavingHomeworkKey(null)
    }
  }

  const openWeek = async (week: number) => {
    setSelectedWeek(week)
    setWeekLoading(true)
    try {
      const res = await api.get<WeekEntry[]>(`/api/school/${schemaName}/classrooms/${classroomId}/week-plans/${week}`)
      const drafts: Record<string, RowDraft> = {}
      res.data.forEach(entry => {
        drafts[rowKey(entry)] = {
          lessonTopic: entry.lessonTopic ?? '',
          homework: entry.homework ?? '',
        }
      })
      setRowDrafts(drafts)
    } catch {
      toast.error('تعذر تحميل خطة الأسبوع')
      setRowDrafts({})
    } finally {
      setWeekLoading(false)
    }
  }

  const closeWeek = () => {
    setSelectedWeek(null)
    setRowDrafts({})
  }

  const updateDraft = (row: ScheduleRow, field: keyof RowDraft, value: string) => {
    const key = rowKey(row)
    setRowDrafts(current => ({
      ...current,
      [key]: { ...(current[key] ?? { lessonTopic: '', homework: '' }), [field]: value },
    }))
  }

  const handleSaveWeek = async () => {
    if (!selectedWeek) return
    setSaving(true)
    try {
      const entries = myScheduleRows.map(row => {
        const draft = rowDrafts[rowKey(row)] ?? { lessonTopic: '', homework: '' }
        return {
          day: row.day,
          period: row.period,
          subjectName: row.subject_name,
          lessonTopic: draft.lessonTopic,
          homework: draft.homework,
        }
      })
      await api.post(`/api/school/${schemaName}/classrooms/${classroomId}/week-plans/${selectedWeek}`, entries)
      toast.success('تم حفظ التعديلات')
      closeWeek()
      fetchAllWeekPlans()
    } catch {
      toast.error('تعذر حفظ التعديلات')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E5E7EB' }}>
      <div style={{ background: '#9EC5C7', color: '#fff', padding: '12px', borderRadius: '10px', textAlign: 'center', fontWeight: 600, fontSize: '15px', marginBottom: '20px' }}>
        خطة الدروس — {classroomName}
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#9CA3AF' }}>جارٍ التحميل...</p>
      ) : myScheduleRows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
          لا توجد حصص مسندة إليك في جدول هذا الفصل بعد.
        </div>
      ) : (
        <>
          <h3 style={{ margin: '0 0 12px', color: '#374151', fontSize: '15px', fontWeight: 700 }}>
            الأسابيع
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
            {WEEKS.map(week => (
              <button
                key={week}
                onClick={() => openWeek(week)}
                style={{ padding: '12px 8px', border: '1px solid #E5E7EB', borderRadius: '10px', background: '#F9FAFB', color: '#374151', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
              >
                الأسبوع {week}
              </button>
            ))}
          </div>
        </>
      )}

      {/* الواجبات */}
      <div style={{ marginTop: '32px' }}>
        <h3 style={{ margin: '0 0 12px', color: '#374151', fontSize: '15px', fontWeight: 700 }}>
          الواجبات
        </h3>

        {allWeekPlansLoading ? (
          <p style={{ textAlign: 'center', color: '#9CA3AF' }}>جارٍ التحميل...</p>
        ) : myAllWeekPlans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF', background: '#F9FAFB', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
            لا توجد دروس مسجّلة بعد. أضف خطة أسبوع أولاً من الأعلى.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB' }}>
                  <th style={thStyle}>الأسبوع</th>
                  <th style={thStyle}>اليوم</th>
                  <th style={thStyle}>الحصة</th>
                  <th style={thStyle}>المادة</th>
                  <th style={thStyle}>الدرس المقرر</th>
                  <th style={thStyle}>الواجب</th>
                  <th style={thStyle}>حفظ</th>
                </tr>
              </thead>
              <tbody>
                {myAllWeekPlans.map(entry => {
                  const key = weekRowKey(entry)
                  const draft = homeworkDrafts[key] ?? entry.homework ?? ''

                  return (
                    <tr key={key}>
                      <td style={tdStyle}>الأسبوع {entry.weekNumber}</td>
                      <td style={tdStyle}>{entry.day}</td>
                      <td style={tdStyle}>{entry.period}</td>
                      <td style={tdStyle}>{entry.subjectName}</td>
                      <td style={tdStyle}>{entry.lessonTopic || '—'}</td>
                      <td style={tdStyle}>
                        <input
                          value={draft}
                          onChange={e => setHomeworkDrafts(current => ({ ...current, [key]: e.target.value }))}
                          placeholder="الواجب المطلوب"
                          style={inputStyle}
                        />
                      </td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => handleSaveHomework(entry)}
                          disabled={savingHomeworkKey === key}
                          style={{ border: 'none', background: '#2D7D82', color: '#fff', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', margin: '0 auto' }}
                        >
                          <Save size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal خطة الأسبوع */}
      {selectedWeek && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(3px)',
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', padding: '32px',
            width: '95%', maxWidth: '1100px', direction: 'rtl',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#374151', fontSize: '18px', fontWeight: 700 }}>
                خطة الأسبوع {selectedWeek} — {classroomName}
              </h2>
              <button onClick={closeWeek} style={{ border: 'none', background: '#F3F4F6', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} color="#6B7280" />
              </button>
            </div>

            {weekLoading ? (
              <p style={{ textAlign: 'center', color: '#9CA3AF' }}>جارٍ التحميل...</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F9FAFB' }}>
                      <th style={thStyle}>اليوم</th>
                      <th style={thStyle}>الحصة</th>
                      <th style={thStyle}>المادة</th>
                      <th style={thStyle}>الدرس المقرر</th>
                      <th style={thStyle}>الواجب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myScheduleRows.map(row => {
                      const key = rowKey(row)
                      const draft = rowDrafts[key] ?? { lessonTopic: '', homework: '' }
                      const datalistId = `lesson-topics-${key}`

                      return (
                        <tr key={key}>
                          <td style={tdStyle}>{row.day}</td>
                          <td style={tdStyle}>{row.period}</td>
                          <td style={{ ...tdStyle, fontWeight: 700 }}>{row.subject_name}</td>
                          <td style={tdStyle}>
                            <input
                              list={datalistId}
                              value={draft.lessonTopic}
                              onChange={e => updateDraft(row, 'lessonTopic', e.target.value)}
                              placeholder="موضوع الدرس"
                              style={inputStyle}
                            />
                            <datalist id={datalistId}>
                              {lessonCatalog
                                .filter(l => l.subject_name === row.subject_name)
                                .map(l => <option key={l.id} value={l.lesson_topic} />)}
                            </datalist>
                          </td>
                          <td style={tdStyle}>
                            <input
                              value={draft.homework}
                              onChange={e => updateDraft(row, 'homework', e.target.value)}
                              placeholder="الواجب المطلوب"
                              style={inputStyle}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '30px', justifyContent: 'flex-end' }}>
              <button onClick={handleSaveWeek} disabled={saving || weekLoading} style={{ padding: '10px 24px', backgroundColor: '#9EC5C7', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Save size={18} />
                {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
              </button>
              <button onClick={closeWeek} style={{ padding: '10px 24px', backgroundColor: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB', padding: '12px 8px',
  textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '13px',
}

const tdStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB', padding: '8px',
  textAlign: 'center',
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #E5E7EB',
  borderRadius: '6px', padding: '8px',
  fontSize: '13px', outline: 'none',
  textAlign: 'right', boxSizing: 'border-box'
}
