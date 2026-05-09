import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/auth/LoginPage'
import SchoolDashboard from './pages/school/SchoolDashboard'
import SchoolLoginPage from './pages/school/SchoolLoginPage'
import { useAuthStore } from './store/authStore'
import DashboardPage from './pages/platform/DashboardPage'
import TeacherDashboard from './pages/school/teachers/TeacherDashboard'
import StudentBehaviorReport from './pages/school/StudentBehaviorReport'

function ProtectedRoute({ children, requiredType }: { children: React.ReactNode, requiredType?: string }) {
  const { token, type } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (requiredType && type !== requiredType) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    
    <Routes>
      {/* Platform */}
      <Route path="/login" element={<LoginPage />} />
      <Route
  path="/platform/dashboard"
  element={
    <ProtectedRoute requiredType="PLATFORM">
      <DashboardPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/school/:schoolCode/classrooms/:classroomId/behavior-report/:studentId"
  element={
    <ProtectedRoute requiredType="SCHOOL">
      <StudentBehaviorReport />
    </ProtectedRoute>
  }
/>

      {/* School — رابط خاص لكل مدرسة */}
      <Route path="/school/:schoolCode/login" element={<SchoolLoginPage />} />
   <Route
  path="/school/:schoolCode/teacher"
  element={
    <ProtectedRoute requiredType="SCHOOL">
      <TeacherDashboard />
    </ProtectedRoute>
  }
/>
<Route
  path="/school/:schoolCode/dashboard"
  element={
    <ProtectedRoute requiredType="SCHOOL">
      <SchoolDashboard />
    </ProtectedRoute>
  }
/>


      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}