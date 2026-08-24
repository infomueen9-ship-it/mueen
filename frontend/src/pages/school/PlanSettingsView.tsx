import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'

interface WeekSetting {
  weekNumber: number
  startDate: string
  endDate: string
}

interface Leave {
  id: number
  title: string
  startDate: string
  endDate: string
}

export default function PlanSettingsView({
  schemaName,
}: {
  schemaName: string
}) {
  const [weeks, setWeeks] = useState<WeekSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    weekNumber: '',
    startDate: '',
    endDate: '',
  })

  const [leaves, setLeaves] = useState<Leave[]>([])
  const [leavesLoading, setLeavesLoading] = useState(true)
  const [savingLeave, setSavingLeave] = useState(false)

  const [leaveForm, setLeaveForm] = useState({
    title: '',
    startDate: '',
    endDate: '',
  })

  const openAddForm = (currentWeeks: WeekSetting[]) => {
    const nextWeek = currentWeeks.length
      ? Math.max(...currentWeeks.map(w => w.weekNumber)) + 1
      : 1

    setForm({
      weekNumber: String(nextWeek),
      startDate: '',
      endDate: '',
    })
  }

  const loadWeeks = async () => {
    try {
      const res = await api.get<WeekSetting[]>(`/api/school/${schemaName}/week-settings`)
      setWeeks(res.data)
      openAddForm(res.data)
    } catch {
      toast.error('تعذر تحميل إعدادات الخطة')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWeeks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaName])

  const handleSave = async () => {
    if (!form.weekNumber) {
      toast.error('يرجى إدخال رقم الأسبوع')
      return
    }
    if (!form.startDate) {
      toast.error('يرجى اختيار تاريخ البداية')
      return
    }
    if (!form.endDate) {
      toast.error('يرجى اختيار تاريخ النهاية')
      return
    }
    if (form.startDate > form.endDate) {
      toast.error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية')
      return
    }

    setSaving(true)
    try {
      await api.post(`/api/school/${schemaName}/week-settings`, {
        weekNumber: Number(form.weekNumber),
        startDate: form.startDate,
        endDate: form.endDate,
      })
      toast.success('تم حفظ الأسبوع بنجاح')
      await loadWeeks()
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || 'تعذر حفظ الأسبوع')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (weekNumber: number) => {
    if (!window.confirm(`هل أنت متأكد من حذف الأسبوع ${weekNumber}؟`)) {
      return
    }
    try {
      await api.delete(`/api/school/${schemaName}/week-settings/${weekNumber}`)
      toast.success('تم حذف الأسبوع')
      setWeeks(current => current.filter(w => w.weekNumber !== weekNumber))
    } catch {
      toast.error('تعذر حذف الأسبوع')
    }
  }

  const loadLeaves = async () => {
    try {
      const res = await api.get<Leave[]>(`/api/school/${schemaName}/leaves`)
      setLeaves(res.data)
    } catch {
      toast.error('تعذر تحميل الإجازات')
    } finally {
      setLeavesLoading(false)
    }
  }

  useEffect(() => {
    loadLeaves()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaName])

  const handleSaveLeave = async () => {
    if (!leaveForm.title.trim()) {
      toast.error('يرجى إدخال اسم أو وصف الإجازة')
      return
    }
    if (!leaveForm.startDate) {
      toast.error('يرجى اختيار تاريخ البداية')
      return
    }
    if (!leaveForm.endDate) {
      toast.error('يرجى اختيار تاريخ النهاية')
      return
    }
    if (leaveForm.startDate > leaveForm.endDate) {
      toast.error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية')
      return
    }

    setSavingLeave(true)
    try {
      await api.post(`/api/school/${schemaName}/leaves`, {
        title: leaveForm.title.trim(),
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
      })
      toast.success('تمت إضافة الإجازة بنجاح')
      setLeaveForm({ title: '', startDate: '', endDate: '' })
      await loadLeaves()
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || 'تعذر إضافة الإجازة')
    } finally {
      setSavingLeave(false)
    }
  }

  const handleDeleteLeave = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الإجازة؟')) {
      return
    }
    try {
      await api.delete(`/api/school/${schemaName}/leaves/${id}`)
      toast.success('تم حذف الإجازة')
      setLeaves(current => current.filter(l => l.id !== id))
    } catch {
      toast.error('تعذر حذف الإجازة')
    }
  }

  return (
    <div style={{ direction: 'rtl' }}>
      <div style={{
        background: '#9EC5C7', color: '#fff', padding: '14px',
        borderRadius: '12px', textAlign: 'center', fontWeight: 600,
        fontSize: '16px', marginBottom: '20px',
      }}>
        إعدادات الخطة — تقويم الأسابيع الدراسية
      </div>

      {/* إضافة أسبوع */}
      <div style={{
        background: '#F9FAFB', border: '1px solid #E5E7EB',
        borderRadius: '12px', padding: '16px', marginBottom: '24px',
        display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap',
      }}>
        <div>
          <label style={labelStyle}>رقم الأسبوع</label>
          <input
            type="number"
            min={1}
            value={form.weekNumber}
            onChange={e => setForm({ ...form, weekNumber: e.target.value })}
            style={{ ...inputStyle, width: '100px' }}
          />
        </div>
        <div>
          <label style={labelStyle}>من تاريخ</label>
          <input
            type="date"
            value={form.startDate}
            onChange={e => setForm({ ...form, startDate: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>إلى تاريخ</label>
          <input
            type="date"
            value={form.endDate}
            onChange={e => setForm({ ...form, endDate: e.target.value })}
            style={inputStyle}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 18px', backgroundColor: '#2D7D82', color: '#fff',
            border: 'none', borderRadius: '8px', cursor: 'pointer',
            fontWeight: 600, fontSize: '13px', height: '38px',
          }}
        >
          <Plus size={14} />
          {saving ? 'جارٍ الحفظ...' : 'حفظ الأسبوع'}
        </button>
      </div>

      {/* قائمة الأسابيع */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#9CA3AF' }}>جارٍ التحميل...</p>
      ) : weeks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
          لا توجد أسابيع مضافة بعد.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB' }}>
              <th style={thStyle}>الأسبوع</th>
              <th style={thStyle}>من</th>
              <th style={thStyle}>إلى</th>
              <th style={thStyle}>حذف</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map(week => (
              <tr key={week.weekNumber} style={{ borderBottom: '1px solid #E5E7EB' }}>
                <td style={tdStyle}>الأسبوع {week.weekNumber}</td>
                <td style={tdStyle}>{week.startDate}</td>
                <td style={tdStyle}>{week.endDate}</td>
                <td style={tdStyle}>
                  <button
                    onClick={() => handleDelete(week.weekNumber)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* الإجازات */}
      <div style={{
        background: '#9EC5C7', color: '#fff', padding: '14px',
        borderRadius: '12px', textAlign: 'center', fontWeight: 600,
        fontSize: '16px', margin: '32px 0 20px',
      }}>
        الإجازات
      </div>

      <div style={{
        background: '#F9FAFB', border: '1px solid #E5E7EB',
        borderRadius: '12px', padding: '16px', marginBottom: '24px',
        display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={labelStyle}>اسم / وصف الإجازة</label>
          <input
            value={leaveForm.title}
            onChange={e => setLeaveForm({ ...leaveForm, title: e.target.value })}
            placeholder="مثال: إجازة اليوم الوطني"
            style={{ ...inputStyle, width: '100%' }}
          />
        </div>
        <div>
          <label style={labelStyle}>من تاريخ</label>
          <input
            type="date"
            value={leaveForm.startDate}
            onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>إلى تاريخ</label>
          <input
            type="date"
            value={leaveForm.endDate}
            onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
            style={inputStyle}
          />
        </div>
        <button
          onClick={handleSaveLeave}
          disabled={savingLeave}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 18px', backgroundColor: '#8B5CF6', color: '#fff',
            border: 'none', borderRadius: '8px', cursor: 'pointer',
            fontWeight: 600, fontSize: '13px', height: '38px', whiteSpace: 'nowrap',
          }}
        >
          <Plus size={14} />
          {savingLeave ? 'جارٍ الحفظ...' : 'إضافة إجازة'}
        </button>
      </div>

      {leavesLoading ? (
        <p style={{ textAlign: 'center', color: '#9CA3AF' }}>جارٍ التحميل...</p>
      ) : leaves.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
          لا توجد إجازات مضافة بعد.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB' }}>
              <th style={thStyle}>الإجازة</th>
              <th style={thStyle}>من</th>
              <th style={thStyle}>إلى</th>
              <th style={thStyle}>حذف</th>
            </tr>
          </thead>
          <tbody>
            {leaves.map(leave => (
              <tr key={leave.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                <td style={tdStyle}>{leave.title}</td>
                <td style={tdStyle}>{leave.startDate}</td>
                <td style={tdStyle}>{leave.endDate}</td>
                <td style={tdStyle}>
                  <button
                    onClick={() => handleDeleteLeave(leave.id)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: '#6B7280',
}

const inputStyle: React.CSSProperties = {
  height: '38px', border: '1px solid #E5E7EB', borderRadius: '8px',
  padding: '0 12px', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
}

const thStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB', padding: '12px 16px',
  textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '13px',
}

const tdStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB', padding: '12px 16px', textAlign: 'center',
}
