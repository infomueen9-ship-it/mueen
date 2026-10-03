import { useEffect, useState, useCallback } from 'react'
import { X, User, Plus, Minus, Save, Image, Video, Ban, CalendarCheck } from 'lucide-react'
import api from '../../../api/axios'
import toast from 'react-hot-toast'
import { AxiosError } from 'axios'

type AttendanceStatus = 'present' | 'absence' | 'delay' | 'permission'

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

interface AttendanceRecord {
  id: number
  date: string
  status: AttendanceStatus
  studentId: number
  studentName: string
}

const today = new Date()
const todayIso = today.toISOString().slice(0, 10)
const todayDayName = new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(today)

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'حاضر',
  absence: 'غياب',
  delay: 'تأخير',
  permission: 'استئذان',
}

const STATUS_COLORS: Record<AttendanceStatus, { bg: string; color: string }> = {
  present: { bg: '#DCFCE7', color: '#16A34A' },
  absence: { bg: '#FEE2E2', color: '#DC2626' },
  delay: { bg: '#FEF3C7', color: '#D97706' },
  permission: { bg: '#EDE9FE', color: '#7C3AED' },
}

interface BehaviorRecord {
  id: number
  statement: string
  operationType: 'add' | 'deduct'
  points: number
  expectedScore: number
  createdAt: string
  studentId: number
  studentName: string
}

