import { useState, useEffect } from 'react'
import { Send, Plus, Search, Eye, Trash2, Calendar, Users, User, MessageSquare, CheckCircle, Clock, XCircle, BookOpen, Save, X } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'

interface Message {
  id: number
  recipientType: string
  recipientName: string
  category: string
  subject: string
  content: string
  sendType: string
  status: string
  createdAt: string
  scheduledDate?: string
}

interface Classroom {
  id: number
  name: string
}

interface Template {
  id: number
  name: string
  category: string
  subject: string
  content: string
}

const CATEGORIES = ['أكاديمي', 'إداري', 'إعلان', 'تحذير', 'غياب', 'ترحيب', 'عام']

const categoryColor = (cat: string) => {
  const map: Record<string, string> = {
    'أكاديمي': '#DBEAFE|#1D4ED8',
    'إداري': '#EDE9FE|#7C3AED',
    'إعلان': '#DCFCE7|#16A34A',
    'تحذير': '#FEE2E2|#DC2626',
    'غياب': '#FFEDD5|#EA580C',
    'ترحيب': '#FCE7F3|#DB2777',
    'عام': '#F3F4F6|#4B5563',
  }
  const [bg, text] = (map[cat] || map['عام']).split('|')
  return { backgroundColor: bg, color: text }
}

const categoryIcon = (cat: string) => {
  const map: Record<string, string> = { 'أكاديمي': '📚', 'إداري': '📋', 'إعلان': '📢', 'تحذير': '⚠️', 'غياب': '📅', 'ترحيب': '🎉', 'عام': '💬' }
  return map[cat] || '💬'
}

