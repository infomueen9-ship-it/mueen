
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Plus,
  Save,
  Trash2,
  X,
  CalendarDays,
  BookOpen,
  Plane,
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
  type: 'lesson' | 'leave'
  planId?: string
  lessonTopic?: string
  weekNumber: string
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
   التواريخ الافتراضية للأسبوع
   ========================================================= */

function weekDates(week: number) {
  const start = new Date(
    new Date().getFullYear(),
    0,
    1
  )

  start.setDate(
    start.getDate() + (week - 1) * 7
  )

  const end = new Date(start)

  end.setDate(
    end.getDate() + 6
  )

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

  const [addType, setAddType] =
    useState<'lesson' | 'leave'>(
      'lesson'
    )

  const [formLevelId, setFormLevelId] =
    useState('')

  const [formGradeId, setFormGradeId] =
    useState('')

  const [formSubjectId, setFormSubjectId] =
    useState('')

  const [newPlan, setNewPlan] =
    useState<ArchivedPlan>({
      type: 'lesson',
      planId: '',
      lessonTopic: '',
      weekNumber: '1',
      startDate:
        weekDates(1).startDate,
      endDate:
        weekDates(1).endDate,
    })

  /* =======================================================
     الصفوف التابعة للمرحلة
     ======================================================= */

  const availableGrades =
    useMemo(() => {
      if (!formLevelId) {
        return []
      }

      return grades.filter(
        grade =>
          String(
            grade.level_id
          ) === formLevelId
      )
    }, [
      grades,
      formLevelId,
    ])

  /* =======================================================
     المواد التابعة للصف
     ======================================================= */

  const availableSubjects =
    useMemo(() => {
      if (
        !formLevelId ||
        !formGradeId
      ) {
        return []
      }

      return subjects.filter(
        subject =>
          String(
            subject.level_id
          ) === formLevelId &&
          String(
            subject.grade_id
          ) === formGradeId
      )
    }, [
      subjects,
      formLevelId,
      formGradeId,
    ])

  /* =======================================================
     مواضيع الدروس التابعة للمادة
     ======================================================= */

  const availableLessons =
    useMemo(() => {
      if (
        !formLevelId ||
        !formGradeId ||
        !formSubjectId
      ) {
        return []
      }

      return lessonPlans.filter(
        lesson =>
          String(
            lesson.level_id
          ) === formLevelId &&
          String(
            lesson.grade_id
          ) === formGradeId &&
          String(
            lesson.subject_id
          ) === formSubjectId
      )
    }, [
      lessonPlans,
      formLevelId,
      formGradeId,
      formSubjectId,
    ])

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
          archivedResponse,
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

          api.get(
            `/api/school/${schemaName}/classrooms/${classroomId}/archived-plans`
          ),
        ])

        if (cancelled) return

        setLevels(
          levelsResponse.data || []
        )

        setGrades(
          gradesResponse.data || []
        )

        setSubjects(
          subjectsResponse.data || []
        )

        setLessonPlans(
          plansResponse.data || []
        )

        const data =
          archivedResponse.data

        if (Array.isArray(data)) {
          setPlans(
            data.map(
              (item: any) => ({
                id: item.id,

                type:
                  item.type === 'leave'
                    ? 'leave'
                    : 'lesson',

                planId:
                  item.planId != null
                    ? String(
                        item.planId
                      )
                    : undefined,

                lessonTopic:
                  item.lessonTopic ??
                  item.lesson_topic ??
                  undefined,

                weekNumber:
                  String(
                    item.weekNumber ??
                      item.week_number ??
                      1
                  ),

                startDate:
                  item.startDate ??
                  item.date_from ??
                  '',

                endDate:
                  item.endDate ??
                  item.date_to ??
                  '',
              })
            )
          )
        } else {
          setPlans([])
        }
      } catch (error) {
        console.error(
          'Archived plans load error:',
          error
        )

        toast.error(
          'تعذر تحميل بيانات الخطط'
        )

        setPlans([])
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
  }, [
    schemaName,
    classroomId,
  ])

  /* =======================================================
     فتح النموذج
     ======================================================= */

  const openAddForm = (
    type: 'lesson' | 'leave'
  ) => {
    const dates =
      weekDates(1)

    setAddType(type)

    setFormLevelId('')
    setFormGradeId('')
    setFormSubjectId('')

    setNewPlan({
      type,
      planId: '',
      lessonTopic: '',
      weekNumber: '1',
      startDate:
        dates.startDate,
      endDate:
        dates.endDate,
    })

    setShowAddForm(true)
  }

  /* =======================================================
     إغلاق النموذج
     ======================================================= */

  const closeAddForm = () => {
    setShowAddForm(false)

    setAddType('lesson')

    setFormLevelId('')
    setFormGradeId('')
    setFormSubjectId('')

    const dates =
      weekDates(1)

    setNewPlan({
      type: 'lesson',
      planId: '',
      lessonTopic: '',
      weekNumber: '1',
      startDate:
        dates.startDate,
      endDate:
        dates.endDate,
    })
  }

  /* =======================================================
     اختيار المرحلة
     ======================================================= */

  const handleLevelChange = (
    value: string
  ) => {
    setFormLevelId(value)
    setFormGradeId('')
    setFormSubjectId('')

    setNewPlan(
      current => ({
        ...current,
        planId: '',
      })
    )
  }

  /* =======================================================
     اختيار الصف
     ======================================================= */

  const handleGradeChange = (
    value: string
  ) => {
    setFormGradeId(value)
    setFormSubjectId('')

    setNewPlan(
      current => ({
        ...current,
        planId: '',
      })
    )
  }

  /* =======================================================
     اختيار المادة
     ======================================================= */

  const handleSubjectChange = (
    value: string
  ) => {
    setFormSubjectId(value)

    setNewPlan(
      current => ({
        ...current,
        planId: '',
      })
    )
  }

  /* =======================================================
     تغيير الأسبوع
     ======================================================= */

  const handleWeekChange = (
    value: string
  ) => {
    const dates =
      weekDates(
        Number(value)
      )

    setNewPlan(
      current => ({
        ...current,

        weekNumber: value,

        startDate:
          dates.startDate,

        endDate:
          dates.endDate,
      })
    )
  }

  /* =======================================================
     تغيير موضوع الدرس
     ======================================================= */

  const handleLessonChange = (
    value: string
  ) => {
    setNewPlan(
      current => ({
        ...current,
        planId: value,
      })
    )
  }

  /* =======================================================
     تغيير الإجازة
     ======================================================= */

  const handleLeaveChange = (
    value: string
  ) => {
    setNewPlan(
      current => ({
        ...current,
        lessonTopic: value,
      })
    )
  }

  /* =======================================================
     تغيير التاريخ
     ======================================================= */

  const handleDateChange = (
    field:
      | 'startDate'
      | 'endDate',
    value: string
  ) => {
    setNewPlan(
      current => ({
        ...current,
        [field]: value,
      })
    )
  }

  /* =======================================================
     إضافة سجل محليًا
     ======================================================= */

  const addPlan = () => {
    if (
      newPlan.type === 'lesson' &&
      !formLevelId
    ) {
      toast.error(
        'يرجى اختيار المرحلة'
      )

      return
    }

    if (
      newPlan.type === 'lesson' &&
      !formGradeId
    ) {
      toast.error(
        'يرجى اختيار الصف'
      )

      return
    }

    if (
      newPlan.type === 'lesson' &&
      !formSubjectId
    ) {
      toast.error(
        'يرجى اختيار المادة'
      )

      return
    }

    if (!newPlan.weekNumber) {
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

    if (
      newPlan.startDate >
      newPlan.endDate
    ) {
      toast.error(
        'تاريخ البداية يجب أن يكون قبل تاريخ النهاية'
      )

      return
    }

    if (
      newPlan.type === 'lesson' &&
      !newPlan.planId
    ) {
      toast.error(
        'يرجى اختيار موضوع الدرس'
      )

      return
    }

    if (
      newPlan.type === 'leave' &&
      !newPlan.lessonTopic?.trim()
    ) {
      toast.error(
        'يرجى إدخال اسم الإجازة'
      )

      return
    }

    setPlans(
      current => [
        ...current,
        {
          ...newPlan,
          id: undefined,
        },
      ]
    )

    toast.success(
      newPlan.type === 'lesson'
        ? 'تمت إضافة الدرس'
        : 'تمت إضافة الإجازة'
    )

    closeAddForm()
  }

  /* =======================================================
     حذف سجل
     ======================================================= */

  const deletePlan = async (
    index: number
  ) => {
    const plan =
      plans[index]

    if (!plan) return

    /*
     * إذا كان السجل جديدًا ولم يحفظ
     * نحذفه من القائمة فقط
     */
    if (!plan.id) {
      setPlans(
        current =>
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

      setPlans(
        current =>
          current.filter(
            (_, currentIndex) =>
              currentIndex !== index
          )
      )

      toast.success(
        'تم حذف السجل'
      )
    } catch (error) {
      console.error(error)

      toast.error(
        'تعذر حذف السجل'
      )
    }
  }

  /* =======================================================
     حفظ جميع السجلات الجديدة
     ======================================================= */

  const save = async () => {
    if (!plans.length) {
      toast.error(
        'أضف درسًا أو إجازة واحدة على الأقل'
      )

      return
    }

    const unsavedPlans =
      plans.filter(
        plan => !plan.id
      )

    if (!unsavedPlans.length) {
      toast.success(
        'جميع السجلات محفوظة بالفعل'
      )

      return
    }

    setSaving(true)

    try {
      const response =
        await api.post(
          `/api/school/${schemaName}/classrooms/${classroomId}/archived-plans/bulk`,
          {
            plans:
              unsavedPlans.map(
                plan => ({
                  type:
                    plan.type,

                  planId:
                    plan.type ===
                    'lesson'
                      ? Number(
                          plan.planId
                        )
                      : null,

                  lessonTopic:
                    plan.type ===
                    'leave'
                      ? plan.lessonTopic
                      : null,

                  weekNumber:
                    Number(
                      plan.weekNumber
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
        response.data
          ?.message ||
          'تم حفظ الخطة بنجاح'
      )

      /*
       * إعادة تحميل البيانات من السيرفر
       * للحصول على IDs الحقيقية
       */
      const archivedResponse =
        await api.get(
          `/api/school/${schemaName}/classrooms/${classroomId}/archived-plans`
        )

      const data =
        archivedResponse.data

      if (Array.isArray(data)) {
        setPlans(
          data.map(
            (item: any) => ({
              id: item.id,

              type:
                item.type ===
                'leave'
                  ? 'leave'
                  : 'lesson',

              planId:
                item.planId != null
                  ? String(
                      item.planId
                    )
                  : undefined,

              lessonTopic:
                item.lessonTopic ??
                item.lesson_topic ??
                undefined,

              weekNumber:
                String(
                  item.weekNumber ??
                    item.week_number ??
                    1
                ),

              startDate:
                item.startDate ??
                item.date_from ??
                '',

              endDate:
                item.endDate ??
                item.date_to ??
                '',
            })
          )
        )
      }
    } catch (error) {
      console.error(
        'Save archived plans error:',
        error
      )

      toast.error(
        'تعذر حفظ الخطة'
      )
    } finally {
      setSaving(false)
    }
  }

  /* =======================================================
     معلومات الخطة
     ======================================================= */

  const getLesson =
    (planId?: string) => {
      if (!planId) {
        return undefined
      }

      return lessonPlans.find(
        lesson =>
          String(
            lesson.id
          ) === planId
      )
    }

  /* =======================================================
     عرض المرحلة/الصف/المادة
     ======================================================= */

  const getLessonInfo =
    (lesson?: LessonPlan) => {
      if (!lesson) {
        return {
          level: '-',
          grade: '-',
          subject: '-',
        }
      }

      return {
        level:
          lesson.level_name ||
          levels.find(
            level =>
              level.id ===
              lesson.level_id
          )?.name ||
          '-',

        grade:
          lesson.grade_name ||
          grades.find(
            grade =>
              grade.id ===
              lesson.grade_id
          )?.name ||
          '-',

        subject:
          lesson.subject_name ||
          subjects.find(
            subject =>
              subject.id ===
              lesson.subject_id
          )?.name ||
          '-',
      }
    }

  /* =======================================================
     Render
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

      {/* =================================================
          Back
         ================================================= */}

      <button
        onClick={onBack}
        style={backButton}
      >
        <ArrowRight size={18} />
        العودة
      </button>

      {/* =================================================
          Header
         ================================================= */}

      <div style={header}>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
            }}
          >
            الخطط الدراسية المؤرشفة
          </h2>

          <p
            style={{
              margin:
                '6px 0 0',
              fontSize: 13,
              opacity: 0.9,
            }}
          >
            الفصل: {classroomName}
          </p>
        </div>
      </div>

      {/* =================================================
          Loading
         ================================================= */}

      {loading ? (
        <div
          style={
            loadingContainer
          }
        >
          جارٍ تحميل البيانات...
        </div>
      ) : (
        <>
          {/* =================================================
              Add Form
             ================================================= */}

          {showAddForm && (
            <div
              style={
                addFormContainer
              }
            >

              <div
                style={
                  addFormHeader
                }
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                    }}
                  >
                    {addType ===
                    'lesson'
                      ? 'إضافة درس'
                      : 'إضافة إجازة'}
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
                    الفصل: {classroomName}
                  </p>
                </div>

                <button
                  onClick={
                    closeAddForm
                  }
                  style={
                    closeButton
                  }
                >
                  <X size={18} />
                </button>
              </div>

              {/* =================================================
                  LEVEL
                 ================================================= */}

              {addType ===
                'lesson' && (
                <div
                  style={
                    stepContainer
                  }
                >
                  <div
                    style={
                      stepNumber
                    }
                  >
                    1
                  </div>

                  <div
                    style={
                      stepContent
                    }
                  >
                    <label
                      style={
                        label
                      }
                    >
                      المرحلة
                    </label>

                    <select
                      value={
                        formLevelId
                      }
                      onChange={event =>
                        handleLevelChange(
                          event.target.value
                        )
                      }
                      style={
                        selectInput
                      }
                    >
                      <option value="">
                        اختر المرحلة
                      </option>

                      {levels.map(
                        level => (
                          <option
                            key={
                              level.id
                            }
                            value={
                              level.id
                            }
                          >
                            {level.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>
              )}

              {/* =================================================
                  GRADE
                 ================================================= */}

              {addType ===
                'lesson' &&
                formLevelId && (
                <div
                  style={
                    stepContainer
                  }
                >
                  <div
                    style={
                      stepNumber
                    }
                  >
                    2
                  </div>

                  <div
                    style={
                      stepContent
                    }
                  >
                    <label
                      style={
                        label
                      }
                    >
                      الصف
                    </label>

                    <select
                      value={
                        formGradeId
                      }
                      onChange={event =>
                        handleGradeChange(
                          event.target.value
                        )
                      }
                      style={
                        selectInput
                      }
                    >
                      <option value="">
                        اختر الصف
                      </option>

                      {availableGrades.map(
                        grade => (
                          <option
                            key={
                              grade.id
                            }
                            value={
                              grade.id
                            }
                          >
                            {grade.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>
              )}

              {/* =================================================
                  SUBJECT
                 ================================================= */}

              {addType ===
                'lesson' &&
                formGradeId && (
                <div
                  style={
                    stepContainer
                  }
                >
                  <div
                    style={
                      stepNumber
                    }
                  >
                    3
                  </div>

                  <div
                    style={
                      stepContent
                    }
                  >
                    <label
                      style={
                        label
                      }
                    >
                      المادة
                    </label>

                    <select
                      value={
                        formSubjectId
                      }
                      onChange={event =>
                        handleSubjectChange(
                          event.target.value
                        )
                      }
                      style={
                        selectInput
                      }
                    >
                      <option value="">
                        اختر المادة
                      </option>

                      {availableSubjects.map(
                        subject => (
                          <option
                            key={
                              subject.id
                            }
                            value={
                              subject.id
                            }
                          >
                            {subject.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>
              )}

              {/* =================================================
                  WEEK
                 ================================================= */}

              <div
                style={
                  stepContainer
                }
              >
                <div
                  style={
                    stepNumber
                  }
                >
                  {addType ===
                  'lesson'
                    ? 4
                    : 1}
                </div>

                <div
                  style={
                    stepContent
                  }
                >
                  <label
                    style={
                      label
                    }
                  >
                    الأسبوع
                  </label>

                  <select
                    value={
                      newPlan.weekNumber
                    }
                    onChange={event =>
                      handleWeekChange(
                        event.target.value
                      )
                    }
                    style={
                      selectInput
                    }
                  >
                    {weeks.map(
                      week => (
                        <option
                          key={
                            week
                          }
                          value={
                            week
                          }
                        >
                          الأسبوع{' '}
                          {week}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {/* =================================================
                  DATES
                 ================================================= */}

              <div
                style={
                  stepContainer
                }
              >
                <div
                  style={
                    stepNumber
                  }
                >
                  {addType ===
                  'lesson'
                    ? 5
                    : 2}
                </div>

                <div
                  style={
                    stepContent
                  }
                >
                  <label
                    style={
                      label
                    }
                  >
                    التاريخ
                  </label>

                  <div
                    style={
                      dateGrid
                    }
                  >

                    <div>
                      <span
                        style={
                          dateLabel
                        }
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
                            event
                              .target
                              .value
                          )
                        }
                        style={
                          selectInput
                        }
                      />

                      {newPlan.startDate && (
                        <div
                          style={
                            hijriDate
                          }
                        >
                          {getHijriDate(
                            newPlan.startDate
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <span
                        style={
                          dateLabel
                        }
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
                            event
                              .target
                              .value
                          )
                        }
                        style={
                          selectInput
                        }
                      />

                      {newPlan.endDate && (
                        <div
                          style={
                            hijriDate
                          }
                        >
                          {getHijriDate(
                            newPlan.endDate
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>

              {/* =================================================
                  LESSON
                 ================================================= */}

              {addType ===
                'lesson' &&
                formSubjectId && (
                <div
                  style={
                    stepContainer
                  }
                >
                  <div
                    style={
                      stepNumber
                    }
                  >
                    6
                  </div>

                  <div
                    style={
                      stepContent
                    }
                  >
                    <label
                      style={
                        label
                      }
                    >
                      موضوع الدرس
                    </label>

                    <select
                      value={
                        newPlan.planId ||
                        ''
                      }
                      onChange={
                        event =>
                          handleLessonChange(
                            event.target.value
                          )
                      }
                      style={
                        selectInput
                      }
                    >
                      <option value="">
                        اختر موضوع الدرس
                      </option>

                      {availableLessons.map(
                        lesson => (
                          <option
                            key={
                              lesson.id
                            }
                            value={
                              lesson.id
                            }
                          >
                            {
                              lesson.lesson_topic
                            }
                          </option>
                        )
                      )}
                    </select>

                    {!availableLessons.length && (
                      <div
                        style={
                          warningText
                        }
                      >
                        لا توجد مواضيع دروس لهذه المادة.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* =================================================
                  LEAVE
                 ================================================= */}

              {addType ===
                'leave' && (
                <div
                  style={
                    stepContainer
                  }
                >
                  <div
                    style={
                      stepNumber
                    }
                  >
                    3
                  </div>

                  <div
                    style={
                      stepContent
                    }
                  >
                    <label
                      style={
                        label
                      }
                    >
                      اسم / وصف الإجازة
                    </label>

                    <input
                      type="text"
                      value={
                        newPlan.lessonTopic ||
                        ''
                      }
                      onChange={
                        event =>
                          handleLeaveChange(
                            event.target
                              .value
                          )
                      }
                      placeholder="مثال: إجازة اليوم الوطني"
                      style={
                        selectInput
                      }
                    />
                  </div>
                </div>
              )}

              {/* =================================================
                  ACTIONS
                 ================================================= */}

              <div
                style={
                  formActions
                }
              >
                <button
                  onClick={
                    addPlan
                  }
                  style={
                    saveButton
                  }
                >
                  <Plus size={17} />

                  {addType ===
                  'lesson'
                    ? 'إضافة الدرس'
                    : 'إضافة الإجازة'}
                </button>

                <button
                  onClick={
                    closeAddForm
                  }
                  style={
                    cancelButton
                  }
                >
                  إلغاء
                </button>
              </div>

            </div>
          )}

          {/* =================================================
              Plans
             ================================================= */}

          <div
            style={
              plansContainer
            }
          >

            <div
              style={
                plansHeader
              }
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                  }}
                >
                  الدروس والإجازات
                </h3>

                <span
                  style={
                    plansCount
                  }
                >
                  {plans.length}{' '}
                  سجل
                </span>
              </div>

              <div
                style={
                  headerActions
                }
              >

                {!showAddForm && (
                  <>
                    <button
                      onClick={() =>
                        openAddForm(
                          'lesson'
                        )
                      }
                      style={
                        primaryButton
                      }
                    >
                      <BookOpen
                        size={17}
                      />

                      إضافة درس
                    </button>

                    <button
                      onClick={() =>
                        openAddForm(
                          'leave'
                        )
                      }
                      style={
                        leaveButton
                      }
                    >
                      <Plane
                        size={17}
                      />

                      إضافة إجازة
                    </button>
                  </>
                )}

              </div>
            </div>

            {/* =================================================
                Empty
               ================================================= */}

            {!plans.length ? (
              <div
                style={
                  emptyState
                }
              >
                <CalendarDays
                  size={36}
                  style={{
                    marginBottom: 10,
                    opacity: 0.5,
                  }}
                />

                <div>
                  لا توجد دروس أو إجازات
                  مؤرشفة حتى الآن.
                </div>

                <div>
                  استخدم الأزرار أعلاه
                  لإضافة السجلات.
                </div>
              </div>
            ) : (

              /* =================================================
                  Table
                 ================================================= */

              <div
                style={
                  tableContainer
                }
              >
                <table
                  style={
                    table
                  }
                >

                  <thead>
                    <tr>

                      <th
                        style={
                          th
                        }
                      >
                        #
                      </th>

                      <th
                        style={
                          th
                        }
                      >
                        النوع
                      </th>

                      <th
                        style={
                          th
                        }
                      >
                        المرحلة
                      </th>

                      <th
                        style={
                          th
                        }
                      >
                        الصف
                      </th>

                      <th
                        style={
                          th
                        }
                      >
                        المادة
                      </th>

                      <th
                        style={
                          th
                        }
                      >
                        الدرس / الإجازة
                      </th>

                      <th
                        style={
                          th
                        }
                      >
                        الأسبوع
                      </th>

                      <th
                        style={
                          th
                        }
                      >
                        من
                      </th>

                      <th
                        style={
                          th
                        }
                      >
                        إلى
                      </th>

                      <th
                        style={
                          th
                        }
                      >
                        الإجراءات
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    {plans.map(
                      (
                        plan,
                        index
                      ) => {

                        const lesson =
                          plan.type ===
                          'lesson'
                            ? getLesson(
                                plan.planId
                              )
                            : undefined

                        const info =
                          getLessonInfo(
                            lesson
                          )

                        return (
                          <tr
                            key={
                              plan.id ??
                              `new-${index}`
                            }
                          >

                            <td
                              style={
                                td
                              }
                            >
                              {index +
                                1}
                            </td>

                            {/* TYPE */}

                            <td
                              style={
                                td
                              }
                            >
                              <span
                                style={
                                  plan.type ===
                                  'lesson'
                                    ? lessonBadge
                                    : leaveBadge
                                }
                              >
                                {plan.type ===
                                'lesson'
                                  ? 'درس'
                                  : 'إجازة'}
                              </span>
                            </td>

                            {/* LEVEL */}

                            <td
                              style={
                                td
                              }
                            >
                              {plan.type ===
                              'lesson'
                                ? info.level
                                : '-'}
                            </td>

                            {/* GRADE */}

                            <td
                              style={
                                td
                              }
                            >
                              {plan.type ===
                              'lesson'
                                ? info.grade
                                : '-'}
                            </td>

                            {/* SUBJECT */}

                            <td
                              style={
                                td
                              }
                            >
                              {plan.type ===
                              'lesson'
                                ? info.subject
                                : '-'}
                            </td>

                            {/* TOPIC */}

                            <td
                              style={{
                                ...td,
                                fontWeight: 600,
                              }}
                            >
                              {plan.type ===
                              'lesson'
                                ? lesson?.lesson_topic ??
                                  '-'
                                : plan.lessonTopic ??
                                  '-'}
                            </td>

                            {/* WEEK */}

                            <td
                              style={
                                td
                              }
                            >
                              الأسبوع{' '}
                              {
                                plan.weekNumber
                              }
                            </td>

                            {/* FROM */}

                            <td
                              style={
                                td
                              }
                            >
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
                                  {
                                    getHijriDate(
                                      plan.startDate
                                    )
                                  }
                                </div>
                              )}
                            </td>

                            {/* TO */}

                            <td
                              style={
                                td
                              }
                            >
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
                                  {
                                    getHijriDate(
                                      plan.endDate
                                    )
                                  }
                                </div>
                              )}
                            </td>

                            {/* DELETE */}

                            <td
                              style={
                                td
                              }
                            >
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
              SAVE
             ================================================= */}

          <div
            style={
              bottomActions
            }
          >
            <button
              onClick={
                save
              }
              disabled={
                saving ||
                !plans.some(
                  plan =>
                    !plan.id
                )
              }
              style={{
                ...saveButton,
                opacity:
                  saving ||
                  !plans.some(
                    plan =>
                      !plan.id
                  )
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
  gap: 15,
}

const headerActions: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
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
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}

const tableContainer: React.CSSProperties = {
  width: '100%',
  overflowX: 'auto',
}

const table: React.CSSProperties = {
  width: '100%',
  minWidth: 1100,
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

const leaveButton: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '10px 16px',
  background: '#8B5CF6',
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

const lessonBadge: React.CSSProperties = {
  display: 'inline-block',
  padding: '4px 9px',
  borderRadius: 20,
  background: '#E0F2FE',
  color: '#0369A1',
  fontSize: 11,
  fontWeight: 700,
}

const leaveBadge: React.CSSProperties = {
  display: 'inline-block',
  padding: '4px 9px',
  borderRadius: 20,
  background: '#EDE9FE',
  color: '#6D28D9',
  fontSize: 11,
  fontWeight: 700,
}
