
import { useEffect, useState } from 'react'
import { Trash2, Table, Printer, Users } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import ClassroomSchedule from './ClassroomSchedule'
import StudentsView from './StudentsView'
import PrintPlanView from './PrintPlanView'

interface Classroom {
  id: number
  name: string
}

export default function SchedulesView({
  schemaName,
}: {
  schemaName: string
}) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)

  const [confirmId, setConfirmId] = useState<number | null>(null)

  const [selectedClassroom, setSelectedClassroom] =
    useState<Classroom | null>(null)

  const [selectedStudentClassroom, setSelectedStudentClassroom] =
    useState<Classroom | null>(null)

  // الفصل الذي تم اختيار "طباعة الخطة" له
  const [printClassroom, setPrintClassroom] =
    useState<Classroom | null>(null)

  // =========================================================
  // Load Classrooms
  // =========================================================

  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const res = await api.get(
          `/api/school/${schemaName}/classrooms`
        )

        setClassrooms(res.data)
      } catch {
        toast.error('تعذر تحميل الفصول')
      } finally {
        setLoading(false)
      }
    }

    fetchClassrooms()
  }, [schemaName])

  // =========================================================
  // Add Classroom
  // =========================================================

  const handleAdd = async () => {
    if (!newName.trim()) {
      return
    }

    // التحقق من وجود الاسم محلياً
    if (
      classrooms.some(
        c => c.name.trim() === newName.trim()
      )
    ) {
      toast.error('عذراً، هذا الفصل موجود مسبقاً')
      return
    }

    try {
      await api.post(
        `/api/school/${schemaName}/classrooms`,
        {
          name: newName.trim(),
        }
      )

      toast.success('تم إضافة الفصل')

      setNewName('')

      const res = await api.get(
        `/api/school/${schemaName}/classrooms`
      )

      setClassrooms(res.data)
    } catch (err) {
      const error = err as {
        response?: {
          data?: {
            message?: string
          }
        }
      }

      const msg =
        error.response?.data?.message ||
        'تعذر إضافة الفصل'

      toast.error(msg)
    }
  }

  // =========================================================
  // Delete Classroom
  // =========================================================

  const handleDelete = async (id: number) => {
    try {
      await api.delete(
        `/api/school/${schemaName}/classrooms/${id}`
      )

      toast.success('تم حذف الفصل')

      setClassrooms(
        classrooms.filter(
          c => c.id !== id
        )
      )
    } catch {
      toast.error('تعذر حذف الفصل')
    }
  }

  // =========================================================
  // Render
  // =========================================================

  return (
    <div
      style={{
        padding: '24px 48px',
      }}
    >

      {/* ===================================================== */}
      {/* Header */}
      {/* ===================================================== */}

      <div
        style={{
          background: '#9EC5C7',
          color: '#fff',
          padding: '14px',
          borderRadius: '12px',
          textAlign: 'center',
          fontWeight: 600,
          fontSize: '16px',
          marginBottom: '20px',
        }}
      >
        الفصول الدراسية المتاحة
      </div>

      {/* ===================================================== */}
      {/* Add Classroom */}
      {/* ===================================================== */}

      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '24px',
          direction: 'rtl',
        }}
      >
        <input
          value={newName}
          onChange={e =>
            setNewName(e.target.value)
          }
          onKeyDown={e =>
            e.key === 'Enter' &&
            handleAdd()
          }
          placeholder="اسم الفصل الدراسي"
          style={{
            flex: 1,
            height: '40px',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            padding: '0 12px',
            textAlign: 'right',
            fontSize: '14px',
            outline: 'none',
          }}
        />

        <button
          onClick={handleAdd}
          style={{
            padding: '0 20px',
            height: '40px',
            backgroundColor: '#9EC5C7',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          حفظ
        </button>
      </div>

      {/* ===================================================== */}
      {/* Classrooms Table */}
      {/* ===================================================== */}

      {loading ? (
        <p
          style={{
            textAlign: 'center',
            color: '#9CA3AF',
          }}
        >
          جارٍ التحميل...
        </p>
      ) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            direction: 'rtl',
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: '#F9FAFB',
              }}
            >
              <th style={thStyle}>
                اسم الفصل الدراسي
              </th>

              <th style={thStyle}>
                الإجراءات
              </th>
            </tr>
          </thead>

          <tbody>
            {classrooms.map(cls => (
              <tr
                key={cls.id}
                style={{
                  borderBottom:
                    '1px solid #E5E7EB',
                }}
              >
                <td style={tdStyle}>
                  {cls.name}
                </td>

                <td style={tdStyle}>
                  <div
                    style={{
                      display: 'flex',
                      gap: '6px',
                      justifyContent: 'center',
                      flexWrap: 'wrap',
                    }}
                  >

                    {/* عرض الجدول */}

                    <ActionBtn
                      icon={
                        <Table size={13} />
                      }
                      label="عرض الجدول"
                      onClick={() =>
                        setSelectedClassroom(cls)
                      }
                    />

                    {/* حذف الفصل */}

                    <ActionBtn
                      icon={
                        <Trash2
                          size={13}
                          color="#EF4444"
                        />
                      }
                      label="حذف الفصل"
                      color="#EF4444"
                      onClick={() =>
                        setConfirmId(cls.id)
                      }
                    />

                    {/* طباعة الخطة */}

                    <ActionBtn
                      icon={
                        <Printer size={13} />
                      }
                      label="طباعة الخطة"
                      onClick={() =>
                        setPrintClassroom(cls)
                      }
                    />

                    {/* الطلاب */}

                    <ActionBtn
                      icon={
                        <Users size={13} />
                      }
                      label="الطلاب"
                      onClick={() =>
                        setSelectedStudentClassroom(
                          cls
                        )
                      }
                    />

                  </div>
                </td>
              </tr>
            ))}

            {classrooms.length === 0 && (
              <tr>
                <td
                  colSpan={2}
                  style={{
                    textAlign: 'center',
                    padding: '32px',
                    color: '#9CA3AF',
                  }}
                >
                  لا توجد فصول بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* ===================================================== */}
      {/* Print Plan Modal */}
      {/* ===================================================== */}

      {printClassroom && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background:
              'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              background: '#fff',
              width: '95%',
              maxWidth: '1400px',
              height: '90vh',
              borderRadius: '16px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow:
                '0 20px 60px rgba(0,0,0,.2)',
            }}
          >

            {/* Modal Header */}

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center',
                padding: '15px 20px',
                borderBottom:
                  '1px solid #E5E7EB',
                background: '#F9FAFB',
                direction: 'rtl',
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    color: '#374151',
                    fontSize: '16px',
                  }}
                >
                  طباعة الخطة
                </h3>

                <div
                  style={{
                    marginTop: '4px',
                    color: '#6B7280',
                    fontSize: '12px',
                  }}
                >
                  {printClassroom.name}
                </div>
              </div>

              <button
                onClick={() =>
                  setPrintClassroom(null)
                }
                style={{
                  border: 'none',
                  background: '#F3F4F6',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6B7280',
                  fontSize: '16px',
                }}
                className="mueen-no-print"
              >
                ✕
              </button>
            </div>

            {/* Print Plan Content */}

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
              }}
            >
              <PrintPlanView
                schemaName={schemaName}
                classroomId={
                  printClassroom.id
                }
                classroomName={
                  printClassroom.name
                }
                onBack={() =>
                  setPrintClassroom(null)
                }
              />
            </div>

          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* Students Modal */}
      {/* ===================================================== */}

      {selectedStudentClassroom && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor:
              'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            backdropFilter:
              'blur(3px)',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '16px',
            }}
          >
            <StudentsView
              classroomId={
                selectedStudentClassroom.id
              }
              classroomName={
                selectedStudentClassroom.name
              }
              schemaName={schemaName}
              onClose={() =>
                setSelectedStudentClassroom(
                  null
                )
              }
            />
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* Classroom Schedule */}
      {/* ===================================================== */}

      {selectedClassroom && (
        <ClassroomSchedule
          classroomId={
            selectedClassroom.id
          }
          classroomName={
            selectedClassroom.name
          }
          schemaName={schemaName}
          onClose={() =>
            setSelectedClassroom(null)
          }
        />
      )}

      {/* ===================================================== */}
      {/* Delete Confirmation */}
      {/* ===================================================== */}

      {confirmId !== null && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor:
              'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '32px',
              width: '360px',
              textAlign: 'center',
              direction: 'rtl',
            }}
          >
            <div
              style={{
                fontSize: '40px',
                marginBottom: '12px',
              }}
            >
              🗑️
            </div>

            <h3
              style={{
                margin: '0 0 8px',
                color: '#374151',
              }}
            >
              تأكيد الحذف
            </h3>

            <p
              style={{
                color: '#6B7280',
                fontSize: '14px',
                marginBottom: '24px',
              }}
            >
              هل أنت متأكد من حذف هذا الفصل؟
              لا يمكن التراجع عن هذا الإجراء.
            </p>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'center',
              }}
            >
              <button
                onClick={() => {
                  handleDelete(confirmId)
                  setConfirmId(null)
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor:
                    '#EF4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                نعم، احذف
              </button>

              <button
                onClick={() =>
                  setConfirmId(null)
                }
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor:
                    '#F3F4F6',
                  color: '#6B7280',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// =========================================================
// Action Button
// =========================================================

function ActionBtn({
  icon,
  label,
  color,
  onClick,
  dot,
}: {
  icon: React.ReactNode
  label: string
  color?: string
  onClick?: () => void
  dot?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        padding: '6px 10px',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        background: '#F9FAFB',
        cursor: 'pointer',
        fontSize: '12px',
        color: color || '#374151',
      }}
    >
      {icon}

      <span>
        {label}
      </span>

      {dot && (
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: '#B0D8DA',
          }}
        />
      )}
    </button>
  )
}

// =========================================================
// Table Styles
// =========================================================

const thStyle: React.CSSProperties = {
  border:
    '1px solid #E5E7EB',
  padding: '12px 16px',
  textAlign: 'center',
  fontWeight: 600,
  color: '#6B7280',
  fontSize: '13px',
}

const tdStyle: React.CSSProperties = {
  border:
    '1px solid #E5E7EB',
  padding: '12px 16px',
  textAlign: 'center',
}