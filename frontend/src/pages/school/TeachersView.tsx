import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Edit, Phone, Mail} from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

interface Teacher {
  id: number;
  fullName: string;
  username: string;
  password?: string;
  phone: string;
}

export default function TeachersView({ schemaName }: { schemaName: string }) {
  const [teacherName, setTeacherName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchTeachers = () => {
    api.get(`/api/school/${schemaName}/teachers`)
      .then(res => {
        setTeachers(res.data);
        setLoading(false);
      })
      .catch(() => {
        toast.error('تعذر تحميل المعلمين');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTeachers();
  }, [schemaName]);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName || !username || !password) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/api/school/${schemaName}/teachers`, {
        fullName: teacherName,
        username,
        password,
        phone,
      });
      toast.success('تم إضافة المعلم بنجاح');
      setTeacherName('');
      setUsername('');
      setPassword('');
      setPhone('');
      fetchTeachers();
    } catch {
      toast.error('تعذر إضافة المعلم');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeacher = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المعلم؟')) return;
    
    try {
      await api.delete(`/api/school/${schemaName}/teachers/${id}`);
      toast.success('تم حذف المعلم');
      fetchTeachers();
    } catch {
      toast.error('تعذر حذف المعلم');
    }
  };

  return (
    <div style={{ padding: '24px 100px', flex: 1, backgroundColor: '#FFFFFF', direction: 'rtl' }}>
      <div style={titleHeaderStyle}>إدارة المعلمين</div>

      {/* نموذج إضافة معلم */}
      <div style={formContainerStyle}>
        <form onSubmit={handleAddTeacher} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', alignItems: 'end' }}>
          <div style={{ textAlign: 'right' }}>
            <label style={labelStyle}>اسم المعلم</label>
            <input 
              type="text" 
            
              style={inputStyle} 
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              required
            />
          </div>
          <div style={{ textAlign: 'right' }}>
            <label style={labelStyle}>اسم المستخدم</label>
            <input 
              type="text" 
              style={inputStyle} 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div style={{ textAlign: 'right' }}>
            <label style={labelStyle}>كلمة المرور</label>
            <input 
              type="password" 
              
              style={inputStyle} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div style={{ textAlign: 'right' }}>
            <label style={labelStyle}>رقم الجوال</label>
            <input 
              type="text" 
              
              style={inputStyle} 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <button type="submit" style={{ ...saveButtonStyle, opacity: saving ? 0.7 : 1 }} disabled={saving}>
            <UserPlus size={18} />
            {saving ? 'جارٍ الحفظ...' : 'إضافة معلم'}
          </button>
        </form>
      </div>

      {/* جدول المعلمين */}
      <div style={{ marginTop: '20px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '32px' }}>جارٍ التحميل...</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                <th style={cellStyle}>اسم المعلم</th>
                <th style={cellStyle}>اسم المستخدم</th>
                <th style={cellStyle}>رقم الجوال</th>
                <th style={cellStyle}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td style={cellStyle}>{teacher.fullName}</td>
                  <td style={cellStyle}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Mail size={14} color="#6B7280" /> {teacher.username}
                    </span>
                  </td>
                  <td style={cellStyle}>
                     <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Phone size={14} color="#6B7280" /> {teacher.phone}
                    </span>
                  </td>
                  <td style={cellStyle}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button style={btnStyle} title="تعديل"><Edit size={14} /></button>
                      <button 
                        style={{ ...btnStyle, color: '#EF4444' }} 
                        title="حذف"
                        onClick={() => handleDeleteTeacher(teacher.id)}
                      >
                        <Trash2 size={14} color="#EF4444" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// إعادة استخدام الستايلات المتوافقة مع Dashboard
const titleHeaderStyle: React.CSSProperties = {
  background: '#9EC5C7', color: '#fff', padding: '14px', borderRadius: '12px', textAlign: 'center', fontWeight: 600, marginBottom: '20px',
};

const formContainerStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px', marginBottom: '20px',
};

const labelStyle: React.CSSProperties = {
  color: '#6B7280', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', height: '40px', padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: '6px', outline: 'none', textAlign: 'right',
};

const saveButtonStyle: React.CSSProperties = {
  height: '40px', padding: '0 16px', backgroundColor: '#B0D8DA', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
  display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center'
};

const tableStyle: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse', background: '#FFFFFF',
};

const cellStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB', padding: '12px', textAlign: 'center', fontSize: '14px'
};

const btnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', border: '1px solid #E5E7EB', borderRadius: '8px', background: '#F9FAFB', cursor: 'pointer', fontSize: '12px', color: '#374151',
};