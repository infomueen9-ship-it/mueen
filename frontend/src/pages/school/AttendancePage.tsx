import { useState, useEffect } from 'react';
import { motion } from "framer-motion";
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

export default function AttendancePage({ schemaName }: { schemaName: string }) {
  const [classroomsAttendance, setClassroomsAttendance] = useState<ClassroomAttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      
      {/* زر */}
      <div className="mb-6">
        <button className="flex items-center gap-2 border border-blue-500 text-blue-500 px-4 py-2 rounded-lg hover:bg-blue-50">
          📅 اختر التاريخ
        </button>
      </div>
      
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
    </div>
  );
}