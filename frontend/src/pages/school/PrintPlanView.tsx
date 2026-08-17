import { Fragment, useEffect, useMemo, useState } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import logo from '../../assets/logo.png'

type ArchivedPlan = {
  id: number
  type: 'lesson' | 'leave'
  planId?: number
  lessonTopic?: string
  weekNumber: number
  startDate: string
  endDate: string
}

type LessonPlan = {
  id: number
  subject_name: string
  lesson_topic: string
  homework?: string
  notes?: string
}

type ScheduleRow = {
  period: string
  day: string
  subject_name: string
}

const DAYS = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
]

const PERIODS = [1, 2, 3, 4, 5, 6, 7]

const WEEK_ORDINALS = [
  '',
  'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس',
  'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
  'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر',
  'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون',
]

const COLUMN_LABELS: Record<ColumnKey, string> = {
  period: 'الحصة',
  subject: 'المادة',
  lesson: 'الدرس المقرر',
  homework: 'الواجب',
  notes: 'الملاحظات',
}

type ColumnKey = 'period' | 'subject' | 'lesson' | 'homework' | 'notes'

/* =========================================================
   التاريخ الهجري (رقمي)
   ========================================================= */

function hijriNumeric(dateString: string) {
  if (!dateString) return ''

  try {
    const date = new Date(`${dateString}T00:00:00`)

    const parts = new Intl.DateTimeFormat(
      'en-u-ca-islamic-nu-latn',
      {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
      }
    ).formatToParts(date)

    const day = parts.find(p => p.type === 'day')?.value
    const month = parts.find(p => p.type === 'month')?.value
    const year = parts.find(p => p.type === 'year')?.value

    return `${day}-${month}-${year}`
  } catch {
    return ''
  }
}

/* =========================================================
   COMPONENT
   ========================================================= */

