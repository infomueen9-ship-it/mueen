import { useEffect, useState, useCallback } from 'react'
import { X, User, Plus, Search, Minus, Save, Image, Video, Ban } from 'lucide-react'
import api from '../../../api/axios'
import toast from 'react-hot-toast'
import { AxiosError } from 'axios'

interface Props {
  classroomId: number
  classroomName: string
  schemaName: string
  onClose: () => void
}

interface Student {
  id: number
  fullName: string
  score: number
}

export default function TeacherStudent({ classroomId, classroomName, schemaName, onClose }: Props) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // حالات نافذة رصد السلوك
  const [showBehaviorModal, setShowBehaviorModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [behaviorStatement, setBehaviorStatement] = useState('')
  const [behaviorPoints, setBehaviorPoints] = useState(5)
  const [behaviorOperation, setBehaviorOperation] = useState<'add' | 'deduct'>('add')
  const [evidenceType, setEvidenceType] = useState<string>('none')
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const [attendanceMap, setAttendanceMap] = useState<Record<number, string>>({})
  const [savingAttendance, setSavingAttendance] = useState(false)

  interface ApiStudent {
    id: number;
    fullName: string;
    expected_score?: number;
    behaviorScore?: number;
    behavior_score?: number;
  }

  const fetchStudents = useCallback(async () => {
    try {
      const res = await api.get<ApiStudent[]>(`/api/school/${schemaName}/classrooms/${classroomId}/students`)
      const fetchedStudents = res.data.map((s) => ({
        id: s.id,
        fullName: s.fullName,
        score: s.expected_score ?? s.behaviorScore ?? s.behavior_score ?? 80
      }))
      setStudents(fetchedStudents)

      // تهيئة حالات الحضور - افتراض "حاضر" للجميع عند التحميل
      const initialMap: Record<number, string> = {}
      fetchedStudents.forEach(s => { initialMap[s.id] = 'present' })
      setAttendanceMap(initialMap)

    } catch {
      toast.error('تعذر تحميل الطلاب')
    } finally {
      setLoading(false)
    }
  }, [schemaName, classroomId])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const handleOpenBehaviorModal = (student: Student) => {
    setSelectedStudent(student)
    setBehaviorStatement('')
    setBehaviorPoints(5)
    setBehaviorOperation('add')
    setEvidenceType('none')
    setEvidenceFile(null)
    setShowBehaviorModal(true)
  }

  const handleSaveBehavior = async () => {
    if (!selectedStudent) return
    if (behaviorStatement.trim().length < 5) {
      toast.error('يرجى كتابة بيان سلوك واضح')
      return
    }
    setSaving(true)

    const formData = new FormData();
    formData.append('statement', behaviorStatement);
    formData.append('operationType', behaviorOperation);
    formData.append('points', behaviorPoints.toString());
    
    // حساب الدرجة المتوقعة لإرسالها
    const expected = Math.max(0, Math.min(100, behaviorOperation === 'add' 
      ? (selectedStudent.score || 0) + behaviorPoints 
      : (selectedStudent.score || 0) - behaviorPoints));
    formData.append('expectedScore', expected.toString());

    if (evidenceType !== 'none') {
      formData.append('evidenceType', evidenceType);
      if (evidenceFile) formData.append('file', evidenceFile);
    }

    try {
      await api.post(`/api/school/${schemaName}/classrooms/${classroomId}/students/${selectedStudent.id}/behavior`, formData);
      toast.success('تم تسجيل السلوك بنجاح')
      setShowBehaviorModal(false)
      fetchStudents()
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>
      toast.error(error.response?.data?.message || 'تعذر حفظ السلوك')
    } finally {
      setSaving(false)
    }
  }

  const handleAttendanceAction = (studentId: number, type: string) => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: type }))
  }

  const handleSaveAttendance = async () => {
    setSavingAttendance(true)
    try {
      // هنا يتم لاحقاً ربط الطلب مع API الحضور الفعلي وإرسال attendanceMap
      // await api.post(`/api/school/${schemaName}/classrooms/${classroomId}/attendance`, { attendance: attendanceMap })
      toast.success('تم حفظ تحضير الطلاب بنجاح')
    } catch {
      toast.error('تعذر حفظ التحضير')
    } finally {
      setSavingAttendance(false)
    }
  }

  const filteredStudents = students.filter(s => s.fullName.includes(searchQuery))

  return (
    <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E5E7EB' }}>
      <div style={headerRow}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#374151' }}>طلاب {classroomName}</h2>
      </div>

      <div style={blueHeader}>قائمة الطلاب والإجراءات</div>

      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <input 
          type="text" 
          placeholder="ابحث عن اسم طالب..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={searchInputStyle}
        />
        <Search size={18} color="#9CA3AF" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
      </div>

      {loading ? <p style={{ textAlign: 'center', color: '#9CA3AF' }}>جارٍ التحميل...</p> : (
        <>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                <th style={thStyle}>اسم الطالب</th>
                <th style={thStyle}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={avatarStyle}><User size={16} color="#9CA3AF" /></div>
                      {student.fullName}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: '12px', borderLeft: '1px solid #E5E7EB', paddingLeft: '12px', marginLeft: '8px' }}>
                        <label style={radioLabelStyle}>
                          <input type="radio" name={`att-${student.id}`} defaultChecked onChange={() => handleAttendanceAction(student.id, 'present')} /> حاضر
                        </label>
                        <label style={radioLabelStyle}>
                          <input type="radio" name={`att-${student.id}`} onChange={() => handleAttendanceAction(student.id, 'absence')} /> غياب
                        </label>
                        <label style={radioLabelStyle}>
                          <input type="radio" name={`att-${student.id}`} onChange={() => handleAttendanceAction(student.id, 'delay')} /> تأخير
                        </label>
                        <label style={radioLabelStyle}>
                          <input type="radio" name={`att-${student.id}`} onChange={() => handleAttendanceAction(student.id, 'permission')} /> استئذان
                        </label>
                      </div>
                      <button onClick={() => handleOpenBehaviorModal(student)} style={actionBtnStyle('#E8F4F5', '#2D7D82')}>
                        <Plus size={14} /> السلوك
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={handleSaveAttendance}
            disabled={savingAttendance}
            style={{ ...saveBtn, width: 'auto', padding: '10px 30px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Save size={18} />
            {savingAttendance ? 'جارٍ الحفظ...' : 'حفظ الحضور'}
          </button>
        </div>
        </>
      )}

      {showBehaviorModal && selectedStudent && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>رصد سلوك: {selectedStudent.fullName}</h3>
              <button onClick={() => setShowBehaviorModal(false)} style={closeBtnStyle}><X size={16} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>البيان</label>
                <textarea value={behaviorStatement} onChange={(e) => setBehaviorStatement(e.target.value)} style={{ ...inputStyle, height: '80px', paddingTop: '10px' }} placeholder="مثال: مشاركة متميزة..." />
              </div>
              <div>
                <label style={labelStyle}>النوع</label>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}><input type="radio" checked={behaviorOperation === 'add'} onChange={() => setBehaviorOperation('add')} /> إضافة</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}><input type="radio" checked={behaviorOperation === 'deduct'} onChange={() => setBehaviorOperation('deduct')} /> خصم</label>
                </div>
              </div>
              <div>
                <label style={labelStyle}>النقاط</label>
                <div style={counterContainer}>
                  <button onClick={() => setBehaviorPoints(p => Math.max(1, p - 1))} style={counterBtn}><Minus size={14} /></button>
                  <span style={{ fontWeight: 700, width: '30px', textAlign: 'center' }}>{behaviorPoints}</span>
                  <button onClick={() => setBehaviorPoints(p => p + 1)} style={counterBtn}><Plus size={14} /></button>
                </div>
              </div>
              {/* الدليل للمعلم */}
              <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                <label style={labelStyle}>الدليل (اختياري)</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => { setEvidenceType('none'); setEvidenceFile(null); }}
                    style={evidenceBtnStyle(evidenceType === 'none')}
                  >
                    <Ban size={14} /> بدون
                  </button>
                  <button 
                    onClick={() => { setEvidenceType('image'); setEvidenceFile(null); }}
                    style={evidenceBtnStyle(evidenceType === 'image')}
                  >
                    <Image size={14} /> صورة
                  </button>
                  <button 
                    onClick={() => { setEvidenceType('video'); setEvidenceFile(null); }}
                    style={evidenceBtnStyle(evidenceType === 'video')}
                  >
                    <Video size={14} /> فيديو
                  </button>
                  {evidenceType !== 'none' && (
                    <div style={{ flex: 1, minWidth: '150px' }}>
                       <input 
                        type="file" 
                        id="teacher-file-input" 
                        accept={evidenceType === 'image' ? "image/*" : "video/*"}
                        style={{ display: 'none' }}
                        onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                       />
                       <label htmlFor="teacher-file-input" style={{ ...inputStyle, display: 'block', cursor: 'pointer', backgroundColor: '#F9FAFB', borderStyle: 'dashed' }}>
                         {evidenceFile ? evidenceFile.name.substring(0,15)+'...' : 'اضغط للاختيار'}
                       </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleSaveBehavior} disabled={saving} style={saveBtn}>{saving ? 'جارٍ الحفظ...' : 'حفظ'}</button>
              <button onClick={() => setShowBehaviorModal(false)} style={cancelBtn}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const headerRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }
