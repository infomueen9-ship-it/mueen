import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import api from '../../api/axios'

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

const getCellValue = (headers: string[], row: string[], candidates: string[], fallbackIndex: number) => {
  const normalizedCandidates = candidates.map(normalizeHeader)
  const index = headers.findIndex((header) => normalizedCandidates.includes(normalizeHeader(header)))
  if (index >= 0 && row[index]) return row[index]
  return row[fallbackIndex] || ''
}

const parseLessonRows = (sheet: XLSX.WorkSheet): LessonRow[] => {
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as Array<Array<unknown>>
  const rows = rawRows.map((row) => row.map((value) => String(value ?? '').trim()))

  if (!rows.length) return []

  const firstRow = rows[0]
  const hasHeaderRow = firstRow.some((cell) => {
    const normalized = normalizeHeader(cell)
    return ['موضوعالدرس', 'lessontopic', 'topic', 'الواجبات', 'homework', 'assignment', 'الملاحظات', 'notes', 'note'].includes(normalized)
  })

  const headerRow = hasHeaderRow ? firstRow : ['موضوع الدرس', 'الواجبات', 'الملاحظات']
  const dataRows = hasHeaderRow ? rows.slice(1) : rows

  return dataRows
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => ({
      lessonTopic: getCellValue(headerRow, row, ['موضوع الدرس', 'lessontopic', 'topic'], 0),
      homework: getCellValue(headerRow, row, ['الواجبات', 'homework', 'assignment'], 1),
      notes: getCellValue(headerRow, row, ['الملاحظات', 'notes', 'note'], 2)
    }))
}

export default function StudyPlansPage() {
  const [selectedTerm, setSelectedTerm] = useState('الفصل الدراسي الأول')
  const [selectedStage, setSelectedStage] = useState('ابتدائي')
  const [selectedGrade, setSelectedGrade] = useState('الأول')
  const [selectedSubject, setSelectedSubject] = useState('اللغة العربية')
  const [parsedRows, setParsedRows] = useState<LessonRow[]>([])
  const [fileName, setFileName] = useState('')
  const [loadingFile, setLoadingFile] = useState(false)
  const [terms, setTerms] = useState<string[]>([])
  const [levels, setLevels] = useState<string[]>([])
  const [grades, setGrades] = useState<string[]>([])

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [termsRes, levelsRes, gradesRes] = await Promise.all([
          api.get('/api/platform/admin/study-plans/terms'),
          api.get('/api/platform/admin/study-plans/levels'),
          api.get('/api/platform/admin/study-plans/grades')
        ])

        const fetchedTerms = Array.isArray(termsRes.data) ? termsRes.data.map((item: any) => item.name) : []
        const fetchedLevels = Array.isArray(levelsRes.data) ? levelsRes.data.map((item: any) => item.name) : []
        const fetchedGrades = Array.isArray(gradesRes.data) ? gradesRes.data.map((item: any) => item.name) : []

        setTerms(fetchedTerms)
        setLevels(fetchedLevels)
        setGrades(fetchedGrades)

        if (fetchedTerms.length > 0) {
          setSelectedTerm(fetchedTerms[0])
        }
        if (fetchedLevels.length > 0) {
          setSelectedStage(fetchedLevels[0])
        }
      } catch {
        toast.error('تعذر تحميل بيانات الترم والمرحلة')
      }
    }

    loadMetadata()
  }, [])

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
      const normalizedRows = parseLessonRows(sheet)

      if (!normalizedRows.length) {
        toast.error('الملف فارغ أو لا يحتوي على بيانات صحيحة')
        setParsedRows([])
        setFileName(file.name)
        return
      }

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
            <label className="block text-sm text-gray-600 mb-2">الفصل الدراسي</label>
            <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1a73e8]">
              {terms.length > 0 ? terms.map((term) => (
                <option key={term} value={term}>{term}</option>
              )) : <option value="">لا توجد بيانات</option>}
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
              {levels.length > 0 ? levels.map((level) => (
                <option key={level} value={level}>{level}</option>
              )) : Object.keys(gradeOptions).map((stage) => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">الصف</label>
            <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1a73e8]">
              {grades.length > 0 ? grades.map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              )) : gradeList.map((grade) => (
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
