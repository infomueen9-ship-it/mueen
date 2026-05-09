import { useState } from 'react'
import type { FormEvent } from 'react'
import { AxiosError } from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
import smallLogo from '../../assets/smalllogo.png'
import illustration from '../../assets/illustration.png'
import tree from '../../assets/tree.png'
import logo from '../../assets/logo.png'
import api from '../../api/axios'
import { useAuthStore } from '../../store/authStore'

function Field({
  label,
  type,
  placeholder,
  value,
  onChange,
  disabled,
}: {
  label: string
  type: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div style={{ width: '100%' }}>
      <label style={{
        display: 'block',
        marginBottom: '8px',
        color: '#7B7B7B',
        fontSize: '14px',
        fontWeight: 600,
        textAlign: 'right',
      }}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required
        dir="rtl"
        style={{
          width: '100%',
          height: '56px',
          border: '2px solid #D1D5DB',
          borderRadius: '10px',
          padding: '0 18px',
          textAlign: 'right',
          fontSize: '16px',
          outline: 'none',
          backgroundColor: '#FFFFFF',
          opacity: disabled ? 0.72 : 1,
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

export default function SchoolLoginPage() {
  const navigate = useNavigate()
  const { schoolCode } = useParams<{ schoolCode: string }>()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

 async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
  setError('')
  setIsSubmitting(true)

  try {
    const response = await api.post(`/api/auth/school/${schoolCode}/login`, {
      username: username.trim(),
      password,
    })

    const data = response.data;
    const { token, name, role } = data;
    
    // التقاط المعرف من الحقول المسطحة أو من داخل كائن user إذا وجد
    const finalUserId = data.teacherId || data.userId || data.id || data.user?.id || data.user?.teacherId;

    setAuth(token, name, role, 'SCHOOL', finalUserId);
    console.log("SchoolLoginPage: finalUserId sent to AuthStore:", finalUserId);

    // توجيه حسب الصلاحية
    if (role === 'PRINCIPAL' || role === 'ADMIN') {
      navigate(`/school/${schoolCode}/dashboard`, { replace: true })
    } else if (role === 'TEACHER') {
      navigate(`/school/${schoolCode}/teacher`, { replace: true })
    } else {
      navigate(`/school/${schoolCode}/dashboard`, { replace: true })
    }

  } catch (err) {
    const status = (err as AxiosError).response?.status
    setError(
      status === 401 || status === 403
        ? 'اسم المستخدم أو كلمة المرور غير صحيحة'
        : 'تعذر تسجيل الدخول. تأكد من البيانات وحاول مجدداً'
    )
  } finally {
    setIsSubmitting(false)
  }
}

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#B0D8DA', overflowX: 'hidden' }}>
      <style>{`
        .login-layout { min-height: 100vh; display: grid; grid-template-columns: minmax(0, 1fr); }
        .login-left { position: relative; padding: 20px 20px 0; overflow: visible; min-height: 46vh; }
        .login-right { background-color: #FFFFFF; min-height: 54vh; display: flex; align-items: center; justify-content: center; padding: 40px 24px; border-top-left-radius: 30px; border-top-right-radius: 30px; }
        .login-copy { max-width: 620px; margin: 48px auto 0; text-align: center; color: #715B5B; padding-inline: 16px; }
        .login-art { position: relative; display: flex; justify-content: center; margin-top: 8px; }
        .login-illustration { width: min(100%, 680px); height: auto; object-fit: contain; }
        .login-tree { position: absolute; right: -12px; top: 70%; transform: translateY(-50%); width: min(26vw, 150px); z-index: 3; }
        @media (min-width: 1024px) {
          .login-layout { grid-template-columns: minmax(360px, 0.8fr) minmax(560px, 1.2fr); }
          .login-right { border-top-right-radius: 0; border-bottom-left-radius: 30px; border-top-left-radius: 30px; }
        }
      `}</style>

      <div className="login-layout" style={{ direction: 'ltr' }}>
        <section className="login-left">
          <img src={smallLogo} alt="معين" style={{ width: '95px', maxWidth: '24vw' }} />
          <div className="login-copy">
            <p style={{ fontSize: '20px', fontWeight: 500 }}>معين... لأن التنظيم يصنع الفرق...</p>
            <p style={{ fontSize: '28px', fontWeight: 600, marginTop: '28px' }}>إدارة متكاملة. متابعة دقيقة. أداء أفضل</p>
            <p style={{ fontSize: '24px', fontWeight: 500, marginTop: '20px' }}>نظام إدارة مدرسي متكامل يجمع كل ما تحتاجه في مكان واحد</p>
          </div>
          <div className="login-art">
            <img src={illustration} alt="" className="login-illustration" />
            <img src={tree} alt="" className="login-tree" />
          </div>
        </section>

        <section className="login-right">
          <div style={{ width: '100%', maxWidth: '620px' }}>
            <img src={logo} alt="معين" style={{ width: '310px', margin: '0 auto 32px', display: 'block' }} />
            <p style={{ textAlign: 'center', color: '#6B7280', fontSize: '15px', marginBottom: '28px' }}>تسجيل دخول المدرسة</p>
            <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '587px', margin: '0 auto' }}>
              <div style={{ display: 'grid', gap: '18px' }}>
                <Field label="اسم المستخدم" type="text" placeholder="sara.ahmed" value={username} onChange={setUsername} disabled={isSubmitting} />
                <Field label="كلمة المرور" type="password" placeholder="أدخل كلمة المرور" value={password} onChange={setPassword} disabled={isSubmitting} />
              </div>
              {error && (
                <div role="alert" style={{ marginTop: '16px', borderRadius: '8px', backgroundColor: '#FEF2F2', color: '#B91C1C', fontSize: '14px', padding: '12px 14px', textAlign: 'right' }}>
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%', minHeight: '63px', border: 'none', borderRadius: '7px',
                  backgroundColor: '#B0D8DA', color: '#FFFFFF', fontSize: '20px', fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer', marginTop: '28px'
                }}
              >
                {isSubmitting ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
              </button>
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '16px', direction: 'rtl' }}>
                <span>ليس لديك حساب؟</span>
                <span style={{ color: '#B0D8DA', cursor: 'pointer' }}>تواصل مع الإدارة الآن</span>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}