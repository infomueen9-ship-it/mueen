import { Fragment, useEffect, useState } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import moeLogo from '../../assets/moe-logo.png'

type WeekSetting = {
  weekNumber: number
  startDate: string
  endDate: string
}

type Leave = {
  id: number
  title: string
  startDate: string
  endDate: string
}

type WeekPlanEntry = {
  day: string
  period: string
  subjectName: string
  lessonTopic?: string
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

  const [generalDirectorate, setGeneralDirectorate] =
    useState('')

  const [weeks, setWeeks] =
    useState<WeekSetting[]>([])

  const [leaves, setLeaves] =
    useState<Leave[]>([])

  const [schedule, setSchedule] =
    useState<ScheduleRow[]>([])

  const [loading, setLoading] =
    useState(true)

  const [selectedWeekNumber, setSelectedWeekNumber] =
    useState<number | null>(null)

  const [weekPlan, setWeekPlan] =
    useState<WeekPlanEntry[]>([])

  const [weekPlanLoading, setWeekPlanLoading] =
    useState(false)

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
          weeksResponse,
          leavesResponse,
          scheduleResponse,
        ] = await Promise.all([
          api
            .get(
              `/api/school/${schemaName}/settings`
            )
            .catch(() => null),

          api.get<WeekSetting[]>(
            `/api/school/${schemaName}/week-settings`
          ),

          api.get<Leave[]>(
            `/api/school/${schemaName}/leaves`
          ),

          api.get<ScheduleRow[]>(
            `/api/school/${schemaName}/classrooms/${classroomId}/schedule`
          ),
        ])

        if (cancelled) return

        setSchoolNameAr(
          settingsResponse?.data
            ?.schoolNameAr || ''
        )

        setGeneralDirectorate(
          settingsResponse?.data
            ?.generalDirectorate || ''
        )

        const weeksData =
          weeksResponse.data || []

        setWeeks(weeksData)

        setLeaves(
          leavesResponse.data || []
        )

        setSchedule(
          scheduleResponse.data || []
        )

        if (weeksData.length) {
          const today =
            new Date()
              .toISOString()
              .slice(0, 10)

          const current =
            weeksData.find(
              week =>
                week.startDate <= today &&
                today <= week.endDate
            ) || weeksData[weeksData.length - 1]

          setSelectedWeekNumber(
            current.weekNumber
          )
        }
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
     تحميل خطة الأسبوع المختار
     ======================================================= */

  useEffect(() => {
    if (!selectedWeekNumber) {
      setWeekPlan([])
      return
    }

    let cancelled = false

    const loadWeekPlan = async () => {
      setWeekPlanLoading(true)

      try {
        const response = await api.get<WeekPlanEntry[]>(
          `/api/school/${schemaName}/classrooms/${classroomId}/week-plans/${selectedWeekNumber}`
        )

        if (!cancelled) {
          setWeekPlan(response.data || [])
        }
      } catch {
        if (!cancelled) {
          toast.error('تعذر تحميل خطة الأسبوع')
          setWeekPlan([])
        }
      } finally {
        if (!cancelled) {
          setWeekPlanLoading(false)
        }
      }
    }

    loadWeekPlan()

    return () => {
      cancelled = true
    }
  }, [
    schemaName,
    classroomId,
    selectedWeekNumber,
  ])


  const selectedWeek =
    weeks.find(
      week =>
        week.weekNumber === selectedWeekNumber
    )

  // الإجازات التي تتقاطع مع تاريخ الأسبوع المختار
  const weekLeaves =
    selectedWeek
      ? leaves.filter(
          leave =>
            leave.startDate <= selectedWeek.endDate &&
            leave.endDate >= selectedWeek.startDate
        )
      : []

  // تاريخ يوم معين ضمن الأسبوع المختار
  const dayDate = (
    day: string
  ): string | null => {
    if (!selectedWeek) return null
    const offset = DAYS.indexOf(day)
    if (offset < 0) return null
    const start = new Date(
      selectedWeek.startDate + 'T00:00:00'
    )
    start.setDate(start.getDate() + offset)
    return start
      .toISOString()
      .slice(0, 10)
  }

  // الإجازة التي تقع في يوم معين (إن وجدت)
  const leaveOnDay = (
    day: string
  ): Leave | undefined => {
    const date = dayDate(day)
    if (!date) return undefined
    return leaves.find(
      leave =>
        leave.startDate <= date &&
        leave.endDate >= date
    )
  }

  /* =======================================================
     مادة الحصة ومحتوى الخطة حسب الجدول
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

  const planOf = (
    day: string,
    period: number
  ) =>
    weekPlan.find(
      entry =>
        entry.day === day &&
        entry.period ===
          `الحصة ${period}`
    )

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
          @page {
            size: A4;
            margin: 6mm;
          }
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
              top: 0;
              left: 0;
              width: 198mm;
              height: 285mm;
            }
            .mueen-no-print {
              display: none !important;
            }
            .mueen-letterhead {
              padding: 14px !important;
              margin-bottom: 14px !important;
              font-size: 15px !important;
              line-height: 1.7 !important;
            }
            .mueen-letterhead img {
              width: 90px !important;
            }
            #mueen-print-area table {
              font-size: 14px !important;
            }
            #mueen-print-area th,
            #mueen-print-area td {
              padding: 6px 8px !important;
            }
            #mueen-print-area tr {
              page-break-inside: avoid;
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
                value={selectedWeekNumber ?? ''}
                onChange={event =>
                  setSelectedWeekNumber(
                    Number(event.target.value)
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
                    key={week.weekNumber}
                    value={week.weekNumber}
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
              style={printButton}
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

          {!weeks.length && (
            <div
              className="mueen-no-print"
              style={{
                textAlign: 'center',
                padding: '10px 16px',
                marginBottom: 16,
                color: '#92400E',
                background: '#FEF3C7',
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              لم يتم إعداد تقويم الأسابيع
              الدراسية بعد. أضِف الأسابيع من
              "إعدادات الخطة" — الفورم أدناه
              فارغ حتى ذلك الحين.
            </div>
          )}

          {weekPlanLoading ? (
            <div
              style={{
                textAlign: 'center',
                padding: 60,
                color: '#6B7280',
              }}
            >
              جارٍ تحميل خطة الأسبوع...
            </div>
          ) : (
              <div id="mueen-print-area">
              <div id="mueen-print-content">

                {/* ===========================================
                    الترويسة
                   =========================================== */}

                <div
                  className="mueen-letterhead"
                  style={letterhead}
                >
                  <div
                    style={{
                      textAlign: 'center',
                    }}
                  >
                    <div>وزارة التعليم</div>
                    <div>
                      {generalDirectorate ||
                        'الإدارة العامة للتعليم بالمنطقة الشرقية'}
                    </div>
                    <div
                      style={letterheadBold}
                    >
                      {schoolNameAr ||
                        `مدرسة ${schemaName.replace(
                          /^school_/,
                          ''
                        )}`}
                    </div>
                  </div>

                  <div
                    style={{
                      flex: '0 0 auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 20px',
                    }}
                  >
                    <img
                      src={moeLogo}
                      alt="وزارة التعليم"
                      style={{
                        width: 110,
                        height: 'auto',
                        objectFit: 'contain',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      textAlign: 'center',
                    }}
                  >
                    <div>
                      من:{' '}
                      {selectedWeek
                        ? hijriNumeric(
                            selectedWeek.startDate
                          )
                        : '—'}{' '}
                      إلى{' '}
                      {selectedWeek
                        ? hijriNumeric(
                            selectedWeek.endDate
                          )
                        : '—'}
                    </div>
                    <div>
                      الأسبوع (
                      {selectedWeek
                        ? WEEK_ORDINALS[
                            selectedWeek
                              .weekNumber
                          ] ||
                          selectedWeek.weekNumber
                        : '—'}
                      )
                    </div>
                    <div>
                      الصف: {classroomName}
                    </div>
                  </div>
                </div>

                {weekLeaves.length > 0 && (
                  <div
                    style={leaveNotice}
                  >
                    إجازة هذا الأسبوع:{' '}
                    {weekLeaves
                      .map(leave => leave.title)
                      .join('، ')}
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
                    {activeDays.map(day => {
                      const dayLeave =
                        leaveOnDay(day)

                      return (
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

                            const plan =
                              subjectName
                                ? planOf(
                                    day,
                                    period
                                  )
                                : undefined

                            return (
                              <tr
                                key={`${day}-${period}`}
                                style={
                                  dayLeave
                                    ? {
                                        background:
                                          '#FEE2E2',
                                      }
                                    : undefined
                                }
                              >
                                {index ===
                                  0 && (
                                  <td
                                    style={{
                                      ...td,
                                      fontWeight: 700,
                                      background: dayLeave
                                        ? '#FCA5A5'
                                        : '#F9FAFB',
                                    }}
                                    rowSpan={
                                      PERIODS.length
                                    }
                                    title={
                                      dayLeave?.title
                                    }
                                  >
                                    {day}
                                    {dayLeave && (
                                      <div
                                        style={{
                                          fontSize: 10,
                                          fontWeight: 400,
                                          marginTop: 2,
                                        }}
                                      >
                                        {dayLeave.title}
                                      </div>
                                    )}
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
                                    {plan?.lessonTopic ||
                                      ''}
                                  </td>
                                )}

                                {visibleColumns.homework && (
                                  <td
                                    style={td}
                                  >
                                    {plan?.homework ||
                                      ''}
                                  </td>
                                )}

                                {visibleColumns.notes && (
                                  <td
                                    style={td}
                                  >
                                    {plan?.notes ||
                                      ''}
                                  </td>
                                )}
                              </tr>
                            )
                          }
                        )}
                      </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              </div>
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
  gap: 24,
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
  fontSize: 11,
}

const th: React.CSSProperties = {
  border: '1px solid #9CA3AF',
  padding: '8px 6px',
  background: '#F3F4F6',
  color: '#1F2937',
  fontWeight: 700,
  fontSize: 11,
  textAlign: 'center',
}

const td: React.CSSProperties = {
  border: '1px solid #9CA3AF',
  padding: '6px 8px',
  textAlign: 'center',
  color: '#374151',
  fontSize: 11,
  wordBreak: 'break-word',
  verticalAlign: 'middle',
  lineHeight: 1.4,
}