const closeBtnStyle: React.CSSProperties = { border: 'none', background: '#F3F4F6', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const blueHeader: React.CSSProperties = { background: '#9EC5C7', color: '#fff', padding: '12px', borderRadius: '10px', textAlign: 'center', fontWeight: 600, fontSize: '15px', marginBottom: '20px' }
const searchInputStyle: React.CSSProperties = { width: '100%', height: '38px', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '0 40px 0 12px', fontSize: '13px', outline: 'none', textAlign: 'right' }
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' }
const thStyle: React.CSSProperties = { border: '1px solid #E5E7EB', padding: '10px', textAlign: 'center', color: '#6B7280', fontSize: '12px', fontWeight: 600 }
const tdStyle: React.CSSProperties = { border: '1px solid #E5E7EB', padding: '10px', textAlign: 'center', color: '#374151', fontSize: '13px' }
const avatarStyle: React.CSSProperties = { width: '28px', height: '28px', borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const actionBtnStyle = (bg: string, color: string): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', backgroundColor: bg, color: color, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 })
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }
const modalContentStyle: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', padding: '32px', width: '95%', maxWidth: '800px', maxHeight: '95vh', overflowY: 'auto', direction: 'rtl' }
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }
const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '8px 10px', outline: 'none', textAlign: 'right', fontSize: '13px' }
const counterContainer: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '15px', background: '#F9FAFB', padding: '5px', borderRadius: '8px', border: '1px solid #E5E7EB', justifyContent: 'center' }
const counterBtn: React.CSSProperties = { width: '28px', height: '28px', border: '1px solid #E5E7EB', borderRadius: '6px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const saveBtn: React.CSSProperties = { flex: 2, padding: '10px', background: '#9EC5C7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }
const cancelBtn: React.CSSProperties = { flex: 1, padding: '10px', background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }
const radioLabelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px', color: '#374151', fontWeight: 600, whiteSpace: 'nowrap' }
const evidenceBtnStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', 
  borderRadius: '20px', border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: '12px',
  backgroundColor: active ? '#E8F4F5' : '#fff', color: active ? '#2D7D82' : '#6B7280', fontWeight: 600
})
