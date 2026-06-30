import { useState, useEffect, useCallback } from 'react'
import { X, Trash2, Plus, UserPlus, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import api from '../../api/axios'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'

interface Props {
  classroomId: number
  classroomName: string
  schemaName: string
  onClose: () => void
  readOnly?: boolean
}

interface Student {
  id: number
  fullName: string
  guardianPhone: string
}

interface StudentForm {
  fullName: string
  guardianPhone: string
}

export default function StudentsView({ classroomId, classroomName, schemaName, onClose, readOnly = false }: Props) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false) // Modal for manual student entry
  const [confirmDelete, setConfirmDelete] = useState<Student | null>(null)
  const [forms, setForms] = useState<StudentForm[]>([{ fullName: '', guardianPhone: '' }])
  const [saving, setSaving] = useState(false)
  const [importingExcel, setImportingExcel] = useState(false)

  const fetchStudents = useCallback(async () => {
    try {
      const res = await api.get(`/api/school/${schemaName}/classrooms/${classroomId}/students`)
      setStudents(res.data)
    } catch {
      toast.error('تعذر تحميل الطلاب')
    } finally {
      setLoading(false)
    }
  }, [schemaName, classroomId])

  useEffect(() => {
   void Promise.resolve().then(fetchStudents)
  }, [fetchStudents])

  const handleAddRow = () => {
    setForms([...forms, { fullName: '', guardianPhone: '' }])
  }

  const handleRemoveRow = (idx: number) => {
    if (forms.length === 1) return
    setForms(forms.filter((_, i) => i !== idx))
  }

  const handleFormChange = (idx: number, field: keyof StudentForm, value: string) => {
    const updated = [...forms]
    updated[idx][field] = value
    setForms(updated)
  }

