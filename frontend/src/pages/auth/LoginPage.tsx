import { useState } from 'react'
import type { FormEvent } from 'react'
import { AxiosError } from 'axios'
import { useNavigate } from 'react-router-dom'
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
      <label
        style={{
          display: 'block',
          marginBottom: '8px',
          color: '#7B7B7B',
          fontSize: '14px',
          fontWeight: 600,
          textAlign: 'right',
        }}
      >
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
        }}
      />
    </div>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await api.post('/api/auth/login', {
        email: email.trim(),
        password,
      })

      const data = response.data;
      const { token, name, role, schoolCode } = data;
      
      const finalId = data.id || data.userId || data.user?.id || data.user?.userId;

      // حفظ بيانات الجلسة
      setAuth(token, name, role, 'PLATFORM', finalId);
      console.log("LoginPage: finalId sent to AuthStore:", finalId);

      // التوجيه بناءً على الصلاحية
      if (role === 'SCHOOL_ADMIN' && schoolCode) {
        navigate(`/school/${schoolCode}/dashboard`, { replace: true })
      } else if (role === 'TEACHER' && schoolCode) {
        navigate(`/school/${schoolCode}/teacher-dashboard`, { replace: true })
      } else {
        navigate('/platform/dashboard', { replace: true })
      }
    } catch (err) {
      const status = (err as AxiosError).response?.status
      setError(
        status === 401 || status === 403
          ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
          : 'تعذر تسجيل الدخول الآن. تأكد من تشغيل الخادم ثم حاول مرة أخرى'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#B0D8DA',
        overflowX: 'hidden',
      }}
    >
      <style>{`
        .login-layout {
          min-height: 100vh;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
        }

        .login-left {
          position: relative;
          padding: 20px 20px 0;
          overflow: visible;
          min-height: 46vh;
        }

        .login-right {
          background-color: #FFFFFF;
          min-height: 54vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          border-top-left-radius: 30px;
          border-top-right-radius: 30px;
        }

        .login-copy {
          max-width: 620px;
          margin: 48px auto 0;
          text-align: center;
          color: #715B5B;
          padding-inline: 16px;
        }

        .login-copy-eyebrow {
          margin: 0;
          font-size: clamp(16px, 1.6vw, 20px);
          font-weight: 500;
          line-height: 1.35;
        }

        .login-copy-title {
          margin: 28px 0 0;
          font-size: clamp(22px, 2.4vw, 28px);
          font-weight: 600;
          line-height: 1.35;
        }

        .login-copy-subtitle {
          margin: 20px 0 0;
          font-size: clamp(18px, 2vw, 24px);
          font-weight: 500;
          line-height: 1.5;
        }

        .login-art {
          position: relative;
          display: flex;
          justify-content: center;
          margin-top: 8px;
          padding-inline: 8px;
        }

        .login-illustration {
          width: min(100%, 680px);
          height: auto;
          object-fit: contain;
        }

       .login-tree {
  position: absolute;
  right: -12px;
  top: 60%;
  transform: translateY(-30%);
  width: clamp(50px, 10vw, 100px); 
  height: auto;
  object-fit: contain;
  z-index: 3;
}

        @media (min-width: 1024px) {
          .login-layout {
            grid-template-columns: minmax(360px, 0.8fr) minmax(560px, 1.2fr);
            min-height: 100vh;
          }

          .login-left {
            min-height: 100vh;
          }

          .login-right {
            min-height: 100vh;
            border-top-right-radius: 0;
            border-bottom-left-radius: 30px;
            border-top-left-radius: 30px;
          }

          .login-copy {
            margin: 72px auto 0;
          }

          .login-illustration {
            width: min(118%, 980px);
          }

          .login-tree {
    right: -92px;
    top: 45%;
    width: clamp(80px, 8vw, 140px);
  }
        }

        @media (max-width: 640px) {
          .login-left {
            padding: 16px 14px 0;
          }

          .login-copy {
            margin-top: 28px;
            padding-inline: 8px;
          }

          .login-copy-title {
            margin-top: 18px;
          }

          .login-copy-subtitle {
            margin-top: 14px;
          }

          .login-art {
            margin-top: 4px;
            padding-inline: 0;
          }

          .login-illustration {
            width: min(108%, 560px);
          }

          .login-tree {
    right: 0;
    top: 55%;
    width: clamp(40px, 12vw, 80px);
  }

          .login-right {
            padding: 28px 16px;
          }
        }
      `}</style>

      <div className="login-layout" style={{ direction: 'ltr' }}>
        <section className="login-left">
          <img
            src={smallLogo}
            alt="معين"
            style={{
              width: '95px',
              maxWidth: '24vw',
              height: 'auto',
              objectFit: 'contain',
            }}
          />

          <div className="login-copy">
            <p className="login-copy-eyebrow">
              معين... لأن التنظيم يصنع الفرق...
            </p>

            <p className="login-copy-title">
              إدارة متكاملة. متابعة دقيقة. أداء أفضل
            </p>

            <p className="login-copy-subtitle">
              نظام إدارة مدرسي متكامل يجمع كل ما تحتاجه في مكان واحد
            </p>
          </div>

          <div className="login-art">
            <img src={illustration} alt="" className="login-illustration" />
            <img src={tree} alt="" className="login-tree" />
          </div>
        </section>

        <section className="login-right">
          <div
            style={{
              width: '100%',
              maxWidth: '620px',
            }}
          >
            <img
              src={logo}
              alt="معين"
              style={{
                width: 'min(100%, 310px)',
                height: 'auto',
                objectFit: 'contain',
                margin: '0 auto 40px',
                display: 'block',
              }}
            />

            <form
              onSubmit={handleSubmit}
              style={{
                width: '100%',
                maxWidth: '587px',
                margin: '0 auto',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gap: '18px',
                }}
              >
                <Field
                  label="البريد الإلكتروني"
                  type="email"
                  placeholder="admin@mueen.com"
                  value={email}
                  onChange={setEmail}
                  disabled={isSubmitting}
                />
                <Field
                  label="كلمة المرور"
                  type="password"
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChange={setPassword}
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <div
                  role="alert"
                  style={{
                    marginTop: '16px',
                    borderRadius: '8px',
                    backgroundColor: '#FEF2F2',
                    color: '#B91C1C',
                    fontSize: '14px',
                    fontWeight: 600,
                    lineHeight: 1.7,
                    padding: '12px 14px',
                    textAlign: 'right',
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  minHeight: '63px',
                  border: 'none',
                  borderRadius: '7px',
                  backgroundColor: '#B0D8DA',
                  color: '#FFFFFF',
                  fontSize: '20px',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  marginTop: '28px',
                  opacity: isSubmitting ? 0.78 : 1,
                }}
              >
                {isSubmitting ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
              </button>

              <div
                style={{
                  marginTop: '24px',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                  fontSize: '16px',
                }}
              >
                <span style={{ color: '#000000' }}>ليس لديك حساب؟</span>
                <span style={{ color: '#B0D8DA' }}>
                  تواصل مع الإدارة الآن
                </span>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}