export default function MessagesPage({ schemaName }: { schemaName: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('الكل')
  const [showSendModal, setShowSendModal] = useState(false)
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Message | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    recipientType: 'كافة الطلاب',
    recipientId: '',
    category: 'عام',
    subject: '',
    content: '',
    sendType: 'فوري',
    scheduledDate: '',
  })

  const [templateForm, setTemplateForm] = useState({
    name: '', category: 'عام', subject: '', content: ''
  })

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.get(`/api/school/${schemaName}/messages`),
      api.get(`/api/school/${schemaName}/classrooms`),
      api.get(`/api/school/${schemaName}/message-templates`),
    ]).then(([msgRes, clsRes, tplRes]) => {
      if (!cancelled) {
        setMessages(msgRes.data)
        setClassrooms(clsRes.data)
        setTemplates(tplRes.data)
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [schemaName])

  const fetchMessages = () => {
    api.get(`/api/school/${schemaName}/messages`).then(r => setMessages(r.data))
  }

  const fetchTemplates = () => {
    api.get(`/api/school/${schemaName}/message-templates`).then(r => setTemplates(r.data))
  }

  const handleSend = async () => {
    if (!form.subject.trim() || !form.content.trim()) { toast.error('يرجى ملء جميع الحقول'); return }
    setSaving(true)
    try {
      await api.post(`/api/school/${schemaName}/messages`, form)
      toast.success('تم إرسال الرسالة')
      setShowSendModal(false)
      setForm({ recipientType: 'كافة الطلاب', recipientId: '', category: 'عام', subject: '', content: '', sendType: 'فوري', scheduledDate: '' })
      fetchMessages()
    } catch {
      toast.error('تعذر إرسال الرسالة')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (msg: Message) => {
    try {
      await api.delete(`/api/school/${schemaName}/messages/${msg.id}`)
      setMessages(messages.filter(m => m.id !== msg.id))
      toast.success('تم حذف الرسالة')
      setConfirmDelete(null)
    } catch {
      toast.error('تعذر حذف الرسالة')
    }
  }

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.content.trim()) { toast.error('يرجى ملء الحقول المطلوبة'); return }
    try {
      await api.post(`/api/school/${schemaName}/message-templates`, templateForm)
      toast.success('تم حفظ القالب')
      setShowSaveTemplateModal(false)
      setTemplateForm({ name: '', category: 'عام', subject: '', content: '' })
      fetchTemplates()
    } catch {
      toast.error('تعذر حفظ القالب')
    }
  }

  const handleDeleteTemplate = async (id: number) => {
    try {
      await api.delete(`/api/school/${schemaName}/message-templates/${id}`)
      setTemplates(templates.filter(t => t.id !== id))
      toast.success('تم حذف القالب')
    } catch {
      toast.error('تعذر حذف القالب')
    }
  }

  const handleUseTemplate = (tpl: Template) => {
    setForm(prev => ({ ...prev, category: tpl.category, subject: tpl.subject, content: tpl.content }))
    setShowTemplatesModal(false)
    setShowSendModal(true)
  }

  const filtered = messages.filter(m => {
    const matchSearch = m.subject.includes(search) || m.content.includes(search) || m.recipientName.includes(search)
    const matchCat = categoryFilter === 'الكل' || m.category === categoryFilter
    return matchSearch && matchCat
  })

  const charCount = form.content.length
  const smsCount = Math.ceil(charCount / 160) || 1

  return (
    <div style={{ padding: '24px 48px', direction: 'rtl' }}>

      {/* Blue Header */}
      <div style={{
        background: '#9EC5C7', color: '#fff', padding: '14px',
        borderRadius: '12px', textAlign: 'center', fontWeight: 600,
        fontSize: '16px', marginBottom: '20px',
      }}>
        نظام الرسائل النصية SMS
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setShowTemplatesModal(true)} style={outlineBtn}>
          <BookOpen size={15} /> بنك الرسائل
        </button>
        <button onClick={() => setShowSendModal(true)} style={primaryBtn}>
          <Plus size={15} /> إرسال رسالة SMS
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'إجمالي الرسائل', value: messages.length, color: '#7C3AED', icon: '💬' },
          { label: 'مرسلة', value: messages.filter(m => m.status === 'مرسلة').length, color: '#16A34A', icon: '✅' },
          { label: 'مجدولة', value: messages.filter(m => m.status === 'مجدولة').length, color: '#2563EB', icon: '📅' },
          { label: 'قوالب محفوظة', value: templates.length, color: '#D97706', icon: '📋' },
        ].map((stat, idx) => (
          <div key={idx} style={{
            backgroundColor: '#fff', borderRadius: '12px', padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            borderRight: `4px solid ${stat.color}`,
          }}>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>{stat.label}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: stat.color }}>{stat.value}</span>
              <span style={{ fontSize: '24px' }}>{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="البحث في الرسائل..."
            style={{ ...inputStyle, paddingRight: '36px', width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ ...inputStyle, width: '150px' }}>
          <option value="الكل">الكل</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '32px' }}>جارٍ التحميل...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB' }}>
              {['المستلم', 'التصنيف', 'الموضوع', 'المحتوى', 'التاريخ', 'النوع', 'الحالة', 'إجراءات'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(msg => (
              <tr key={msg.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {msg.recipientType === 'كافة الطلاب' ? <Users size={13} /> : msg.recipientType === 'صف معين' ? <MessageSquare size={13} /> : <User size={13} />}
                    <span>{msg.recipientName}</span>
                  </div>
                </td>
                <td style={tdStyle}>
                  <span style={{ ...categoryColor(msg.category), padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                    {categoryIcon(msg.category)} {msg.category}
                  </span>
                </td>
                <td style={{ ...tdStyle, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.subject}</td>
                <td style={{ ...tdStyle, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#6B7280', fontSize: '12px' }}>{msg.content}</td>
                <td style={tdStyle}>{msg.scheduledDate || msg.createdAt?.split('T')[0] || '—'}</td>
                <td style={tdStyle}>
                  <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', backgroundColor: msg.sendType === 'فوري' ? '#E0F2FE' : '#EDE9FE', color: msg.sendType === 'فوري' ? '#0369A1' : '#7C3AED' }}>
                    {msg.sendType}
                  </span>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {msg.status === 'مرسلة' ? <CheckCircle size={13} color="#16A34A" /> : msg.status === 'مجدولة' ? <Calendar size={13} color="#2563EB" /> : msg.status === 'فشل' ? <XCircle size={13} color="#DC2626" /> : <Clock size={13} color="#D97706" />}
                    <span style={{ fontSize: '12px' }}>{msg.status}</span>
                  </div>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    <button onClick={() => setSelectedMessage(msg)} style={iconBtn}>
                      <Eye size={13} color="#2563EB" />
                    </button>
                    <button onClick={() => setConfirmDelete(msg)} style={iconBtn}>
                      <Trash2 size={13} color="#DC2626" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF' }}>لا توجد رسائل</td></tr>
            )}
          </tbody>
        </table>
      )}

      {/* Send Modal */}
      {showSendModal && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, maxWidth: '680px' }}>
            <div style={modalHeader}>
              <h3 style={modalTitle}>إرسال رسالة SMS جديدة</h3>
              <button onClick={() => setShowSendModal(false)} style={closeBtn}><X size={16} color="#6B7280" /></button>
            </div>

            {/* Use Template */}
            <div style={{ backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '10px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', color: '#7C3AED' }}>هل تريد استخدام رسالة جاهزة؟</span>
              <button onClick={() => { setShowSendModal(false); setShowTemplatesModal(true) }} style={{ ...outlineBtn, fontSize: '12px', padding: '6px 12px' }}>
                اختر من البنك
              </button>
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>إرسال إلى</label>
                  <select value={form.recipientType} onChange={e => setForm({ ...form, recipientType: e.target.value, recipientId: '' })} style={inputStyle}>
                    <option value="كافة الطلاب">كافة الطلاب</option>
                    <option value="صف معين">صف معين</option>
                  </select>
                </div>
                {form.recipientType === 'صف معين' && (
                  <div>
                    <label style={labelStyle}>اختر الصف</label>
                    <select value={form.recipientId} onChange={e => setForm({ ...form, recipientId: e.target.value })} style={inputStyle}>
                      <option value="">اختر صفاً</option>
                      {classrooms.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>تصنيف الرسالة</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inputStyle}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{categoryIcon(c)} {c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>نوع الإرسال</label>
                  <select value={form.sendType} onChange={e => setForm({ ...form, sendType: e.target.value })} style={inputStyle}>
                    <option value="فوري">فوري</option>
                    <option value="مجدول">مجدول</option>
                  </select>
                </div>
              </div>

              {form.sendType === 'مجدول' && (
                <div>
                  <label style={labelStyle}>تاريخ الإرسال</label>
                  <input type="datetime-local" value={form.scheduledDate} onChange={e => setForm({ ...form, scheduledDate: e.target.value })} style={inputStyle} />
                </div>
              )}

              <div>
                <label style={labelStyle}>عنوان الرسالة</label>
                <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="مثال: امتحان الرياضيات" style={inputStyle} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={labelStyle}>محتوى الرسالة</label>
                  <span style={{ fontSize: '11px', color: charCount > 160 ? '#EA580C' : '#9CA3AF' }}>{charCount}/160 — {smsCount} SMS</span>
                </div>
                <textarea
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  placeholder="اكتب محتوى الرسالة..."
                  rows={4}
                  maxLength={480}
                  style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' }}
                />
              </div>

              <button
                type="button"
                onClick={() => { setTemplateForm({ name: form.subject, category: form.category, subject: form.subject, content: form.content }); setShowSaveTemplateModal(true) }}
                disabled={!form.subject || !form.content}
                style={{ ...outlineBtn, fontSize: '12px', width: 'fit-content' }}
              >
                <Save size={13} /> حفظ كقالب
              </button>
            </div>

            {/* Summary */}
            <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '14px', margin: '16px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: '#6B7280' }}>عدد الرسائل لكل مستلم:</span>
                <span style={{ fontWeight: 700, color: '#7C3AED' }}>{smsCount} SMS</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleSend} disabled={saving} style={{ ...primaryBtn, flex: 2 }}>
                {form.sendType === 'فوري' ? <><Send size={14} /> إرسال فوري</> : <><Calendar size={14} /> جدولة الإرسال</>}
              </button>
              <button onClick={() => setShowSendModal(false)} style={{ ...outlineBtn, flex: 1 }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplatesModal && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, maxWidth: '800px' }}>
            <div style={modalHeader}>
              <h3 style={modalTitle}><BookOpen size={18} /> بنك الرسائل</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setShowSaveTemplateModal(true)} style={primaryBtn}><Plus size={14} /> قالب جديد</button>
                <button onClick={() => setShowTemplatesModal(false)} style={closeBtn}><X size={16} color="#6B7280" /></button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
              {templates.length === 0 && (
                <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#9CA3AF', padding: '32px' }}>لا توجد قوالب بعد</p>
              )}
              {templates.map(tpl => (
                <div key={tpl.id} style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div>
                      <span style={{ ...categoryColor(tpl.category), padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                        {categoryIcon(tpl.category)} {tpl.category}
                      </span>
                      <p style={{ margin: '6px 0 0', fontWeight: 600, fontSize: '14px', color: '#374151' }}>{tpl.name}</p>
                    </div>
                    <button onClick={() => handleDeleteTemplate(tpl.id)} style={iconBtn}><Trash2 size={13} color="#DC2626" /></button>
                  </div>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 12px', lineHeight: 1.6 }}>{tpl.content}</p>
                  <button onClick={() => handleUseTemplate(tpl)} style={{ ...primaryBtn, width: '100%', justifyContent: 'center' }}>
                    <Send size={13} /> استخدام
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, maxWidth: '560px' }}>
            <div style={modalHeader}>
              <h3 style={modalTitle}>حفظ قالب جديد</h3>
              <button onClick={() => setShowSaveTemplateModal(false)} style={closeBtn}><X size={16} color="#6B7280" /></button>
            </div>
            <div style={{ display: 'grid', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={labelStyle}>اسم القالب *</label>
                <input value={templateForm.name} onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="مثال: رسالة ترحيب" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>التصنيف</label>
                <select value={templateForm.category} onChange={e => setTemplateForm({ ...templateForm, category: e.target.value })} style={inputStyle}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{categoryIcon(c)} {c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>عنوان الرسالة</label>
                <input value={templateForm.subject} onChange={e => setTemplateForm({ ...templateForm, subject: e.target.value })} placeholder="عنوان الرسالة" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>المحتوى *</label>
                <textarea value={templateForm.content} onChange={e => setTemplateForm({ ...templateForm, content: e.target.value })} rows={4} style={{ ...inputStyle, height: 'auto', padding: '10px 12px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={handleSaveTemplate} style={{ ...primaryBtn, flex: 2 }}><Save size={14} /> حفظ في البنك</button>
              <button onClick={() => setShowSaveTemplateModal(false)} style={{ ...outlineBtn, flex: 1 }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* View Message Modal */}
      {selectedMessage && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, maxWidth: '600px' }}>
            <div style={modalHeader}>
              <h3 style={modalTitle}>{selectedMessage.subject}</h3>
              <button onClick={() => setSelectedMessage(null)} style={closeBtn}><X size={16} color="#6B7280" /></button>
            </div>
            <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={infoBox}><span style={{ color: '#9CA3AF', fontSize: '11px' }}>المستلم</span><span style={{ fontWeight: 600 }}>{selectedMessage.recipientName}</span></div>
                <div style={infoBox}><span style={{ color: '#9CA3AF', fontSize: '11px' }}>التصنيف</span><span style={{ ...categoryColor(selectedMessage.category), padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>{selectedMessage.category}</span></div>
                <div style={infoBox}><span style={{ color: '#9CA3AF', fontSize: '11px' }}>نوع الإرسال</span><span style={{ fontWeight: 600 }}>{selectedMessage.sendType}</span></div>
                <div style={infoBox}><span style={{ color: '#9CA3AF', fontSize: '11px' }}>الحالة</span><span style={{ fontWeight: 600 }}>{selectedMessage.status}</span></div>
              </div>
              <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px' }}>
                <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 8px' }}>محتوى الرسالة:</p>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{selectedMessage.content}</p>
              </div>
            </div>
            <button onClick={() => setSelectedMessage(null)} style={{ ...outlineBtn, width: '100%', justifyContent: 'center', marginTop: '16px' }}>إغلاق</button>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div style={overlayStyle}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '32px', width: '360px', textAlign: 'center', direction: 'rtl' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px', color: '#374151' }}>تأكيد الحذف</h3>
            <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '24px' }}>هل أنت متأكد من حذف هذه الرسالة؟</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handleDelete(confirmDelete)} style={{ flex: 1, padding: '10px', backgroundColor: '#EF4444', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}>نعم، احذف</button>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '10px', backgroundColor: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const primaryBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px',
  padding: '8px 16px', backgroundColor: '#9EC5C7',
  color: '#fff', border: 'none', borderRadius: '8px',
  cursor: 'pointer', fontWeight: 600, fontSize: '13px',
}

const outlineBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px',
  padding: '8px 16px', backgroundColor: '#fff',
  color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: '8px',
  cursor: 'pointer', fontWeight: 600, fontSize: '13px',
}

const iconBtn: React.CSSProperties = {
  border: '1px solid #E5E7EB', background: '#F9FAFB',
  borderRadius: '8px', width: '32px', height: '32px',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, backdropFilter: 'blur(3px)',
}

const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff', borderRadius: '16px', padding: '32px',
  width: '95%', direction: 'rtl', maxHeight: '90vh', overflowY: 'auto',
}

const modalHeader: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
}

const modalTitle: React.CSSProperties = {
  margin: 0, color: '#374151', fontSize: '16px', fontWeight: 700,
  display: 'flex', alignItems: 'center', gap: '8px',
}

const closeBtn: React.CSSProperties = {
  border: 'none', background: '#F3F4F6', borderRadius: '50%',
  width: '32px', height: '32px', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const thStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB', padding: '12px 16px',
  textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '13px',
}

const tdStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB', padding: '12px 16px', textAlign: 'center', fontSize: '13px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: '38px', border: '1px solid #E5E7EB',
  borderRadius: '8px', padding: '0 12px', fontSize: '13px',
  textAlign: 'right', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: '#6B7280',
}

const infoBox: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '4px',
  padding: '10px', backgroundColor: '#F9FAFB', borderRadius: '8px',
}