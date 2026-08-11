import { useEffect, useState } from 'react'
import { ArrowRight, Plus, Save, Trash2 } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'

type Subject = { id: number; name: string }
type Plan = { id?: number; subjectId: string; lesson: string; homework: string }

const weeks = Array.from({ length: 20 }, (_, index) => index + 1)

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

export default function ArchivedPlansView({ schemaName, classroomId, classroomName, onBack }: {
  schemaName: string; classroomId: number; classroomName: string; onBack: () => void
}) {
  const [week, setWeek] = useState(1)
  const [dates, setDates] = useState(weekDates(1))
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      api.get<Subject[]>(`/api/school/${schemaName}/classrooms/${classroomId}/subjects`),
      api.get(`/api/school/${schemaName}/classrooms/${classroomId}/archived-plans`, { params: { week } }),
    ]).then(([subjectsResponse, plansResponse]) => {
      if (cancelled) return
      setSubjects(subjectsResponse.data)
      const data = plansResponse.data
      setDates({
        startDate: data.startDate || weekDates(week).startDate,
        endDate: data.endDate || weekDates(week).endDate,
      })
      setPlans(data.plans?.map((plan: any) => ({
        id: plan.id,
        subjectId: String(plan.subjectId),
        lesson: plan.lesson || '',
        homework: plan.homework || '',
      })) || [])
    }).catch(() => !cancelled && toast.error('تعذر تحميل الخطة المؤرشفة'))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [schemaName, classroomId, week])

  const changeWeek = (value: number) => {
    setWeek(value)
    setDates(weekDates(value))
  }

  const updatePlan = (index: number, field: keyof Plan, value: string) => {
    setPlans(plans.map((plan, current) => current === index ? { ...plan, [field]: value } : plan))
  }

  const save = async () => {
    if (plans.some(plan => !plan.subjectId || !plan.lesson.trim())) {
      toast.error('اختر المادة وأدخل موضوع الدرس لكل صف')
      return
    }
    setSaving(true)
    try {
      await api.post(`/api/school/${schemaName}/classrooms/${classroomId}/archived-plans`, {
        weekNumber: week,
        ...dates,
        plans: plans.map(plan => ({ ...plan, subjectId: Number(plan.subjectId) })),
      })
      toast.success('تم حفظ الخطة المؤرشفة')
    } catch {
      toast.error('تعذر حفظ الخطة')
    } finally { setSaving(false) }
  }

  return <div style={{ direction: 'rtl' }}>
    <button onClick={onBack} style={backButton}><ArrowRight size={17} /> العودة إلى إدارة الجداول</button>
    <div style={header}>الخطط المؤرشفة — {classroomName}</div>
    <div style={filters}>
      <label>الأسبوع
        <select value={week} onChange={event => changeWeek(Number(event.target.value))} style={input}>
          {weeks.map(value => <option key={value} value={value}>الأسبوع {value}</option>)}
        </select>
      </label>
      <label>من التاريخ<input type="date" value={dates.startDate} onChange={event => setDates({ ...dates, startDate: event.target.value })} style={input} /></label>
      <label>إلى التاريخ<input type="date" value={dates.endDate} onChange={event => setDates({ ...dates, endDate: event.target.value })} style={input} /></label>
    </div>
    {loading ? <p style={{ textAlign: 'center' }}>جارٍ التحميل...</p> : <div style={{ overflowX: 'auto' }}>
      <table style={table}><thead><tr>
        <th style={th}>الصف</th><th style={th}>المادة</th><th style={th}>موضوع الدرس</th><th style={th}>الواجبات</th><th style={th}>الأسبوع</th><th style={th}>من</th><th style={th}>إلى</th><th style={th}>إجراء</th>
      </tr></thead><tbody>
        {plans.map((plan, index) => <tr key={index}>
          <td style={td}>{classroomName}</td>
          <td style={td}><select value={plan.subjectId} onChange={event => updatePlan(index, 'subjectId', event.target.value)} style={input}><option value="">اختر المادة</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></td>
          <td style={td}><input value={plan.lesson} onChange={event => updatePlan(index, 'lesson', event.target.value)} style={input} /></td>
          <td style={td}><input value={plan.homework} onChange={event => updatePlan(index, 'homework', event.target.value)} style={input} /></td>
          <td style={td}>الأسبوع {week}</td><td style={td}>{dates.startDate}</td><td style={td}>{dates.endDate}</td>
          <td style={td}><button onClick={() => setPlans(plans.filter((_, current) => current !== index))} style={iconButton}><Trash2 size={16} /></button></td>
        </tr>)}
        {!plans.length && <tr><td colSpan={8} style={{ ...td, color: '#9CA3AF' }}>لا توجد خطة لهذا الأسبوع. أضف صفًا لبدء الخطة.</td></tr>}
      </tbody></table>
    </div>}
    <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
      <button onClick={() => setPlans([...plans, { subjectId: '', lesson: '', homework: '' }])} style={secondaryButton}><Plus size={16} /> إضافة درس</button>
      <button onClick={save} disabled={saving} style={saveButton}><Save size={16} /> {saving ? 'جارٍ الحفظ...' : 'حفظ الخطة'}</button>
    </div>
  </div>
}

const header: React.CSSProperties = { background: '#9EC5C7', color: '#fff', padding: 16, borderRadius: 12, textAlign: 'center', fontWeight: 700, marginBottom: 18 }
const filters: React.CSSProperties = { display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 18 }
const input: React.CSSProperties = { display: 'block', marginTop: 6, minWidth: 150, padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 7, boxSizing: 'border-box', background: '#fff' }
const table: React.CSSProperties = { width: '100%', minWidth: 900, borderCollapse: 'collapse' }
const th: React.CSSProperties = { border: '1px solid #E5E7EB', padding: 10, background: '#F9FAFB', color: '#4B5563' }
const td: React.CSSProperties = { border: '1px solid #E5E7EB', padding: 8, textAlign: 'center' }
const backButton: React.CSSProperties = { border: 'none', background: 'none', cursor: 'pointer', color: '#2D7D82', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }
const secondaryButton: React.CSSProperties = { border: '1px solid #D1D5DB', background: '#fff', padding: '9px 14px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }
const saveButton: React.CSSProperties = { border: 'none', background: '#2D7D82', color: '#fff', padding: '9px 14px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }
const iconButton: React.CSSProperties = { border: 'none', background: 'none', color: '#DC2626', cursor: 'pointer' }
