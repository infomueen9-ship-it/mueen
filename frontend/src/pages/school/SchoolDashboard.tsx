import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../api/axios'
//import toast from 'react-hot-toast'
import logo from '../../assets/logo.png'
import SchedulesView from './SchedulesView'
import TeachersPage from './TeachersPage'
import BehaviorPage from './BehaviorPage'
import AttendancePage from './AttendancePage'
import MessagesPage from './MessagesPage'
import WaitingMuPage from './WaitingMuPage'
import {
  Calendar,
  Users,
  ClipboardList,
  MessageSquare,
  Clock,
  CheckCircle2,
  X,
  Phone,
  User,
  Smartphone
} from 'lucide-react'

export default function SchoolDashboard() {
  const { schoolCode } = useParams<{ schoolCode: string }>()
  const { name, logout } = useAuthStore()
  const navigate = useNavigate()
  const actualSchemaName = `school_${schoolCode}`.toLowerCase();

  // States
  const [activePage, setActivePage] = useState('schedules')
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false)
  const [schoolName, setSchoolName] = useState('جارِ التحميل...')

  useEffect(() => {
    // جلب إعدادات المدرسة للحصول على الاسم الفعلي
    api.get(`/api/school/${actualSchemaName}/settings`)
      .then(res => {
        setSchoolName(res.data.school_name_ar || `مدرسة ${schoolCode}`)
      })
      .catch(() => setSchoolName(`مدرسة ${schoolCode}`))
  }, [actualSchemaName, schoolCode])

  const handleLogout = () => {
    logout()
    navigate(`/school/${schoolCode}/login`, { replace: true })
  }

  const menuItems = [
    { key: 'schedules', label: 'ادارة الجدول', icon: <Calendar size={18} /> },
    { key: 'teachers', label: 'المعلمين', icon: <Users size={18} /> },
    { key: 'behavior', label: 'السلوك', icon: <CheckCircle2 size={18} /> },
    { key: 'attendance', label: 'الحضور', icon: <ClipboardList size={18} /> },
    { key: 'waitlist', label: 'الانتظار والمناوبة', icon: <Clock size={18} /> },
    { key: 'messages', label: 'الرسائل', icon: <MessageSquare size={18} /> },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', direction: 'rtl', backgroundColor: '#F9FAFB' }}>

      {/* Sidebar */}
      <aside style={sidebarStyle}>
        <div>
          <div style={logoContainerStyle}>
            <img src={logo} alt="معين" style={logoStyle} />
          </div>

          <nav style={{ padding: '16px 0' }}>
            {menuItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActivePage(item.key)}
                style={{
                  ...menuButtonStyle,
                  backgroundColor: activePage === item.key ? '#F4F8FB' : 'transparent',
                  fontWeight: activePage === item.key ? 600 : 400,
                  borderRight: activePage === item.key ? '3px solid #B0D8DA' : '3px solid transparent',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <button onClick={handleLogout} style={logoutButtonStyle}>
          <span>→</span>
          <span>تسجيل الخروج</span>
        </button>
      </aside>

      {/* Main Content */}
      <div style={{ marginRight: '220px', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <header style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280', fontSize: '14px' }}>
            <span>👤</span>
            <span>{name}</span>
          </div>
          
          <button
            onClick={() => setIsSchoolModalOpen(true)}
            style={schoolNameButtonStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F3F4F6')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {schoolName}
          </button>

          <div style={{ color: '#B0D8DA', fontSize: '18px', fontWeight: 600 }}>
            ساري: 21 يوم
          </div>
        </header>

        {/* Main Content Area */}
        <main style={mainContentStyle}>
          {activePage === 'schedules' && <SchedulesView schemaName={actualSchemaName} />}
          {activePage === 'teachers' && <TeachersPage schemaName={actualSchemaName} />}
          {activePage === 'behavior' && <BehaviorPage schemaName={actualSchemaName} />}
          {activePage === 'attendance' && <AttendancePage schemaName={actualSchemaName} />}
          {activePage === 'messages' && <MessagesPage schemaName={actualSchemaName} />}
          {activePage === 'waitlist' && <WaitingMuPage schemaName={actualSchemaName} />}
        </main>
      </div>

      {/* School Data Modal (الشاشة المنبثقة) */}
      {isSchoolModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <button onClick={() => setIsSchoolModalOpen(false)} style={closeModalButtonStyle}>
              <X size={18} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <div style={modalIconContainer}>🏫</div>
              <h2 style={{ margin: 0, color: '#374151', fontSize: '20px' }}>{schoolName}</h2>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={modalInfoBox}>
                <div style={iconLabelGroup}><User size={14} color="#9CA3AF" /> <span style={labelLight}>اسم المستخدم</span></div>
                <span style={valueStyle}>{name}</span>
              </div>
              
              <div style={modalInfoBox}>
                <div style={iconLabelGroup}><Phone size={14} color="#9CA3AF" /> <span style={labelLight}>الهاتف</span></div>
                <span style={valueStyle}>011XXXXXXX</span>
              </div>

              <div style={modalInfoBox}>
                <div style={iconLabelGroup}><Smartphone size={14} color="#9CA3AF" /> <span style={labelLight}>رقم الجوال</span></div>
                <span style={valueStyle}>05XXXXXXXX</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={modalInfoBox}>
                  <span style={labelLight}>كود المدرسة</span>
                  <span style={valueStyle}>{schoolCode}</span>
                </div>
                <div style={modalInfoBox}>
                  <span style={labelLight}>تاريخ الانتهاء</span>
                  <span style={valueStyle}>2024/12/30</span>
                </div>
              </div>

              <div style={statusBadgeStyle}>
                <span style={{ color: '#059669', fontSize: '13px', fontWeight: 600 }}>حالة الاشتراك</span>
                <span style={activeBadgeStyle}>نشط - بقية 21 يوم</span>
              </div>
            </div>

            {/* أزرار الإجراءات */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
               <button 
                onClick={() => console.log('Edit Profile')}
                style={{ ...modalActionBtn, backgroundColor: '#9EC5C7', flex: 2 }}
              >
                تعديل البيانات
              </button>
              <button 
                onClick={() => setIsSchoolModalOpen(false)}
                style={{ ...modalActionBtn, backgroundColor: '#F3F4F6', color: '#6B7280', flex: 1 }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



const sidebarStyle: React.CSSProperties = {
  width: '220px', backgroundColor: '#FFFFFF', borderLeft: '1px solid #E5E7EB',
  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
  padding: '10px 0', position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 10,
}

const logoContainerStyle: React.CSSProperties = {
  padding: '0 10px 10px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'center',
}

const logoStyle: React.CSSProperties = {
  width: '100%', maxWidth: '140px', height: 'auto', objectFit: 'contain',
}

const menuButtonStyle: React.CSSProperties = {
  width: '93%', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px',
  border: 'none', color: '#6B7280', fontSize: '14px', cursor: 'pointer', textAlign: 'right',
  borderRadius: '10px', marginLeft: '5px', marginRight: '5px',
}

const logoutButtonStyle: React.CSSProperties = {
  margin: '0 16px', padding: '10px', border: 'none', backgroundColor: 'transparent',
  color: '#6B7280', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
}

const headerStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF', borderBottom: '1px solid #E5E7EB', padding: '16px 32px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
}

const schoolNameButtonStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer', color: '#374151',
  fontSize: '16px', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', transition: 'all 0.2s ease',
}

const mainContentStyle: React.CSSProperties = {
  padding: '24px 100px', flex: 1, backgroundColor: '#FFFFFF', margin: '3px 3px 0 0',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
}


// --- Modal Styles ---
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)'
}

const modalContentStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF', width: '95%', maxWidth: '450px', borderRadius: '24px', padding: '30px',
  position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', direction: 'rtl'
}

const closeModalButtonStyle: React.CSSProperties = {
  position: 'absolute', top: '20px', left: '20px', border: 'none', background: '#F3F4F6',
  borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: '#6B7280',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
}

const modalIconContainer: React.CSSProperties = {
  width: '64px', height: '64px', background: '#F4F8FB', borderRadius: '18px',
  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '28px'
}

const modalInfoBox: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 15px',
  background: '#F9FAFB', borderRadius: '12px', border: '1px solid #F3F4F6', textAlign: 'right'
}

const iconLabelGroup: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px'
}

const labelLight: React.CSSProperties = { color: '#9CA3AF', fontSize: '11px', fontWeight: 500 }

const valueStyle: React.CSSProperties = { color: '#374151', fontWeight: 600, fontSize: '14px' }

const statusBadgeStyle: React.CSSProperties = {
  padding: '12px 15px', background: '#ECFDF5', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
}

const activeBadgeStyle: React.CSSProperties = {
  backgroundColor: '#10B981', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600
}

const modalActionBtn: React.CSSProperties = {
  padding: '12px', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', fontSize: '14px', transition: 'opacity 0.2s'
}