const handleSave = async () => {
    const valid = forms.filter(f => f.fullName.trim())
    if (!valid.length) { toast.error('أدخل اسم طالب على الأقل'); return }

    const invalidPhone = valid.find(f => f.guardianPhone && !f.guardianPhone.startsWith('05'))
    if (invalidPhone) {
      toast.error(`رقم الجوال للطالب ${invalidPhone.fullName} يجب أن يبدأ بـ 05`)
      return
    }

    setSaving(true)
    try {
      await api.post(`/api/school/${schemaName}/classrooms/${classroomId}/students/batch`, valid)
      toast.success('تم إضافة الطلاب')
      setShowAddModal(false)
      setForms([{ fullName: '', guardianPhone: '' }])
      fetchStudents()
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>
      const msg = error.response?.data?.message
      toast.error(msg || 'تعذر إضافة الطلاب')
    } finally {
      setSaving(false)
    }
  }

  const normalizePhone = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length === 9 && digits.startsWith('5')) return `0${digits}`
    return digits.slice(0, 10)
  }

  const normalizeHeader = (value: unknown) =>
    String(value ?? '')
      .replace(/\s/g, '')
      .replace(/[ـ_:\-.]/g, '')
      .toLowerCase()

  const findColumnIndex = (headers: unknown[], aliases: string[]) => {
    const normalizedAliases = aliases.map(normalizeHeader)
    return headers.findIndex(header => normalizedAliases.includes(normalizeHeader(header)))
  }

  const getCellValue = (row: unknown[], index: number) => {
    if (index < 0) return ''
    const value = row[index]
    return value === undefined || value === null ? '' : String(value).trim()
  }

  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      toast.error('الملف يجب أن يكون Excel بصيغة xlsx أو xls')
      return
    }

    setImportingExcel(true)
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]

      if (!sheetName) {
        toast.error('ملف Excel لا يحتوي على أوراق')
        return
      }

      const worksheet = workbook.Sheets[sheetName]
      const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        defval: '',
        blankrows: false,
      })

      const rows = rawRows.filter(row => row.some(cell => String(cell ?? '').trim()))
      const headers = rows[0] ?? []
      const nameColumn = findColumnIndex(headers, ['fullName', 'Full Name', 'name', 'studentName', 'اسم الطالب', 'اسم الطالبة', 'الاسم', 'الطالب'])
      const phoneColumn = findColumnIndex(headers, ['guardianPhone', 'Guardian Phone', 'phone', 'mobile', 'رقم ولي الأمر', 'رقم جوال ولي الأمر', 'الجوال', 'رقم الجوال'])
      const hasHeader = nameColumn !== -1 || phoneColumn !== -1
      const dataRows = hasHeader ? rows.slice(1) : rows
      const resolvedNameColumn = nameColumn !== -1 ? nameColumn : 0
      const resolvedPhoneColumn = phoneColumn !== -1 ? phoneColumn : 1

      const imported = dataRows
        .map(row => ({
          fullName: getCellValue(row, resolvedNameColumn),
          guardianPhone: normalizePhone(getCellValue(row, resolvedPhoneColumn)),
        }))
        .filter(student => student.fullName)

      if (!imported.length) {
        toast.error('لم يتم العثور على أسماء طلاب في الملف')
        return
      }

      const invalidPhone = imported.find(student => student.guardianPhone && !student.guardianPhone.startsWith('05'))
      if (invalidPhone) {
        toast.error(`رقم الجوال للطالب ${invalidPhone.fullName} يجب أن يبدأ بـ 05`)
        return
      }

      const invalidPhoneLength = imported.find(student => student.guardianPhone && student.guardianPhone.length !== 10)
      if (invalidPhoneLength) {
        toast.error(`رقم الجوال للطالب ${invalidPhoneLength.fullName} يجب أن يكون 10 أرقام`)
        return
      }

      const phones = imported.map(student => student.guardianPhone).filter(Boolean)
      const duplicatePhone = phones.find((phone, index) => phones.indexOf(phone) !== index)
      if (duplicatePhone) {
        toast.error(`يوجد رقم جوال مكرر في الملف: ${duplicatePhone}`)
        return
      }

      await api.post(`/api/school/${schemaName}/classrooms/${classroomId}/students/batch`, imported)
      toast.success(`تم استيراد ${imported.length} طالب من Excel`)
      fetchStudents()
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>
      toast.error(error.response?.data?.message || 'تعذر استيراد ملف Excel')
    } finally {
      setImportingExcel(false)
    }
  }

  const handleDelete = async (student: Student) => {
    try {
      await api.delete(`/api/school/${schemaName}/classrooms/${classroomId}/students/${student.id}`)
      setStudents(students.filter(s => s.id !== student.id))
      toast.success('تم حذف الطالب')
    } catch {
      toast.error('تعذر حذف الطالب')
    }
  }

  return (
    <div style={{ padding: '0px' }}>
      <div style={{
        backgroundColor: '#fff', borderRadius: '16px', padding: '20px',
        width: '100%', direction: 'rtl',
        maxHeight: 'none', overflowY: 'visible',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#374151', fontSize: '18px', fontWeight: 700 }}>
            طلاب {classroomName}
          </h2>
          <button onClick={onClose} style={{
            border: 'none', background: '#F3F4F6', borderRadius: '50%',
            width: '36px', height: '36px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={18} color="#6B7280" />
          </button>
        </div>

        {/* Blue Header */}
        <div style={{
          background: '#9EC5C7', color: '#fff', padding: '14px',
          borderRadius: '12px', textAlign: 'center', fontWeight: 600,
          fontSize: '16px', marginBottom: '20px',
        }}>
          قائمة طلاب — {classroomName}
        </div>

        {/* Add Button */}
        {!readOnly && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <label
              htmlFor="students-excel-input"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', backgroundColor: '#374151',
                color: '#fff', border: 'none', borderRadius: '10px',
                cursor: importingExcel ? 'not-allowed' : 'pointer',
                fontWeight: 600, fontSize: '14px', opacity: importingExcel ? 0.7 : 1,
              }}
            >
              <Upload size={16} />
              {importingExcel ? 'جاري الاستيراد...' : 'استيراد من Excel'}
            </label>
            <input
              id="students-excel-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelImport}
              disabled={importingExcel}
              style={{ display: 'none' }}
            />
            {/* Manual Add Button */}
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', backgroundColor: '#9EC5C7',
                color: '#fff', border: 'none', borderRadius: '10px',
                cursor: 'pointer', fontWeight: 600, fontSize: '14px', marginRight: '10px'
              }}
            >
              <UserPlus size={16} />
              إضافة طلاب يدوياً
            </button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '32px' }}>جارٍ التحميل...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>اسم الطالب</th>
                <th style={thStyle}>رقم جوال ولي الأمر</th>
                {!readOnly && <th style={thStyle}>إجراءات</th>}
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => (
                <tr key={student.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={tdStyle}>{idx + 1}</td>
                  <td style={tdStyle}>{student.fullName}</td>
                  <td style={tdStyle}>{student.guardianPhone || '—'}</td>
                  {!readOnly && (
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          onClick={() => setConfirmDelete(student)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            padding: '6px 10px', border: '1px solid #FEE2E2',
                            borderRadius: '8px', background: '#FEF2F2',
                            cursor: 'pointer', fontSize: '12px', color: '#EF4444',
                          }}
                        >
                          <Trash2 size={13} />
                          حذف
                        </button>
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/school/${schemaName.replace('school_', '')}/schedule/${classroomId}`
                            navigator.clipboard.writeText(url)
                            toast.success('تم نسخ رابط الخطة')
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            padding: '6px 10px', border: '1px solid #E8F4F5',
                            borderRadius: '8px', background: '#E8F4F5',
                            cursor: 'pointer', fontSize: '12px', color: '#2D7D82',
                          }}
                        >
                          🔗 مشاركة الخطة
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={readOnly ? 3 : 4} style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF' }}>
                    لا يوجد طلاب بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal إضافة طلاب */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', padding: '32px',
            width: '95%', maxWidth: '700px', direction: 'rtl',
            maxHeight: '85vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#374151', fontSize: '16px', fontWeight: 700 }}>إضافة طلاب</h3>
              <button onClick={() => { setShowAddModal(false); setForms([{ fullName: '', guardianPhone: '' }]) }} style={{
                border: 'none', background: '#F3F4F6', borderRadius: '50%',
                width: '32px', height: '32px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={16} color="#6B7280" />
              </button>
            </div>

            {/* Header Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: '10px', marginBottom: '8px', padding: '0 4px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>اسم الطالب *</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>رقم جوال ولي الأمر</span>
              <span />
            </div>

            {/* Forms */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {forms.map((form, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: '10px', alignItems: 'center' }}>
                  <input
                    value={form.fullName}
                    onChange={(e) => handleFormChange(idx, 'fullName', e.target.value)}
                    placeholder="اسم الطالب"
                    style={inputStyle}
                  />
                  <input
  value={form.guardianPhone}
  onChange={(e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10)
    handleFormChange(idx, 'guardianPhone', val)
  }}
  onBlur={(e) => {
    if (e.target.value && !e.target.value.startsWith('05')) {
      toast.error('رقم الجوال يجب أن يبدأ بـ 05')
    }
  }}
  placeholder="05xxxxxxxx"
  maxLength={10}
  style={inputStyle}
/>
                  <button
                    onClick={() => handleRemoveRow(idx)}
                    disabled={forms.length === 1}
                    style={{
                      border: 'none', background: forms.length === 1 ? '#F9FAFB' : '#FEF2F2',
                      borderRadius: '8px', width: '36px', height: '36px',
                      cursor: forms.length === 1 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <X size={14} color={forms.length === 1 ? '#D1D5DB' : '#EF4444'} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Row */}
            <button
              onClick={handleAddRow}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', border: '1px dashed #9EC5C7',
                borderRadius: '8px', background: 'transparent',
                cursor: 'pointer', fontSize: '13px', color: '#9EC5C7',
                fontWeight: 600, marginBottom: '20px',
              }}
            >
              <Plus size={14} />
              إضافة طالب آخر
            </button>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 2, padding: '12px', backgroundColor: '#9EC5C7',
                  color: '#fff', border: 'none', borderRadius: '10px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: 600, fontSize: '14px', opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'جارٍ الحفظ...' : 'حفظ الطلاب'}
              </button>
              <button
                onClick={() => { setShowAddModal(false); setForms([{ fullName: '', guardianPhone: '' }]) }}
                style={{
                  flex: 1, padding: '12px', backgroundColor: '#F3F4F6',
                  color: '#6B7280', border: 'none', borderRadius: '10px',
                  cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal تأكيد الحذف */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', padding: '32px',
            width: '360px', textAlign: 'center', direction: 'rtl',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px', color: '#374151' }}>تأكيد الحذف</h3>
            <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '24px' }}>
              هل أنت متأكد من حذف الطالب <strong>{confirmDelete.fullName}</strong>؟
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={async () => { await handleDelete(confirmDelete); setConfirmDelete(null) }} style={{
                flex: 1, padding: '10px', backgroundColor: '#EF4444',
                color: '#fff', border: 'none', borderRadius: '10px',
                cursor: 'pointer', fontWeight: 600,
              }}>نعم، احذف</button>
              <button onClick={() => setConfirmDelete(null)} style={{
                flex: 1, padding: '10px', backgroundColor: '#F3F4F6',
                color: '#6B7280', border: 'none', borderRadius: '10px',
                cursor: 'pointer', fontWeight: 600,
              }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB', padding: '12px 16px',
  textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '13px',
}

const tdStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB', padding: '12px 16px', textAlign: 'center',
}

const inputStyle: React.CSSProperties = {
  height: '38px', border: '1px solid #E5E7EB', borderRadius: '8px',
  padding: '0 12px', fontSize: '13px', textAlign: 'right',
  outline: 'none', width: '100%', boxSizing: 'border-box',
}
