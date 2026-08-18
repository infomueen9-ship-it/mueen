import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import SchoolsPage from './SchoolsPage'
import StudyPlansPage from './StudyPlansPage'
import logo from '../../assets/logo.png'

export default function DashboardPage() {
  const { name, role, logout } = useAuthStore()
  const navigate = useNavigate()
  const [activePage, setActivePage] = useState('schools')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex" style={{ direction: 'rtl' }}>

      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-sm flex flex-col">
        <div className="p-6 border-b flex flex-col items-center">
          <img src={logo} alt="شعار" className="w-full max-w-[140px] h-auto object-contain" />
          <p className="text-xs text-gray-400 mt-2">لوحة تحكم المنصة</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActivePage('schools')}
            className={`w-full text-right px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activePage === 'schools'
                ? 'bg-blue-50 text-[#1a73e8]'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            🏫 المدارس
          </button>
          <button
            onClick={() => setActivePage('studyPlans')}
            className={`w-full text-right px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activePage === 'studyPlans'
                ? 'bg-blue-50 text-[#1a73e8]'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            📘 الخطط الدراسية
          </button>
          <button
            onClick={() => setActivePage('plans')}
            className={`w-full text-right px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activePage === 'plans'
                ? 'bg-blue-50 text-[#1a73e8]'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            📦 الباقات
          </button>
        </nav>

        {/* User Info */}
        <div className="p-4 border-t">
          <p className="text-sm font-medium text-gray-700">{name}</p>
          <p className="text-xs text-gray-400">{role}</p>
          <button
            onClick={handleLogout}
            className="mt-2 text-xs text-red-500 hover:underline"
          >
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {activePage === 'schools' && <SchoolsPage />}
        {activePage === 'studyPlans' && <StudyPlansPage />}
        {activePage === 'plans' && (
          <div className="text-gray-400 text-center py-20">
            قريباً — إدارة الباقات
          </div>
        )}
      </main>

    </div>
  )
}