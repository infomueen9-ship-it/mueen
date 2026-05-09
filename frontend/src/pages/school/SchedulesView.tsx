import { useEffect, useState } from 'react'
import { Trash2, Table, Printer, Users, Lock } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import ClassroomSchedule from './ClassroomSchedule'
import StudentsView from './StudentsView'

interface Classroom {
  id: number
  name: string
}

export default function SchedulesView({ schemaName }: { schemaName: string }) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null)
  const [selectedStudentClassroom, setSelectedStudentClassroom] = useState<Classroom | null>(null)

  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const res = await api.get(`/api/school/${schemaName}/classrooms`)
        setClassrooms(res.data)
      } catch {
        toast.error('تعذر تحميل الفصول')
      } finally {
        setLoading(false)
      }
    }
    fetchClassrooms()
  }, [schemaName])

  const handleAdd = async () => {
    if (!newName.trim()) return

    // التحقق من وجود الاسم في القائمة المحلية قبل الإرسال
    if (classrooms.some(c => c.name.trim() === newName.trim())) {
      toast.error('عذراً، هذا الفصل موجود مسبقاً')
      return
    }

    try {
      await api.post(`/api/school/${schemaName}/classrooms`, { name: newName.trim() })
      toast.success('تم إضافة الفصل')
      setNewName('')
      const res = await api.get(`/api/school/${schemaName}/classrooms`)
      setClassrooms(res.data)
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } }
      const msg = error.response?.data?.message || 'تعذر إضافة الفصل'
      toast.error(msg)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/school/${schemaName}/classrooms/${id}`)
      toast.success('تم حذف الفصل')
      setClassrooms(classrooms.filter(c => c.id !== id))
    } catch {
      toast.error('تعذر حذف الفصل')
    }
  }

  return (
    <div style={{ padding: '24px 48px' }}>

      {/* Blue Header */}
      <div style={{
        background: '#9EC5C7', color: '#fff', padding: '14px',
        borderRadius: '12px', textAlign: 'center', fontWeight: 600,
        fontSize: '16px', marginBottom: '20px',
      }}>
        الفصول الدراسية المتاحة
      </div>

      {/* Add Classroom */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', direction: 'rtl' }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="اسم الفصل الدراسي"
          style={{
            flex: 1, height: '40px', borderRadius: '8px',
            border: '1px solid #E5E7EB', padding: '0 12px',
            textAlign: 'right', fontSize: '14px', outline: 'none',
          }}
        />
        <button
          onClick={handleAdd}
          style={{
            padding: '0 20px', height: '40px', backgroundColor: '#9EC5C7',
            color: '#fff', border: 'none', borderRadius: '8px',
            cursor: 'pointer', fontWeight: 600, fontSize: '14px',
          }}
        >
          حفظ
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#9CA3AF' }}>جارٍ التحميل...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl' }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB' }}>
              <th style={thStyle}>اسم الفصل الدراسي</th>
              <th style={thStyle}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {classrooms.map((cls) => (
              <tr key={cls.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                <td style={tdStyle}>{cls.name}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <ActionBtn 
  icon={<Table size={13} />} 
  label="عرض الجدول" 
  onClick={() => setSelectedClassroom(cls)} 
/>
<ActionBtn 
  icon={<Trash2 size={13} color="#EF4444" />} 
  label="حذف الفصل" 
  color="#EF4444" 
  onClick={() => setConfirmId(cls.id)} 
/>                    <ActionBtn icon={<Printer size={13} />} label="طباعة الخطة" />
                    <ActionBtn 
  icon={<Users size={13} />} 
  label="الطلاب" 
  onClick={() => setSelectedStudentClassroom(cls)} 
/>
                    <ActionBtn icon={<Lock size={13} />} label="الخطط المؤرشفة" dot />
                  </div>
                </td>
              </tr>
            ))}
            {classrooms.length === 0 && (
              <tr>
                <td colSpan={2} style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF' }}>
                  لا توجد فصول بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
{selectedStudentClassroom && (
  <div style={{
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    padding: '20px', backdropFilter: 'blur(3px)'
  }}>
    <div style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px' }}>
      <StudentsView
        classroomId={selectedStudentClassroom.id}
        classroomName={selectedStudentClassroom.name}
        schemaName={schemaName}
        onClose={() => setSelectedStudentClassroom(null)}
      />
    </div>
  </div>
)}
{selectedClassroom && (
  <ClassroomSchedule
    classroomId={selectedClassroom.id}
    classroomName={selectedClassroom.name}
    schemaName={schemaName}
    onClose={() => setSelectedClassroom(null)}
  />
)}

      {confirmId !== null && (
  <div style={{
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  }}>
    <div style={{
      backgroundColor: '#fff', borderRadius: '16px', padding: '32px',
      width: '360px', textAlign: 'center', direction: 'rtl',
    }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗑️</div>
      <h3 style={{ margin: '0 0 8px', color: '#374151' }}>تأكيد الحذف</h3>
      <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '24px' }}>
        هل أنت متأكد من حذف هذا الفصل؟ لا يمكن التراجع عن هذا الإجراء.
      </p>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button
          onClick={() => { handleDelete(confirmId); setConfirmId(null) }}
          style={{
            flex: 1, padding: '10px', backgroundColor: '#EF4444',
            color: '#fff', border: 'none', borderRadius: '10px',
            cursor: 'pointer', fontWeight: 600,
          }}
        >
          نعم، احذف
        </button>
        <button
          onClick={() => setConfirmId(null)}
          style={{
            flex: 1, padding: '10px', backgroundColor: '#F3F4F6',
            color: '#6B7280', border: 'none', borderRadius: '10px',
            cursor: 'pointer', fontWeight: 600,
          }}
        >
          إلغاء
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  )
}

function ActionBtn({ icon, label, color, onClick, dot }: {
  icon: React.ReactNode
  label: string
  color?: string
  onClick?: () => void
  dot?: boolean
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '5px',
      padding: '6px 10px', border: '1px solid #E5E7EB',
      borderRadius: '8px', background: '#F9FAFB',
      cursor: 'pointer', fontSize: '12px',
      color: color || '#374151',
    }}>
      {icon}
      <span>{label}</span>
      {dot && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#B0D8DA' }} />}
    </button>
  )
}

const thStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB', padding: '12px 16px',
  textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '13px',
}

const tdStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB', padding: '12px 16px', textAlign: 'center',
}