export default function PrintPlanView({
  schemaName,
  classroomId,
  classroomName,
  onBack,
}: {
  schemaName: string
  classroomId: number
  classroomName: string
  onBack: () => void
}) {
  const [schoolNameAr, setSchoolNameAr] =
    useState('')

  const [archivedPlans, setArchivedPlans] =
    useState<ArchivedPlan[]>([])

  const [lessonPlans, setLessonPlans] =
    useState<LessonPlan[]>([])

  const [schedule, setSchedule] =
    useState<ScheduleRow[]>([])

  const [loading, setLoading] =
    useState(true)

  const [selectedWeekKey, setSelectedWeekKey] =
    useState('')

  const [visibleColumns, setVisibleColumns] =
    useState<Record<ColumnKey, boolean>>({
      period: true,
      subject: true,
      lesson: true,
      homework: true,
      notes: true,
    })

  const [visibleDays, setVisibleDays] =
    useState<Record<string, boolean>>(
      Object.fromEntries(
        DAYS.map(day => [day, true])
      )
    )

  /* =======================================================
     تحميل البيانات
     ======================================================= */

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)

      try {
        const [
          settingsResponse,
          archivedResponse,
          lessonPlansResponse,
          scheduleResponse,
        ] = await Promise.all([
          api
            .get(
              `/api/school/${schemaName}/settings`
            )
            .catch(() => null),

          api.get(
            `/api/school/${schemaName}/classrooms/${classroomId}/archived-plans`
          ),

          api.get<LessonPlan[]>(
            '/api/platform/admin/study-plans/plans'
          ),

          api.get<ScheduleRow[]>(
            `/api/school/${schemaName}/classrooms/${classroomId}/schedule`
          ),
        ])

        if (cancelled) return

        setSchoolNameAr(
          settingsResponse?.data
            ?.school_name_ar || ''
        )

        setArchivedPlans(
          Array.isArray(
            archivedResponse.data
          )
            ? archivedResponse.data
            : []
        )

        setLessonPlans(
          lessonPlansResponse.data || []
        )

        setSchedule(
          scheduleResponse.data || []
        )
      } catch {
        toast.error(
          'تعذر تحميل بيانات الخطة'
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [
    schemaName,
    classroomId,
  ])

  /* =======================================================
     تجميع الأسابيع المؤرشفة
     ======================================================= */

  const weeks = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string
        weekNumber: number
        startDate: string
        endDate: string
        lessonsBySubject: Map<
          string,
          LessonPlan
        >
        leaves: string[]
      }
    >()

    archivedPlans.forEach(plan => {
      const key = `${plan.weekNumber}__${plan.startDate}__${plan.endDate}`

      if (!map.has(key)) {
        map.set(key, {
          key,
          weekNumber: plan.weekNumber,
          startDate: plan.startDate,
          endDate: plan.endDate,
          lessonsBySubject: new Map(),
          leaves: [],
        })
      }

      const entry = map.get(key)!

      if (plan.type === 'lesson') {
        const lesson =
          lessonPlans.find(
            item =>
              item.id === plan.planId
          )

        if (lesson) {
          entry.lessonsBySubject.set(
            lesson.subject_name,
            lesson
          )
        }
      } else if (
        plan.lessonTopic
      ) {
        entry.leaves.push(
          plan.lessonTopic
        )
      }
    })

    return Array.from(
      map.values()
    ).sort((a, b) =>
      a.startDate.localeCompare(
        b.startDate
      )
    )
  }, [
    archivedPlans,
    lessonPlans,
  ])

  useEffect(() => {
    if (selectedWeekKey || !weeks.length) {
      return
    }

    const today =
      new Date()
        .toISOString()
        .slice(0, 10)

    const current =
      weeks.find(
        week =>
          week.startDate <= today &&
          today <= week.endDate
      ) || weeks[weeks.length - 1]

    setSelectedWeekKey(current.key)
  }, [
    weeks,
    selectedWeekKey,
  ])

  const selectedWeek =
    weeks.find(
      week =>
        week.key === selectedWeekKey
    )

  /* =======================================================
     مادة الحصة حسب الجدول
     ======================================================= */

  const subjectOf = (
    day: string,
    period: number
  ) => {
    const row =
      schedule.find(
        item =>
          item.day === day &&
          item.period ===
            `الحصة ${period}`
      )

    return row?.subject_name || ''
  }

  /* =======================================================
     تبديل عمود / يوم
     ======================================================= */

  const toggleColumn = (
    key: ColumnKey
  ) => {
    setVisibleColumns(
      current => ({
        ...current,
        [key]: !current[key],
      })
    )
  }

  const toggleDay = (
    day: string
  ) => {
    setVisibleDays(
      current => ({
        ...current,
        [day]: !current[day],
      })
    )
  }

  const activeDays =
    DAYS.filter(
      day => visibleDays[day]
    )

  const activeColumns =
    (Object.keys(
      COLUMN_LABELS
    ) as ColumnKey[]).filter(
      key => visibleColumns[key]
    )

  /* =======================================================
     Render
     ======================================================= */

  return (
    <div
      style={{
        direction: 'rtl',
        padding: 24,
        background: '#fff',
      }}
    >
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #mueen-print-area,
            #mueen-print-area * {
              visibility: visible;
            }
            #mueen-print-area {
              position: absolute;
              inset: 0;
              width: 100%;
              padding: 12px;
            }
            .mueen-no-print {
              display: none !important;
            }
          }
        `}
      </style>

      {loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: 60,
            color: '#6B7280',
          }}
        >
          جارٍ تحميل البيانات...
        </div>
      ) : (
        <>
          {/* ===============================================
              إظهار/إخفاء الأعمدة
             =============================================== */}

          <div
            className="mueen-no-print"
            style={togglePanel}
          >
            <div style={togglePanelHeader}>
              إظهار/إخفاء الأعمدة
            </div>

            <div style={togglePanelBody}>
              {(Object.keys(
                COLUMN_LABELS
              ) as ColumnKey[]).map(
                key => (
                  <label
                    key={key}
                    style={toggleLabel}
                  >
                    <input
                      type="checkbox"
                      checked={
                        visibleColumns[key]
                      }
                      onChange={() =>
                        toggleColumn(key)
                      }
                    />
                    {COLUMN_LABELS[key]}
                  </label>
                )
              )}
            </div>
          </div>

          {/* ===============================================
              إظهار/إخفاء الأيام
             =============================================== */}

          <div
            className="mueen-no-print"
            style={togglePanel}
          >
            <div style={togglePanelHeader}>
              إظهار/إخفاء الأيام
            </div>

            <div style={togglePanelBody}>
              {DAYS.map(day => (
                <label
                  key={day}
                  style={toggleLabel}
                >
                  <input
                    type="checkbox"
                    checked={
                      visibleDays[day]
                    }
                    onChange={() =>
                      toggleDay(day)
                    }
                  />
                  {day}
                </label>
              ))}
            </div>
          </div>

          {/* ===============================================
              اختيار الأسبوع
             =============================================== */}

          {weeks.length > 0 && (
            <div
              className="mueen-no-print"
              style={{
                marginBottom: 16,
                textAlign: 'center',
              }}
            >
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#374151',
                  marginLeft: 8,
                }}
              >
                الأسبوع:
              </label>

              <select
                value={selectedWeekKey}
                onChange={event =>
                  setSelectedWeekKey(
                    event.target.value
                  )
                }
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #D1D5DB',
                  fontSize: 13,
                }}
              >
                {weeks.map(week => (
                  <option
                    key={week.key}
                    value={week.key}
                  >
                    الأسبوع{' '}
                    {
                      WEEK_ORDINALS[
                        week.weekNumber
                      ] || week.weekNumber
                    }{' '}
                    ({week.startDate} إلى{' '}
                    {week.endDate})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ===============================================
              أزرار
             =============================================== */}

          <div
            className="mueen-no-print"
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 10,
              marginBottom: 24,
            }}
          >
            <button
              onClick={() =>
                window.print()
              }
              disabled={!selectedWeek}
              style={{
                ...printButton,
                opacity: selectedWeek
                  ? 1
                  : 0.6,
              }}
            >
              طباعة
            </button>

            <button
              onClick={onBack}
              style={backBtn}
            >
              عودة
            </button>
          </div>

          {!weeks.length ? (
            <div
              style={{
                textAlign: 'center',
                padding: 60,
                color: '#9CA3AF',
              }}
            >
              لا توجد خطط مؤرشفة لهذا الفصل
              بعد.
            </div>
          ) : (
            selectedWeek && (
              <div id="mueen-print-area">

                {/* ===========================================
                    الترويسة
                   =========================================== */}

                <div style={letterhead}>
                  <div
                    style={{
                      textAlign: 'right',
                      flex: 1,
                    }}
                  >
                    <div
                      style={letterheadBold}
                    >
                      المملكة العربية السعودية
                    </div>
                    <div>وزارة التعليم</div>
                    <div>
                      الإدارة العامة للتعليم
                      بالمنطقة الشرقية
                    </div>
                    <div>
                      إدارة التعليم بمحافظة
                      حفر الباطن
                    </div>
                    <div
                      style={letterheadBold}
                    >
                      {schoolNameAr ||
                        classroomName}
                    </div>
                  </div>

                  <div
                    style={{
                      flex: '0 0 auto',
                      textAlign: 'center',
                      padding: '0 16px',
                    }}
                  >
                    <img
                      src={logo}
                      alt="شعار"
                      style={{
                        width: 60,
                        height: 60,
                        objectFit: 'contain',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      textAlign: 'left',
                      flex: 1,
                    }}
                  >
                    <div>
                      من:{' '}
                      {hijriNumeric(
                        selectedWeek.startDate
                      )}{' '}
                      إلى{' '}
                      {hijriNumeric(
                        selectedWeek.endDate
                      )}
                    </div>
                    <div>
                      الأسبوع (
                      {WEEK_ORDINALS[
                        selectedWeek
                          .weekNumber
                      ] ||
                        selectedWeek.weekNumber}
                      )
                    </div>
                    <div>
                      الصف: {classroomName}
                    </div>
                  </div>
                </div>

                {selectedWeek.leaves.length >
                  0 && (
                  <div
                    style={leaveNotice}
                  >
                    إجازة هذا الأسبوع:{' '}
                    {selectedWeek.leaves.join(
                      '، '
                    )}
                  </div>
                )}

                {/* ===========================================
                    الجدول
                   =========================================== */}

                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>
                        اليوم
                      </th>

                      {activeColumns.map(
                        key => (
                          <th
                            key={key}
                            style={th}
                          >
                            {
                              COLUMN_LABELS[
                                key
                              ]
                            }
                          </th>
                        )
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {activeDays.map(day => (
                      <Fragment key={day}>
                        {PERIODS.map(
                          (
                            period,
                            index
                          ) => {
                            const subjectName =
                              subjectOf(
                                day,
                                period
                              )

                            const lesson =
                              subjectName
                                ? selectedWeek.lessonsBySubject.get(
                                    subjectName
                                  )
                                : undefined

                            return (
                              <tr
                                key={`${day}-${period}`}
                              >
                                {index ===
                                  0 && (
                                  <td
                                    style={{
                                      ...td,
                                      fontWeight: 700,
                                      background:
                                        '#F9FAFB',
                                    }}
                                    rowSpan={
                                      PERIODS.length
                                    }
                                  >
                                    {day}
                                  </td>
                                )}

                                {visibleColumns.period && (
                                  <td
                                    style={td}
                                  >
                                    {period}
                                  </td>
                                )}

                                {visibleColumns.subject && (
                                  <td
                                    style={td}
                                  >
                                    {subjectName ||
                                      ''}
                                  </td>
                                )}

                                {visibleColumns.lesson && (
                                  <td
                                    style={td}
                                  >
                                    {lesson?.lesson_topic ||
                                      ''}
                                  </td>
                                )}

                                {visibleColumns.homework && (
                                  <td
                                    style={td}
                                  >
                                    {lesson?.homework ||
                                      ''}
                                  </td>
                                )}

                                {visibleColumns.notes && (
                                  <td
                                    style={td}
                                  >
                                    {lesson?.notes ||
                                      ''}
                                  </td>
                                )}
                              </tr>
                            )
                          }
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}

/* =========================================================
   STYLES
   ========================================================= */

const togglePanel: React.CSSProperties = {
  border: '1px solid #E5E7EB',
  borderRadius: 10,
  overflow: 'hidden',
  marginBottom: 16,
}

const togglePanelHeader: React.CSSProperties = {
  background: '#1F3A5F',
  color: '#fff',
  padding: '10px 16px',
  textAlign: 'center',
  fontWeight: 700,
  fontSize: 14,
}

const togglePanelBody: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: 20,
  padding: '12px 16px',
}

const toggleLabel: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 13,
  color: '#374151',
  cursor: 'pointer',
}

const printButton: React.CSSProperties = {
  padding: '10px 28px',
  background: '#2D7D82',
  color: '#fff',
  border: 'none',
  borderRadius: 9,
  cursor: 'pointer',
  fontWeight: 600,
}

const backBtn: React.CSSProperties = {
  padding: '10px 28px',
  background: '#F3F4F6',
  color: '#6B7280',
  border: 'none',
  borderRadius: 9,
  cursor: 'pointer',
  fontWeight: 600,
}

const letterhead: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  border: '1px solid #9CA3AF',
  borderRadius: 10,
  padding: 16,
  marginBottom: 16,
  fontSize: 12,
  color: '#1F2937',
  lineHeight: 1.9,
}

const letterheadBold: React.CSSProperties = {
  fontWeight: 700,
}

const leaveNotice: React.CSSProperties = {
  background: '#FEF3C7',
  color: '#92400E',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 12,
  marginBottom: 12,
  textAlign: 'center',
}

const table: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 12,
}

const th: React.CSSProperties = {
  border: '1px solid #9CA3AF',
  padding: 8,
  background: '#F3F4F6',
  color: '#1F2937',
  fontWeight: 700,
}

const td: React.CSSProperties = {
  border: '1px solid #9CA3AF',
  padding: 8,
  textAlign: 'center',
  color: '#374151',
}
