import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  CheckCircle,
  UserX,
  Trash2,
  Edit,
  MessageCircle,
  X,
  Plus,
} from "lucide-react";
import api from '../../api/axios';
import toast from "react-hot-toast";

interface SubstituteSchedule {
  id: string;
  date: string;
  day: string;
  class: string;
  period: string;
  teacherName?: string;
  notes?: string;
  executorType?: 'teacher' | 'admin';
  adminPhone?: string;
}

interface DutySchedule {
  id: string;
  day: string;
  teacherName?: string;
  location: string;
  date: string;
  notes?: string;
  executorType?: 'teacher' | 'admin';
  adminPhone?: string;
}

interface Teacher {
  id: number;
  fullName: string;
  username: string;
  phone: string;
}

interface Classroom {
  id: number;
  name: string;
}

interface ApiSubstituteResponse {
  id: number;
  scheduled_date: string;
  period: string;
  classroom_name: string;
  executor_type: 'TEACHER' | 'ADMIN';
  teacher_full_name?: string;
  admin_name?: string;
  admin_phone?: string;
  notes?: string;
}

interface ApiDutyResponse {
  id: number;
  scheduled_date: string;
  location: string;
  executor_type: 'TEACHER' | 'ADMIN';
  teacher_full_name?: string;
  admin_name?: string;
  admin_phone?: string;
  notes?: string;
}

interface WaitingMuFormData {
  executorType: 'teacher' | 'admin';
  teacherName: string;
  adminPhone: string;
  day: string;
  date: string;
  period: string;
  class: string;
  notes: string;
  location: string;
}

