import { useState, useEffect } from 'react'
import { Trash2, Link, Eye, EyeOff, Plus, Pencil, X } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'

interface Classroom {
  id: number
  name: string
}

interface Subject {
  id: number
  name: string
  teacherId: number | null
}

interface Teacher {
  id: number
  fullName: string
  username: string
  password?: string
  phone: string
}

interface TeacherForm {
  fullName: string
  username: string
  password: string
  phone: string
}

export default function TeachersPage({ schemaName }: { schemaName: string }) {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<Teacher | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<TeacherForm>({
    fullName: '', username: '', password: '', phone: ''
  })
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null)
const [editForm, setEditForm] = useState({ fullName: '', username: '', phone: '', password: '' })
const [addTeacherSubjects, setAddTeacherSubjects] = useState<Teacher | null>(null)

const [classrooms, setClassrooms] = useState<Classroom[]>([])
const [selectedClassId, setSelectedClassId] = useState<string>('')
const [subjects, setSubjects] = useState<Subject[]>([])
const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([])

const [viewTeacherAssignments, setViewTeacherAssignments] = useState<Teacher | null>(null)
const [teacherAssignments, setTeacherAssignments] = useState<{ classroomName: string, subjectName: string }[]>([])
const [loadingAssignments, setLoadingAssignments] = useState(false)

useEffect(() => {
  if (addTeacherSubjects) {
    api.get(`/api/school/${schemaName}/classrooms`)
      .then(res => setClassrooms(res.data))
      .catch(() => toast.error('تعذر تحميل الفصول'))
  }
}, [addTeacherSubjects, schemaName])

useEffect(() => {
  if (selectedClassId && addTeacherSubjects) {
    api.get(`/api/school/${schemaName}/classrooms/${selectedClassId}/subjects`)
      .then(res => {
        setSubjects(res.data)
        // تحديد المواد التي يدرسها هذا المعلم مسبقاً في هذا الفصل
        const alreadyAssigned = res.data
          .filter((s: Subject) => s.teacherId && Number(s.teacherId) === Number(addTeacherSubjects.id))
          .map((s: Subject) => s.id)
        setSelectedSubjectIds(alreadyAssigned)
      })
      .catch(() => toast.error('تعذر تحميل المواد'))
  } 
}, [selectedClassId, addTeacherSubjects, schemaName])

const toggleSubject = (id: number) => {
  setSelectedSubjectIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
}

useEffect(() => {
  let ignore = false; // Flag to prevent state updates on unmounted component or cancelled effect

  const fetchAssignments = async () => {
    if (viewTeacherAssignments) {
      // setLoadingAssignments(true) is now set on click, so we don't need it here
    api.get(`/api/school/${schemaName}/teachers/${viewTeacherAssignments.id}/assignments`)
        .then(res => {
          if (!ignore) {
            setTeacherAssignments(res.data)
          }
        })
        .catch(() => {
          if (!ignore) {
            toast.error('تعذر تحميل بيانات الصفوف')
            setTeacherAssignments([])
          }
        })
      .finally(() => setLoadingAssignments(false))
    } else {
      // If viewTeacherAssignments becomes null (modal closed), reset loading and assignments
      if (!ignore) {
        setTeacherAssignments([])
        setLoadingAssignments(false)
      }
    }
  };

  fetchAssignments();

  return () => {
    ignore = true; // Cleanup function to prevent state updates after component unmounts or effect re-runs
  };
}, [viewTeacherAssignments, schemaName]);

const fetchTeachers = () => {
  api.get(`/api/school/${schemaName}/teachers`)
    .then(res => {
      setTeachers(res.data);
      setLoading(false);
    })
    .catch(() => {
      toast.error('تعذر تحميل المعلمين');
      setLoading(false);
    })
};

