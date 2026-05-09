import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, User, Info, ChevronDown, BookOpen, ArrowRight, Search, Plus, Minus, FileText, X, Printer, ArrowUp, ArrowDown, Image, Video, Ban } from 'lucide-react'
import { flushSync } from 'react-dom'
import api from '../../api/axios'

import toast from 'react-hot-toast'
import { AxiosError } from 'axios'

interface Classroom {
  id: number
  name: string
  avgScore?: number
  studentCount?: number
  student_count?: number
  totalStudents?: number
  total_students?: number
}

interface ApiStudentResponse {
  id: number;
  fullName: string;
  guardianPhone: string; // API returns this, even if not directly used in Student interface for BehaviorPage
  behaviorScore?: number;
  behavior_score?: number;
  expected_score?: number;
}

interface BehaviorLog {
  id: number
  statement: string
  operationType?: 'add' | 'deduct'
  operation_type?: 'add' | 'deduct'
  points: number
  expectedScore?: number
  expected_score?: number
  evidenceType?: string
  evidence_type?: string
  evidenceUrl?: string
  evidence_url?: string
  createdAt: string
  created_at?: string // لتوافق بيانات قاعدة البيانات
}

interface Student {
  id: number
  fullName: string
  score?: number
}



const BEHAVIOR_CATEGORIES = [
  {
    title: "أولًا: الانضباط",
    practices: [
      { label: "انضباط الطالب وعدم غيابه بدون عذر خلال الفصل الدراسي.", points: 6, detail: "تمنح للطالب الذي يلتزم بالحضور وعدم الغياب بدون عذر خلال الفصل الدراسي." },
    ]
  },
  {
    title: "ثانيًا: المشاركة المجتمعية والتوعوية",
    description: "اختر أيًّا مما يلي (تُحسب المشاركة الواحدة بـ ٦ درجات):",
    practices: [
      { label: "المشاركة في الخدمة المجتمعية خارج المدرسة.", points: 6, detail: "تمنح للمشاركة في الأنشطة التطوعية خارج نطاق المدرسة." },
      { label: "تقديم فعالية حوارية.", points: 6, detail: "تمنح لتقديم أو تنظيم فعاليات حوارية." },
      { label: "المشاركة في حملة توعوية.", points: 6, detail: "تمنح للمشاركة في حملات توعوية داخل أو خارج المدرسة." },
      { label: "عرض تجارب شخصية ناجحة.", points: 6, detail: "تمنح للطالب الذي يعرض تجاربه الشخصية الملهمة." },
      { label: "الالتحاق ببرنامج أو دورة.", points: 6, detail: "تمنح للالتحاق ببرامج أو دورات تدريبية إضافية." },
    ]
  },
  {
    title: "ثالثًا: مجالات الأنشطة المدرسية",
    description: "(+٤ لكل مشاركة)",
    practices: [
      { label: "مهارات الاتصال (العمل الجماعي والتعلّم بالأقران).", points: 4, detail: "تمنح لإظهار مهارات تواصل وتعاون ممتازة." },
      { label: "مهارات القيادة والمسؤولية (التخطيط والتحفيز).", points: 4, detail: "تمنح لإظهار قدرات قيادية ومسؤولية." },
      { label: "المهارات الرقمية (إعداد العروض وتصميم المحتوى الاحترافي).", points: 4, detail: "تمنح للتميز في استخدام الأدوات الرقمية." },
      { label: "مهارات إدارة الوقت.", points: 4, detail: "تمنح لإظهار قدرة عالية على إدارة الوقت." },
    ]
  },
  {
    title: "رابعًا: مبادرات إضافية",
    description: "(+٢ لكل بند)",
    practices: [
      { label: "كتابة رسالة شكر (للوطن/القيادة/الأسرة/المعلّم…).", points: 2, detail: "تمنح لكتابة رسائل شكر معبرة." },
      { label: "المشاركة في الإذاعة المدرسية.", points: 2, detail: "تمنح للمشاركة الفعالة في الإذاعة المدرسية." },
      { label: "تقديم مقترحات لصالح المجتمع المدرسي.", points: 2, detail: "تمنح لتقديم أفكار بناءة لتحسين البيئة المدرسية." },
      { label: "التعاون مع الزملاء والمعلمين وإدارة المدرسة.", points: 2, detail: "تمنح لإظهار روح التعاون والتفاعل الإيجابي." },
    ]
  },
  {
    title: "خامسًا: سلوك متميّز غير مذكور",
    practices: [
      { label: "إذا اكتسب الطالب سلوكًا متميّزًا غير وارد أعلاه؛ تُمنح درجة مناسبة بناءً على توصية لجنة المدرسة، مع عدم تجاوز الحد الأعلى المعتمد.", points: "مرن | لا يتجاوز السقف", detail: "تقييم خاص للسلوكيات غير المذكورة." },
    ]
  }
]

