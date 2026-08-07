import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

type LessonRow = {
  lessonTopic: string
  homework: string
  notes: string
}

const gradeOptions: Record<string, string[]> = {
  ابتدائي: ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'],
  متوسط: ['الأول متوسط', 'الثاني متوسط', 'الثالث متوسط'],
  ثانوي: ['الأول ثانوي', 'الثاني ثانوي', 'الثالث ثانوي']
}

const subjectOptions: Record<string, string[]> = {
  ابتدائي: ['اللغة العربية', 'الرياضيات', 'العلوم', 'الإنجليزية', 'العلوم الاجتماعية'],
  متوسط: ['اللغة العربية', 'الرياضيات', 'العلوم', 'الإنجليزية', 'الحاسب'],
  ثانوي: ['اللغة العربية', 'الرياضيات', 'الفيزياء', 'الكيمياء', 'الأحياء']
}

const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')

const findHeader = (headers: string[], candidates: string[]) => {
  const normalizedCandidates = candidates.map(normalizeHeader)
  return headers.find((header) => normalizedCandidates.includes(normalizeHeader(header)))
}

export default function StudyPlansPage() {
  const [selectedTerm, setSelectedTerm] = useState('الفصل الدراسي الأول')
  const [selectedStage, setSelectedStage] = useState('ابتدائي')
  const [selectedGrade, setSelectedGrade] = useState('الأول')
  const [selectedSubject, setSelectedSubject] = useState('اللغة العربية')
  const [parsedRows, setParsedRows] = useState<LessonRow[]>([])
  const [fileName, setFileName] = useState('')
  const [loadingFile, setLoadingFile] = useState(false)

  const gradeList = useMemo(() => gradeOptions[selectedStage] || [], [selectedStage])
  const subjectList = useMemo(() => subjectOptions[selectedStage] || [], [selectedStage])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoadingFile(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

      if (!rows.length) {
        toast.error('الملف فارغ')
        setParsedRows([])
        setFileName(file.name)
        return
      }

      const headers = Object.keys(rows[0])
      const lessonTopicHeader = findHeader(headers, ['موضوع الدرس', 'موضوعالدرس', 'lesson topic', 'topic'])
      const homeworkHeader = findHeader(headers, ['الواجبات', 'homework', 'assignment'])
      const notesHeader = findHeader(headers, ['الملاحظات', 'notes', 'note'])

      if (!lessonTopicHeader || !homeworkHeader || !notesHeader) {
        toast.error('الملف يجب أن يحتوي على الأعمدة: موضوع الدرس، الواجبات، الملاحظات')
        setParsedRows([])
        setFileName(file.name)
        return
      }

      const normalizedRows: LessonRow[] = rows.map((row) => ({
        lessonTopic: String(row[lessonTopicHeader] ?? ''),
        homework: String(row[homeworkHeader] ?? ''),
        notes: String(row[notesHeader] ?? '')
      }))

      setParsedRows(normalizedRows)
      setFileName(file.name)
      toast.success(`تم تحميل ${normalizedRows.length} سطرًا بنجاح`)
    } catch {
      toast.error('تعذر قراءة الملف. تأكد من أنه بصيغة Excel')
      setParsedRows([])
    } finally {
      setLoadingFile(false)
    }
  }

  return (
    <div className="space-y-6" style={{ direction: 'rtl' }}>
      <div>
        <h2 className="text-2xl font-bold text-gray-800">إضافة خطة دراسية</h2>
        <p className="text-sm text-gray-500 mt-1">اختر الترم والمرحلة والصف والمادة ثم ارفع ملف Excel يحتوي على الأعمدة المطلوبة</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">الترم</label>
            <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1a73e8]">
              <option>الفصل الدراسي الأول</option>
              <option>الفصل الدراسي الثاني</option>
              <option>الفصل الدراسي الثالث</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">المرحلة</label>
            <select value={selectedStage} onChange={(e) => {
              const nextStage = e.target.value
              setSelectedStage(nextStage)
              setSelectedGrade(gradeOptions[nextStage]?.[0] || '')
              setSelectedSubject(subjectOptions[nextStage]?.[0] || '')
            }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1a73e8]">
              {Object.keys(gradeOptions).map((stage) => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">الصف</label>
            <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1a73e8]">
              {gradeList.map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">المادة</label>
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1a73e8]">
              {subjectList.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-gray-300 p-5 bg-gray-50">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center">
            <span className="rounded-full bg-[#1a73e8] px-4 py-2 text-sm font-medium text-white">اختيار ملف Excel</span>
            <span className="text-sm text-gray-600">استخدم ملف يحتوي على الأعمدة: موضوع الدرس، الواجبات، الملاحظات</span>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
          </label>
          {fileName && <p className="mt-3 text-sm text-gray-500">الملف المختار: {fileName}</p>}
          {loadingFile && <p className="mt-2 text-sm text-[#1a73e8]">جارٍ قراءة الملف...</p>}
        </div>

        <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
          <p><span className="font-semibold">الخطة المختارة:</span> {selectedTerm} • {selectedStage} • {selectedGrade} • {selectedSubject}</p>
        </div>
      </div>

      {parsedRows.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">معاينة البيانات</h3>
            <span className="text-sm text-gray-500">{parsedRows.length} صف</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-right">موضوع الدرس</th>
                  <th className="px-4 py-3 text-right">الواجبات</th>
                  <th className="px-4 py-3 text-right">الملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parsedRows.slice(0, 8).map((row, index) => (
                  <tr key={`${row.lessonTopic}-${index}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{row.lessonTopic || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{row.homework || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{row.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
