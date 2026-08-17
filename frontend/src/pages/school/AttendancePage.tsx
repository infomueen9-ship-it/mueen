import { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { X } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

interface ClassroomAttendanceSummary {
  id: number;
  name: string;
  totalStudents: number;
  presentStudents: number;
  absentStudents: number;
  attendancePercentage: number;
}

interface AttendanceRecord {
  id: number;
  date: string;
  status: 'present' | 'absence' | 'delay' | 'permission';
  studentName: string;
}

const STATUS_LABELS: Record<AttendanceRecord['status'], string> = {
  present: 'حاضر',
  absence: 'غياب',
  delay: 'تأخير',
  permission: 'استئذان',
};

const STATUS_COLORS: Record<AttendanceRecord['status'], { bg: string; color: string }> = {
  present: { bg: '#DCFCE7', color: '#16A34A' },
  absence: { bg: '#FEE2E2', color: '#DC2626' },
  delay: { bg: '#FEF3C7', color: '#D97706' },
  permission: { bg: '#EDE9FE', color: '#7C3AED' },
};

export default function AttendancePage({ schemaName }: { schemaName: string }) {
  const [classroomsAttendance, setClassroomsAttendance] = useState<ClassroomAttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedClassroom, setSelectedClassroom] = useState<ClassroomAttendanceSummary | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    const fetchAttendanceSummary = async () => {
      try {
        setLoading(true);
        // Assuming a new API endpoint for attendance summary per classroom
        const response = await api.get(`/api/school/${schemaName}/attendance/summary`);
        setClassroomsAttendance(response.data);
      } catch (err) {
        console.error("Failed to fetch attendance summary:", err);
        toast.error("تعذر تحميل ملخص الحضور");
        setError("تعذر تحميل ملخص الحضور");
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceSummary();
  }, [schemaName]);

  const openClassroom = async (classroom: ClassroomAttendanceSummary) => {
    setSelectedClassroom(classroom);
    setNameFilter('');
    setDateFilter('');
    setRecordsLoading(true);
    try {
      const response = await api.get<AttendanceRecord[]>(`/api/school/${schemaName}/attendance/classroom/${classroom.id}`);
      setRecords(response.data);
    } catch {
      toast.error('تعذر تحميل سجل الحضور');
      setRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesName = record.studentName.includes(nameFilter);
    const matchesDate = !dateFilter || record.date === dateFilter;
    return matchesName && matchesDate;
  });

  return (
    <div style={{ padding: '24px 48px' }}>
      {/* Blue Header */}
      <div style={{
        background: '#9EC5C7', color: '#fff', padding: '14px',
        borderRadius: '12px', textAlign: 'center', fontWeight: 600,
        fontSize: '16px', marginBottom: '20px',
      }}>
        إحصائيات الغياب
      </div>
     <div className="p-6 min-h-screen" dir="rtl">

      {loading ? (
        <p style={{ textAlign: 'center', color: '#9CA3AF' }}>جارٍ تحميل بيانات الحضور...</p>
      ) : error ? (
        <p style={{ textAlign: 'center', color: '#EF4444' }}>{error}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {classroomsAttendance.length === 0 ? (
            <p className="col-span-full text-center text-gray-500">لا توجد بيانات حضور للفصول الدراسية.</p>
          ) : (
            classroomsAttendance.map((classroom, index) => (
              <motion.div
                key={classroom.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openClassroom(classroom)}
                className="bg-white p-6 rounded-xl shadow text-right cursor-pointer border border-gray-200"
              >
                <h3 className="text-lg font-bold text-gray-800 mb-3">{classroom.name}</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p className="flex justify-between"><span>إجمالي الطلاب:</span> <span className="font-semibold">{classroom.totalStudents}</span></p>
                  <p className="flex justify-between"><span>الحضور:</span> <span className="font-semibold text-green-600">{classroom.presentStudents}</span></p>
                  <p className="flex justify-between"><span>الغياب:</span> <span className="font-semibold text-red-600">{classroom.absentStudents}</span></p>
                  <p className="flex justify-between pt-2 border-t border-gray-100">
                    <span className="text-gray-700 font-medium">نسبة الحضور:</span>
                    <span className="font-bold text-blue-600">{classroom.attendancePercentage.toFixed(1)}%</span>
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>

    {/* Modal سجل الحضور التفصيلي */}
    {selectedClassroom && (
      <div style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(3px)',
      }}>
        <div style={{
          backgroundColor: '#fff', borderRadius: '16px', padding: '32px',
          width: '95%', maxWidth: '900px', direction: 'rtl',
          maxHeight: '90vh', overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: '#374151', fontSize: '18px', fontWeight: 700 }}>
              سجل الحضور — {selectedClassroom.name}
            </h2>
            <button onClick={() => setSelectedClassroom(null)} style={{ border: 'none', background: '#F3F4F6', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} color="#6B7280" />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <input
              value={nameFilter}
              onChange={e => setNameFilter(e.target.value)}
              placeholder="بحث باسم الطالب"
              style={{ flex: 1, minWidth: '180px', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', outline: 'none', textAlign: 'right' }}
            />
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', outline: 'none' }}
            />
          </div>

          {recordsLoading ? (
            <p style={{ textAlign: 'center', color: '#9CA3AF' }}>جارٍ التحميل...</p>
          ) : filteredRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
              لا توجد سجلات حضور مطابقة.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB' }}>
                    <th style={thStyle}>اسم الطالب</th>
                    <th style={thStyle}>التاريخ</th>
                    <th style={thStyle}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(record => (
                    <tr key={record.id}>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{record.studentName}</td>
                      <td style={tdStyle}>{record.date}</td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-block', padding: '4px 12px', borderRadius: '20px',
                          fontSize: '12px', fontWeight: 700,
                          backgroundColor: STATUS_COLORS[record.status]?.bg || '#F3F4F6',
                          color: STATUS_COLORS[record.status]?.color || '#6B7280',
                        }}>
                          {STATUS_LABELS[record.status] || record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB', padding: '10px',
  textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '13px',
};

const tdStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB', padding: '10px',
  textAlign: 'center', fontSize: '13px', color: '#374151',
};
