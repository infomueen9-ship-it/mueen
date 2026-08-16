import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Plus, Save, Trash2 } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'

type Level = {
  id: number
  name: string
}

type Grade = {
  id: number
  name: string
  level_id: number
  level_name: string
}

type Subject = {
  id: number
  name: string
  level_id: number
  level_name: string
  grade_id: number
  grade_name: string
}

type LessonPlan = {
  id: number
  term_id?: number
  term_name?: string
  subject_id: number
  subject_name: string
  level_id: number
  level_name: string
  grade_id: number
  grade_name: string
  lesson_topic: string
  homework?: string
  notes?: string
}

type ArchivedPlan = {
  id?: number
  levelId: string
  gradeId: string
  subjectId: string
  planId: string
  week: string
  startDate: string
  endDate: string
}

const weeks = Array.from({ length: 20 }, (_, index) => index + 1)

/* =========================================================
   التاريخ الهجري
   ========================================================= */

function getHijriDate(dateString: string) {
  if (!dateString) return ''

  try {
    const date = new Date(`${dateString}T00:00:00`)

    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date)
  } catch {
    return ''
  }
}

/* =========================================================
   التواريخ الافتراضية
   ========================================================= */

function weekDates(week: number) {
  const start = new Date(new Date().getFullYear(), 0, 1)

  start.setDate(start.getDate() + (week - 1) * 7)

  const end = new Date(start)
  end.setDate(end.getDate() + 6)

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

/* =========================================================
   COMPONENT
   ========================================================= */

export default function ArchivedPlansView({
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
  const [levels, setLevels] = useState<Level[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([])

  const [plans, setPlans] = useState<ArchivedPlan[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  /* =======================================================
     تحميل البيانات الأساسية
     ======================================================= */

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      setLoading(true)

      try {
        const [
          levelsResponse,
          gradesResponse,
          subjectsResponse,
          plansResponse,
        ] = await Promise.all([
          api.get<Level[]>(
            '/api/platform/admin/study-plans/levels'
          ),

          api.get<Grade[]>(
            '/api/platform/admin/study-plans/grades'
          ),

          api.get<Subject[]>(
            '/api/platform/admin/study-plans/subjects'
          ),

          api.get<LessonPlan[]>(
            '/api/platform/admin/study-plans/plans'
          ),
        ])

        if (cancelled) return

        setLevels(levelsResponse.data || [])
        setGrades(gradesResponse.data || [])
        setSubjects(subjectsResponse.data || [])
        setLessonPlans(plansResponse.data || [])

        /*
         * نحاول تحميل الأرشيف الحالي إذا كان API موجودًا.
         *
         * إذا كان غير موجود حاليًا في الـ Backend،
         * سيبدأ الجدول فارغًا ويمكن إضافة صفوف جديدة.
         */
        try {
          const archivedResponse = await api.get(
            `/api/school/${schemaName}/classrooms/${classroomId}/archived-plans`
          )

          if (cancelled) return

          const data = archivedResponse.data

          if (Array.isArray(data)) {
            setPlans(
              data.map((plan: any) => ({
                id: plan.id,
                levelId: String(
                  plan.levelId ??
                  plan.level_id ??
                  ''
                ),
                gradeId: String(
                  plan.gradeId ??
                  plan.grade_id ??
                  ''
                ),
                subjectId: String(
                  plan.subjectId ??
                  plan.subject_id ??
                  ''
                ),
                planId: String(
                  plan.planId ??
                  plan.plan_id ??
                  ''
                ),
                week: String(
                  plan.week ??
                  plan.weekNumber ??
                  plan.week_number ??
                  1
                ),
                startDate:
                  plan.startDate ??
                  plan.start_date ??
                  weekDates(
                    Number(
                      plan.week ??
                      plan.weekNumber ??
                      1
                    )
                  ).startDate,
                endDate:
                  plan.endDate ??
                  plan.end_date ??
                  weekDates(
                    Number(
                      plan.week ??
                      plan.weekNumber ??
                      1
                    )
                  ).endDate,
              }))
            )
          }
        } catch {
          /*
           * الـ API الخاص بالأرشيف قد لا يكون موجودًا
           * حتى الآن، لذلك لا نوقف الصفحة.
           */
          setPlans([])
        }
      } catch (error) {
        console.error(error)
        toast.error('تعذر تحميل بيانات الخطط')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [schemaName, classroomId])

  /* =======================================================
     إضافة صف جديد
     ======================================================= */

  const addPlan = () => {
    const firstLevel = levels[0]

    const firstGrade = firstLevel
      ? grades.find(
          grade => grade.level_id === firstLevel.id
        )
      : undefined

    const firstSubject = firstGrade
      ? subjects.find(
          subject =>
            subject.grade_id === firstGrade.id &&
            subject.level_id === firstLevel?.id
        )
      : undefined

    const firstLesson = firstSubject
      ? lessonPlans.find(
          plan =>
            plan.subject_id === firstSubject.id &&
            plan.level_id === firstLevel?.id &&
            plan.grade_id === firstGrade?.id
        )
      : undefined

    const dates = weekDates(1)

    setPlans(current => [
      ...current,
      {
        levelId: firstLevel
          ? String(firstLevel.id)
          : '',

        gradeId: firstGrade
          ? String(firstGrade.id)
          : '',

        subjectId: firstSubject
          ? String(firstSubject.id)
          : '',

        planId: firstLesson
          ? String(firstLesson.id)
          : '',

        week: '1',

        startDate: dates.startDate,

        endDate: dates.endDate,
      },
    ])
  }

  /* =======================================================
     تعديل الصف
     ======================================================= */

  const updatePlan = (
    index: number,
    field: keyof ArchivedPlan,
    value: string
  ) => {
    setPlans(current =>
      current.map((plan, currentIndex) =>
        currentIndex === index
          ? {
              ...plan,
              [field]: value,
            }
          : plan
      )
    )
  }

  /* =======================================================
     تغيير الفصل الدراسي
     ======================================================= */

  const changeLevel = (
    index: number,
    levelId: string
  ) => {
    const firstGrade = grades.find(
      grade =>
        String(grade.level_id) === levelId
    )

    const gradeId = firstGrade
      ? String(firstGrade.id)
      : ''

    const firstSubject = firstGrade
      ? subjects.find(
          subject =>
            subject.grade_id === firstGrade.id &&
            String(subject.level_id) === levelId
        )
      : undefined

    const subjectId = firstSubject
      ? String(firstSubject.id)
      : ''

    const firstLesson = firstSubject
      ? lessonPlans.find(
          plan =>
            plan.subject_id === firstSubject.id &&
            String(plan.level_id) === levelId &&
            plan.grade_id === firstGrade?.id
        )
      : undefined

    const planId = firstLesson
      ? String(firstLesson.id)
      : ''

    setPlans(current =>
      current.map((plan, currentIndex) =>
        currentIndex === index
          ? {
              ...plan,
              levelId,
              gradeId,
              subjectId,
              planId,
            }
          : plan
      )
    )
  }

  /* =======================================================
     تغيير الصف
     ======================================================= */

  const changeGrade = (
    index: number,
    gradeId: string
  ) => {
    const currentPlan = plans[index]

    const firstSubject = subjects.find(
      subject =>
        String(subject.grade_id) === gradeId &&
        String(subject.level_id) === currentPlan.levelId
    )

    const subjectId = firstSubject
      ? String(firstSubject.id)
      : ''

    const firstLesson = firstSubject
      ? lessonPlans.find(
          plan =>
            plan.subject_id === firstSubject.id &&
            plan.grade_id === Number(gradeId) &&
            plan.level_id === Number(currentPlan.levelId)
        )
      : undefined

    const planId = firstLesson
      ? String(firstLesson.id)
      : ''

    setPlans(current =>
      current.map((plan, currentIndex) =>
        currentIndex === index
          ? {
              ...plan,
              gradeId,
              subjectId,
              planId,
            }
          : plan
      )
    )
  }

  /* =======================================================
     تغيير المادة
     ======================================================= */

  const changeSubject = (
    index: number,
    subjectId: string
  ) => {
    const currentPlan = plans[index]

    const firstLesson = lessonPlans.find(
      plan =>
        plan.subject_id === Number(subjectId) &&
        plan.grade_id === Number(currentPlan.gradeId) &&
        plan.level_id === Number(currentPlan.levelId)
    )

    setPlans(current =>
      current.map((plan, currentIndex) =>
        currentIndex === index
          ? {
              ...plan,
              subjectId,
              planId: firstLesson
                ? String(firstLesson.id)
                : '',
            }
          : plan
      )
    )
  }

  /* =======================================================
     تغيير الأسبوع
     ======================================================= */

  const changeWeek = (
    index: number,
    value: string
  ) => {
    const dates = weekDates(Number(value))

    setPlans(current =>
      current.map((plan, currentIndex) =>
        currentIndex === index
          ? {
              ...plan,
              week: value,
              startDate: dates.startDate,
              endDate: dates.endDate,
            }
          : plan
      )
    )
  }

  /* =======================================================
     حذف صف
     ======================================================= */

  const deletePlan = async (
    index: number
  ) => {
    const plan = plans[index]

    if (!plan.id) {
      setPlans(current =>
        current.filter(
          (_, currentIndex) =>
            currentIndex !== index
        )
      )

      return
    }

    try {
      await api.delete(
        `/api/school/${schemaName}/classrooms/${classroomId}/archived-plans/${plan.id}`
      )

      setPlans(current =>
        current.filter(
          (_, currentIndex) =>
            currentIndex !== index
        )
      )

      toast.success('تم حذف الخطة')
    } catch (error) {
      console.error(error)
      toast.error('تعذر حذف الخطة')
    }
  }

  /* =======================================================
     حفظ الخطة
     ======================================================= */

  const save = async () => {
    if (!plans.length) {
      toast.error('أضف درسًا واحدًا على الأقل')
      return
    }

    const invalid = plans.some(
      plan =>
        !plan.levelId ||
        !plan.gradeId ||
        !plan.subjectId ||
        !plan.planId ||
        !plan.week ||
        !plan.startDate ||
        !plan.endDate
    )

    if (invalid) {
      toast.error(
        'يرجى استكمال جميع بيانات الخطة'
      )
      return
    }

    setSaving(true)

    try {
      await api.post(
        `/api/school/${schemaName}/classrooms/${classroomId}/archived-plans`,
        {
          plans: plans.map(plan => ({
            id: plan.id,
            levelId: Number(plan.levelId),
            gradeId: Number(plan.gradeId),
            subjectId: Number(plan.subjectId),
            planId: Number(plan.planId),
            weekNumber: Number(plan.week),
            startDate: plan.startDate,
            endDate: plan.endDate,
          })),
        }
      )

      toast.success(
        'تم حفظ الخطة المؤرشفة بنجاح'
      )
    } catch (error) {
      console.error(error)
      toast.error(
        'تعذر حفظ الخطة المؤرشفة'
      )
    } finally {
      setSaving(false)
    }
  }

  /* =======================================================
     القوائم التابعة
     ======================================================= */

  const getGrades = (
    levelId: string
  ) =>
    grades.filter(
      grade =>
        String(grade.level_id) === levelId
    )

  const getSubjects = (
    levelId: string,
    gradeId: string
  ) =>
    subjects.filter(
      subject =>
        String(subject.level_id) === levelId &&
        String(subject.grade_id) === gradeId
    )

  const getLessonPlans = (
    levelId: string,
    gradeId: string,
    subjectId: string
  ) =>
    lessonPlans.filter(
      plan =>
        String(plan.level_id) === levelId &&
        String(plan.grade_id) === gradeId &&
        String(plan.subject_id) === subjectId
    )

  /* =======================================================
     JSX
     ======================================================= */

  return (
    <div style={{ direction: 'rtl' }}>

      {/* العودة */}

      <button
        onClick={onBack}
        style={backButton}
      >
        <ArrowRight size={17} />
        العودة إلى إدارة الجداول
      </button>

      {/* العنوان */}

      <div style={header}>
        الخطط المؤرشفة — {classroomName}
      </div>

      {/* الجدول */}

      {loading ? (
        <p style={{ textAlign: 'center' }}>
          جارٍ تحميل البيانات...
        </p>
      ) : (
        <div
          style={{
            overflowX: 'auto',
          }}
        >
          <table style={table}>

            <thead>
              <tr>

                <th style={th}>
                  الفصل الدراسي
                </th>

                <th style={th}>
                  الصف
                </th>

                <th style={th}>
                  المادة
                </th>

                <th style={th}>
                  موضوع الدرس
                </th>

                <th style={th}>
                  الأسبوع
                </th>

                <th style={th}>
                  من
                </th>

                <th style={th}>
                  إلى
                </th>

                <th style={th}>
                  الإجراءات
                </th>

              </tr>
            </thead>

            <tbody>

              {plans.map(
                (plan, index) => {

                  const rowGrades =
                    getGrades(
                      plan.levelId
                    )

                  const rowSubjects =
                    getSubjects(
                      plan.levelId,
                      plan.gradeId
                    )

                  const rowLessonPlans =
                    getLessonPlans(
                      plan.levelId,
                      plan.gradeId,
                      plan.subjectId
                    )

                  return (
                    <tr key={plan.id ?? index}>

                      {/* الفصل */}

                      <td style={td}>

                        <select
                          value={plan.levelId}
                          onChange={event =>
                            changeLevel(
                              index,
                              event.target.value
                            )
                          }
                          style={input}
                        >

                          <option value="">
                            اختر الفصل الدراسي
                          </option>

                          {levels.map(
                            level => (
                              <option
                                key={level.id}
                                value={level.id}
                              >
                                {level.name}
                              </option>
                            )
                          )}

                        </select>

                      </td>

                      {/* الصف */}

                      <td style={td}>

                        <select
                          value={plan.gradeId}
                          onChange={event =>
                            changeGrade(
                              index,
                              event.target.value
                            )
                          }
                          disabled={!plan.levelId}
                          style={input}
                        >

                          <option value="">
                            اختر الصف
                          </option>

                          {rowGrades.map(
                            grade => (
                              <option
                                key={grade.id}
                                value={grade.id}
                              >
                                {grade.name}
                              </option>
                            )
                          )}

                        </select>

                      </td>

                      {/* المادة */}

                      <td style={td}>

                        <select
                          value={plan.subjectId}
                          onChange={event =>
                            changeSubject(
                              index,
                              event.target.value
                            )
                          }
                          disabled={
                            !plan.gradeId
                          }
                          style={input}
                        >

                          <option value="">
                            اختر المادة
                          </option>

                          {rowSubjects.map(
                            subject => (
                              <option
                                key={subject.id}
                                value={subject.id}
                              >
                                {subject.name}
                              </option>
                            )
                          )}

                        </select>

                      </td>

                      {/* موضوع الدرس */}

                      <td style={td}>

                        <select
                          value={plan.planId}
                          onChange={event =>
                            updatePlan(
                              index,
                              'planId',
                              event.target.value
                            )
                          }
                          disabled={
                            !plan.subjectId
                          }
                          style={{
                            ...input,
                            minWidth: 220,
                          }}
                        >

                          <option value="">
                            اختر موضوع الدرس
                          </option>

                          {rowLessonPlans.map(
                            lesson => (
                              <option
                                key={lesson.id}
                                value={lesson.id}
                              >
                                {
                                  lesson.lesson_topic
                                }
                              </option>
                            )
                          )}

                        </select>

                      </td>

                      {/* الأسبوع */}

                      <td style={td}>

                        <select
                          value={plan.week}
                          onChange={event =>
                            changeWeek(
                              index,
                              event.target.value
                            )
                          }
                          style={input}
                        >

                          {weeks.map(
                            week => (
                              <option
                                key={week}
                                value={week}
                              >
                                الأسبوع {week}
                              </option>
                            )
                          )}

                        </select>

                      </td>

                      {/* من */}

                      <td style={td}>

                        <input
                          type="date"
                          value={
                            plan.startDate
                          }
                          onChange={event =>
                            updatePlan(
                              index,
                              'startDate',
                              event.target.value
                            )
                          }
                          style={input}
                        />

                        {plan.startDate && (
                          <div
                            style={
                              hijriDate
                            }
                          >
                            {
                              getHijriDate(
                                plan.startDate
                              )
                            }
                          </div>
                        )}

                      </td>

                      {/* إلى */}

                      <td style={td}>

                        <input
                          type="date"
                          value={
                            plan.endDate
                          }
                          onChange={event =>
                            updatePlan(
                              index,
                              'endDate',
                              event.target.value
                            )
                          }
                          style={input}
                        />

                        {plan.endDate && (
                          <div
                            style={
                              hijriDate
                            }
                          >
                            {
                              getHijriDate(
                                plan.endDate
                              )
                            }
                          </div>
                        )}

                      </td>

                      {/* حذف */}

                      <td style={td}>

                        <button
                          onClick={() =>
                            deletePlan(index)
                          }
                          style={
                            iconButton
                          }
                          title="حذف"
                        >
                          <Trash2
                            size={18}
                          />
                        </button>

                      </td>

                    </tr>
                  )
                }
              )}

              {!plans.length && (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      ...td,
                      color: '#9CA3AF',
                      padding: 30,
                    }}
                  >
                    لا توجد خطة مؤرشفة.
                    اضغط على "إضافة درس"
                    لبدء الخطة.
                  </td>
                </tr>
              )}

            </tbody>

          </table>
        </div>
      )}

      {/* الأزرار */}

      <div
        style={{
          display: 'flex',
          gap: 10,
          marginTop: 18,
        }}
      >

        <button
          onClick={addPlan}
          style={secondaryButton}
        >
          <Plus size={16} />
          إضافة درس
        </button>

        <button
          onClick={save}
          disabled={saving}
          style={{
            ...saveButton,
            opacity: saving ? 0.7 : 1,
          }}
        >
          <Save size={16} />

          {saving
            ? 'جارٍ الحفظ...'
            : 'حفظ الخطة'}
        </button>

      </div>

    </div>
  )
}

/* =========================================================
   STYLES
   ========================================================= */

const header: React.CSSProperties = {
  background: '#9EC5C7',
  color: '#fff',
  padding: 16,
  borderRadius: 12,
  textAlign: 'center',
  fontWeight: 700,
  marginBottom: 18,
}

const input: React.CSSProperties = {
  display: 'block',
  marginTop: 6,
  minWidth: 150,
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #E5E7EB',
  borderRadius: 7,
  boxSizing: 'border-box',
  background: '#fff',
}

const table: React.CSSProperties = {
  width: '100%',
  minWidth: 1200,
  borderCollapse: 'collapse',
}

const th: React.CSSProperties = {
  border: '1px solid #E5E7EB',
  padding: 10,
  background: '#F9FAFB',
  color: '#4B5563',
  whiteSpace: 'nowrap',
}

const td: React.CSSProperties = {
  border: '1px solid #E5E7EB',
  padding: 8,
  textAlign: 'center',
  verticalAlign: 'middle',
}

const backButton: React.CSSProperties = {
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  color: '#2D7D82',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 12,
}

const secondaryButton: React.CSSProperties = {
  border: '1px solid #D1D5DB',
  background: '#fff',
  padding: '9px 14px',
  borderRadius: 8,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const saveButton: React.CSSProperties = {
  border: 'none',
  background: '#2D7D82',
  color: '#fff',
  padding: '9px 14px',
  borderRadius: 8,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const iconButton: React.CSSProperties = {
  border: 'none',
  background: 'none',
  color: '#DC2626',
  cursor: 'pointer',
}

const hijriDate: React.CSSProperties = {
  marginTop: 5,
  fontSize: 12,
  color: '#2D7D82',
  whiteSpace: 'nowrap',
}