export default function TeacherStudent({ classroomId, classroomName, schemaName, onClose }: Props) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  // حالات نافذة رصد السلوك
  const [showBehaviorModal, setShowBehaviorModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [behaviorStatement, setBehaviorStatement] = useState('')
  const [behaviorPoints, setBehaviorPoints] = useState(5)
  const [behaviorOperation, setBehaviorOperation] = useState<'add' | 'deduct'>('add')
  const [evidenceType, setEvidenceType] = useState<string>('none')
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const [attendanceMap, setAttendanceMap] = useState<Record<number, AttendanceStatus>>({})
  const [savingAttendance, setSavingAttendance] = useState(false)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(true)

  const [behaviorRecords, setBehaviorRecords] = useState<BehaviorRecord[]>([])
  const [behaviorRecordsLoading, setBehaviorRecordsLoading] = useState(true)

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
      const initialMap: Record<number, AttendanceStatus> = {}
      fetchedStudents.forEach(s => { initialMap[s.id] = 'present' })
      setAttendanceMap(initialMap)
    } catch {
      toast.error('تعذر تحميل الطلاب')
    } finally {
      setLoading(false)
    }
  }, [schemaName, classroomId])

  const fetchAttendanceRecords = useCallback(async () => {
    setRecordsLoading(true)
    try {
      const res = await api.get<AttendanceRecord[]>(
        `/api/school/${schemaName}/attendance/classroom/${classroomId}`
      )
      setAttendanceRecords(res.data)

      // تعبئة حضور اليوم الحالي في نموذج "إضافة حضور" إن كان محفوظاً مسبقاً
      setAttendanceMap(prev => {
        const updated = { ...prev }
        res.data
          .filter(record => record.date === todayIso)
          .forEach(record => { updated[record.studentId] = record.status })
        return updated
      })
    } catch {
      toast.error('تعذر تحميل سجل الحضور')
    } finally {
      setRecordsLoading(false)
    }
  }, [schemaName, classroomId])

  const fetchBehaviorRecords = useCallback(async () => {
    setBehaviorRecordsLoading(true)
    try {
      const res = await api.get<BehaviorRecord[]>(
        `/api/school/${schemaName}/classrooms/${classroomId}/behavior`
      )
      setBehaviorRecords(res.data)
    } catch {
      toast.error('تعذر تحميل سجل السلوك')
    } finally {
      setBehaviorRecordsLoading(false)
    }
  }, [schemaName, classroomId])

  useEffect(() => {
    void Promise.resolve().then(fetchStudents)
    void Promise.resolve().then(fetchAttendanceRecords)
    void Promise.resolve().then(fetchBehaviorRecords)
  }, [fetchStudents, fetchAttendanceRecords, fetchBehaviorRecords])

  const handleOpenBehaviorModal = () => {
    setSelectedStudent(null)
    setBehaviorStatement('')
    setBehaviorPoints(5)
    setBehaviorOperation('add')
    setEvidenceType('none')
    setEvidenceFile(null)
    setShowBehaviorModal(true)
  }

  const handleSaveBehavior = async () => {
    if (!selectedStudent) {
      toast.error('يرجى اختيار الطالب')
      return
    }
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
      fetchBehaviorRecords()
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>
      toast.error(error.response?.data?.message || 'تعذر حفظ السلوك')
    } finally {
      setSaving(false)
    }
  }

  const handleAttendanceAction = (studentId: number, type: AttendanceStatus) => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: type }))
  }

  const handleSaveAttendance = async () => {
    setSavingAttendance(true)
    try {
      await api.post(`/api/school/${schemaName}/attendance/classroom/${classroomId}`, {
        date: todayIso,
        attendance: attendanceMap,
      })
      toast.success('تم حفظ تحضير الطلاب بنجاح')
      setShowAttendanceModal(false)
      fetchAttendanceRecords()
    } catch {
      toast.error('تعذر حفظ التحضير')
    } finally {
      setSavingAttendance(false)
    }
  }

  return (
    <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E5E7EB' }}>
      <div style={headerRow}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#374151' }}>طلاب {classroomName}</h2>
        <button onClick={onClose} style={closeHeaderBtnStyle} aria-label="إغلاق">
          <X size={18} />
        </button>
      </div>

      <div style={blueHeader}>الحضور والسلوك</div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '32px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowAttendanceModal(true)}
          disabled={loading}
          style={{ ...actionBtnStyle('#2D7D82', '#fff'), padding: '10px 20px', fontSize: '13px' }}
        >
          <CalendarCheck size={16} /> إضافة حضور
        </button>
        <button
          onClick={handleOpenBehaviorModal}
          disabled={loading}
          style={{ ...actionBtnStyle('#7C3AED', '#fff'), padding: '10px 20px', fontSize: '13px' }}
        >
          <Plus size={16} /> إضافة سلوك
        </button>
      </div>

      {/* سجل الحضور */}
      <div style={{ marginTop: '32px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#374151' }}>سجل الحضور</h3>

        {recordsLoading ? (
          <p style={{ textAlign: 'center', color: '#9CA3AF' }}>جارٍ التحميل...</p>
        ) : attendanceRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF', background: '#F9FAFB', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
            لا توجد سجلات حضور بعد.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB' }}>
                  <th style={thStyle}>اسم الطالب</th>
                  <th style={thStyle}>التاريخ</th>
                  <th style={thStyle}>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map(record => (
                  <tr key={record.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{record.studentName}</td>
                    <td style={tdStyle}>{record.date}</td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-block', padding: '4px 12px', borderRadius: '20px',
                        fontSize: '12px', fontWeight: 700,
                        backgroundColor: STATUS_COLORS[record.status].bg,
                        color: STATUS_COLORS[record.status].color,
                      }}>
                        {STATUS_LABELS[record.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* سجل السلوك */}
      <div style={{ marginTop: '32px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#374151' }}>سجل السلوك</h3>

        {behaviorRecordsLoading ? (
          <p style={{ textAlign: 'center', color: '#9CA3AF' }}>جارٍ التحميل...</p>
        ) : behaviorRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF', background: '#F9FAFB', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
            لا توجد سجلات سلوك بعد. استخدم زر "إضافة سلوك" أعلاه لإضافة سجل.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB' }}>
                  <th style={thStyle}>اسم الطالب</th>
                  <th style={thStyle}>البيان</th>
                  <th style={thStyle}>النقاط</th>
                  <th style={thStyle}>الدرجة المتوقعة</th>
                  <th style={thStyle}>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {behaviorRecords.map(record => (
                  <tr key={record.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{record.studentName}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{record.statement}</td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-block', padding: '4px 12px', borderRadius: '20px',
                        fontSize: '12px', fontWeight: 700,
                        backgroundColor: record.operationType === 'add' ? '#DCFCE7' : '#FEE2E2',
                        color: record.operationType === 'add' ? '#16A34A' : '#DC2626',
                      }}>
                        {record.operationType === 'add' ? `+${record.points}` : `-${record.points}`}
                      </span>
                    </td>
                    <td style={tdStyle}>{record.expectedScore}</td>
                    <td style={tdStyle}>{new Date(record.createdAt).toLocaleDateString('ar-SA')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal إضافة حضور */}
      {showAttendanceModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>إضافة حضور — {classroomName}</h3>
              <button onClick={() => setShowAttendanceModal(false)} style={closeBtnStyle}><X size={16} /></button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '20px', color: '#2D7D82', fontSize: '13px', fontWeight: 700 }}>
              تحضير اليوم: {todayDayName} — {todayIso}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB' }}>
                    <th style={thStyle}>اسم الطالب</th>
                    <th style={thStyle}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={avatarStyle}><User size={16} color="#9CA3AF" /></div>
                          {student.fullName}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <label style={radioLabelStyle}>
                            <input
                              type="radio"
                              name={`att-${student.id}`}
                              checked={attendanceMap[student.id] === 'present'}
                              onChange={() => handleAttendanceAction(student.id, 'present')}
                            />
                            حاضر
                          </label>
                          <label style={radioLabelStyle}>
                            <input
                              type="radio"
                              name={`att-${student.id}`}
                              checked={attendanceMap[student.id] === 'absence'}
                              onChange={() => handleAttendanceAction(student.id, 'absence')}
                            />
                            غياب
                          </label>
                          <label style={radioLabelStyle}>
                            <input
                              type="radio"
                              name={`att-${student.id}`}
                              checked={attendanceMap[student.id] === 'delay'}
                              onChange={() => handleAttendanceAction(student.id, 'delay')}
                            />
                            تأخير
                          </label>
                          <label style={radioLabelStyle}>
                            <input
                              type="radio"
                              name={`att-${student.id}`}
                              checked={attendanceMap[student.id] === 'permission'}
                              onChange={() => handleAttendanceAction(student.id, 'permission')}
                            />
                            استئذان
                          </label>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={handleSaveAttendance} disabled={savingAttendance} style={{ ...saveBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Save size={18} />
                {savingAttendance ? 'جارٍ الحفظ...' : 'حفظ الحضور'}
              </button>
              <button onClick={() => setShowAttendanceModal(false)} style={cancelBtn}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {showBehaviorModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>رصد سلوك — {classroomName}</h3>
              <button onClick={() => setShowBehaviorModal(false)} style={closeBtnStyle}><X size={16} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>الطالب</label>
                <select
                  value={selectedStudent?.id ?? ''}
                  onChange={(e) => setSelectedStudent(students.find(s => s.id === Number(e.target.value)) || null)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">اختر الطالب</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>{student.fullName}</option>
                  ))}
                </select>
              </div>
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
const closeHeaderBtnStyle: React.CSSProperties = { border: 'none', background: '#F3F4F6', borderRadius: '10px', width: '38px', height: '38px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const closeBtnStyle: React.CSSProperties = { border: 'none', background: '#F3F4F6', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const blueHeader: React.CSSProperties = { background: '#9EC5C7', color: '#fff', padding: '12px', borderRadius: '10px', textAlign: 'center', fontWeight: 600, fontSize: '15px', marginBottom: '20px' }
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
