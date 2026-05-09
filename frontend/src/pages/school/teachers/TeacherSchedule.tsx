import { useState, useEffect } from 'react'
import {  UserX, Shield } from 'lucide-react'
import api from '../../../api/axios'
import toast from 'react-hot-toast'

interface Props {
  schemaName: string
  teacherId: string | number
}

interface SubstituteRecord {
  id: number;
  classroom_name: string;
  scheduled_date: string;
  period: string;
  notes: string | null;
}

interface DutyRecord {
  id: number;
  location: string;
  scheduled_date: string;
  notes: string | null;
}

export default function TeacherSchedule({ schemaName, teacherId }: Props) {
  const [activeTab, setActiveTab] = useState<'substitute' | 'duty'>('substitute');
  const [loading, setLoading] = useState(false);
  const [subs, setSubs] = useState<SubstituteRecord[]>([]);
  const [duties, setDuties] = useState<DutyRecord[]>([]);

  useEffect(() => {
    const tid = Number(teacherId);
    if (!tid || tid === 0) {
      return;
    }

    let cancelled = false;

    const fetch = async () => {
      try {
        setLoading(true);
        const lowerSchema = schemaName.toLowerCase();
        const [subsRes, dutyRes] = await Promise.all([
          api.get<SubstituteRecord[]>(`/api/school/${lowerSchema}/waiting/substitute?teacherId=${tid}`),
          api.get<DutyRecord[]>(`/api/school/${lowerSchema}/waiting/duty?teacherId=${tid}`)
        ]);
        if (!cancelled) {
          setSubs(Array.isArray(subsRes.data) ? subsRes.data : []);
          setDuties(Array.isArray(dutyRes.data) ? dutyRes.data : []);
        }
      } catch {
        if (!cancelled) {
          toast.error('تعذر تحميل الجداول');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetch();
    return () => {
      cancelled = true;
    };
  }, [schemaName, teacherId]);

  const getDayName = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('ar-SA', { weekday: 'long' });
  };

  return (
    <div style={{ direction: 'rtl', padding: '10px' }}>
  

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #E5E7EB', paddingBottom: '10px' }}>
        <button 
          onClick={() => setActiveTab('substitute')} 
          style={tabButtonStyle(activeTab === 'substitute')}
        >
          <UserX size={16} /> حصص الانتظار
        </button>
        <button 
          onClick={() => setActiveTab('duty')} 
          style={tabButtonStyle(activeTab === 'duty')}
        >
          <Shield size={16} /> جدول المناوبة
        </button>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '32px' }}>جارٍ التحميل...</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '15px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                {activeTab === 'substitute' ? (
                  <>
                    <th style={thStyle}>الفصل</th>
                    <th style={thStyle}>التاريخ</th>
                    <th style={thStyle}>اليوم</th>
                    <th style={thStyle}>الحصة</th>
                    <th style={thStyle}>الملاحظات</th>
                  </>
                ) : (
                  <>
                    <th style={thStyle}>المكان</th>
                    <th style={thStyle}>التاريخ</th>
                    <th style={thStyle}>اليوم</th>
                    <th style={thStyle}>الملاحظات</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {activeTab === 'substitute' ? (
                subs.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={tdStyle}>{item.classroom_name}</td>
                    <td style={tdStyle}>{item.scheduled_date}</td>
                    <td style={tdStyle}>{getDayName(item.scheduled_date)}</td>
                    <td style={tdStyle}>{item.period}</td>
                    <td style={tdStyle}>{item.notes || '—'}</td>
                  </tr>
                ))
              ) : (
                duties.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={tdStyle}>{item.location}</td>
                    <td style={tdStyle}>{item.scheduled_date}</td>
                    <td style={tdStyle}>{getDayName(item.scheduled_date)}</td>
                    <td style={tdStyle}>{item.notes || '—'}</td>
                  </tr>
                ))
              )}
              {((activeTab === 'substitute' && subs.length === 0) || (activeTab === 'duty' && duties.length === 0)) && (
                <tr>
                  <td colSpan={activeTab === 'substitute' ? 5 : 4} style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF' }}>
                    لا توجد بيانات مسجلة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const tabButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: '10px 20px', border: 'none', background: active ? '#F4F8FB' : 'transparent',
  color: active ? '#2D7D82' : '#6B7280', fontWeight: active ? 700 : 400, borderRadius: '10px',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: active ? '2px solid #2D7D82' : 'none',
  transition: 'all 0.2s'
});

const thStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB', padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '13px',
};

const tdStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB', padding: '12px 16px', textAlign: 'center', color: '#374151', fontSize: '14px',
};