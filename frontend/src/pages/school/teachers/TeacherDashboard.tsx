import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { flushSync } from 'react-dom'
import { useAuthStore } from '../../../store/authStore'
import logo from '../../../assets/logo.png'
import api from '../../../api/axios'
import { LogOut, BookOpen, Users, Table, FileText, Clock } from 'lucide-react'
import ClassroomSchedule from '../ClassroomSchedule'
import TeacherStudent from './TeacherStudent'
import TeacherSchedule from './TeacherSchedule'
import TeacherPlan from './TeacherPlan'

interface Classroom {
  id: number
  name: string
}

export default function TeacherDashboard() {
  const { schoolCode } = useParams<{ schoolCode: string }>()
  const { name, logout, teacherId, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [activePage, setActivePage] = useState('waitlist')
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null)
  const [showClassroomPage, setShowClassroomPage] = useState(false)
  const [classroomAction, setClassroomAction] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const schemaName = `school_${schoolCode}`.toLowerCase()

  useEffect(() => {
    if (isAuthenticated === false) {
      navigate(`/school/${schoolCode}/login`, { replace: true });
    }
  }, [isAuthenticated, navigate, schoolCode]);

useEffect(() => {
  let cancelled = false
  // جلب الفصول فقط إذا كان المعلم مسجل دخول
  if (teacherId && isAuthenticated) {
     const fetchClassrooms = async () => {
       try {
         setLoading(true)
         const res = await api.get<Classroom[]>(`/api/school/${schemaName}/teachers/my-classrooms?teacherId=${teacherId}`)
         if (!cancelled) {
           setClassrooms(res.data)
           setLoading(false)
         }
       } catch {
         if (!cancelled) {
           try {
             const r = await api.get<Classroom[]>(`/api/school/${schemaName}/classrooms`)
             if (!cancelled) {
               setClassrooms(r.data)
               setLoading(false)
             }
           } catch {
             if (!cancelled) setLoading(false)
           }
         }
       }
     }
     fetchClassrooms()
  } else {
    flushSync(() => {
      setLoading(false)
    })
  }
  return () => { cancelled = true }
}, [schemaName, teacherId, isAuthenticated])

  // منع تعليق الصفحة. ننتظر فقط إذا كانت حالة المصادقة غير معروفة بعد.
  // أما إذا كان غير مسجل دخول (false) فسيتم تحويله عبر useEffect أعلاه.
  if (isAuthenticated === undefined) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>جارٍ تحميل بيانات المعلم...</div>
      </div>
    );
  }

  const handleLogout = () => {
    logout()
    navigate(`/school/${schoolCode}/login`, { replace: true })
  }

  const menuItems = [
        { key: 'waitlist', label: 'الجداول', icon: <Clock size={18} /> },
    { key: 'classrooms', label: 'فصولي', icon: <BookOpen size={18} /> },

  ]

  const classroomActions = [
    { key: 'schedule', label: 'عرض الجدول', icon: <Table size={20} />, color: '#2D7D82', bg: '#E8F4F5' },
    { key: 'plan', label: 'خطة الدروس', icon: <FileText size={20} />, color: '#7C3AED', bg: '#F5F3FF' },
    { key: 'students', label: 'الطلاب', icon: <Users size={20} />, color: '#1D4ED8', bg: '#DBEAFE' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', direction: 'rtl', backgroundColor: '#F9FAFB' }}>

      {/* Sidebar */}
      <aside style={{
        width: '220px', backgroundColor: '#FFFFFF', borderLeft: '1px solid #E5E7EB',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '10px 0', position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 10,
      }}>
        <div>
          <div style={{ padding: '0 10px 10px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'center' }}>
            <img src={logo} alt="معين" style={{ width: '100%', maxWidth: '140px', height: 'auto', objectFit: 'contain' }} />
          </div>
          <nav style={{ padding: '16px 0' }}>
            {menuItems.map((item) => (
              <button key={item.key} onClick={() => { setActivePage(item.key); setShowClassroomPage(false) }} style={{
                width: '93%', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px',
                color: activePage === item.key ? '#2D7D82' : '#6B7280',
                fontSize: '14px', cursor: 'pointer', textAlign: 'right',
                borderRadius: '10px', marginLeft: '5px', marginRight: '5px',
                backgroundColor: activePage === item.key ? '#F4F8FB' : 'transparent',
                fontWeight: activePage === item.key ? 600 : 400,
                borderRight: activePage === item.key ? '3px solid #2D7D82' : '3px solid transparent',
              }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <button onClick={handleLogout} style={{
          margin: '0 16px', padding: '10px', border: 'none', backgroundColor: 'transparent',
          color: '#6B7280', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <LogOut size={16} style={{ transform: 'rotate(180deg)' }} />
          <span>تسجيل الخروج</span>
        </button>
      </aside>

      {/* Main */}
      <div style={{ marginRight: '220px', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <header style={{
          backgroundColor: '#FFFFFF', borderBottom: '1px solid #E5E7EB', padding: '16px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280', fontSize: '14px' }}>
            {showClassroomPage && selectedClassroom && (
              <button
                onClick={() => { setShowClassroomPage(false); setClassroomAction(null); setSelectedClassroom(null); }}
                style={{ border: 'none', background: '#F3F4F6', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                ← رجوع
              </button>
            )}
          </div>
          <div style={{ color: '#374151', fontSize: '16px', fontWeight: 600 }}>
            {showClassroomPage && selectedClassroom ? selectedClassroom.name : 'لوحة تحكم المعلم'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6B7280', fontSize: '14px' }}>
            <Users size={16} />
            <span>{name}</span>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: '32px' }}>

          {/* صفحة الفصول */}
          {activePage === 'classrooms' && !showClassroomPage && (
            <div>
              <div style={{
                background: '#9EC5C7', color: '#fff', padding: '14px',
                borderRadius: '12px', textAlign: 'center', fontWeight: 600,
                fontSize: '16px', marginBottom: '24px',
              }}>
                فصولي الدراسية
              </div>

              {loading ? (
                <p style={{ textAlign: 'center', color: '#9CA3AF' }}>جارٍ التحميل...</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                  {classrooms.map(cls => (
                    <div
                      key={cls.id}
                      style={{
                        padding: '24px 16px', border: '1px solid #E5E7EB',
                        borderRadius: '16px', textAlign: 'center',
                        backgroundColor: '#fff', color: '#374151',
                        fontSize: '15px', fontWeight: 600,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        transition: 'all 0.2s',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                      }}
                    >
                      <div style={{
                        width: '56px', height: '56px', borderRadius: '14px',
                        backgroundColor: '#E8F4F5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <BookOpen size={24} color="#2D7D82" />
                      </div>
                      <span style={{ fontSize: '18px', marginBottom: '8px' }}>{cls.name}</span>
                      
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gap: '8px', 
                        width: '100%', 
                        borderTop: '1px solid #F3F4F6', 
                        paddingTop: '12px' 
                      }}>
                        {classroomActions.map(action => (
                          <button
                            key={action.key}
                            onClick={() => {
                              setSelectedClassroom(cls);
                              setShowClassroomPage(true);
                              setClassroomAction(action.key);
                            }}
                            style={{
                              padding: '8px 4px', borderRadius: '8px', border: 'none',
                              backgroundColor: action.bg, color: action.color,
                              fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'row', // جعل الأيقونة والنص في سطر واحد
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px', // مسافة موحدة بين الأيقونة والنص
                              gridColumn: action.key === 'students' ? 'span 2' : 'auto'
                            }}
                          >
                            {React.cloneElement(action.icon as React.ReactElement<{ size?: number }>, { size: 14 })}
                            <span>{action.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {classrooms.length === 0 && (
                    <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#9CA3AF', padding: '48px' }}>
                      لا توجد فصول مسندة إليك بعد
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* صفحة الفصل المحدد */}
          {activePage === 'classrooms' && showClassroomPage && selectedClassroom && !classroomAction && (
            <div>
              <div style={{
                background: '#9EC5C7', color: '#fff', padding: '14px',
                borderRadius: '12px', textAlign: 'center', fontWeight: 600,
                fontSize: '16px', marginBottom: '24px',
              }}>
                {selectedClassroom.name}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
                {classroomActions.map(action => (
                  <button
                    key={action.key}
                    onClick={() => setClassroomAction(action.key)}
                    style={{
                      padding: '24px 16px', border: '1px solid #E5E7EB',
                      borderRadius: '16px', cursor: 'pointer', textAlign: 'center',
                      backgroundColor: '#fff', color: action.color,
                      fontSize: '14px', fontWeight: 600,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = action.bg }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff' }}
                  >
                    <div style={{
                      width: '52px', height: '52px', borderRadius: '14px',
                      backgroundColor: action.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {action.icon}
                    </div>
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* إجراءات الفصل */}
          {activePage === 'classrooms' && showClassroomPage && selectedClassroom && classroomAction && (
            <div>
              {classroomAction !== 'students' && (
                <button
                  onClick={() => setClassroomAction(null)}
                  style={{ border: 'none', background: '#F3F4F6', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', color: '#6B7280', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  ← رجوع
                </button>
              )}

              {classroomAction === 'students' && (
                <TeacherStudent
                  classroomId={selectedClassroom.id}
                  classroomName={selectedClassroom.name}
                  schemaName={schemaName}
                  onClose={() => setClassroomAction(null)}
                />
              )}

              {classroomAction === 'plan' && (
                <TeacherPlan
                  classroomId={selectedClassroom.id}
                  classroomName={selectedClassroom.name}
                  schemaName={schemaName}
                  teacherId={teacherId || 0}
                />
              )}

              {!['schedule', 'students', 'plan'].includes(classroomAction) && (
                <div style={{
                  background: '#9EC5C7', color: '#fff', padding: '14px',
                  borderRadius: '12px', textAlign: 'center', fontWeight: 600, fontSize: '16px',
                }}>
                  {classroomActions.find(a => a.key === classroomAction)?.label} — قريباً
                </div>
              )}
            </div>
          )}

          {activePage === 'waitlist' && (
            
            <div style={{ background: '#fff', borderRadius: '16px' }}>
                <div style={{
                background: '#9EC5C7', color: '#fff', padding: '14px',
                borderRadius: '12px', textAlign: 'center', fontWeight: 600,
                fontSize: '16px', marginBottom: '24px',
              }}>
               الجداول
              </div>
              <TeacherSchedule 
                schemaName={schemaName} 
                teacherId={teacherId || 0} 
              />
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {classroomAction === 'schedule' && selectedClassroom && (
        <ClassroomSchedule
          classroomId={selectedClassroom.id}
          classroomName={selectedClassroom.name}
          schemaName={schemaName}
          onClose={() => { setClassroomAction(null); setShowClassroomPage(false); setSelectedClassroom(null); }}
          readOnly={true}
        />
      )}
    </div>
  )
}