useEffect(() => {
  fetchTeachers();
}, [schemaName]);


  const handleSave = async () => {
    if (!form.fullName.trim() || !form.username.trim() || !form.password.trim()) {
      toast.error('يرجى ملء جميع الحقول المطلوبة')
      return
    }
    if (form.phone && !form.phone.startsWith('05')) {
      toast.error('رقم الجوال يجب أن يبدأ بـ 05')
      return
    }
    setSaving(true)
    try {
      await api.post(`/api/school/${schemaName}/teachers`, form)
      toast.success('تم إضافة المعلم')
      setForm({ fullName: '', username: '', password: '', phone: '' })
      fetchTeachers()
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || 'تعذر إضافة المعلم')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (teacher: Teacher) => {
    try {
      await api.delete(`/api/school/${schemaName}/teachers/${teacher.id}`)
      setTeachers(teachers.filter(t => t.id !== teacher.id))
      toast.success('تم حذف المعلم')
      setConfirmDelete(null)
    } catch {
      toast.error('تعذر حذف المعلم')
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
        قائمة المعلمين
      </div>

      {/* Add Form — نفس السطر */}
      <div style={{
        background: '#F9FAFB', border: '1px solid #E5E7EB',
        borderRadius: '12px', padding: '16px', marginBottom: '20px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr 1fr 1fr auto',
          gap: '10px', alignItems: 'flex-end',
        }}>

          <div>
            <label style={labelStyle}>اسم المعلم *</label>
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="الاسم الكامل"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>اسم المستخدم *</label>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="teacher.name"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>كلمة المرور *</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                style={{ ...inputStyle, paddingLeft: '36px' }}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', left: '8px', top: '50%',
                  transform: 'translateY(-50%)', border: 'none',
                  background: 'none', cursor: 'pointer', color: '#9CA3AF',
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>رقم الجوال</label>
            <input
              value={form.phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                setForm({ ...form, phone: val })
              }}
              placeholder="05xxxxxxxx"
              style={inputStyle}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              height: '38px', padding: '0 16px', backgroundColor: '#9EC5C7',
              color: '#fff', border: 'none', borderRadius: '8px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: '13px', opacity: saving ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
            }}
          >
            <Plus size={14} />
            إضافة
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '32px' }}>جارٍ التحميل...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl' }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB' }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>اسم المعلم</th>
              <th style={thStyle}>اسم المستخدم</th>
              <th style={thStyle}>رقم الجوال</th>
              <th style={thStyle}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher, idx) => (
              <tr key={teacher.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                <td style={tdStyle}>{idx + 1}</td>
                <td style={tdStyle}>{teacher.fullName}</td>
                <td style={tdStyle}>{teacher.username}</td>
                <td style={tdStyle}>{teacher.phone || '—'}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
 <ActionBtn
                      icon={<Trash2 size={13} color="#EF4444" />}
                      label="حذف"
                      color="#EF4444"
                      bg="#FEF2F2"
                      border="#FEE2E2"
                      onClick={() => setConfirmDelete(teacher)}
                    />

                    <ActionBtn
                      icon={<Link size={13} />}
                      label="ربط صف + مواد"
                      color="#2D7D82"
                      bg="#E8F4F5"
                      onClick={() => {
    setAddTeacherSubjects(teacher)
    setSelectedClassId('')
    setSubjects([])
    setSelectedSubjectIds([])
  }}
                    />
                    <ActionBtn
                      icon={<Eye size={13} />}
                      label="عرض الصفوف"
                      onClick={() => {
                        setViewTeacherAssignments(teacher);
                        setLoadingAssignments(true); // Set loading state immediately on click
                      }}
                    />
                    <ActionBtn
  icon={<Pencil size={13} />}
  label="تعديل"
  color="#374151"
  onClick={() => {
    setEditTeacher(teacher)
    setEditForm({
      fullName: teacher.fullName,
      username: teacher.username,
      phone: teacher.phone,
      password: '',
    })
  }}
/>
                   
                  </div>
                </td>
              </tr>
            ))}
            {teachers.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF' }}>
                  لا يوجد معلمون بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* Modal تأكيد الحذف */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', padding: '32px',
            width: '360px', textAlign: 'center', direction: 'rtl',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px', color: '#374151' }}>تأكيد الحذف</h3>
            <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '24px' }}>
              هل أنت متأكد من حذف المعلم <strong>{confirmDelete.fullName}</strong>؟
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handleDelete(confirmDelete)} style={{
                flex: 1, padding: '10px', backgroundColor: '#EF4444',
                color: '#fff', border: 'none', borderRadius: '10px',
                cursor: 'pointer', fontWeight: 600,
              }}>نعم، احذف</button>
              <button onClick={() => setConfirmDelete(null)} style={{
                flex: 1, padding: '10px', backgroundColor: '#F3F4F6',
                color: '#6B7280', border: 'none', borderRadius: '10px',
                cursor: 'pointer', fontWeight: 600,
              }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
  {/* ربط المواد بالمعلم*/}

     {addTeacherSubjects && (
  <div style={{
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  }}>
    <div style={{
      backgroundColor: '#fff', borderRadius: '16px', padding: '32px',
      width: '95%', maxWidth: '560px', direction: 'rtl',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, color: '#374151', fontSize: '16px', fontWeight: 700 }}>إدارة الصلاحيات: {addTeacherSubjects.fullName}</h3>
        <button onClick={() => setAddTeacherSubjects(null)} style={{
          border: 'none', background: '#F3F4F6', borderRadius: '50%',
          width: '32px', height: '32px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={16} color="#6B7280" />
        </button>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        <div>
          <label style={labelStyle}>اختر الصف الدراسي</label>
          <select
            value={selectedClassId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedClassId(val);
              if (!val) {
                setSubjects([]);
                setSelectedSubjectIds([]);
              }
            }}
            style={inputStyle}
          >
            <option value="">-- اختر الصف --</option>
            {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {selectedClassId && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>المواد الدراسية</label>
              {subjects.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedSubjectIds.length === subjects.length) setSelectedSubjectIds([])
                    else setSelectedSubjectIds(subjects.map(s => s.id))
                  }}
                  style={{ background: 'none', border: 'none', color: '#2D7D82', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {selectedSubjectIds.length === subjects.length ? 'إلغاء الكل' : 'تحديد الكل'}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {subjects.map(s => (
                <label key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: selectedSubjectIds.includes(s.id) ? '#E8F4F5' : '#F9FAFB',
                  border: `1px solid ${selectedSubjectIds.includes(s.id) ? '#B0D8DA' : '#E5E7EB'}`,
                  borderRadius: '20px', padding: '6px 12px', cursor: 'pointer',
                  color: selectedSubjectIds.includes(s.id) ? '#2D7D82' : '#6B7280', fontSize: '12px', fontWeight: 600
                }}>
                  <input 
                    type="checkbox" 
                    checked={selectedSubjectIds.includes(s.id)}
                    onChange={() => toggleSubject(s.id)}
                    style={{ accentColor: '#9EC5C7' }}
                  />
                  {s.name}
                </label>
              ))}
              {subjects.length === 0 && <p style={{ fontSize: '12px', color: '#9CA3AF' }}>لا توجد مواد مضافة لهذا الفصل</p>}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
        <button
          onClick={async () => {
            if (!selectedClassId) { toast.error('يرجى اختيار صف'); return }
            try {
              await api.put(`/api/school/${schemaName}/classrooms/${selectedClassId}/subjects/assign-teacher`, {
                teacherId: addTeacherSubjects.id,
                subjectIds: selectedSubjectIds
              })
              toast.success('تم ربط المواد بنجاح')
              setAddTeacherSubjects(null)
            } catch (err) {
              const error = err as { response?: { data?: { message?: string } } }
              const msg = error.response?.data?.message || 'تعذر ربط المواد'
              toast.error(msg)
            }
          }}
          style={{
            flex: 2, padding: '12px', backgroundColor: '#9EC5C7',
            color: '#fff', border: 'none', borderRadius: '10px',
            cursor: 'pointer', fontWeight: 600, fontSize: '14px',
          }}
        >
          حفظ الربط
        </button>
        <button onClick={() => setAddTeacherSubjects(null)} style={{
          flex: 1, padding: '12px', backgroundColor: '#F3F4F6',
          color: '#6B7280', border: 'none', borderRadius: '10px',
          cursor: 'pointer', fontWeight: 600, fontSize: '14px',
        }}>
          إلغاء
        </button>
      </div>
    </div>
  </div>
)}


      {editTeacher && (
  <div style={{
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  }}>
    <div style={{
      backgroundColor: '#fff', borderRadius: '16px', padding: '32px',
      width: '95%', maxWidth: '560px', direction: 'rtl',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, color: '#374151', fontSize: '16px', fontWeight: 700 }}>تعديل بيانات المعلم</h3>
        <button onClick={() => setEditTeacher(null)} style={{
          border: 'none', background: '#F3F4F6', borderRadius: '50%',
          width: '32px', height: '32px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={16} color="#6B7280" />
        </button>
      </div>

      <div style={{ display: 'grid', gap: '14px' }}>
        <div>
          <label style={labelStyle}>اسم المعلم *</label>
          <input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>اسم المستخدم *</label>
            <input value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>رقم الجوال</label>
            <input
              value={editForm.phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                setEditForm({ ...editForm, phone: val })
              }}
              placeholder="05xxxxxxxx"
              style={inputStyle}
            />
          </div>
        </div>
        <div>
          <label style={labelStyle}>كلمة المرور الجديدة (اتركها فارغة لعدم التغيير)</label>
          <input
            type="password"
            value={editForm.password}
            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
            style={inputStyle}
            placeholder="••••••••"
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
        <button
          onClick={async () => {
            if (!editTeacher) return;
            try {
              await api.put(`/api/school/${schemaName}/teachers/${editTeacher.id}`, editForm)
              toast.success('تم تعديل بيانات المعلم')
              setEditTeacher(null)
              fetchTeachers()
            } catch {
              toast.error('تعذر تعديل البيانات')
            }
          }}
          style={{
            flex: 2, padding: '12px', backgroundColor: '#9EC5C7',
            color: '#fff', border: 'none', borderRadius: '10px',
            cursor: 'pointer', fontWeight: 600, fontSize: '14px',
          }}
        >
          حفظ التعديلات
        </button>
        <button onClick={() => setEditTeacher(null)} style={{
          flex: 1, padding: '12px', backgroundColor: '#F3F4F6',
          color: '#6B7280', border: 'none', borderRadius: '10px',
          cursor: 'pointer', fontWeight: 600, fontSize: '14px',
        }}>
          إلغاء
        </button>
      </div>
    </div>
  </div>
)}

      {/* Modal عرض الصفوف والمواد */}
      {viewTeacherAssignments && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', padding: '32px',
            width: '95%', maxWidth: '450px', direction: 'rtl',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, color: '#374151', fontSize: '16px', fontWeight: 700 }}>
                الصفوف والمواد: {viewTeacherAssignments.fullName}
              </h3>
              <button onClick={() => setViewTeacherAssignments(null)} style={{
                border: 'none', background: '#F3F4F6', borderRadius: '50%',
                width: '32px', height: '32px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={16} color="#6B7280" />
              </button>
            </div>

            {loadingAssignments ? (
               <p style={{ textAlign: 'center', color: '#9CA3AF' }}>جارٍ التحميل...</p>
            ) : (
              <div style={{ display: 'grid', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                {teacherAssignments.length > 0 ? (
                  teacherAssignments.map((a, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', padding: '12px',
                      background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB'
                    }}>
                      <span style={{ fontWeight: 600, color: '#2D7D82' }}>{a.classroomName}</span>
                      <span style={{ color: '#6B7280' }}>{a.subjectName}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '20px' }}>
                    لم يتم ربط هذا المعلم بأي صفوف بعد
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ActionBtn({ icon, label, color, bg, border, onClick }: {
  icon: React.ReactNode
  label: string
  color?: string
  bg?: string
  border?: string
  onClick?: () => void
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '5px',
      padding: '6px 10px', 
      border: border ? `1px solid ${border}` : '1px solid #E5E7EB',
      borderRadius: '8px',
      background: bg || '#F9FAFB',
      cursor: 'pointer', fontSize: '12px',
      color: color || '#374151',
    }}>
      {icon}
      <span>{label}</span>
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

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '6px',
  fontSize: '12px', fontWeight: 600, color: '#6B7280',
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: '38px', border: '1px solid #E5E7EB',
  borderRadius: '8px', padding: '0 12px', fontSize: '13px',
  textAlign: 'right', outline: 'none', boxSizing: 'border-box',
}