export default function BehaviorPage({ schemaName, initialClassroomId }: { schemaName: string, initialClassroomId?: number }) {
  const navigate = useNavigate()
  const initialLoadRef = useRef(false)
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [showPractices, setShowPractices] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'excellent' | 'under80' | 'unevaluated'>('all')

  // حالات النافذة المنبثقة لتعديل السلوك
  const [showBehaviorModal, setShowBehaviorModal] = useState(false)
  const [selectedStudentForBehavior, setSelectedStudentForBehavior] = useState<Student | null>(null)
  const [behaviorStatement, setBehaviorStatement] = useState('')
  const [behaviorOperation, setBehaviorOperation] = useState<'add' | 'deduct'>('add')
  const [behaviorPoints, setBehaviorPoints] = useState<number>(5) // يتم تهيئة القيمة الافتراضية
  const [savingBehavior, setSavingBehavior] = useState(false)
  const [evidenceType, setEvidenceType] = useState<string>('none')
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)

  const [viewStudentLog, setViewStudentLog] = useState<Student | null>(null)
  const [logs, setLogs] = useState<BehaviorLog[]>([])
  const [logFilter, setLogFilter] = useState<'all' | 'add' | 'deduct'>('all')

  const [previewEvidence, setPreviewEvidence] = useState<{ url: string, type: string } | null>(null)

  // جلب الفصول الدراسية
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

  // الانتقال التلقائي للفصل إذا تم تمرير المعرف
  useEffect(() => {
    if (!initialLoadRef.current && initialClassroomId && classrooms.length > 0) {
      initialLoadRef.current = true;
      const cls = classrooms.find(c => c.id === initialClassroomId);
      if (cls) {
        flushSync(() => {
          setSelectedClassroom(cls);
          setLoadingStudents(true);
        });
        (async () => {
          try {
            const res = await api.get(`/api/school/${schemaName}/classrooms/${cls.id}/students`);
            setStudents(res.data.map((s: ApiStudentResponse) => ({ 
              id: s.id, 
              fullName: s.fullName, 
              score: s.expected_score ?? s.behaviorScore ?? s.behavior_score ?? 80 
            })));
          } catch {
            toast.error('تعذر تحميل الطلاب');
          } finally {
            setLoadingStudents(false);
          }
        })();
      }
    }
  }, [initialClassroomId, classrooms, schemaName]);

  // جلب الطلاب عند اختيار فصل
  const handleManageBehavior = useCallback(async (cls: Classroom) => {
    setSelectedClassroom(cls)
    setLoadingStudents(true)
    try {
      const res = await api.get(`/api/school/${schemaName}/classrooms/${cls.id}/students`)
      setStudents(res.data.map((s: ApiStudentResponse) => ({ 
        id: s.id, 
        fullName: s.fullName, 
        score: s.expected_score ?? s.behaviorScore ?? s.behavior_score ?? 80 
      })))
    } catch {
      toast.error('تعذر تحميل الطلاب')
    } finally {
      setLoadingStudents(false)
    }
  }, [schemaName])

  // جلب سجل السلوك للطالب
  useEffect(() => {
    let ignore = false;
    if (viewStudentLog && selectedClassroom) {
      api.get(`/api/school/${schemaName}/classrooms/${selectedClassroom.id}/students/${viewStudentLog.id}/behavior`)
        .then(res => {
          if (!ignore) setLogs(res.data)
        })
        .catch(() => {
          if (!ignore) toast.error('تعذر تحميل السجل')
        })
    }
    return () => {
      ignore = true;
    };
  }, [viewStudentLog, schemaName, selectedClassroom])

  // فتح نافذة تعديل السلوك
  const handleOpenBehaviorModal = (student: Student) => {
    setSelectedStudentForBehavior(student)
    setBehaviorStatement('')
    setBehaviorOperation('add')
    setBehaviorPoints(5) // القيمة الافتراضية كما في طلبك
    setEvidenceType('none')
    setEvidenceFile(null)
    setShowBehaviorModal(true)
  }

  // تصفية الطلاب بناءً على البحث والفلتر
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.fullName.includes(searchQuery)
    const score = s.score || 0
    if (filterType === 'excellent') return matchesSearch && score === 100
    if (filterType === 'under80') return matchesSearch && score < 80
    if (filterType === 'unevaluated') return matchesSearch && score === 80
    return matchesSearch
  })

  const excellentCount = students.filter(s => (s.score || 0) === 100).length
  const under80Count = students.filter(s => (s.score || 0) < 80).length
  const unevaluatedCount = students.filter(s => (s.score || 0) === 80).length

  // حساب إحصائيات السجل
  const getOpType = (log: BehaviorLog) => log.operationType || log.operation_type;
  const totalAdditions = logs.reduce((sum, log) => getOpType(log) === 'add' ? sum + log.points : sum, 0)
  const totalDeductions = logs.reduce((sum, log) => getOpType(log) === 'deduct' ? sum + log.points : sum, 0)
  const filteredLogs = logs.filter(log => 
    logFilter === 'all' ? true : getOpType(log) === logFilter
  )

  return (
    <>
    <div style={{ padding: '24px 48px', direction: 'rtl' }}>
      {!selectedClassroom ? (
        <>
          <div style={headerStyle}>سلوك الطلاب — الفصول</div>
          <div style={{ marginBottom: '24px' }}>
            <button onClick={() => setShowPractices(!showPractices)} style={dropdownButtonStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Info size={18} color="#2D7D82" />
                <span>عرض ممارسات السلوك المتميّز المقترحة</span>
              </div>
              <ChevronDown size={20} style={{ transition: 'transform 0.2s', transform: showPractices ? 'rotate(180deg)' : 'none' }} />
            </button>
            {showPractices && (
              <div style={practicesGridStyle}>
                {BEHAVIOR_CATEGORIES.map((category, catIdx) => (
                  <div key={catIdx} style={categoryCardStyle}>
                    <h4 style={{ margin: '0 0 10px', color: '#2D7D82', fontSize: '13px', fontWeight: 800 }}>{category.title}</h4>
                    {category.description && <p style={{ margin: '0 0 10px', fontSize: '10px', color: '#6B7280', lineHeight: 1.4 }}>{category.description}</p>}
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {category.practices.map((practice, pIdx) => (
                        <div key={pIdx} style={practiceItemStyle}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
                            <span style={{ fontWeight: 600, color: '#374151', fontSize: '11px' }}>{practice.label}</span>
                            <span style={{ backgroundColor: '#E8F4F5', color: '#2D7D82', padding: '2px 5px', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }}>{practice.points}</span>
                          </div>
                          <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#9CA3AF' }}>{practice.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {loading ? <p style={{ textAlign: 'center', color: '#9CA3AF' }}>جارٍ التحميل...</p> : (
            <div style={classroomGridStyle}>
              {classrooms.map((cls) => (
                <div key={cls.id} style={classroomCardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ width: '40px', height: '40px', background: '#F4F8FB', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={20} color="#2D7D82" /></div>
                    <h3 style={{ margin: 0, fontSize: '17px', color: '#374151', fontWeight: 700 }}>{cls.name}</h3>
                  </div>
                  <div style={cardStatRow}><span style={cardStatLabel}>متوسط السلوك:</span><span style={{ fontWeight: 700, color: '#2D7D82' }}>100/100</span></div>
                  <div style={cardStatRow}><span style={cardStatLabel}>عدد الطلاب:</span><span style={{ fontWeight: 700, color: '#374151' }}>{cls.studentCount ?? cls.student_count ?? cls.totalStudents ?? cls.total_students ?? 0}</span></div>
                  <button onClick={() => handleManageBehavior(cls)} style={manageButtonStyle}>
                    <CheckCircle2 size={16} /> إدارة السلوك
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', border: '1px solid #E5E7EB', display: viewStudentLog ? 'none' : 'block' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
            <button onClick={() => setSelectedClassroom(null)} style={{ border: 'none', background: '#F3F4F6', borderRadius: '10px', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}><ArrowRight size={20} /></button>
            <h3 style={{ margin: 0, color: '#374151', fontSize: '18px', fontWeight: 700 }}>سلوك الطلاب — {selectedClassroom.name}</h3>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input type="text" placeholder="ابحث باسم الطالب..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ ...inputStyle, paddingRight: '40px' }} />
              <Search size={18} color="#9CA3AF" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setFilterType('excellent')} style={filterButtonStyle(filterType === 'excellent')}>ممتاز (100)</button>
              <button onClick={() => setFilterType('under80')} style={filterButtonStyle(filterType === 'under80')}>تحت 80</button>
              <button onClick={() => setFilterType('unevaluated')} style={filterButtonStyle(filterType === 'unevaluated')}>غير مُقيّم</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={statCardStyle}><span style={statLabelStyle}>إجمالي الطلاب</span><span style={statValueStyle}>{students.length}</span></div>
            <div style={statCardStyle}><div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span style={statLabelStyle}>ممتاز (100)</span><button onClick={() => setFilterType('excellent')} style={miniFilterLink}>تصفية</button></div><span style={{ ...statValueStyle, color: '#10B981' }}>{excellentCount}</span></div>
            <div style={statCardStyle}><div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span style={statLabelStyle}>تحت 80</span><button onClick={() => setFilterType('under80')} style={miniFilterLink}>تصفية</button></div><span style={{ ...statValueStyle, color: '#EF4444' }}>{under80Count}</span></div>
            <div style={statCardStyle}><div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span style={statLabelStyle}>غير مُقيّم (80 أساس)</span><button onClick={() => setFilterType('unevaluated')} style={miniFilterLink}>تصفية</button></div><span style={{ ...statValueStyle, color: '#6B7280' }}>{unevaluatedCount}</span></div>
          </div>
          {loadingStudents ? <p style={{ textAlign: 'center', color: '#9CA3AF' }}>جارٍ تحميل الطلاب...</p> : (
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ backgroundColor: '#F9FAFB' }}><th style={thStyle}>اسم الطالب</th><th style={thStyle}>درجة السلوك</th><th style={thStyle}>إجراءات</th><th style={thStyle}>السجل</th></tr></thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ ...tdStyle, textAlign: 'right' }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={16} color="#9CA3AF" /></div>{student.fullName}</div></td>
                      <td style={tdStyle}><span style={{ fontWeight: 700, color: (student.score || 0) >= 100 ? '#10B981' : (student.score || 0) < 80 ? '#EF4444' : '#374151' }}>{student.score}/100</span></td>
                      <td style={tdStyle}><div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button onClick={() => handleOpenBehaviorModal(student)} style={actionBtnIconStyle('#E8F4F5', '#2D7D82')}><Plus size={14} /> إضافة/خصم</button>
                      </div></td>
                      <td style={tdStyle}>
                        <button onClick={() => { setLogs([]); setViewStudentLog(student); }} style={{ ...actionBtnIconStyle('#F3F4F6', '#6B7280'), border: 'none' }}>
                          <FileText size={14} /> عرض السجل
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredStudents.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>لا يوجد طلاب يطابقون خيارات البحث/التصفية</div>}
            </div>
          )}
        </div>
      )}

      {/* واجهة سجل السلوك */}
      {selectedClassroom && viewStudentLog && (
        <div className="printable" style={{ background: '#fff', borderRadius: '16px', padding: '32px', border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <button onClick={() => { setViewStudentLog(null); setLogs([]); }} style={{ border: 'none', background: '#F3F4F6', borderRadius: '10px', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                <ArrowRight size={20} />
              </button>
              <h3 style={{ margin: 0, color: '#374151', fontSize: '18px', fontWeight: 700 }}>سجل السلوك — {viewStudentLog.fullName}</h3>
            </div>
            <button 
              onClick={() => {
                const schoolCode = schemaName.replace('school_', '');
                navigate(`/school/${schoolCode}/classrooms/${selectedClassroom.id}/behavior-report/${viewStudentLog.id}?name=${viewStudentLog.fullName}&classroom=${selectedClassroom.name}&score=${viewStudentLog.score}`);
              }} 
              style={{ ...actionBtnIconStyle('#9EC5C7', '#fff'), border: 'none', padding: '10px 20px' }}
            >
              <Printer size={16} /> طباعة السجل
            </button>
          </div>

          {/* كروت الإحصائيات في السجل */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ ...statCardStyle, backgroundColor: '#ECFDF5', border: '1px solid #10B981' }}>
              <span style={{ ...statLabelStyle, color: '#047857' }}>إجمالي الزيادات</span>
              <span style={{ ...statValueStyle, color: '#059669' }}>+{totalAdditions}</span>
            </div>
            <div style={{ ...statCardStyle, backgroundColor: '#FEF2F2', border: '1px solid #EF4444' }}>
              <span style={{ ...statLabelStyle, color: '#B91C1C' }}>إجمالي الخصومات</span>
              <span style={{ ...statValueStyle, color: '#DC2626' }}>-{totalDeductions}</span>
            </div>
            <div style={{ ...statCardStyle, background: '#fff' }}>
              <span style={statLabelStyle}>تصفية النتائج</span>
              <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                <button onClick={() => setLogFilter('all')} style={miniBtnStyle(logFilter === 'all')}>الكل</button>
                <button onClick={() => setLogFilter('add')} style={miniBtnStyle(logFilter === 'add')}>زيادات</button>
                <button onClick={() => setLogFilter('deduct')} style={miniBtnStyle(logFilter === 'deduct')}>خصومات</button>
              </div>
            </div>
          </div>

          {/* جدول السجل */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                <th style={thStyle}>التاريخ</th>
                <th style={thStyle}>التغيير</th>
                <th style={thStyle}>التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const opType = log.operationType || log.operation_type;
                const isAdd = opType === 'add';

                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={tdStyle}>
                    {new Date(log.createdAt || log.created_at || '').toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: isAdd ? '#10B981' : '#EF4444' }}>
                    {isAdd ? '+' : '-'}{log.points} {isAdd ? 'زيادة' : 'خصم'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontSize: '12px' }}>
                    {log.statement}
                  </td>
                </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                    لا توجد سجلات تطابق الفلتر المختار
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <style>{`
            @media print {
              body * { visibility: hidden; }
              .printable, .printable * { visibility: visible; }
              .printable { position: absolute; left: 0; top: 0; width: 100%; }
            }
          `}</style>
        </div>
      )}
    </div>
    

    {/* Modal: تعديل سلوك الطالب */}
    {showBehaviorModal && selectedStudentForBehavior && (
      <div style={modalOverlayStyle}>
        <div style={{ ...modalContentStyle, maxWidth: '1100px', padding: 0, overflowY: 'auto' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderBottom: '1px solid #E5E7EB', flexWrap: 'wrap-reverse', gap: '16px' }}>
            <button onClick={() => setShowBehaviorModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6B7280' }}>
              <X size={36} />
            </button>
            <div style={{ textAlign: 'right', flex: '1 1 300px' }}>
              <h1 style={{ margin: 0, fontSize: 'clamp(20px, 4vw, 32px)', fontWeight: 800, color: '#111827' }}>
                تعديل سلوك — {selectedStudentForBehavior.fullName}
              </h1>
              <p style={{ margin: '8px 0 0', color: '#6B7280', fontSize: 'clamp(14px, 3vw, 18px)' }}>
                نص البيان إلزامي (حد أدنى 10 أحرف).
              </p>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '24px 32px' }}>
            
            {/* نص البيان */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 700, marginBottom: '16px' }}>
                نص البيان <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <textarea
                  value={behaviorStatement}
                  onChange={(e) => setBehaviorStatement(e.target.value)}
                  placeholder="اكتب تفاصيل واضحة عن سبب الزيادة/الخصم..."
                  style={{
                    width: '100%', height: '80px', border: '2px solid #FCA5A5', borderRadius: '12px',
                    padding: '12px', fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box'
                  }}
                />
                <div style={{ position: 'absolute', bottom: '8px', left: '12px', color: '#6B7280', fontSize: '11px', fontWeight: 600 }}>
                  {behaviorStatement.length}/10
                </div>
              </div>
            </div>

            {/* Controls Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              
              {/* نوع العملية */}
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>نوع العملية</h2>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setBehaviorOperation('add')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '50px',
                      border: '2px solid #16A34A', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: '0.2s',
                      backgroundColor: behaviorOperation === 'add' ? '#16A34A' : 'transparent',
                      color: behaviorOperation === 'add' ? '#fff' : '#16A34A'
                    }}
                  >
                    <ArrowUp size={16} /> زيادة
                  </button>
                  <button
                    onClick={() => setBehaviorOperation('deduct')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '50px',
                      border: '2px solid #DC2626', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: '0.2s',
                      backgroundColor: behaviorOperation === 'deduct' ? '#DC2626' : 'transparent',
                      color: behaviorOperation === 'deduct' ? '#fff' : '#DC2626'
                    }}
                  >
                    <ArrowDown size={16} /> خصم
                  </button>
                </div>
              </div>

              {/* القيمة */}
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>القيمة (عدد النقاط)</h2>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button onClick={() => setBehaviorPoints(prev => prev + 1)} style={{ width: '40px', height: '40px', border: '1px solid #E5E7EB', borderLeft: 'none', background: '#fff', fontSize: '16px', cursor: 'pointer' }}><Plus size={18}/></button>
                  <div style={{ width: '50px', height: '40px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800 }}>{behaviorPoints}</div>
                  <button onClick={() => setBehaviorPoints(prev => Math.max(0, prev - 1))} style={{ width: '40px', height: '40px', border: '1px solid #E5E7EB', borderRight: 'none', background: '#fff', fontSize: '16px', cursor: 'pointer' }}><Minus size={18}/></button>
                </div>
              </div>

              {/* المتوقع */}
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>المتوقع</h2>
                <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ backgroundColor: '#2563EB', color: '#fff', padding: '6px 16px', borderRadius: '10px', fontSize: '20px', fontWeight: 800, textAlign: 'center' }}>
                    {Math.max(0, Math.min(100, behaviorOperation === 'add' ? (selectedStudentForBehavior.score || 0) + behaviorPoints : (selectedStudentForBehavior.score || 0) - behaviorPoints))}
                  </div>
                  <div style={{ fontSize: '12px', color: '#4B5563', fontWeight: 600 }}>الحدود 0-100</div>
                </div>
              </div>
            </div>

            {/* الأدلة */}
            <div style={{ marginTop: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>الدليل (اختياري)</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <button
                  onClick={() => { 
                    setEvidenceType('none'); 
                    setEvidenceFile(null); 
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '50px',
                    border: '2px solid #2563EB', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: '0.2s',
                    backgroundColor: evidenceType === 'none' ? '#2563EB' : 'transparent',
                    color: evidenceType === 'none' ? '#fff' : '#2563EB'
                  }}
                >
                  <Ban size={16} /> بدون مرفق
                </button>
                <button
                  onClick={() => { setEvidenceType('image'); setEvidenceFile(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '50px',
                    border: '2px solid #2563EB', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: '0.2s',
                    backgroundColor: evidenceType === 'image' ? '#2563EB' : 'transparent',
                    color: evidenceType === 'image' ? '#fff' : '#2563EB'
                  }}
                >
                  <Image size={16} /> صورة
                </button>
                <button
                  onClick={() => { setEvidenceType('video'); setEvidenceFile(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '50px',
                    border: '2px solid #2563EB', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: '0.2s',
                    backgroundColor: evidenceType === 'video' ? '#2563EB' : 'transparent',
                    color: evidenceType === 'video' ? '#fff' : '#2563EB'
                  }}
                >
                  <Video size={16} /> فيديو
                </button>
                {evidenceType !== 'none' && (
                  <div style={{ flex: '1 1 200px', position: 'relative' }}>
                    <input 
                      type="file" 
                      id="behavior-file-input"
                      accept={evidenceType === 'image' ? "image/*" : "video/*"}
                      onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                      style={{ display: 'none' }}
                    />
                    <label 
                      htmlFor="behavior-file-input"
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', 
                        border: '2px dashed #B0D8DA', borderRadius: '10px', backgroundColor: '#F0F9FA',
                        fontSize: '13px', color: '#2D7D82', cursor: 'pointer', height: '38px', boxSizing: 'border-box'
                      }}
                    >
                      {evidenceFile ? (
                        <span style={{ fontWeight: 600 }}>{evidenceFile.name.length > 20 ? evidenceFile.name.substring(0,20)+'...' : evidenceFile.name}</span>
                      ) : (
                        <>اضغط لاختيار {evidenceType === 'image' ? 'صورة' : 'فيديو'}</>
                      )}
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid #E5E7EB', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <button onClick={() => setShowBehaviorModal(false)} style={{ fontSize: '16px', fontWeight: 700, color: '#111827', background: 'none', border: 'none', cursor: 'pointer' }}>إلغاء</button>
            <button 
               onClick={async () => {
                if (behaviorStatement.length < 10) {
                  toast.error('نص البيان إلزامي (حد أدنى 10 أحرف).')
                  return
                }
                if (behaviorPoints <= 0) {
                  toast.error('يرجى تحديد عدد نقاط أكبر من صفر')
                  return
                }
                setSavingBehavior(true)
                
                const formData = new FormData();
                formData.append('statement', behaviorStatement);
                formData.append('operationType', behaviorOperation);
                formData.append('points', behaviorPoints.toString());
                
                // حساب الدرجة المتوقعة لإرسالها
                const expected = Math.max(0, Math.min(100, behaviorOperation === 'add' 
                  ? (selectedStudentForBehavior.score || 0) + behaviorPoints 
                  : (selectedStudentForBehavior.score || 0) - behaviorPoints));
                formData.append('expectedScore', expected.toString());

                if (evidenceType !== 'none') {
                  formData.append('evidenceType', evidenceType);
                  if (evidenceFile) formData.append('file', evidenceFile);
                }

                try {
                  await api.post(`/api/school/${schemaName}/classrooms/${selectedClassroom!.id}/students/${selectedStudentForBehavior.id}/behavior`, formData);

                  toast.success(`تم تسجيل سلوك للطالب ${selectedStudentForBehavior.fullName}`)
                  // تحديث القائمة بعد الحفظ
                  const res = await api.get(`/api/school/${schemaName}/classrooms/${selectedClassroom!.id}/students`)
                  setStudents(res.data.map((s: ApiStudentResponse) => ({ id: s.id, fullName: s.fullName, score: s.expected_score ?? s.behaviorScore ?? 80 })))
                  setShowBehaviorModal(false)
                } catch (err) {
                  const error = err as AxiosError<{ message?: string }>
                  toast.error(error.response?.data?.message || error.message || 'تعذر حفظ السلوك')
                } finally {
                  setSavingBehavior(false)
                }
               }}
               disabled={savingBehavior}
               style={{
                 backgroundColor: '#3B82F6', color: '#fff', padding: '10px 32px', borderRadius: '10px', fontSize: '16px', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', opacity: savingBehavior ? 0.7 : 1
               }}
            >
              {savingBehavior ? 'جارٍ الحفظ...' : 'حفظ'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* نافذة معاينة الدليل (صورة/فيديو) */}
    {previewEvidence && (
      <div style={modalOverlayStyle}>
        <div style={{ ...modalContentStyle, maxWidth: '800px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>معاينة المرفق</h3>
            <button onClick={() => setPreviewEvidence(null)} style={closeButtonStyle}><X size={18} /></button>
          </div>
          
          {previewEvidence.type === 'image' ? (
            <img src={previewEvidence.url} alt="الدليل" style={{ width: '100%', borderRadius: '8px', maxHeight: '70vh', objectFit: 'contain' }} />
          ) : (
            <video src={previewEvidence.url} controls style={{ width: '100%', borderRadius: '8px' }} />
          )}
          
          <div style={{ marginTop: '20px', fontSize: '14px', color: '#6B7280' }}>
             اسم الملف: {previewEvidence.url}
             <p style={{ marginTop: '5px', color: '#9CA3AF' }}>(ملاحظة: يتطلب عرض الملفات الحقيقية ربطها بخدمة تخزين سحابية)</p>
          </div>
          
          <button onClick={() => setPreviewEvidence(null)} style={{ ...btnBaseStyle, backgroundColor: '#9EC5C7', width: '100%', marginTop: '20px' }}>
            إغلاق المعاينة
          </button>
        </div>
      </div>
    )}
    </>
  )
}

const headerStyle: React.CSSProperties = { background: '#9EC5C7', color: '#fff', padding: '14px', borderRadius: '12px', textAlign: 'center', fontWeight: 600, fontSize: '16px', marginBottom: '20px' }
const dropdownButtonStyle: React.CSSProperties = { width: '100%', background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: '#374151', fontWeight: 700, fontSize: '15px', outline: 'none' }
const practicesGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '12px', padding: '16px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '12px' }
const categoryCardStyle: React.CSSProperties = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '15px' }
const practiceItemStyle: React.CSSProperties = { background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: '8px', padding: '10px' }
const classroomGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }
const classroomCardStyle: React.CSSProperties = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '10px' } // تم الإبقاء على هذا النمط
const cardStatRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '8px 0', borderBottom: '1px dashed #F3F4F6' }
const cardStatLabel: React.CSSProperties = { color: '#6B7280', fontWeight: 500 }
const manageButtonStyle: React.CSSProperties = { marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', backgroundColor: '#E8F4F5', color: '#2D7D82', border: '1px solid #B0D8DA', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, transition: 'all 0.2s' }
const thStyle: React.CSSProperties = { border: '1px solid #E5E7EB', padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '13px' }
const tdStyle: React.CSSProperties = { border: '1px solid #E5E7EB', padding: '12px 16px', textAlign: 'center', color: '#374151', fontSize: '14px' }

const inputStyle: React.CSSProperties = { width: '100%', height: '38px', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '0 12px', fontSize: '13px', textAlign: 'right', outline: 'none', boxSizing: 'border-box' }
const btnBaseStyle: React.CSSProperties = { padding: '12px', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }
const filterButtonStyle = (active: boolean): React.CSSProperties => ({ padding: '8px 16px', borderRadius: '8px', border: active ? '1px solid #9EC5C7' : '1px solid #E5E7EB', background: active ? '#E8F4F5' : '#fff', color: active ? '#2D7D82' : '#6B7280', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' })
const statCardStyle: React.CSSProperties = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }
const statLabelStyle: React.CSSProperties = { color: '#6B7280', fontSize: '12px', fontWeight: 600 }
const statValueStyle: React.CSSProperties = { fontSize: '24px', fontWeight: 800, color: '#374151' }
const miniFilterLink: React.CSSProperties = { background: 'none', border: 'none', color: '#B0D8DA', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }
const actionBtnIconStyle = (bg: string, color: string): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: bg, color: color, border: `1px solid ${color}44`, borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 })

// أنماط النافذة المنبثقة (Modal Styles)
const miniBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '4px 12px', borderRadius: '6px', border: active ? '1px solid #9EC5C7' : '1px solid #E5E7EB',
  background: active ? '#E8F4F5' : '#fff', color: active ? '#2D7D82' : '#6B7280',
  fontSize: '11px', fontWeight: 600, cursor: 'pointer'
})

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)',
}
const modalContentStyle: React.CSSProperties = {
  backgroundColor: '#fff', borderRadius: '16px', padding: '32px',
  width: '95%', maxWidth: '900px', maxHeight: '95vh', overflowY: 'auto', direction: 'rtl',
}
const closeButtonStyle: React.CSSProperties = {
  border: 'none', background: '#F3F4F6', borderRadius: '50%',
  width: '36px', height: '36px', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280',
}
