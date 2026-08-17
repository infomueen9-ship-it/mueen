
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
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

const weeks = Array.from(
  { length: 20 },
  (_, index) => index + 1
)

/* =========================================================
   التاريخ الهجري
   ========================================================= */

function getHijriDate(dateString: string) {
  if (!dateString) return ''

  try {
    const date = new Date(`${dateString}T00:00:00`)

    return new Intl.DateTimeFormat(
      'ar-SA-u-ca-islamic',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }
    ).format(date)
  } catch {
    return ''
  }
}

/* =========================================================
   تواريخ الأسبوع الافتراضية
   ========================================================= */

function weekDates(week: number) {
  const year = new Date().getFullYear()

  const start = new Date(year, 0, 1)

  start.setDate(
    start.getDate() + (week - 1) * 7
  )

  const end = new Date(start)

  end.setDate(end.getDate() + 6)

  return {
    startDate: start
      .toISOString()
      .slice(0, 10),

    endDate: end
      .toISOString()
      .slice(0, 10),
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
  const [levels, setLevels] =
    useState<Level[]>([])

  const [grades, setGrades] =
    useState<Grade[]>([])

  const [subjects, setSubjects] =
    useState<Subject[]>([])

  const [lessonPlans, setLessonPlans] =
    useState<LessonPlan[]>([])

  const [plans, setPlans] =
    useState<ArchivedPlan[]>([])

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [showAddForm, setShowAddForm] =
    useState(false)

  const [newPlan, setNewPlan] =
    useState<ArchivedPlan>({
      levelId: '',
      gradeId: '',
      subjectId: '',
      planId: '',
      week: '',
      startDate: '',
      endDate: '',
    })

  /* =======================================================
     تحميل البيانات
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

        const levelsData =
          levelsResponse.data || []

        const gradesData =
          gradesResponse.data || []

        const subjectsData =
          subjectsResponse.data || []

        const plansData =
          plansResponse.data || []

        console.log(
          'ArchivedPlansView LEVELS:',
          levelsData
        )

        console.log(
          'ArchivedPlansView GRADES:',
          gradesData
        )

        console.log(
          'ArchivedPlansView SUBJECTS:',
          subjectsData
        )

        console.log(
          'ArchivedPlansView LESSON PLANS:',
          plansData
        )

        setLevels(levelsData)
        setGrades(gradesData)
        setSubjects(subjectsData)
        setLessonPlans(plansData)

        /* ===============================================
           الدروس المؤرشفة
           =============================================== */

        try {
          const archivedResponse =
            await api.get(
              `/api/school/${schemaName}/classrooms/${classroomId}/archived-plans`
            )

          if (cancelled) return

          const data =
            archivedResponse.data

          console.log(
            'ArchivedPlansView ARCHIVED:',
            data
          )

          if (Array.isArray(data)) {
            setPlans(
              data.map(
                (plan: any) => {
                  const week =
                    Number(
                      plan.week ??
                        plan.weekNumber ??
                        plan.week_number ??
                        1
                    )

                  const dates =
                    weekDates(week)

                  return {
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

                    week: String(week),

                    startDate:
                      plan.startDate ??
                      plan.start_date ??
                      dates.startDate,

                    endDate:
                      plan.endDate ??
                      plan.end_date ??
                      dates.endDate,
                  }
                }
              )
            )
          }
        } catch (error) {
          console.error(
            'Archived plans load error:',
            error
          )

          setPlans([])
        }
      } catch (error) {
        console.error(
          'Study plans load error:',
          error
        )

        toast.error(
          'تعذر تحميل بيانات الخطط'
        )
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
     الصفوف التابعة للمرحلة
     ======================================================= */

  const availableGrades =
    useMemo(() => {
      if (!newPlan.levelId) {
        return []
      }

      return grades.filter(
        grade =>
          String(grade.level_id) ===
          String(newPlan.levelId)
      )
    }, [
      grades,
      newPlan.levelId,
    ])

  /* =======================================================
     المواد التابعة للصف
     ======================================================= */

  const availableSubjects =
    useMemo(() => {
      if (
        !newPlan.levelId ||
        !newPlan.gradeId
      ) {
        return []
      }

      return subjects.filter(
        subject =>
          String(subject.level_id) ===
            String(newPlan.levelId) &&
          String(subject.grade_id) ===
            String(newPlan.gradeId)
      )
    }, [
      subjects,
      newPlan.levelId,
      newPlan.gradeId,
    ])

  /* =======================================================
     الدروس التابعة للمادة
     ======================================================= */

  const availableLessons =
    useMemo(() => {
      if (
        !newPlan.levelId ||
        !newPlan.gradeId ||
        !newPlan.subjectId
      ) {
        return []
      }

      const result =
        lessonPlans.filter(
          lesson =>
            String(lesson.level_id) ===
              String(newPlan.levelId) &&
            String(lesson.grade_id) ===
              String(newPlan.gradeId) &&
            String(lesson.subject_id) ===
              String(newPlan.subjectId)
        )

      console.log(
        'Available lessons:',
        result
      )

      return result
    }, [
      lessonPlans,
      newPlan.levelId,
      newPlan.gradeId,
      newPlan.subjectId,
    ])

  /* =======================================================
     فتح النموذج
     ======================================================= */

  const openAddForm = () => {
    setNewPlan({
      levelId: '',
      gradeId: '',
      subjectId: '',
      planId: '',
      week: '',
      startDate: '',
      endDate: '',
    })

    setShowAddForm(true)
  }

  /* =======================================================
     إغلاق النموذج
     ======================================================= */

  const closeAddForm = () => {
    setShowAddForm(false)

    setNewPlan({
      levelId: '',
      gradeId: '',
      subjectId: '',
      planId: '',
      week: '',
      startDate: '',
      endDate: '',
    })
  }

  /* =======================================================
     المرحلة
     ======================================================= */

  const handleLevelChange = (
    value: string
  ) => {
    console.log(
      'Selected level:',
      value
    )

    setNewPlan(current => ({
      ...current,

      levelId: value,

      gradeId: '',
      subjectId: '',
      planId: '',
      week: '',
      startDate: '',
      endDate: '',
    }))
  }

  /* =======================================================
     الصف
     ======================================================= */

  const handleGradeChange = (
    value: string
  ) => {
    console.log(
      'Selected grade:',
      value
    )

    setNewPlan(current => ({
      ...current,

      gradeId: value,

      subjectId: '',
      planId: '',
      week: '',
      startDate: '',
      endDate: '',
    }))
  }

  /* =======================================================
     المادة
     ======================================================= */

  const handleSubjectChange = (
    value: string
  ) => {
    console.log(
      'Selected subject:',
      value
    )

    setNewPlan(current => ({
      ...current,

      subjectId: value,

      planId: '',
      week: '',
      startDate: '',
      endDate: '',
    }))
  }

  /* =======================================================
     الأسبوع
     ======================================================= */

  const handleWeekChange = (
    value: string
  ) => {
    if (!value) {
      setNewPlan(current => ({
        ...current,
        week: '',
        startDate: '',
        endDate: '',
      }))

      return
    }

    const dates =
      weekDates(Number(value))

    setNewPlan(current => ({
      ...current,

      week: value,

      startDate:
        dates.startDate,

      endDate:
        dates.endDate,
    }))
  }

  /* =======================================================
     التاريخ
     ======================================================= */

  const handleDateChange = (
    field:
      | 'startDate'
      | 'endDate',
    value: string
  ) => {
    setNewPlan(current => ({
      ...current,
      [field]: value,
    }))
  }

  /* =======================================================
     موضوع الدرس
     ======================================================= */

  const handleLessonChange = (
    value: string
  ) => {
    setNewPlan(current => ({
      ...current,
      planId: value,
    }))
  }

  /* =======================================================
     إضافة الدرس
     ======================================================= */

  const addPlan = () => {
    if (!newPlan.levelId) {
      toast.error(
        'يرجى اختيار المرحلة'
      )
      return
    }

    if (!newPlan.gradeId) {
      toast.error(
        'يرجى اختيار الصف'
      )
      return
    }

    if (!newPlan.subjectId) {
      toast.error(
        'يرجى اختيار المادة'
      )
      return
    }

    if (!newPlan.week) {
      toast.error(
        'يرجى اختيار الأسبوع'
      )
      return
    }

    if (!newPlan.startDate) {
      toast.error(
        'يرجى اختيار تاريخ البداية'
      )
      return
    }

    if (!newPlan.endDate) {
      toast.error(
        'يرجى اختيار تاريخ النهاية'
      )
      return
    }

    if (!newPlan.planId) {
      toast.error(
        'يرجى اختيار موضوع الدرس'
      )
      return
    }

    setPlans(current => [
      ...current,
      {
        ...newPlan,
      },
    ])

    toast.success(
      'تمت إضافة الدرس'
    )

    closeAddForm()
  }

  /* =======================================================
     حذف
     ======================================================= */

  const deletePlan = async (
    index: number
  ) => {
    const plan =
      plans[index]

    if (!plan) return

    if (!plan.id) {
      setPlans(current =>
        current.filter(
          (_, currentIndex) =>
            currentIndex !== index
        )
      )

      toast.success(
        'تم حذف الدرس'
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

      toast.success(
        'تم حذف الدرس'
      )
    } catch (error) {
      console.error(error)

      toast.error(
        'تعذر حذف الدرس'
      )
    }
  }

  /* =======================================================
     حفظ
     ======================================================= */

  const save = async () => {
    if (!plans.length) {
      toast.error(
        'أضف درسًا واحدًا على الأقل'
      )

      return
    }

    const invalid =
      plans.some(
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
          plans: plans.map(
            plan => ({
              id: plan.id,

              levelId:
                Number(
                  plan.levelId
                ),

              gradeId:
                Number(
                  plan.gradeId
                ),

              subjectId:
                Number(
                  plan.subjectId
                ),

              planId:
                Number(
                  plan.planId
                ),

              weekNumber:
                Number(
                  plan.week
                ),

              startDate:
                plan.startDate,

              endDate:
                plan.endDate,
            })
          ),
        }
      )

      toast.success(
        'تم حفظ الخطة بنجاح'
      )
    } catch (error) {
      console.error(error)

      toast.error(
        'تعذر حفظ الخطة'
      )
    } finally {
      setSaving(false)
    }
  }

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div
      style={{
        direction: 'rtl',
        padding: 30,
        maxWidth: 1100,
        margin: '0 auto',
      }}
    >
      <button
        onClick={onBack}
        style={backButton}
      >
        <ArrowRight size={18} />
        العودة
      </button>

      <div style={header}>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
            }}
          >
            الخطط الدراسية
          </h2>

          <p
            style={{
              margin: '6px 0 0',
              fontSize: 13,
              opacity: 0.9,
            }}
          >
            {classroomName}
          </p>
        </div>
      </div>

      {loading ? (
        <div style={loadingContainer}>
          جارٍ تحميل البيانات...
        </div>
      ) : (
        <>
          {/* =================================================
              نموذج إضافة الدرس
             ================================================= */}

          {showAddForm && (
            <div
              style={addFormContainer}
            >
              <div
                style={addFormHeader}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                    }}
                  >
                    إضافة درس جديد
                  </h3>

                  <p
                    style={{
                      margin:
                        '6px 0 0',
                      color:
                        '#6B7280',
                      fontSize: 13,
                    }}
                  >
                    اختر البيانات بالتسلسل
                  </p>
                </div>

                <button
                  onClick={
                    closeAddForm
                  }
                  style={closeButton}
                >
                  <X size={18} />
                </button>
              </div>

              {/* =================================================
                  1 - المرحلة
                 ================================================= */}

              <div style={stepContainer}>
                <div style={stepNumber}>
                  1
                </div>

                <div style={stepContent}>
                  <label style={label}>
                    المرحلة
                  </label>

                  <select
                    value={
                      newPlan.levelId
                    }
                    onChange={event =>
                      handleLevelChange(
                        event.target.value
                      )
                    }
                    style={selectInput}
                  >
                    <option value="">
                      اختر المرحلة
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
                </div>
              </div>

              {/* =================================================
                  2 - الصف
                 ================================================= */}

              {newPlan.levelId && (
                <div style={stepContainer}>
                  <div style={stepNumber}>
                    2
                  </div>

                  <div style={stepContent}>
                    <label style={label}>
                      الصف
                    </label>

                    <select
                      value={
                        newPlan.gradeId
                      }
                      onChange={event =>
                        handleGradeChange(
                          event.target.value
                        )
                      }
                      style={selectInput}
                    >
                      <option value="">
                        اختر الصف
                      </option>

                      {availableGrades.map(
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

                    {!availableGrades.length && (
                      <div style={warningText}>
                        لا توجد صفوف مرتبطة بهذه المرحلة.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* =================================================
                  3 - المادة
                 ================================================= */}

              {newPlan.gradeId && (
                <div style={stepContainer}>
                  <div style={stepNumber}>
                    3
                  </div>

                  <div style={stepContent}>
                    <label style={label}>
                      المادة
                    </label>

                    <select
                      value={
                        newPlan.subjectId
                      }
                      onChange={event =>
                        handleSubjectChange(
                          event.target.value
                        )
                      }
                      style={selectInput}
                    >
                      <option value="">
                        اختر المادة
                      </option>

                      {availableSubjects.map(
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

                    {!availableSubjects.length && (
                      <div style={warningText}>
                        لا توجد مواد مرتبطة بهذا الصف.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* =================================================
                  4 - الأسبوع
                 ================================================= */}

              {newPlan.subjectId && (
                <div style={stepContainer}>
                  <div style={stepNumber}>
                    4
                  </div>

                  <div style={stepContent}>
                    <label style={label}>
                      الأسبوع
                    </label>

                    <select
                      value={
                        newPlan.week
                      }
                      onChange={event =>
                        handleWeekChange(
                          event.target.value
                        )
                      }
                      style={selectInput}
                    >
                      <option value="">
                        اختر الأسبوع
                      </option>

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
                  </div>
                </div>
              )}

              {/* =================================================
                  5 - التاريخ
                 ================================================= */}

              {newPlan.week && (
                <div style={stepContainer}>
                  <div style={stepNumber}>
                    5
                  </div>

                  <div style={stepContent}>
                    <label style={label}>
                      التاريخ
                    </label>

                    <div style={dateGrid}>
                      <div>
                        <span
                          style={dateLabel}
                        >
                          من
                        </span>

                        <input
                          type="date"
                          value={
                            newPlan.startDate
                          }
                          onChange={event =>
                            handleDateChange(
                              'startDate',
                              event.target.value
                            )
                          }
                          style={selectInput}
                        />

                        {newPlan.startDate && (
                          <div style={hijriDate}>
                            {getHijriDate(
                              newPlan.startDate
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <span
                          style={dateLabel}
                        >
                          إلى
                        </span>

                        <input
                          type="date"
                          value={
                            newPlan.endDate
                          }
                          onChange={event =>
                            handleDateChange(
                              'endDate',
                              event.target.value
                            )
                          }
                          style={selectInput}
                        />

                        {newPlan.endDate && (
                          <div style={hijriDate}>
                            {getHijriDate(
                              newPlan.endDate
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* =================================================
                  6 - موضوع الدرس
                 ================================================= */}

              {newPlan.week && (
                <div style={stepContainer}>
                  <div style={stepNumber}>
                    6
                  </div>

                  <div style={stepContent}>
                    <label style={label}>
                      موضوع الدرس
                    </label>

                    <select
                      value={
                        newPlan.planId
                      }
                      onChange={event =>
                        handleLessonChange(
                          event.target.value
                        )
                      }
                      style={selectInput}
                    >
                      <option value="">
                        اختر موضوع الدرس
                      </option>

                      {availableLessons.map(
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

                    {!availableLessons.length && (
                      <div style={warningText}>
                        لا توجد مواضيع دروس لهذه المادة.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* =================================================
                  أزرار
                 ================================================= */}

              <div style={formActions}>
                <button
                  onClick={addPlan}
                  style={saveButton}
                >
                  <Plus size={17} />
                  إضافة الدرس
                </button>

                <button
                  onClick={closeAddForm}
                  style={cancelButton}
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {/* =================================================
              الدروس المضافة
             ================================================= */}

          <div style={plansContainer}>
            <div style={plansHeader}>
              <div>
                <h3
                  style={{
                    margin: 0,
                  }}
                >
                  الدروس المضافة
                </h3>

                <span style={plansCount}>
                  {plans.length} درس
                </span>
              </div>

              {!showAddForm && (
                <button
                  onClick={openAddForm}
                  style={primaryButton}
                >
                  <Plus size={17} />
                  إضافة درس
                </button>
              )}
            </div>

            {!plans.length ? (
              <div style={emptyState}>
                لا توجد دروس مؤرشفة حتى الآن.
                <br />

                اضغط على
                <strong>
                  {' '}
                  "إضافة درس"
                </strong>{' '}
                لبدء الخطة.
              </div>
            ) : (
              <div style={tableContainer}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>#</th>
                      <th style={th}>المرحلة</th>
                      <th style={th}>الصف</th>
                      <th style={th}>المادة</th>
                      <th style={th}>موضوع الدرس</th>
                      <th style={th}>الأسبوع</th>
                      <th style={th}>من</th>
                      <th style={th}>إلى</th>
                      <th style={th}>الإجراءات</th>
                    </tr>
                  </thead>

                  <tbody>
                    {plans.map(
                      (plan, index) => {
                        const level =
                          levels.find(
                            item =>
                              String(
                                item.id
                              ) ===
                              String(
                                plan.levelId
                              )
                          )

                        const grade =
                          grades.find(
                            item =>
                              String(
                                item.id
                              ) ===
                              String(
                                plan.gradeId
                              )
                          )

                        const subject =
                          subjects.find(
                            item =>
                              String(
                                item.id
                              ) ===
                              String(
                                plan.subjectId
                              )
                          )

                        const lesson =
                          lessonPlans.find(
                            item =>
                              String(
                                item.id
                              ) ===
                              String(
                                plan.planId
                              )
                          )

                        return (
                          <tr
                            key={
                              plan.id ??
                              `new-${index}`
                            }
                          >
                            <td style={td}>
                              {index + 1}
                            </td>

                            <td style={td}>
                              {
                                level?.name ??
                                '-'
                              }
                            </td>

                            <td style={td}>
                              {
                                grade?.name ??
                                '-'
                              }
                            </td>

                            <td style={td}>
                              {
                                subject?.name ??
                                '-'
                              }
                            </td>

                            <td
                              style={{
                                ...td,
                                fontWeight: 600,
                              }}
                            >
                              {
                                lesson?.lesson_topic ??
                                '-'
                              }
                            </td>

                            <td style={td}>
                              الأسبوع{' '}
                              {plan.week}
                            </td>

                            <td style={td}>
                              <div>
                                {
                                  plan.startDate
                                }
                              </div>

                              {plan.startDate && (
                                <div
                                  style={
                                    hijriDate
                                  }
                                >
                                  {getHijriDate(
                                    plan.startDate
                                  )}
                                </div>
                              )}
                            </td>

                            <td style={td}>
                              <div>
                                {
                                  plan.endDate
                                }
                              </div>

                              {plan.endDate && (
                                <div
                                  style={
                                    hijriDate
                                  }
                                >
                                  {getHijriDate(
                                    plan.endDate
                                  )}
                                </div>
                              )}
                            </td>

                            <td style={td}>
                              <button
                                onClick={() =>
                                  deletePlan(
                                    index
                                  )
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
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* =================================================
              حفظ
             ================================================= */}

          <div style={bottomActions}>
            <button
              onClick={save}
              disabled={
                saving ||
                !plans.length
              }
              style={{
                ...saveButton,
                opacity:
                  saving ||
                  !plans.length
                    ? 0.6
                    : 1,
              }}
            >
              <Save size={17} />

              {saving
                ? 'جارٍ الحفظ...'
                : 'حفظ الخطة'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* =========================================================
   STYLES
   ========================================================= */

const header: React.CSSProperties = {
  background: '#9EC5C7',
  color: '#fff',
  padding: 18,
  borderRadius: 12,
  marginBottom: 18,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
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
  fontSize: 14,
}

const loadingContainer: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E5E7EB',
  borderRadius: 14,
  padding: 60,
  textAlign: 'center',
  color: '#6B7280',
}

const addFormContainer: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #DDE7E8',
  borderRadius: 16,
  padding: 22,
  marginBottom: 20,
  boxShadow:
    '0 4px 18px rgba(0,0,0,0.05)',
}

const addFormHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: 18,
  borderBottom:
    '1px solid #E5E7EB',
  marginBottom: 18,
}

const closeButton: React.CSSProperties = {
  border: 'none',
  background: '#F3F4F6',
  width: 34,
  height: 34,
  borderRadius: '50%',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#6B7280',
}

const stepContainer: React.CSSProperties = {
  display: 'flex',
  gap: 14,
  alignItems: 'flex-start',
  marginBottom: 18,
  padding: 14,
  background: '#FAFCFC',
  border:
    '1px solid #E5E7EB',
  borderRadius: 12,
}

const stepNumber: React.CSSProperties = {
  width: 32,
  height: 32,
  minWidth: 32,
  borderRadius: '50%',
  background: '#2D7D82',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: 13,
}

const stepContent: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
}

const label: React.CSSProperties = {
  display: 'block',
  marginBottom: 7,
  fontSize: 13,
  color: '#374151',
  fontWeight: 700,
}

const selectInput: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 12px',
  border:
    '1px solid #D1D5DB',
  borderRadius: 8,
  outline: 'none',
  background: '#fff',
  fontSize: 13,
  color: '#374151',
}

const dateGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(2, minmax(0, 1fr))',
  gap: 12,
}

const dateLabel: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  color: '#6B7280',
  fontSize: 12,
  fontWeight: 600,
}

const hijriDate: React.CSSProperties = {
  marginTop: 5,
  fontSize: 11,
  color: '#2D7D82',
  whiteSpace: 'nowrap',
}

const warningText: React.CSSProperties = {
  marginTop: 8,
  color: '#B45309',
  background: '#FEF3C7',
  borderRadius: 7,
  padding: '8px 10px',
  fontSize: 12,
}

const formActions: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  marginTop: 22,
  paddingTop: 18,
  borderTop:
    '1px solid #E5E7EB',
}

const plansContainer: React.CSSProperties = {
  background: '#fff',
  border:
    '1px solid #E5E7EB',
  borderRadius: 14,
  overflow: 'hidden',
}

const plansHeader: React.CSSProperties = {
  padding: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom:
    '1px solid #E5E7EB',
}

const plansCount: React.CSSProperties = {
  display: 'inline-block',
  marginTop: 5,
  color: '#6B7280',
  fontSize: 12,
}

const emptyState: React.CSSProperties = {
  padding: 45,
  textAlign: 'center',
  color: '#9CA3AF',
  lineHeight: 2,
  fontSize: 13,
}

const tableContainer: React.CSSProperties = {
  width: '100%',
  overflowX: 'auto',
}

const table: React.CSSProperties = {
  width: '100%',
  minWidth: 1000,
  borderCollapse: 'collapse',
}

const th: React.CSSProperties = {
  border:
    '1px solid #E5E7EB',
  padding: 10,
  background: '#F9FAFB',
  color: '#4B5563',
  whiteSpace: 'nowrap',
  fontSize: 12,
}

const td: React.CSSProperties = {
  border:
    '1px solid #E5E7EB',
  padding: 9,
  textAlign: 'center',
  verticalAlign: 'middle',
  fontSize: 12,
  color: '#374151',
}

const primaryButton: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '10px 16px',
  background: '#2D7D82',
  color: '#fff',
  border: 'none',
  borderRadius: 9,
  cursor: 'pointer',
  fontWeight: 600,
  whiteSpace: 'nowrap',
}

const saveButton: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '10px 18px',
  background: '#2D7D82',
  color: '#fff',
  border: 'none',
  borderRadius: 9,
  cursor: 'pointer',
  fontWeight: 600,
  whiteSpace: 'nowrap',
}

const cancelButton: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '10px 18px',
  background: '#F3F4F6',
  color: '#6B7280',
  border: 'none',
  borderRadius: 9,
  cursor: 'pointer',
  fontWeight: 600,
}

const bottomActions: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-start',
  marginTop: 18,
}

const iconButton: React.CSSProperties = {
  border: 'none',
  background: 'none',
  color: '#DC2626',
  cursor: 'pointer',
}
