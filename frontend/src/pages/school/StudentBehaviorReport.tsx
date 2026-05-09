import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { Printer, ArrowRight } from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";

interface BehaviorLog {
  id: number;
  statement: string;
  operation_type: 'add' | 'deduct';
  operationType?: 'add' | 'deduct';
  points: number;
  expected_score: number;
  expectedScore?: number;
  evidence_type?: string;
  evidenceType?: string;
  evidence_url?: string;
  evidenceUrl?: string;
  created_at: string;
  createdAt?: string;
}

export default function StudentBehaviorReport() {
  const { schoolCode, classroomId, studentId } = useParams();
  const [searchParams] = useSearchParams();
  const studentName = searchParams.get("name") || "الطالب";
  const classroomName = searchParams.get("classroom") || "الفصل";
  const currentScore = searchParams.get("score") || "80";
  
  const [logs, setLogs] = useState<BehaviorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const schemaName = `school_${schoolCode}`;

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get(`/api/school/${schemaName}/classrooms/${classroomId}/students/${studentId}/behavior`);
        setLogs(res.data);
      } catch {
        toast.error("تعذر تحميل بيانات التقرير");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [schemaName, classroomId, studentId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>جارٍ تجهيز التقرير...</div>;

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 p-8 print:bg-white print:p-0" style={{ fontFamily: 'Tajawal, sans-serif' }}>
      {/* زر الطباعة والرجوع */}
      <div className="max-w-5xl mx-auto flex justify-between mb-6 print:hidden">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 bg-white text-gray-600 px-6 py-3 rounded-2xl shadow-sm border border-gray-200 hover:bg-gray-50 transition font-bold"
        >
          <ArrowRight size={20} />
          رجوع
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-[#2D7D82] text-white px-8 py-3 rounded-2xl shadow-lg hover:scale-105 transition font-bold"
        >
          <Printer size={20} />
          طباعة التقرير
        </button>
      </div>

      {/* الصفحة */}
      <div className="bg-white max-w-5xl mx-auto rounded-[2rem] shadow-xl border border-gray-100 p-12 print:shadow-none print:border-none">

        {/* الهيدر */}
        <div className="flex justify-between items-center flex-wrap gap-8 mb-12 pb-10 border-b-2 border-gray-50">
          <div className="text-right">
            <h1 className="text-4xl font-extrabold mb-6 text-gray-900">
              سجل سلوك الطالب
            </h1>
            <div className="space-y-3 text-lg font-semibold text-gray-700">
              <p>الاسم: <span className="mr-2 text-black">{studentName}</span></p>
              <p>الفصل: <span className="mr-2 text-black">{classroomName}</span></p>
              <p>تاريخ الاستخراج: <span className="mr-2 text-black">{new Date().toLocaleDateString('ar-SA')}</span></p>
            </div>
          </div>

          {/* الدرجة */}
          <div className="w-52 h-52 border-4 border-[#F0F9FA] rounded-[2.5rem] flex flex-col justify-center items-center bg-gradient-to-b from-white to-[#F8FCFD] shadow-inner">
            <p className="text-xl font-bold text-gray-500 mb-3">الدرجة الحالية</p>
            <h2 className="text-7xl font-black text-[#2D7D82] tracking-tighter">{currentScore}</h2>
            <span className="mt-3 text-gray-400 font-bold uppercase tracking-widest text-xs">من 100</span>
          </div>
        </div>

        {/* السلوكيات */}
        <div className="space-y-10">
          {logs.map((item) => {
            const opType = item.operation_type || item.operationType;
            const isAdd = opType === 'add';
            const eType = item.evidence_type || item.evidenceType;
            const eUrl = item.evidence_url || item.evidenceUrl;
            const dateStr = item.created_at || item.createdAt;

            return (
            <div key={item.id} className="border-2 border-gray-50 rounded-[2rem] p-10 bg-[#FBFCFC] break-inside-avoid hover:border-[#E8F4F5] transition-colors">
              <div className="flex justify-between items-start flex-wrap gap-8">
                {/* النقاط */}
                <div
                  className={`min-w-[100px] h-[70px] rounded-2xl flex items-center justify-center text-4xl font-black border-2
                  ${isAdd ? "bg-green-50 text-green-600 border-green-100" : "bg-red-50 text-red-600 border-red-100"}`}
                >
                  {isAdd ? `+${item.points}` : `-${item.points}`}
                </div>

                {/* البيانات */}
                <div className="flex-1 text-right">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-gray-400 font-bold">{new Date(dateStr || '').toLocaleDateString('ar-SA')}</span>
                       <span className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide ${isAdd ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                         {isAdd ? 'تعزيز إيجابي' : 'تنبيه سلوكي'}
                       </span>
                    </div>

                    <p className="text-2xl font-bold text-gray-800 leading-relaxed">
                      {item.statement}
                    </p>
                    
                    <div className="flex gap-8 mt-4 text-gray-500 font-semibold">
                       <p>نوع الإثبات: <span className="text-gray-800">{eType === 'image' ? 'صورة' : eType === 'video' ? 'فيديو' : 'بيان نصي'}</span></p>
                       <p>المعلم المنفذ: <span className="text-gray-800">إدارة المدرسة</span></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* QR Code للمرفقات */}
              {eUrl && (
                <div className="flex items-center gap-8 mt-10 p-6 bg-white rounded-[1.5rem] border border-gray-100 shadow-sm">
                  <div className="flex-1">
                    <p className="text-lg font-bold text-gray-800 mb-1">الدليل الرقمي</p>
                    <p className="text-sm text-gray-400 mb-4">يرجى مسح رمز الاستجابة السريعة (QR) لمشاهدة المرفق المرتبط بهذا الإجراء السلوكي.</p>
                    <code className="text-[10px] bg-gray-50 px-3 py-1 rounded-lg text-gray-400 block w-fit font-mono">{eUrl}</code>
                  </div>
                  <div className="bg-white p-3 border-2 border-gray-50 rounded-2xl shadow-sm">
                    <QRCodeCanvas value={eUrl} size={110} />
                  </div>
                </div>
              )}
            </div>
            );
          })}

          {logs.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              لا يوجد سجلات سلوك مسجلة لهذا الطالب حتى الآن.
            </div>
          )}
        </div>
        
        {/* فوتر التقرير للطباعة */}
        <div className="hidden print:flex justify-between mt-12 pt-8 border-t border-gray-100 text-gray-400 text-sm">
          <p>نظام معين للإدارة المدرسية الذكية</p>
          <p>صدر هذا التقرير بتاريخ {new Date().toLocaleDateString('ar-SA')}</p>
        </div>
      </div>

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
          
          @media print {
            body {
              background: white !important;
              -webkit-print-color-adjust: exact;
            }
            .min-h-screen {
              background: white !important;
              padding: 0 !important;
            }
            @page {
              size: A4;
              margin: 15mm;
            }
          }
        `}
      </style>
    </div>
  );
}