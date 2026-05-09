import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

interface Student {
  id: number;
  fullName: string;
}

interface Props {
  schemaName: string;
  classroomId: number;
  classroomName: string;
  actionType: 'absence' | 'delay' | 'permission';
}

export default function ClassroomAttendancePage({ schemaName, classroomId, classroomName, actionType }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Student[]>(`/api/school/${schemaName}/classrooms/${classroomId}/students`)
      .then(res => { setStudents(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [schemaName, classroomId]);

  const titles: Record<string, string> = { 
    absence: 'رصد الغياب', 
    delay: 'رصد التأخير', 
    permission: 'منح استئذان' 
  };

  return (
    <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E5E7EB' }}>
      <h3 style={{ marginBottom: '20px', color: '#374151' }}>{titles[actionType]} — {classroomName}</h3>
      {loading ? <p>جارٍ التحميل...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB' }}>
              <th style={{ padding: '12px', border: '1px solid #E5E7EB' }}>الطالب</th>
              <th style={{ padding: '12px', border: '1px solid #E5E7EB' }}>الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id}>
                <td style={{ padding: '12px', border: '1px solid #E5E7EB' }}>{s.fullName}</td>
                <td style={{ padding: '12px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                  <button 
                    onClick={() => toast.success('تم تسجيل الإجراء')}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#E8F4F5', color: '#2D7D82', cursor: 'pointer' }}
                  >
                    تسجيل
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}