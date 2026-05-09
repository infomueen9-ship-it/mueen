import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'

interface Props {
  classroomId: number
  classroomName: string
  schemaName: string
  onClose: () => void
  readOnly?: boolean
}

interface Subject {
  id: number
  name: string
}

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
const PERIODS = ['الحصة 1', 'الحصة 2', 'الحصة 3', 'الحصة 4', 'الحصة 5', 'الحصة 6', 'الحصة 7']

type Schedule = Record<string, string>

export default function ClassroomSchedule({ classroomId, classroomName, schemaName, onClose, readOnly = false }: Props) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [schedule, setSchedule] = useState<Schedule>({})
  const [newSubject, setNewSubject] = useState('')
  const [confirmSubject, setConfirmSubject] = useState<Subject | null>(null)

  const getKey = (period: string, day: string) => `${period}__${day}`

  // تحميل المواد
  useEffect(() => {
    const load = async () => {
      try {
        const [subjectsRes, scheduleRes] = await Promise.all([
          api.get(`/api/school/${schemaName}/classrooms/${classroomId}/subjects`),
          api.get(`/api/school/${schemaName}/classrooms/${classroomId}/schedule`),
        ])
        setSubjects(subjectsRes.data)
        const scheduleMap: Schedule = {}
        
        scheduleRes.data.forEach((row: { period: string; day: string; subject_name: string }) => {
          scheduleMap[getKey(row.period, row.day)] = row.subject_name || ''
        })
        setSchedule(scheduleMap)
      } catch {
        toast.error('تعذر تحميل البيانات')
      }
    }
    load()
  }, [schemaName, classroomId])

  // إضافة مادة
  const handleAddSubject = async () => {
    if (!newSubject.trim()) return
    try {
      await api.post(`/api/school/${schemaName}/classrooms/${classroomId}/subjects`, { name: newSubject.trim() })
      const res = await api.get(`/api/school/${schemaName}/classrooms/${classroomId}/subjects`)
      setSubjects(res.data)
      setNewSubject('')
      toast.success('تم إضافة المادة')
    } catch {
      toast.error('تعذر إضافة المادة')
    }
  }

  // حذف مادة
  const handleDeleteSubject = async (subject: Subject) => {
    try {
      await api.delete(`/api/school/${schemaName}/classrooms/${classroomId}/subjects/${subject.id}`)
      setSubjects(subjects.filter(s => s.id !== subject.id))
      toast.success('تم حذف المادة')
    } catch {
      toast.error('تعذر حذف المادة')
    }
  }

  // حفظ الجدول
  const handleSaveSchedule = async () => {
    try {
      const payload = Object.entries(schedule)
        .filter(([, subj]) => subj)
        .map(([key, subj]) => {
          const [period, day] = key.split('__')
          return { period, day, subject_name: subj }
        })
      await api.post(`/api/school/${schemaName}/classrooms/${classroomId}/schedule`, payload)
      toast.success('تم حفظ الجدول')
    } catch {
      toast.error('تعذر حفظ الجدول')
    }
  }

  return (
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

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#374151', fontSize: '18px', fontWeight: 700 }}>
            جدول {classroomName}
          </h2>
          <button onClick={onClose} style={{
            border: 'none', background: '#F3F4F6', borderRadius: '50%',
            width: '36px', height: '36px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={18} color="#6B7280" />
          </button>
        </div>

        {/* Blue Header */}
        <div style={{
          background: '#9EC5C7', color: '#fff', padding: '14px',
          borderRadius: '12px', textAlign: 'center', fontWeight: 600,
          fontSize: '16px', marginBottom: '20px',
        }}>
          الجدول الدراسي — {classroomName}
        </div>

        {/* إضافة مادة */}
        {!readOnly && (
          <div style={{
            background: '#F9FAFB', border: '1px solid #E5E7EB',
            borderRadius: '12px', padding: '16px', marginBottom: '20px',
          }}>
            <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
              المواد الدراسية للفصل
            </p>

            {/* Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
              {subjects.map((subj) => (
                <span key={subj.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  backgroundColor: '#E8F4F5', color: '#2D7D82',
                  borderRadius: '20px', padding: '4px 12px',
                  fontSize: '12px', fontWeight: 600,
                }}>
                  {subj.name}
                  <button onClick={() => setConfirmSubject(subj)} style={{
                    border: 'none', background: 'none', cursor: 'pointer',
                    color: '#9CA3AF', fontSize: '14px', padding: 0, lineHeight: 1,
                  }}>×</button>
                </span>
              ))}
              {subjects.length === 0 && (
                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>لا توجد مواد بعد</span>
              )}
            </div>

            {/* إضافة مادة جديدة */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
                placeholder="اسم المادة"
                style={{
                  flex: 1, height: '38px', border: '1px solid #E5E7EB',
                  borderRadius: '8px', padding: '0 12px', fontSize: '13px',
                  textAlign: 'right', outline: 'none',
                }}
              />
              <button onClick={handleAddSubject} style={{
                padding: '0 20px', height: '38px', backgroundColor: '#9EC5C7',
                color: '#fff', border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontWeight: 600, fontSize: '13px',
              }}>
                إضافة
              </button>
            </div>
          </div>
        )}

        {/* جدول الحصص */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl', minWidth: '700px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                <th style={thStyle}>الحصة / اليوم</th>
                {DAYS.map(day => <th key={day} style={thStyle}>{day}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map((period) => (
                <tr key={period}>
                  <td style={{ ...tdStyle, backgroundColor: '#F9FAFB', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                    {period}
                  </td>
                  {DAYS.map(day => {
                    const key = getKey(period, day)
                    const subjectName = schedule[key] || ''
                    return (
                      <td key={day} style={tdStyle}>
                        {readOnly ? (
                          <span style={{ fontSize: '13px', fontWeight: 600, color: subjectName ? '#2D7D82' : '#9CA3AF' }}>
                            {subjectName || '—'}
                          </span>
                        ) : (
                          <select
                            value={subjectName}
                            onChange={(e) => setSchedule(prev => ({ ...prev, [key]: e.target.value }))}
                            style={{
                              width: '100%', border: '1px solid #E5E7EB',
                              borderRadius: '6px', padding: '6px 8px',
                              fontSize: '12px', outline: 'none',
                              color: '#374151', backgroundColor: '#fff', cursor: 'pointer',
                            }}
                          >
                            <option value="">اختر مادة</option>
                            {subjects.map((subj) => (
                              <option key={subj.id} value={subj.name}>{subj.name}</option>
                            ))}
                          </select>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'flex-end' }}>
          {!readOnly && (
            <button onClick={handleSaveSchedule} style={{
              padding: '10px 28px', backgroundColor: '#9EC5C7',
              color: '#fff', border: 'none', borderRadius: '10px',
              cursor: 'pointer', fontWeight: 600, fontSize: '14px',
            }}>
              حفظ الجدول
            </button>
          )}
          <button onClick={onClose} style={{
            padding: '10px 28px', backgroundColor: '#F3F4F6',
            color: '#6B7280', border: 'none', borderRadius: '10px',
            cursor: 'pointer', fontWeight: 600, fontSize: '14px',
          }}>
            إغلاق
          </button>
        </div>
      </div>

      {/* Modal تأكيد حذف المادة */}
      {confirmSubject && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', padding: '32px',
            width: '360px', textAlign: 'center', direction: 'rtl',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px', color: '#374151' }}>تأكيد الحذف</h3>
            <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '24px' }}>
              هل أنت متأكد من حذف مادة <strong>{confirmSubject.name}</strong>؟
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={async () => {
                await handleDeleteSubject(confirmSubject)
                setConfirmSubject(null)
              }} style={{
                flex: 1, padding: '10px', backgroundColor: '#EF4444',
                color: '#fff', border: 'none', borderRadius: '10px',
                cursor: 'pointer', fontWeight: 600,
              }}>
                نعم، احذف
              </button>
              <button onClick={() => setConfirmSubject(null)} style={{
                flex: 1, padding: '10px', backgroundColor: '#F3F4F6',
                color: '#6B7280', border: 'none', borderRadius: '10px',
                cursor: 'pointer', fontWeight: 600,
              }}>
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
  textAlign: 'center', minWidth: '120px',
}