export default function WaitingMuPage({
  schemaName
}: {
  schemaName: string;
}) {

  const [activeTab, setActiveTab] = useState<'substitute' | 'duty'>('substitute');
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);

  // حالات النوافذ المنبثقة
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingItem, setEditingItem] = useState<SubstituteSchedule | DutySchedule | null>(null);

  // بيانات الجداول
  const [substituteSchedules, setSubstituteSchedules] = useState<SubstituteSchedule[]>([]);
  const [dutySchedules, setDutySchedules] = useState<DutySchedule[]>([]);

  // نموذج الإدخال الموحد
  const [formData, setFormData] = useState<WaitingMuFormData>({
    executorType: 'teacher',
    teacherName: '',
    adminPhone: '',
    day: new Date().toLocaleDateString('ar-SA', { weekday: 'long' }),
    date: new Date().toISOString().split('T')[0],
    period: '',
    class: '',
    notes: '',
    location: '',
  });

  // دالة لفتح نافذة الإضافة مع تصفير البيانات
  const handleOpenAddModal = () => {
    setModalMode('add');
    setEditingItem(null);
    const today = new Date().toISOString().split('T')[0];
    // استخدام handleDateChange لضمان تطابق اليوم مع التاريخ المختار
    handleDateChange(today); 
    setShowModal(true);
  };

  // جلب البيانات من السيرفر
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [teachersRes, classroomsRes, subsRes, dutyRes] = await Promise.all([
        api.get<Teacher[]>(`/api/school/${schemaName}/teachers`),
        api.get<Classroom[]>(`/api/school/${schemaName}/classrooms`),
        api.get<ApiSubstituteResponse[]>(`/api/school/${schemaName}/waiting/substitute`),
        api.get<ApiDutyResponse[]>(`/api/school/${schemaName}/waiting/duty`)
      ]);
      setTeachers(teachersRes.data);
      setClassrooms(classroomsRes.data);
      
      // معالجة البيانات القادمة من SQL (تنسيق snake_case إلى ما يتوقعه الجدول)
      setSubstituteSchedules(subsRes.data.map((s: ApiSubstituteResponse) => ({
        id: String(s.id),
        date: s.scheduled_date,
        day: new Date(s.scheduled_date + 'T00:00:00').toLocaleDateString('ar-SA', { weekday: 'long' }),
        period: s.period,
        class: s.classroom_name,
        teacherName: s.executor_type === 'TEACHER' ? s.teacher_full_name : s.admin_name,
        executorType: s.executor_type.toLowerCase() as 'teacher' | 'admin',
        notes: s.notes,
        adminPhone: s.admin_phone
      })));

      setDutySchedules(dutyRes.data.map((d: ApiDutyResponse) => ({
        id: String(d.id),
        date: d.scheduled_date,
        day: new Date(d.scheduled_date + 'T00:00:00').toLocaleDateString('ar-SA', { weekday: 'long' }),
        location: d.location,
        teacherName: d.executor_type === 'TEACHER' ? d.teacher_full_name : d.admin_name,
        executorType: d.executor_type.toLowerCase() as 'teacher' | 'admin',
        notes: d.notes,
        adminPhone: d.admin_phone
      })));

    } catch {
      toast.error('خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [schemaName]);

  useEffect(() => {
    // eslint-disable-next-line
    fetchAllData();
  }, [schemaName, fetchAllData]);
  const handleDateChange = (val: string) => {
    const dayName = new Date(val + 'T00:00:00').toLocaleDateString('ar-SA', { weekday: 'long' });
    setFormData({ ...formData, date: val, day: dayName });
  };

  const sendWhatsApp = (item: SubstituteSchedule | DutySchedule, isDuty: boolean = false) => {
    if (!item.teacherName) {
      toast.error('لا يمكن الإرسال: اسم المكلف غير متوفر');
      return;
    }

    // تحديد رقم الهاتف: إذا كان إدارياً نستخدم رقمه المسجل، وإذا كان معلماً نبحث عنه في القائمة
    let phone = '0500000000';
    if (item.executorType === 'admin' && item.adminPhone) {
      phone = item.adminPhone;
    } else {
      const teacher = teachers.find(t => t.fullName === item.teacherName);
      if (teacher) phone = teacher.phone;
    }

    // تحديد الاسم واللقب المناسب
    const name = item.teacherName || (item.executorType === 'admin' ? 'الزميل الإداري' : 'الزميل المعلم');
    
    let message = `السلام عليكم أ. ${name}،\n\n`;

    if (isDuty) {
      message += `*إشعار بمناوبة مدرسية:*\n`;
      message += `• اليوم: ${item.day}\n`;
      message += `• التاريخ: ${item.date}\n`;
      message += `• الموقع: ${(item as DutySchedule).location}`;
      if (item.notes) message += `\n• ملاحظات: ${item.notes}`;
    } else {
      message += `*إشعار بحصة انتظار:*\n`;
      message += `• اليوم: ${item.day}\n`;
      message += `• التاريخ: ${item.date}\n`;
      message += `• الحصة: ${(item as SubstituteSchedule).period}\n`;
      message += `• الصف: ${(item as SubstituteSchedule).class}`;
      if (item.notes) message += `\n• ملاحظات: ${item.notes}`;
    }

    const formattedPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, "_blank");
    toast.success('تم فتح الواتساب للإرسال');
  };

  const handleDelete = async (id: string, type: 'sub' | 'duty') => {
    if (!window.confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      const endpoint = type === 'sub' ? 'substitute' : 'duty';
      await api.delete(`/api/school/${schemaName}/waiting/${endpoint}/${id}`);
      toast.success('تم الحذف بنجاح');
      fetchAllData();
    } catch {
      toast.error('تعذر الحذف');
    }
  };

  const handleSave = async () => {
    const isSub = activeTab === 'substitute';
    
    // التحقق من الحقول المطلوبة قبل الإرسال
    if (!formData.teacherName) return toast.error('يرجى تحديد اسم المكلف');
    if (isSub && !formData.class) return toast.error('يرجى اختيار الفصل');
    if (isSub && !formData.period) return toast.error('يرجى تحديد الحصة');
    if (!isSub && !formData.location) return toast.error('يرجى تحديد الموقع');

    try {
      const endpoint = isSub ? 'substitute' : 'duty';
      const selectedTeacher = teachers.find(t => t.fullName === formData.teacherName);
      const selectedClassroom = classrooms.find(c => c.name === formData.class);

      const payload = {
        executorType: formData.executorType.toUpperCase(),
        teacherId: formData.executorType === 'teacher' ? selectedTeacher?.id : null,
        adminName: formData.executorType === 'admin' ? formData.teacherName : null,
        adminPhone: formData.executorType === 'admin' ? formData.adminPhone : null,
        classroomId: isSub ? selectedClassroom?.id : null,
        date: formData.date,
        period: isSub ? formData.period : null,
        notes: formData.notes,
        location: !isSub ? formData.location : null
      };

      if (modalMode === 'edit' && editingItem) {
        await api.put(`/api/school/${schemaName}/waiting/${endpoint}/${editingItem.id}`, payload);
        toast.success('تم التحديث بنجاح');
      } else {
        await api.post(`/api/school/${schemaName}/waiting/${endpoint}`, payload);
        toast.success('تم الحفظ بنجاح');
      }

      setShowModal(false);
      setEditingItem(null);
      fetchAllData();
    } catch {
      toast.error('حدث خطأ أثناء حفظ البيانات');
    }
  };

  return (
    <div style={{ padding: '24px 48px', direction: 'rtl' }}>
      <div style={headerStyle}>حصص الانتظار والمناوبه</div>

      {/* نظام التبويبات */}
      <div style={{ ...tabContainerStyle, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '10px' }}> {/* Group tab buttons */}
          <button onClick={() => setActiveTab('substitute')} style={tabButtonStyle(activeTab === 'substitute')}>
            <UserX size={16} /> حصص الانتظار
          </button>
          <button onClick={() => setActiveTab('duty')} style={tabButtonStyle(activeTab === 'duty')}>
            <Shield size={16} /> جدول المناوبة
          </button>
        </div>
        <button
          onClick={handleOpenAddModal}
          style={{ ...primaryActionBtn, padding: '8px 16px', fontSize: '13px' }}
        >
          <Plus size={16} /> إضافة جديد
        </button>
      </div>
      {loading ? (
        <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '32px' }}>جارٍ التحميل...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* كروت الإحصائيات (تظهر في جميع التبويبات) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
             <StatCard icon={<UserX color="#EA580C" />} label="حصص الانتظار" value={substituteSchedules.length} bg="#FFF7ED" />
             <StatCard icon={<Shield color="#2563EB" />} label="المناوبات" value={dutySchedules.length} bg="#EFF6FF" />
             <StatCard icon={<CheckCircle color="#10B981" />} label="المعلمين النشطين" value={teachers.length || '—'} bg="#ECFDF5" />
          </div>

          {/* محتوى التبويب: حصص الانتظار */}
          {activeTab === 'substitute' && (
            <div style={tableContainerStyle}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB' }}>
                    <th style={thStyle}>الاسم</th>
                    <th style={thStyle}>الفصل</th>
                    <th style={thStyle}>التاريخ</th>
                    <th style={thStyle}>اليوم</th>
                    <th style={thStyle}>الحصة</th>
                    <th style={thStyle}>معلم-إداري</th>
                    <th style={thStyle}>ملاحظات</th>
                    <th style={thStyle}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {substituteSchedules.map(sub => (
                    <tr key={sub.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{sub.teacherName}</td>
                      <td style={tdStyle}>{sub.class}</td>
                      <td style={tdStyle}>{sub.date}</td>
                      <td style={tdStyle}>{sub.day || '—'}</td>
                      <td style={tdStyle}>{sub.period}</td>
                      <td style={tdStyle}>
                        <span style={badgeStyle(sub.executorType === 'admin' ? 'إداري' : 'معلم')}>
                          {sub.executorType === 'admin' ? 'إداري' : 'معلم'}
                        </span>
                      </td>
                      <td style={tdStyle}>{sub.notes || '—'}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          <IconButton 
                            icon={<Edit size={14} />} 
                            color="#2563EB" 
                            onClick={() => { 
                              setModalMode('edit'); 
                              setEditingItem(sub); 
                              setFormData({
                                executorType: sub.executorType || 'teacher',
                                teacherName: sub.teacherName || '',
                                adminPhone: sub.adminPhone || '',
                                day: sub.day || '',
                                date: sub.date || '',
                                period: sub.period || '',
                                class: sub.class || '',
                                notes: sub.notes || '',
                                location: '', // حصص الانتظار لا تحتوي على موقع
                              });
                              setShowModal(true); 
                            }} 
                          />
                          <IconButton icon={<MessageCircle size={14} />} color="#10B981" onClick={() => sendWhatsApp(sub)} />
                          <IconButton icon={<Trash2 size={14} />} color="#EF4444" onClick={() => handleDelete(sub.id, 'sub')} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {substituteSchedules.length === 0 && (
                  <tbody>
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF' }}>لا توجد حصص انتظار مسجلة</td></tr>
                  </tbody>
                )}
              </table>
            </div>
          )}

          {/* محتوى التبويب: جدول المناوبة */}
          {activeTab === 'duty' && (
            <div style={tableContainerStyle}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB' }}>
                    <th style={thStyle}>الاسم</th>
                    <th style={thStyle}>المكان</th>
                    <th style={thStyle}>التاريخ</th>
                    <th style={thStyle}>اليوم</th>
                    <th style={thStyle}>معلم-إداري</th>
                    <th style={thStyle}>ملاحظات</th>
                    <th style={thStyle}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {dutySchedules.map(duty => (
                    <tr key={duty.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{duty.teacherName}</td>
                      <td style={tdStyle}>{duty.location}</td>
                      <td style={tdStyle}>{duty.date || '—'}</td>
                      <td style={tdStyle}>{duty.day || '—'}</td>
                      <td style={tdStyle}>
                        <span style={badgeStyle(duty.executorType === 'admin' ? 'إداري' : 'معلم')}>
                          {duty.executorType === 'admin' ? 'إداري' : 'معلم'}
                        </span>
                      </td>
                      <td style={tdStyle}>{duty.notes || '—'}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          <IconButton 
                            icon={<Edit size={14} />} 
                            color="#2563EB" 
                            onClick={() => { 
                              setModalMode('edit'); 
                              setEditingItem(duty); 
                              setFormData({
                                executorType: duty.executorType || 'teacher',
                                teacherName: duty.teacherName || '',
                                adminPhone: duty.adminPhone || '',
                                day: duty.day || '',
                                date: duty.date || '',
                                notes: duty.notes || '',
                                location: duty.location || '',
                                period: '', // المناوبات لا تحتوي على حصة
                                class: '',  // المناوبات لا تحتوي على فصل
                              });
                              setShowModal(true); 
                            }} 
                          />
                          <IconButton icon={<MessageCircle size={14} />} color="#10B981" onClick={() => sendWhatsApp(duty, true)} />
                          <IconButton icon={<Trash2 size={14} />} color="#EF4444" onClick={() => handleDelete(duty.id, 'duty')} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {dutySchedules.length === 0 && (
                  <tbody>
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF' }}>لا توجد مناوبات مسجلة</td></tr>
                  </tbody>
                )}
              </table>
            </div>
          )}
        </div>
      )}

      {/* نافذة الإضافة والتعديل */}
      {showModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>
                {modalMode === 'edit' 
                  ? (activeTab === 'substitute' ? 'تعديل حصة انتظار' : 'تعديل مناوبة')
                  : (activeTab === 'substitute' ? 'إضافة حصة انتظار' : 'إضافة مناوبة')}
              </h3>
              <button onClick={() => { setShowModal(false); setEditingItem(null); }} style={closeBtnStyle}><X size={18} /></button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              {activeTab === 'substitute' && (
                <div style={{...formGroup, gridColumn: 'span 2'}}>
                  <label style={labelStyle}>الفئة المكلفة</label>
                  <div style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', cursor: 'pointer' }}>
                      <input type="radio" checked={formData.executorType === 'teacher'} onChange={() => setFormData({...formData, executorType: 'teacher'})} /> معلم
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', cursor: 'pointer' }}>
                      <input type="radio" checked={formData.executorType === 'admin'} onChange={() => setFormData({...formData, executorType: 'admin'})} /> إداري
                    </label>
                  </div>
                </div>
              )}

              {(activeTab === 'duty' || (activeTab === 'substitute' && formData.executorType === 'teacher')) ? (
                <div style={formGroup}>
                  <label style={labelStyle}>{activeTab === 'duty' ? 'المعلم المناوب' : 'المعلم البديل'}</label>
                  <select 
                    value={formData.teacherName} 
                    onChange={e => setFormData({...formData, teacherName: e.target.value})} 
                    style={inputStyle}
                  >
                    <option value="">اختر المعلم</option>
                    {teachers.map(t => <option key={t.id} value={t.fullName}>{t.fullName}</option>)}
                  </select>
                </div>
              ) : (
                <div style={formGroup}>
                  <label style={labelStyle}>اسم الإداري</label>
                  <input value={formData.teacherName} onChange={e => setFormData({...formData, teacherName: e.target.value})} style={inputStyle} placeholder="الاسم الكامل" />
                </div>
              )}

              {activeTab === 'substitute' && formData.executorType === 'admin' && (
                <div style={formGroup}>
                  <label style={labelStyle}>رقم الجوال</label>
                  <input value={formData.adminPhone} onChange={e => setFormData({...formData, adminPhone: e.target.value})} style={inputStyle} placeholder="05xxxxxxxx" />
                </div>
              )}

              {activeTab === 'substitute' ? (
                <>
                  <div style={formGroup}>
                    <label style={labelStyle}>الفصل</label>
                    <select value={formData.class} onChange={e => setFormData({...formData, class: e.target.value})} style={inputStyle}>
                      <option value="">اختر الفصل</option>
                      {classrooms.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div style={formGroup}><label style={labelStyle}>التاريخ</label><input type="date" value={formData.date} onChange={e => handleDateChange(e.target.value)} style={inputStyle} /></div>
                  <div style={formGroup}><label style={labelStyle}>اليوم</label><input value={formData.day} readOnly style={{...inputStyle, backgroundColor: '#F9FAFB', color: '#6B7280'}} /></div>
                  <div style={formGroup}>
                    <label style={labelStyle}>الحصة</label>
                    <select value={formData.period} onChange={e => setFormData({...formData, period: e.target.value})} style={inputStyle}>
                      <option value="">اختر الحصة</option>
                      {[1, 2, 3, 4, 5, 6, 7].map(num => (
                        <option key={num} value={`الحصة ${num}`}>الحصة {num}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{...formGroup, gridColumn: 'span 2'}}><label style={labelStyle}>ملاحظات</label><textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} style={{...inputStyle, height: '60px', padding: '10px'}} /></div>
                </>
              ) : (
                <>
                  <div style={formGroup}><label style={labelStyle}>التاريخ</label><input type="date" value={formData.date} onChange={e => handleDateChange(e.target.value)} style={inputStyle} /></div>
                  <div style={formGroup}><label style={labelStyle}>اليوم</label><input value={formData.day} readOnly style={{...inputStyle, backgroundColor: '#F9FAFB', color: '#6B7280'}} /></div>
                  <div style={formGroup}><label style={labelStyle}>الموقع</label><input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} style={inputStyle} placeholder="الساحة، البوابة..." /></div>
                  <div style={{...formGroup, gridColumn: 'span 2'}}><label style={labelStyle}>ملاحظات</label><textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} style={{...inputStyle, height: '60px', padding: '10px'}} /></div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
              <button onClick={handleSave} style={saveBtnStyle}>حفظ البيانات</button>
              <button onClick={() => setShowModal(false)} style={cancelBtnStyle}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// مكونات مساعدة
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  bg: string;
}

function StatCard({ icon, label, value, bg }: StatCardProps) {
  return (
    <div style={{ ...statCardStyle, backgroundColor: bg }}>
      {icon}
      <div>
        <p style={statLabelStyle}>{label}</p>
        <h3 style={statValueStyle}>{value}</h3>
      </div>
    </div>
  );
}

interface IconButtonProps {
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

function IconButton({ icon, color, onClick }: IconButtonProps) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', color }}>
      {icon}
    </button>
  );
}

const tabContainerStyle: React.CSSProperties = { display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #E5E7EB', paddingBottom: '10px' };
const tabButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: '10px 20px', border: 'none', background: active ? '#F4F8FB' : 'transparent',
  color: active ? '#2D7D82' : '#6B7280', fontWeight: active ? 700 : 400, borderRadius: '10px',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: active ? '2px solid #2D7D82' : 'none'
});

const badgeStyle = (status: string): React.CSSProperties => {
  const colors: Record<string, string> = { 'معلم': '#3B82F6', 'إداري': '#D97706', 'صباحي': '#3B82F6', 'فسحة': '#10B981', 'مسائي': '#6366F1' };
  return {
    backgroundColor: `${colors[status] || '#6B7280'}15`, color: colors[status] || '#6B7280',
    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700
  };
};

const tableContainerStyle: React.CSSProperties = { background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', overflowX: 'auto', padding: '10px' };
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalContentStyle: React.CSSProperties = { background: '#fff', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '600px' };
const formGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '5px' };
const labelStyle: React.CSSProperties = { fontSize: '12px', color: '#6B7280', fontWeight: 600 };
const inputStyle: React.CSSProperties = { padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB', outline: 'none' };
const saveBtnStyle: React.CSSProperties = { flex: 2, padding: '12px', background: '#9EC5C7', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700 };
const cancelBtnStyle: React.CSSProperties = { flex: 1, padding: '12px', background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: '10px', cursor: 'pointer' };
const closeBtnStyle: React.CSSProperties = { background: '#F3F4F6', border: 'none', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer' };
const primaryActionBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#2D7D82', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 };

const headerStyle: React.CSSProperties = {
  background: '#9EC5C7',
  color: '#fff',
  padding: '14px',
  borderRadius: '12px',
  textAlign: 'center',
  fontWeight: 600,
  fontSize: '16px',
  marginBottom: '20px',
};

const statCardStyle: React.CSSProperties = {
  padding: '20px',
  borderRadius: '16px',
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  textAlign: 'right'
};

const statLabelStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '12px',
  color: '#6B7280',
  fontWeight: 600
};

const statValueStyle: React.CSSProperties = {
  margin: '4px 0 0',
  fontSize: '24px',
  fontWeight: 800,
  color: '#1F2937'
};

const thStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB',
  padding: '12px 16px',
  textAlign: 'center',
  fontWeight: 600,
  color: '#6B7280',
  fontSize: '13px',
};

const tdStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB',
  padding: '12px 16px',
  textAlign: 'center',
  color: '#374151',
  fontSize: '14px',
};