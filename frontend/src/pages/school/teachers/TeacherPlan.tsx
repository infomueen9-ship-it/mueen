import { useState, useEffect } from 'react'
import { FileText, BookOpen, X, Plus, Trash2, Save } from 'lucide-react'
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

interface PlanEntry {
  id?: number
  day: string
  period: string
  subject: string
  lesson: string
  homework: string
}

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
const PERIODS = ['1', '2', '3', '4', '5', '6', '7']

export default function TeacherPlan({ classroomId, classroomName, schemaName, teacherId }: Props) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [planEntries, setPlanEntries] = useState<PlanEntry[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchMySubjects = async () => {
      try {
        const res = await api.get<Subject[]>(`/api/school/${schemaName}/classrooms/${classroomId}/subjects`)
        // تصفية المواد المسندة لهذا المعلم فقط
        const mySubjects = res.data.filter(s => s.teacherId === teacherId)
        setSubjects(mySubjects)
      } catch {
        toast.error('تعذر تحميل المواد الدراسية')
      } finally {
        setLoading(false)
      }
    }
    fetchMySubjects()
  }, [schemaName, classroomId, teacherId])

  const handleOpenPlan = async (subject: Subject) => {
    setSelectedSubject(subject)
    try {
      // جلب الخطة الحالية للمادة من السيرفر
      const res = await api.get<PlanEntry[]>(`/api/school/${schemaName}/classrooms/${classroomId}/subjects/${subject.id}/plan`)
      setPlanEntries(res.data.length > 0 ? res.data : [{ day: 'الأحد', period: '1', subject: subject.name, lesson: '', homework: '' }])
    } catch {
      // في حال عدم وجود خطة سابقة، نبدأ بسطر فارغ
      setPlanEntries([{ day: 'الأحد', period: '1', subject: subject.name, lesson: '', homework: '' }])
    }
  }

  const handleAddRow = () => {
    setPlanEntries([...planEntries, { day: 'الأحد', period: '1', subject: selectedSubject?.name || '', lesson: '', homework: '' }])
  }

  const handleRemoveRow = (idx: number) => {
    setPlanEntries(planEntries.filter((_, i) => i !== idx))
  }

  const handleFieldChange = (idx: number, field: keyof PlanEntry, value: string) => {
    const updated = [...planEntries]
    updated[idx] = { ...updated[idx], [field]: value }
    setPlanEntries(updated)
  }

  const handleSavePlan = async () => {
    if (!selectedSubject) return
    setSaving(true)
    try {
      await api.post(`/api/school/${schemaName}/classrooms/${classroomId}/subjects/${selectedSubject.id}/plan`, planEntries)
      toast.success('تم حفظ الخطة بنجاح')
      setSelectedSubject(null)
    } catch {
      toast.error('تعذر حفظ الخطة')
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
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {subjects.map(subject => (
            <div key={subject.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={20} color="#7C3AED" />
                </div>
                <span style={{ fontWeight: 700, color: '#374151' }}>{subject.name}</span>
              </div>
              <button onClick={() => handleOpenPlan(subject)} style={{ backgroundColor: '#7C3AED', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={14} /> إدارة الخطة
              </button>
            </div>
          ))}
          {subjects.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
              لا توجد مواد دراسية مسندة إليك في هذا الفصل.
            </div>
          )}
        </div>
      )}

      {/* Modal إدارة الخطة */}
      {selectedSubject && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(3px)',
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', padding: '32px',
            width: '95%', maxWidth: '1000px', direction: 'rtl',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#374151', fontSize: '18px', fontWeight: 700 }}>
                إدارة خطة مادة: {selectedSubject.name}
              </h2>
              <button onClick={() => setSelectedSubject(null)} style={{ border: 'none', background: '#F3F4F6', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} color="#6B7280" />
              </button>
            </div>

            <div style={{ background: '#F4F8FB', padding: '12px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #E5E7EB', color: '#2D7D82', fontWeight: 600, fontSize: '14px', textAlign: 'center' }}>
              الخطة الدراسية — {classroomName}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB' }}>
                    <th style={thStyle}>اليوم</th>
                    <th style={thStyle}>الحصة</th>
                    <th style={thStyle}>المادة</th>
                    <th style={thStyle}>الدرس المقرر</th>
                    <th style={thStyle}>الواجب</th>
                    <th style={thStyle}>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {planEntries.map((entry, idx) => (
                    <tr key={idx}>
                      <td style={tdStyle}>
                        <select value={entry.day} onChange={(e) => handleFieldChange(idx, 'day', e.target.value)} style={selectStyle}>
                          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </td>
                      <td style={tdStyle}>
                        <select value={entry.period} onChange={(e) => handleFieldChange(idx, 'period', e.target.value)} style={selectStyle}>
                          {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                      <td style={tdStyle}>
                        <input value={entry.subject} onChange={(e) => handleFieldChange(idx, 'subject', e.target.value)} style={inputStyle} />
                      </td>
                      <td style={tdStyle}>
                        <input value={entry.lesson} onChange={(e) => handleFieldChange(idx, 'lesson', e.target.value)} placeholder="عنوان الدرس" style={inputStyle} />
                      </td>
                      <td style={tdStyle}>
                        <input value={entry.homework} onChange={(e) => handleFieldChange(idx, 'homework', e.target.value)} placeholder="الواجب المطلوب" style={inputStyle} />
                      </td>
                      <td style={tdStyle}>
                        <button onClick={() => handleRemoveRow(idx)} disabled={planEntries.length === 1} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444' }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={handleAddRow} style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#F3F4F6', border: '1px dashed #D1D5DB', borderRadius: '8px', color: '#6B7280', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={14} /> إضافة سطر للخطة
            </button>

            <div style={{ display: 'flex', gap: '10px', marginTop: '30px', justifyContent: 'flex-end' }}>
              <button onClick={handleSavePlan} disabled={saving} style={{ padding: '10px 24px', backgroundColor: '#9EC5C7', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Save size={18} />
                {saving ? 'جارٍ الحفظ...' : 'حفظ الخطة'}
              </button>
              <button onClick={() => setSelectedSubject(null)} style={{ padding: '10px 24px', backgroundColor: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                إلغاء
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

const selectStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #E5E7EB',
  borderRadius: '6px', padding: '8px',
  fontSize: '13px', outline: 'none',
  backgroundColor: '#fff', cursor: 'pointer'
}