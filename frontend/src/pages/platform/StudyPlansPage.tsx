
import { useCallback, useEffect, useState } from "react";
import {
BookOpen,
GraduationCap,
Layers,
FileText,
Plus,
Edit,
Trash2,
Upload,
X,
RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";

type EntityType =
| "term"
| "level"
| "grade"
| "subject";

interface Term {
id: number;
name: string;
}

interface Level {
id: number;
name: string;
}

interface Grade {
id: number;
name: string;
level_id: number;
level_name?: string;
}

interface Subject {
id: number;
name: string;
level_id: number;
level_name?: string;
grade_id: number;
grade_name?: string;
}

interface StudyPlan {
  id: number;

  termId?: number;
  termName?: string;

  subjectId: number;
  subjectName: string;

  levelId: number;
  levelName: string;

  gradeId: number;
  gradeName: string;

  lessonTopic: string;
  homework?: string;
  notes?: string;
}


export default function StudyPlansPage() {

const [activeTab, setActiveTab] =
useState<"plans" | "terms" | "levels" | "grades" | "subjects">(
"plans"
);

const [loading, setLoading] = useState(false);

const [terms, setTerms] = useState<Term[]>([]);
const [levels, setLevels] = useState<Level[]>([]);
const [grades, setGrades] = useState<Grade[]>([]);
const [subjects, setSubjects] = useState<Subject[]>([]);
const [plans, setPlans] = useState<StudyPlan[]>([]);

const [selectedLevel, setSelectedLevel] =
useState("");

const [selectedGrade, setSelectedGrade] =
useState("");

const [selectedSubject, setSelectedSubject] =
useState("");

const [selectedTerm, setSelectedTerm] =
useState("");

const [showModal, setShowModal] =
useState(false);

const [modalType, setModalType] =
useState("term");

const [editingId, setEditingId] =
useState<number | null>(null);

const [formData, setFormData] =
useState({
name: "",
levelId: "",
gradeId: "",
});

const [showUploadModal, setShowUploadModal] =
useState(false);

const [uploadFile, setUploadFile] =
useState<File | null>(null);

const [uploadTerm, setUploadTerm] =
useState("");

const [uploadSubject, setUploadSubject] =
useState("");

// =========================================================
// Load data
// =========================================================

const loadData = useCallback(async () => {

setLoading(true);

try {

  const [
    termsRes,
    levelsRes,
    gradesRes,
    subjectsRes,
    plansRes,
  ] = await Promise.all([
    api.get("/api/platform/admin/study-plans/terms"),
    api.get("/api/platform/admin/study-plans/levels"),
    api.get("/api/platform/admin/study-plans/grades"),
    api.get("/api/platform/admin/study-plans/subjects"),
    api.get("/api/platform/admin/study-plans/plans"),
  ]);

  setTerms(termsRes.data);
  setLevels(levelsRes.data);
  setGrades(gradesRes.data);
  setSubjects(subjectsRes.data);
  setPlans(plansRes.data);

} catch (error) {

  console.error(error);

  toast.error(
    "تعذر تحميل بيانات الخطط الدراسية"
  );

} finally {

  setLoading(false);
}
}, []);

useEffect(() => {
loadData();
}, [loadData]);

// =========================================================
// Modal
// =========================================================

const openAddModal = (
type: EntityType
) => {

setModalType(type);
setEditingId(null);

setFormData({
  name: "",
  levelId: "",
  gradeId: "",
});

setShowModal(true);
};

const openEditModal = (
type: EntityType,
item: any
) => {

setModalType(type);
setEditingId(item.id);

setFormData({
  name: item.name,
  levelId:
    item.level_id
      ? String(item.level_id)
      : "",
  gradeId:
    item.grade_id
      ? String(item.grade_id)
      : "",
});

setShowModal(true);
};

const closeModal = () => {

setShowModal(false);
setEditingId(null);

setFormData({
  name: "",
  levelId: "",
  gradeId: "",
});
};

// =========================================================
// Save entity
// =========================================================

const saveEntity = async () => {

if (!formData.name.trim()) {
  toast.error("يرجى إدخال الاسم");
  return;
}

try {

  let endpoint = "";

  let payload: any = {
    name: formData.name.trim(),
  };

  if (modalType === "term") {

    endpoint =
      "/api/platform/admin/study-plans/terms";
  }

  if (modalType === "level") {

    endpoint =
      "/api/platform/admin/study-plans/levels";
  }

  if (modalType === "grade") {

    if (!formData.levelId) {
      toast.error("يرجى اختيار المرحلة");
      return;
    }

    endpoint =
      "/api/platform/admin/study-plans/grades";

    payload.levelId =
      Number(formData.levelId);
  }

  if (modalType === "subject") {

    if (!formData.levelId) {
      toast.error("يرجى اختيار المرحلة");
      return;
    }

    if (!formData.gradeId) {
      toast.error("يرجى اختيار الصف");
      return;
    }

    endpoint =
      "/api/platform/admin/study-plans/subjects";

    payload.levelId =
      Number(formData.levelId);

    payload.gradeId =
      Number(formData.gradeId);
  }

  if (editingId) {

    await api.put(
      `${endpoint}/${editingId}`,
      payload
    );

    toast.success("تم التعديل بنجاح");

  } else {

    await api.post(
      endpoint,
      payload
    );

    toast.success("تمت الإضافة بنجاح");
  }

  closeModal();

  await loadData();

} catch (error) {

  console.error(error);

  toast.error(
    "حدث خطأ أثناء حفظ البيانات"
  );
}
};

// =========================================================
// Delete
// =========================================================

const deleteEntity = async (
type: EntityType,
id: number
) => {

if (
  !window.confirm(
    "هل أنت متأكد من الحذف؟"
  )
) {
  return;
}

let endpoint = "";

if (type === "term") {
  endpoint =
    "/api/platform/admin/study-plans/terms";
}

if (type === "level") {
  endpoint =
    "/api/platform/admin/study-plans/levels";
}

if (type === "grade") {
  endpoint =
    "/api/platform/admin/study-plans/grades";
}

if (type === "subject") {
  endpoint =
    "/api/platform/admin/study-plans/subjects";
}

try {

  await api.delete(
    `${endpoint}/${id}`
  );

  toast.success("تم الحذف بنجاح");

  await loadData();

} catch (error) {

  console.error(error);

  toast.error(
    "لا يمكن حذف العنصر لأنه مرتبط ببيانات أخرى"
  );
}
};

// =========================================================
// Upload
// =========================================================
const uploadPlan = async () => {
  if (!uploadFile) {
    toast.error("يرجى اختيار الملف");
    return;
  }

  if (!uploadTerm) {
    toast.error("يرجى اختيار الفصل الدراسي");
    return;
  }

  if (!uploadSubject) {
    toast.error("يرجى اختيار المادة");
    return;
  }

  try {
    const data = new FormData();

    data.append("termId", uploadTerm);
    data.append("subjectId", uploadSubject);
    data.append("file", uploadFile);

    await api.post(
      "/api/platform/admin/study-plans/plans/upload",
      data
    );

    toast.success("تم رفع الخطة وحفظ البيانات بنجاح");

    setShowUploadModal(false);
    setUploadFile(null);
    setUploadTerm("");
    setUploadSubject("");

    await loadData();

  } catch (error) {
    console.error(error);
    toast.error("حدث خطأ أثناء رفع الخطة");
  }
};

// =========================================================
// Delete plan
// =========================================================

const deletePlan = async (
id: number
) => {

if (
  !window.confirm(
    "هل أنت متأكد من حذف الخطة؟"
  )
) {
  return;
}

try {

  await api.delete(
    `/api/platform/admin/study-plans/plans/${id}`
  );

  toast.success(
    "تم حذف الخطة"
  );

  await loadData();

} catch {

  toast.error(
    "تعذر حذف الخطة"
  );
}
};

// =========================================================
// Download
// =========================================================



// =========================================================
// Filtering
// =========================================================

const filteredGrades =
selectedLevel
? grades.filter(
g =>
String(g.level_id) ===
selectedLevel
)
: grades;

const filteredSubjects =
subjects.filter(subject => {

  if (
    selectedLevel &&
    String(subject.level_id) !==
      selectedLevel
  ) {
    return false;
  }

  if (
    selectedGrade &&
    String(subject.grade_id) !==
      selectedGrade
  ) {
    return false;
  }

  return true;
});
const filteredPlans =
plans.filter(plan => {

  if (
    selectedTerm &&
    String(plan.termId) !==
      selectedTerm
  ) {
    return false;
  }

  if (
    selectedLevel &&
    String(plan.levelId) !==
      selectedLevel
  ) {
    return false;
  }

  if (
    selectedGrade &&
    String(plan.gradeId) !==
      selectedGrade
  ) {
    return false;
  }

  if (
    selectedSubject &&
    String(plan.subjectId) !==
      selectedSubject
  ) {
    return false;
  }

  return true;
});
// =========================================================
// Render
// =========================================================

return (
<div
style={{
direction: "rtl",
padding: "30px",
}}
>

  {/* Header */}

  <div style={headerStyle}>

    <div>

      <h2
        style={{
          margin: 0,
          fontSize: "20px",
        }}
      >
        إدارة الخطط الدراسية
      </h2>

      <p
        style={{
          margin:
            "6px 0 0",
          opacity: 0.9,
          fontSize: "13px",
        }}
      >
        إدارة بيانات المناهج على مستوى المنصة
      </p>

    </div>

    <button
      onClick={loadData}
      style={refreshButton}
    >
      <RefreshCw size={16} />
      تحديث
    </button>

  </div>

  {/* Tabs */}

  <div style={tabsStyle}>

    <TabButton
      active={activeTab === "plans"}
      icon={<FileText size={17} />}
      label="الخطط الدراسية"
      onClick={() =>
        setActiveTab("plans")
      }
    />

    <TabButton
      active={activeTab === "terms"}
      icon={<BookOpen size={17} />}
      label="الفصول الدراسية"
      onClick={() =>
        setActiveTab("terms")
      }
    />

    <TabButton
      active={activeTab === "levels"}
      icon={<Layers size={17} />}
      label="المراحل"
      onClick={() =>
        setActiveTab("levels")
      }
    />

    <TabButton
      active={activeTab === "grades"}
      icon={<GraduationCap size={17} />}
      label="الصفوف"
      onClick={() =>
        setActiveTab("grades")
      }
    />

    <TabButton
      active={activeTab === "subjects"}
      icon={<BookOpen size={17} />}
      label="المواد"
      onClick={() =>
        setActiveTab("subjects")
      }
    />

  </div>

  {/* Loading */}

  {loading ? (

    <div style={loadingStyle}>
      جارٍ تحميل البيانات...
    </div>

  ) : (

    <>
      {/* ================================================= */}
      {/* PLANS */}
      {/* ================================================= */}

      {activeTab === "plans" && (

        <>

          <div style={filterCard}>

            <div style={filterGroup}>

              <label>
                الفصل الدراسي
              </label>

              <select
                value={selectedTerm}
                onChange={e =>
                  setSelectedTerm(
                    e.target.value
                  )
                }
                style={inputStyle}
              >

                <option value="">
                  جميع الفصول
                </option>

                {terms.map(term => (

                  <option
                    key={term.id}
                    value={term.id}
                  >
                    {term.name}
                  </option>

                ))}

              </select>

            </div>

            <div style={filterGroup}>

              <label>
                المرحلة
              </label>

              <select
                value={selectedLevel}
                onChange={e => {

                  setSelectedLevel(
                    e.target.value
                  );

                  setSelectedGrade("");
                  setSelectedSubject("");

                }}
                style={inputStyle}
              >

                <option value="">
                  جميع المراحل
                </option>

                {levels.map(level => (

                  <option
                    key={level.id}
                    value={level.id}
                  >
                    {level.name}
                  </option>

                ))}

              </select>

            </div>

            <div style={filterGroup}>

              <label>
                الصف
              </label>

              <select
                value={selectedGrade}
                onChange={e => {

                  setSelectedGrade(
                    e.target.value
                  );

                  setSelectedSubject("");

                }}
                style={inputStyle}
              >

                <option value="">
                  جميع الصفوف
                </option>

                {filteredGrades.map(
                  grade => (

                    <option
                      key={grade.id}
                      value={grade.id}
                    >
                      {grade.name}
                    </option>

                  )
                )}

              </select>

            </div>

            <div style={filterGroup}>

              <label>
                المادة
              </label>

              <select
                value={selectedSubject}
                onChange={e =>
                  setSelectedSubject(
                    e.target.value
                  )
                }
                style={inputStyle}
              >

                <option value="">
                  جميع المواد
                </option>

                {filteredSubjects.map(
                  subject => (

                    <option
                      key={subject.id}
                      value={subject.id}
                    >
                      {subject.name}
                    </option>

                  )
                )}

              </select>

            </div>

            <button
              onClick={() =>
                setShowUploadModal(true)
              }
              style={primaryButton}
            >
              <Upload size={17} />
              رفع خطة
            </button>

          </div>

          <div style={tableContainer}>

  <table style={tableStyle}>
  <thead>
    <tr>
      <th style={thStyle}>الفصل</th>
      <th style={thStyle}>المرحلة</th>
      <th style={thStyle}>الصف</th>
      <th style={thStyle}>المادة</th>
      <th style={thStyle}>موضوع الدرس</th>
      <th style={thStyle}>الواجبات</th>
      <th style={thStyle}>الملاحظات</th>
      <th style={thStyle}>الإجراءات</th>
    </tr>
  </thead>

  <tbody>
    {filteredPlans.map(plan => (
      <tr key={plan.id}>

        <td style={tdStyle}>
          {plan.termName || "—"}
        </td>

        <td style={tdStyle}>
          {plan.levelName || "—"}
        </td>

        <td style={tdStyle}>
          {plan.gradeName || "—"}
        </td>

        <td
          style={{
            ...tdStyle,
            fontWeight: 700,
          }}
        >
          {plan.subjectName || "—"}
        </td>

        <td style={tdStyle}>
          {plan.lessonTopic || "—"}
        </td>

        <td style={tdStyle}>
          {plan.homework || "—"}
        </td>

        <td style={tdStyle}>
          {plan.notes || "—"}
        </td>

        <td style={tdStyle}>
          <div
            style={{
              display: "flex",
              gap: "5px",
              justifyContent: "center",
            }}
          >
            <IconButton
              icon={<Edit size={15} />}
              color="#2563EB"
              onClick={() => {
                // تعديل لاحقاً
              }}
            />

            <IconButton
              icon={<Trash2 size={15} />}
              color="#EF4444"
              onClick={() =>
                deletePlan(plan.id)
              }
            />
          </div>
        </td>

      </tr>
    ))}
  </tbody>
</table>

  {filteredPlans.length === 0 && (
    <EmptyState
      text="لا توجد بيانات في بنك الخطط"
    />
  )}

</div>

     

        </>

      )}

      {/* ================================================= */}
      {/* TERMS */}
      {/* ================================================= */}

      {activeTab === "terms" && (

        <EntitySection
          title="الفصول الدراسية"
          addLabel="إضافة فصل"
          onAdd={() =>
            openAddModal("term")
          }
        >

          <table style={tableStyle}>

            <thead>

              <tr>
                <th style={thStyle}>
                  #
                </th>

                <th style={thStyle}>
                  الفصل الدراسي
                </th>

                <th style={thStyle}>
                  الإجراءات
                </th>
              </tr>

            </thead>

            <tbody>

              {terms.map(
                (term, index) => (

                  <tr key={term.id}>

                    <td style={tdStyle}>
                      {index + 1}
                    </td>

                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 700,
                      }}
                    >
                      {term.name}
                    </td>

                    <td style={tdStyle}>

                      <ActionButtons
                        onEdit={() =>
                          openEditModal(
                            "term",
                            term
                          )
                        }
                        onDelete={() =>
                          deleteEntity(
                            "term",
                            term.id
                          )
                        }
                      />

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </EntitySection>

      )}

      {/* ================================================= */}
      {/* LEVELS */}
      {/* ================================================= */}

      {activeTab === "levels" && (

        <EntitySection
          title="المراحل الدراسية"
          addLabel="إضافة مرحلة"
          onAdd={() =>
            openAddModal("level")
          }
        >

          <table style={tableStyle}>

            <thead>

              <tr>

                <th style={thStyle}>
                  #
                </th>

                <th style={thStyle}>
                  المرحلة
                </th>

                <th style={thStyle}>
                  الإجراءات
                </th>

              </tr>

            </thead>

            <tbody>

              {levels.map(
                (level, index) => (

                  <tr key={level.id}>

                    <td style={tdStyle}>
                      {index + 1}
                    </td>

                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 700,
                      }}
                    >
                      {level.name}
                    </td>

                    <td style={tdStyle}>

                      <ActionButtons
                        onEdit={() =>
                          openEditModal(
                            "level",
                            level
                          )
                        }
                        onDelete={() =>
                          deleteEntity(
                            "level",
                            level.id
                          )
                        }
                      />

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </EntitySection>

      )}

      {/* ================================================= */}
      {/* GRADES */}
      {/* ================================================= */}

      {activeTab === "grades" && (

        <EntitySection
          title="الصفوف الدراسية"
          addLabel="إضافة صف"
          onAdd={() =>
            openAddModal("grade")
          }
        >

          <table style={tableStyle}>

            <thead>

              <tr>

                <th style={thStyle}>
                  #
                </th>

                <th style={thStyle}>
                  المرحلة
                </th>

                <th style={thStyle}>
                  الصف
                </th>

                <th style={thStyle}>
                  الإجراءات
                </th>

              </tr>

            </thead>

            <tbody>

              {grades.map(
                (grade, index) => (

                  <tr key={grade.id}>

                    <td style={tdStyle}>
                      {index + 1}
                    </td>

                    <td style={tdStyle}>
                      {grade.level_name}
                    </td>

                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 700,
                      }}
                    >
                      {grade.name}
                    </td>

                    <td style={tdStyle}>

                      <ActionButtons
                        onEdit={() =>
                          openEditModal(
                            "grade",
                            grade
                          )
                        }
                        onDelete={() =>
                          deleteEntity(
                            "grade",
                            grade.id
                          )
                        }
                      />

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </EntitySection>

      )}

      {/* ================================================= */}
      {/* SUBJECTS */}
      {/* ================================================= */}

      {activeTab === "subjects" && (

        <EntitySection
          title="المواد الدراسية"
          addLabel="إضافة مادة"
          onAdd={() =>
            openAddModal("subject")
          }
        >

          <table style={tableStyle}>

            <thead>

              <tr>

                <th style={thStyle}>
                  #
                </th>

                <th style={thStyle}>
                  المرحلة
                </th>

                <th style={thStyle}>
                  الصف
                </th>

                <th style={thStyle}>
                  المادة
                </th>

                <th style={thStyle}>
                  الإجراءات
                </th>

              </tr>

            </thead>

            <tbody>

              {subjects.map(
                (subject, index) => (

                  <tr key={subject.id}>

                    <td style={tdStyle}>
                      {index + 1}
                    </td>

                    <td style={tdStyle}>
                      {subject.level_name}
                    </td>

                    <td style={tdStyle}>
                      {subject.grade_name}
                    </td>

                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 700,
                      }}
                    >
                      {subject.name}
                    </td>

                    <td style={tdStyle}>

                      <ActionButtons
                        onEdit={() =>
                          openEditModal(
                            "subject",
                            subject
                          )
                        }
                        onDelete={() =>
                          deleteEntity(
                            "subject",
                            subject.id
                          )
                        }
                      />

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </EntitySection>

      )}

    </>

  )}

  {/* ===================================================== */}
  {/* ENTITY MODAL */}
  {/* ===================================================== */}

  {showModal && (

    <div style={overlayStyle}>

      <div style={modalStyle}>

        <div style={modalHeader}>

          <h3 style={{ margin: 0 }}>
            {getModalTitle(
              modalType as EntityType,
              !!editingId
            )}
          </h3>

          <button
            onClick={closeModal}
            style={closeButton}
          >
            <X size={18} />
          </button>

        </div>

        <div
          style={{
            display: "flex",
            flexDirection:
              "column",
            gap: "15px",
          }}
        >

          <div>
            <label style={labelStyle}>
              {modalType === "term"
                ? "اسم الفصل الدراسي"
                : modalType === "level"
                ? "اسم المرحلة"
                : modalType === "grade"
                ? "اسم الصف"
                : "اسم المادة"}
            </label>

            <input
              value={formData.name}
              onChange={e =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
              style={inputStyle}
            />

          </div>

          {(modalType === "grade" ||
            modalType === "subject") && (

            <div>

              <label style={labelStyle}>
                المرحلة
              </label>

              <select
                value={
                  formData.levelId
                }
                onChange={e =>
                  setFormData({
                    ...formData,
                    levelId:
                      e.target.value,
                    gradeId: "",
                  })
                }
                style={inputStyle}
              >

                <option value="">
                  اختر المرحلة
                </option>

                {levels.map(
                  level => (

                    <option
                      key={level.id}
                      value={level.id}
                    >
                      {level.name}
                    </option>

                  )
                )}

              </select>

            </div>

          )}

          {modalType === "subject" && (

            <div>

              <label style={labelStyle}>
                الصف
              </label>

              <select
                value={
                  formData.gradeId
                }
                onChange={e =>
                  setFormData({
                    ...formData,
                    gradeId:
                      e.target.value,
                  })
                }
                style={inputStyle}
              >

                <option value="">
                  اختر الصف
                </option>

                {grades
                  .filter(
                    grade =>
                      !formData.levelId ||
                      String(
                        grade.level_id
                      ) ===
                        formData.levelId
                  )
                  .map(grade => (

                    <option
                      key={grade.id}
                      value={grade.id}
                    >
                      {grade.name}
                    </option>

                  ))}

              </select>

            </div>

          )}

        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "25px",
          }}
        >

          <button
            onClick={saveEntity}
            style={primaryButton}
          >
            حفظ
          </button>

          <button
            onClick={closeModal}
            style={secondaryButton}
          >
            إلغاء
          </button>

        </div>

      </div>

    </div>

  )}

  {/* ===================================================== */}
  {/* UPLOAD MODAL */}
  {/* ===================================================== */}

  {showUploadModal && (

    <div style={overlayStyle}>

      <div style={modalStyle}>

        <div style={modalHeader}>

          <h3 style={{ margin: 0 }}>
            رفع خطة دراسية
          </h3>

          <button
            onClick={() =>
              setShowUploadModal(false)
            }
            style={closeButton}
          >
            <X size={18} />
          </button>

        </div>

        <div
          style={{
            display: "flex",
            flexDirection:
              "column",
            gap: "15px",
          }}
        >

          <div>

            <label style={labelStyle}>
              الفصل الدراسي
            </label>

            <select
              value={uploadTerm}
              onChange={e =>
                setUploadTerm(
                  e.target.value
                )
              }
              style={inputStyle}
            >

              <option value="">
                اختر الفصل الدراسي
              </option>

              {terms.map(term => (

                <option
                  key={term.id}
                  value={term.id}
                >
                  {term.name}
                </option>

              ))}

            </select>

          </div>

          <div>

            <label style={labelStyle}>
              المرحلة
            </label>

            <select
              value={selectedLevel}
              onChange={e => {

                setSelectedLevel(
                  e.target.value
                );

                setSelectedGrade("");
                setUploadSubject("");

              }}
              style={inputStyle}
            >

              <option value="">
                اختر المرحلة
              </option>

              {levels.map(level => (

                <option
                  key={level.id}
                  value={level.id}
                >
                  {level.name}
                </option>

              ))}

            </select>

          </div>

          <div>

            <label style={labelStyle}>
              الصف
            </label>

            <select
              value={selectedGrade}
              onChange={e => {

                setSelectedGrade(
                  e.target.value
                );

                setUploadSubject("");

              }}
              style={inputStyle}
            >

              <option value="">
                اختر الصف
              </option>

              {filteredGrades.map(
                grade => (

                  <option
                    key={grade.id}
                    value={grade.id}
                  >
                    {grade.name}
                  </option>

                )
              )}

            </select>

          </div>

          <div>

            <label style={labelStyle}>
              المادة
            </label>

            <select
              value={uploadSubject}
              onChange={e =>
                setUploadSubject(
                  e.target.value
                )
              }
              style={inputStyle}
            >

              <option value="">
                اختر المادة
              </option>

              {filteredSubjects.map(
                subject => (

                  <option
                    key={subject.id}
                    value={subject.id}
                  >
                    {subject.name}
                  </option>

                )
              )}

            </select>

          </div>

          <div>

            <label style={labelStyle}>
              ملف الخطة
            </label>

            <input
              type="file"
              onChange={e =>
                setUploadFile(
                  e.target.files?.[0] ||
                    null
                )
              }
              style={inputStyle}
            />

          </div>

        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "25px",
          }}
        >

          <button
            onClick={uploadPlan}
            style={primaryButton}
          >
            <Upload size={16} />
            رفع الخطة
          </button>

          <button
            onClick={() =>
              setShowUploadModal(false)
            }
            style={secondaryButton}
          >
            إلغاء
          </button>

        </div>

      </div>

    </div>

  )}

</div>
);
}

// =========================================================
// Components
// =========================================================

function TabButton({
active,
icon,
label,
onClick,
}: {
active: boolean;
icon: React.ReactNode;
label: string;
onClick: () => void;
}) {

return (

<button
  onClick={onClick}
  style={{
    ...tabButton,
    ...(active
      ? activeTabButton
      : {}),
  }}
>

  {icon}

  {label}

</button>
);
}

function EntitySection({
title,
addLabel,
onAdd,
children,
}: {
title: string;
addLabel: string;
onAdd: () => void;
children: React.ReactNode;
}) {

return (

<div>

  <div style={sectionHeader}>

    <h3 style={{ margin: 0 }}>
      {title}
    </h3>

    <button
      onClick={onAdd}
      style={primaryButton}
    >
      <Plus size={17} />
      {addLabel}
    </button>

  </div>

  <div style={tableContainer}>
    {children}
  </div>

</div>
);
}

function ActionButtons({
onEdit,
onDelete,
}: {
onEdit: () => void;
onDelete: () => void;
}) {

return (

<div
  style={{
    display: "flex",
    gap: "6px",
    justifyContent:
      "center",
  }}
>

  <IconButton
    icon={<Edit size={15} />}
    color="#2563EB"
    onClick={onEdit}
  />

  <IconButton
    icon={<Trash2 size={15} />}
    color="#EF4444"
    onClick={onDelete}
  />

</div>
);
}

function IconButton({
icon,
color,
onClick,
}: {
icon: React.ReactNode;
color: string;
onClick: () => void;
}) {

return (

<button
  onClick={onClick}
  style={{
    border: "none",
    background: `${color}12`,
    color,
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",
  }}
>
  {icon}
</button>
);
}

function EmptyState({
text,
}: {
text: string;
}) {

return (

<div
  style={{
    padding: "40px",
    textAlign: "center",
    color: "#9CA3AF",
  }}
>
  {text}
</div>
);
}

// =========================================================
// Helpers
// =========================================================

function getModalTitle(
type: EntityType,
edit: boolean
) {

const action =
edit ? "تعديل" : "إضافة";

const names = {
term: "الفصل الدراسي",
level: "المرحلة",
grade: "الصف",
subject: "المادة",
};

return `${action} ${names[type]}`;
}



// =========================================================
// Styles
// =========================================================

const headerStyle: React.CSSProperties = {
background: "#9EC5C7",
color: "#fff",
padding: "20px 24px",
borderRadius: "14px",
marginBottom: "20px",
display: "flex",
justifyContent:
"space-between",
alignItems: "center",
};

const refreshButton: React.CSSProperties = {
display: "flex",
alignItems: "center",
gap: "7px",
border: "none",
background: "#ffffff33",
color: "#fff",
padding: "9px 14px",
borderRadius: "9px",
cursor: "pointer",
};

const tabsStyle: React.CSSProperties = {
display: "flex",
gap: "8px",
flexWrap: "wrap",
borderBottom:
"1px solid #E5E7EB",
marginBottom: "20px",
};

const tabButton: React.CSSProperties = {
display: "flex",
alignItems: "center",
gap: "7px",
padding: "11px 16px",
border: "none",
background: "transparent",
color: "#6B7280",
cursor: "pointer",
fontSize: "13px",
borderBottom:
"2px solid transparent",
};

const activeTabButton:
React.CSSProperties = {
color: "#2D7D82",
fontWeight: 700,
borderBottom:
"2px solid #2D7D82",
};

const sectionHeader:
React.CSSProperties = {
display: "flex",
justifyContent:
"space-between",
alignItems: "center",
marginBottom: "15px",
};

const filterCard:
React.CSSProperties = {
background: "#fff",
border:
"1px solid #E5E7EB",
borderRadius: "14px",
padding: "18px",
display: "grid",
gridTemplateColumns:
"repeat(4, 1fr) auto",
gap: "12px",
alignItems: "end",
marginBottom: "18px",
};

const filterGroup:
React.CSSProperties = {
display: "flex",
flexDirection: "column",
gap: "6px",
fontSize: "12px",
color: "#6B7280",
fontWeight: 600,
};

const inputStyle:
React.CSSProperties = {
width: "100%",
boxSizing: "border-box",
padding: "10px 12px",
border:
"1px solid #E5E7EB",
borderRadius: "8px",
outline: "none",
background: "#fff",
fontSize: "13px",
};

const primaryButton:
React.CSSProperties = {
display: "flex",
alignItems: "center",
justifyContent:
"center",
gap: "7px",
padding: "10px 16px",
background: "#2D7D82",
color: "#fff",
border: "none",
borderRadius: "9px",
cursor: "pointer",
fontWeight: 600,
whiteSpace: "nowrap",
};

const secondaryButton:
React.CSSProperties = {
flex: 1,
padding: "11px",
border: "none",
background: "#F3F4F6",
color: "#6B7280",
borderRadius: "9px",
cursor: "pointer",
};

const tableContainer:
React.CSSProperties = {
background: "#fff",
border:
"1px solid #E5E7EB",
borderRadius: "14px",
overflowX: "auto",
padding: "10px",
};

const tableStyle:
React.CSSProperties = {
width: "100%",
borderCollapse:
"collapse",
};

const thStyle:
React.CSSProperties = {
border:
"1px solid #E5E7EB",
padding: "12px",
background: "#F9FAFB",
color: "#6B7280",
fontSize: "12px",
fontWeight: 700,
textAlign: "center",
};

const tdStyle:
React.CSSProperties = {
border:
"1px solid #E5E7EB",
padding: "11px",
color: "#374151",
fontSize: "13px",
textAlign: "center",
};

const overlayStyle:
React.CSSProperties = {
position: "fixed",
inset: 0,
background:
"rgba(0,0,0,.4)",
display: "flex",
alignItems: "center",
justifyContent:
"center",
zIndex: 2000,
};

const modalStyle:
React.CSSProperties = {
background: "#fff",
borderRadius: "16px",
width: "90%",
maxWidth: "500px",
padding: "25px",
boxSizing: "border-box",
};

const modalHeader:
React.CSSProperties = {
display: "flex",
justifyContent:
"space-between",
alignItems: "center",
marginBottom: "20px",
};

const closeButton:
React.CSSProperties = {
border: "none",
background: "#F3F4F6",
width: "32px",
height: "32px",
borderRadius: "50%",
cursor: "pointer",
display: "flex",
alignItems: "center",
justifyContent:
"center",
};

const labelStyle:
React.CSSProperties = {
display: "block",
marginBottom: "6px",
fontSize: "12px",
color: "#6B7280",
fontWeight: 600,
};

const loadingStyle:
React.CSSProperties = {
textAlign: "center",
padding: "60px",
color: "#6B7280",
};
