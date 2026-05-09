import { useEffect, useState } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'

interface Tenant {
  id: number
  schoolName: string
  schoolNameAr: string
  schoolCode: string
  email: string
  phone: string
  city: string
  genderType: string
  status: string
  createdAt: string
  schemaName: string
}

export default function SchoolsPage() {
  const [createdSchool, setCreatedSchool] = useState<{schemaName: string, schoolCode: string} | null>(null)
const [principalForm, setPrincipalForm] = useState({ fullName: '', username: '', password: '' })
const [showPrincipalModal, setShowPrincipalModal] = useState(false)
const [savingPrincipal, setSavingPrincipal] = useState(false)
  const [schools, setSchools] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  
const [schoolCredentials, setSchoolCredentials] = useState<Record<string, {username: string, password: string}>>({}) 
 const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    schoolName: '', schoolNameAr: '', schoolCode: '',
    email: '', phone: '', city: '', genderType: 'BOYS'
  })

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const res = await api.get('/api/platform/tenants')
        setSchools(res.data)
      } catch {
        toast.error('تعذر تحميل المدارس')
      } finally {
        setLoading(false)
      }
    }
    fetchSchools()
  }, [])

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  try {
    await api.post('/api/platform/tenants', form)
    toast.success('تم إنشاء المدرسة بنجاح')
    setShowModal(false)
    const schoolCode = form.schoolCode.toLowerCase().replace(/[^a-z0-9]/g, '_')
    const newSchool = { schemaName: `school_${schoolCode}`, schoolCode }
    setCreatedSchool(newSchool)
    setShowPrincipalModal(true)
    const res = await api.get('/api/platform/tenants')
    setSchools(res.data)
    setForm({ schoolName: '', schoolNameAr: '', schoolCode: '', email: '', phone: '', city: '', genderType: 'BOYS' })
  } catch {
    toast.error('تعذر إنشاء المدرسة')
  }
}

  const statusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-700'
      case 'TRIAL': return 'bg-orange-100 text-orange-700'
      case 'SUSPENDED': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'نشط'
      case 'TRIAL': return 'تجربة'
      case 'SUSPENDED': return 'موقوف'
      case 'CANCELLED': return 'ملغي'
      default: return status
    }
  }

  return (
    <div style={{ direction: 'rtl' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">المدارس المشتركة</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#1a73e8] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90"
        >
          + إضافة مدرسة
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-center text-gray-400 py-10">جارٍ التحميل...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
  <table className="w-full text-sm">
    <thead className="bg-gray-50 text-gray-500 border-b">
      <tr>
        <th className="text-right px-4 py-3">#</th>
        <th className="text-right px-4 py-3">اسم المدرسة</th>
        <th className="text-right px-4 py-3">البريد</th>
        <th className="text-right px-4 py-3">المدينة</th>
        <th className="text-right px-4 py-3">الحالة</th>
        <th className="text-right px-4 py-3">رابط الدخول</th>
        <th className="text-right px-4 py-3">واتساب</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100">
      {schools.map((school) => {
        const schoolCode = school.schemaName?.replace('school_', '') || ''
        const loginUrl = `${window.location.origin}/school/${schoolCode}/login`
        return (
          <tr key={school.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 text-gray-400">{school.id}</td>
            <td className="px-4 py-3">
              <p className="font-medium text-gray-800">{school.schoolNameAr}</p>
              <p className="text-gray-400 text-xs">{school.schoolName}</p>
            </td>
            <td className="px-4 py-3 text-gray-600">{school.email}</td>
            <td className="px-4 py-3 text-gray-600">{school.city}</td>
            <td className="px-4 py-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(school.status)}`}>
                {statusLabel(school.status)}
              </span>
            </td>
            <td className="px-4 py-3">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: '#6B7280', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {loginUrl}
                </span>
                <button
                  onClick={() => { navigator.clipboard.writeText(loginUrl); toast.success('تم نسخ الرابط') }}
                  style={{ padding: '4px 8px', backgroundColor: '#E8F4F5', color: '#2D7D82', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap' }}
                >
                  نسخ
                </button>
              </div>
            </td>
            <td className="px-4 py-3">
             <button
  onClick={() => {
   const creds = schoolCredentials[school.schemaName]
    const msg = `مرحباً،\n\nتم إنشاء حساب مدرستكم على منصة معين.\n\n🔗 رابط الدخول:\n${loginUrl}\n\n👤 اسم المستخدم: ${creds?.username || '—'}\n🔑 كلمة المرور: ${creds?.password || '—'}\n\nللاستفسار تواصلوا معنا.`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }}
  style={{ padding: '6px 12px', backgroundColor: '#25D366', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
>
  📱 واتساب
</button>
            </td>
          </tr>
        )
      })}
    </tbody>
  </table>
  {schools.length === 0 && (
    <p className="text-center text-gray-400 py-10">لا توجد مدارس بعد</p>
  )}
</div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-xl">
            <h3 className="text-xl font-bold text-gray-800 mb-6">إضافة مدرسة جديدة</h3>
            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">اسم المدرسة بالعربية</label>
                  <input
                    value={form.schoolNameAr}
                    onChange={(e) => setForm({ ...form, schoolNameAr: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1a73e8]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">School Name</label>
                  <input
                    value={form.schoolName}
                    onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1a73e8]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">كود المدرسة (بالإنجليزية)</label>
                <input
                  value={form.schoolCode}
                  onChange={(e) => setForm({ ...form, schoolCode: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1a73e8]"
                  placeholder="مثال: school001"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1a73e8]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">رقم الهاتف</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1a73e8]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">المدينة</label>
                  <input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1a73e8]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">النوع</label>
                  <select
                    value={form.genderType}
                    onChange={(e) => setForm({ ...form, genderType: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1a73e8]"
                  >
                    <option value="BOYS">بنين</option>
                    <option value="GIRLS">بنات</option>
                    <option value="MIXED">مختلط</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#1a73e8] text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90"
                >
                  إنشاء المدرسة
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
      
{showPrincipalModal && createdSchool && (
  <div style={{
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
  }}>
    <div style={{
      backgroundColor: '#fff', borderRadius: '16px', padding: '32px',
      width: '95%', maxWidth: '500px', direction: 'rtl',
    }}>
      <h3 style={{ margin: '0 0 8px', color: '#374151', fontSize: '16px', fontWeight: 700 }}>
        🎉 تم إنشاء المدرسة بنجاح!
      </h3>
      <p style={{ color: '#6B7280', fontSize: '13px', marginBottom: '20px' }}>
        أنشئ حساب مدير المدرسة الآن
      </p>

      <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
        <div>
          <label style={labelStyle}>الاسم الكامل *</label>
          <input
            value={principalForm.fullName}
            onChange={e => setPrincipalForm({ ...principalForm, fullName: e.target.value })}
            placeholder="اسم مدير المدرسة"
            style={inputFieldStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>اسم المستخدم *</label>
          <input
            value={principalForm.username}
            onChange={e => setPrincipalForm({ ...principalForm, username: e.target.value })}
            placeholder="principal.name"
            style={inputFieldStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>كلمة المرور *</label>
          <input
            type="password"
            value={principalForm.password}
            onChange={e => setPrincipalForm({ ...principalForm, password: e.target.value })}
            placeholder="••••••••"
            style={inputFieldStyle}
          />
        </div>
      </div>

      {/* رابط الدخول */}
      <div style={{
        backgroundColor: '#F0F9FA', border: '1px solid #9EC5C7',
        borderRadius: '10px', padding: '12px', marginBottom: '20px',
      }}>
        <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 6px' }}>رابط تسجيل الدخول للمدرسة:</p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#374151', flex: 1, wordBreak: 'break-all' }}>
            {window.location.origin}/school/{createdSchool.schoolCode}/login
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/school/${createdSchool.schoolCode}/login`)
              toast.success('تم نسخ الرابط')
            }}
            style={{
              padding: '6px 12px', backgroundColor: '#9EC5C7', color: '#fff',
              border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap',
            }}
          >
            نسخ الرابط
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          disabled={savingPrincipal}
          onClick={async () => {
            if (!principalForm.fullName.trim() || !principalForm.username.trim() || !principalForm.password.trim()) {
              toast.error('يرجى ملء جميع الحقول')
              return
            }
            setSavingPrincipal(true)
            try {
              await api.post(`/api/platform/tenants/${createdSchool.schemaName}/users`, {
                fullName: principalForm.fullName,
                username: principalForm.username,
                email: '',
                phone: '',
                password: principalForm.password,
                role: 'PRINCIPAL',
                gender: 'MALE',
              })
       toast.success('تم إنشاء حساب المدير بنجاح')

// احفظ البيانات أولاً قبل تصفير أي شيء
if (createdSchool) {
  setSchoolCredentials(prev => ({
    ...prev,
    [createdSchool.schemaName]: {
      username: principalForm.username,
      password: principalForm.password,
    }
  }))
}

// ثم أغلق وصفّر
setShowPrincipalModal(false)
setPrincipalForm({ fullName: '', username: '', password: '' })
setCreatedSchool(null)
              setShowPrincipalModal(false)
              setPrincipalForm({ fullName: '', username: '', password: '' })
              setCreatedSchool(null)
            }  catch (err) {
  const error = err as { response?: { data?: { message?: string } } }
  toast.error(error.response?.data?.message || 'تعذر إنشاء الحساب')
            } finally {
              setSavingPrincipal(false)
            }
          }}
          style={{
            flex: 2, padding: '12px', backgroundColor: '#1a73e8',
            color: '#fff', border: 'none', borderRadius: '10px',
            cursor: savingPrincipal ? 'not-allowed' : 'pointer',
            fontWeight: 600, opacity: savingPrincipal ? 0.7 : 1,
          }}
        >
          {savingPrincipal ? 'جارٍ الحفظ...' : 'إنشاء الحساب'}
        </button>
        <button
          onClick={() => { setShowPrincipalModal(false); setCreatedSchool(null) }}
          style={{
            flex: 1, padding: '12px', backgroundColor: '#F3F4F6',
            color: '#6B7280', border: 'none', borderRadius: '10px',
            cursor: 'pointer', fontWeight: 600,
          }}
        >
          تخطي
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  )
}
const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: '#6B7280',
}

const inputFieldStyle: React.CSSProperties = {
  width: '100%', height: '38px', border: '1px solid #E5E7EB',
  borderRadius: '8px', padding: '0 12px', fontSize: '13px',
  textAlign: 'right', outline: 'none', boxSizing: 'border-box' as const,
}