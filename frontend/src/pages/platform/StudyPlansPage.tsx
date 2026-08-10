import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, GraduationCap, Layers, FileText, Plus, Edit, Trash2, X, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";

type EntityType = "term" | "level" | "grade" | "subject";
type Tab = "plans" | "terms" | "levels" | "grades" | "subjects";

interface Term { id: number; name: string; }
interface Level { id: number; name: string; }
interface Grade { id: number; name: string; level_id: number; level_name?: string; }
interface Subject { id: number; name: string; level_id: number; level_name?: string; grade_id: number; grade_name?: string; }
interface StudyPlan {
  id: number;
  term_id: number | null;
  term_name: string | null;
  subject_id: number;
  subject_name: string;
  level_id: number;
  level_name: string;
  grade_id: number;
  grade_name: string;
  lesson_topic: string;
  homework: string | null;
  notes: string | null;
}
interface EntityForm { name: string; levelId: string; gradeId: string; }
interface PlanForm { termId: string; levelId: string; gradeId: string; subjectId: string; lessonTopic: string; homework: string; notes: string; }

const emptyEntity: EntityForm = { name: "", levelId: "", gradeId: "" };
const emptyPlan: PlanForm = { termId: "", levelId: "", gradeId: "", subjectId: "", lessonTopic: "", homework: "", notes: "" };

export default function StudyPlansPage() {
  const [activeTab, setActiveTab] = useState<Tab>("plans");
  const [loading, setLoading] = useState(false);
  const [terms, setTerms] = useState<Term[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [plans, setPlans] = useState<StudyPlan[]>([]);

  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  const [showEntityModal, setShowEntityModal] = useState(false);
  const [entityType, setEntityType] = useState<EntityType>("term");
  const [editingEntityId, setEditingEntityId] = useState<number | null>(null);
  const [entityForm, setEntityForm] = useState<EntityForm>(emptyEntity);

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [planForm, setPlanForm] = useState<PlanForm>(emptyPlan);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [t, l, g, s, p] = await Promise.all([
        api.get<Term[]>("/api/platform/admin/study-plans/terms"),
        api.get<Level[]>("/api/platform/admin/study-plans/levels"),
        api.get<Grade[]>("/api/platform/admin/study-plans/grades"),
        api.get<Subject[]>("/api/platform/admin/study-plans/subjects"),
        api.get<StudyPlan[]>("/api/platform/admin/study-plans/plans"),
      ]);
      setTerms(t.data); setLevels(l.data); setGrades(g.data); setSubjects(s.data); setPlans(p.data);
    } catch (error) {
      console.error(error);
      toast.error("تعذر تحميل بيانات الخطط الدراسية");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredGrades = useMemo(() => selectedLevel ? grades.filter(g => String(g.level_id) === selectedLevel) : grades, [grades, selectedLevel]);
  const filteredSubjects = useMemo(() => subjects.filter(s => (!selectedLevel || String(s.level_id) === selectedLevel) && (!selectedGrade || String(s.grade_id) === selectedGrade)), [subjects, selectedLevel, selectedGrade]);
  const planGrades = useMemo(() => planForm.levelId ? grades.filter(g => String(g.level_id) === planForm.levelId) : [], [grades, planForm.levelId]);
  const planSubjects = useMemo(() => subjects.filter(s => (!planForm.levelId || String(s.level_id) === planForm.levelId) && (!planForm.gradeId || String(s.grade_id) === planForm.gradeId)), [subjects, planForm.levelId, planForm.gradeId]);
  const filteredPlans = useMemo(() => plans.filter(p => (!selectedTerm || String(p.term_id) === selectedTerm) && (!selectedLevel || String(p.level_id) === selectedLevel) && (!selectedGrade || String(p.grade_id) === selectedGrade) && (!selectedSubject || String(p.subject_id) === selectedSubject)), [plans, selectedTerm, selectedLevel, selectedGrade, selectedSubject]);

  const errorMessage = (e: any, fallback: string) => e?.response?.data?.message || fallback;

  const openEntity = (type: EntityType, item?: any) => {
    setEntityType(type); setEditingEntityId(item?.id ?? null);
    setEntityForm({ name: item?.name ?? "", levelId: item?.level_id ? String(item.level_id) : "", gradeId: item?.grade_id ? String(item.grade_id) : "" });
    setShowEntityModal(true);
  };
  const closeEntity = () => { setShowEntityModal(false); setEditingEntityId(null); setEntityForm(emptyEntity); };

  const saveEntity = async () => {
    if (!entityForm.name.trim()) return toast.error("يرجى إدخال الاسم");
    const endpoints: Record<EntityType, string> = {
      term: "/api/platform/admin/study-plans/terms", level: "/api/platform/admin/study-plans/levels",
      grade: "/api/platform/admin/study-plans/grades", subject: "/api/platform/admin/study-plans/subjects",
    };
    const payload: any = { name: entityForm.name.trim() };
    if (entityType === "grade" || entityType === "subject") {
      if (!entityForm.levelId) return toast.error("يرجى اختيار المرحلة");
      payload.levelId = Number(entityForm.levelId);
    }
    if (entityType === "subject") {
      if (!entityForm.gradeId) return toast.error("يرجى اختيار الصف");
      payload.gradeId = Number(entityForm.gradeId);
    }
    try {
      const endpoint = endpoints[entityType];
      if (editingEntityId) { await api.put(`${endpoint}/${editingEntityId}`, payload); toast.success("تم التعديل بنجاح"); }
      else { await api.post(endpoint, payload); toast.success("تمت الإضافة بنجاح"); }
      closeEntity(); await loadData();
    } catch (e) { console.error(e); toast.error(errorMessage(e, "حدث خطأ أثناء الحفظ")); }
  };

  const deleteEntity = async (type: EntityType, id: number) => {
    if (!window.confirm("هل أنت متأكد من الحذف؟")) return;
    const endpoints: Record<EntityType, string> = {
      term: "/api/platform/admin/study-plans/terms", level: "/api/platform/admin/study-plans/levels",
      grade: "/api/platform/admin/study-plans/grades", subject: "/api/platform/admin/study-plans/subjects",
    };
    try { await api.delete(`${endpoints[type]}/${id}`); toast.success("تم الحذف بنجاح"); await loadData(); }
    catch (e) { console.error(e); toast.error(errorMessage(e, "لا يمكن حذف العنصر لأنه مرتبط ببيانات أخرى")); }
  };

  const openAddPlan = () => {
    setEditingPlanId(null);
    setPlanForm({ ...emptyPlan, termId: selectedTerm, levelId: selectedLevel, gradeId: selectedGrade, subjectId: selectedSubject });
    setShowPlanModal(true);
  };
  const openEditPlan = (p: StudyPlan) => {
    setEditingPlanId(p.id);
    setPlanForm({ termId: p.term_id ? String(p.term_id) : "", levelId: String(p.level_id), gradeId: String(p.grade_id), subjectId: String(p.subject_id), lessonTopic: p.lesson_topic || "", homework: p.homework || "", notes: p.notes || "" });
    setShowPlanModal(true);
  };
  const closePlan = () => { setShowPlanModal(false); setEditingPlanId(null); setPlanForm(emptyPlan); };

  const savePlan = async () => {
    if (!planForm.termId) return toast.error("يرجى اختيار الفصل الدراسي");
    if (!planForm.levelId) return toast.error("يرجى اختيار المرحلة");
    if (!planForm.gradeId) return toast.error("يرجى اختيار الصف");
    if (!planForm.subjectId) return toast.error("يرجى اختيار المادة");
    if (!planForm.lessonTopic.trim()) return toast.error("يرجى إدخال موضوع الدرس");
    const payload = {
      termId: Number(planForm.termId), subjectId: Number(planForm.subjectId),
      lessonTopic: planForm.lessonTopic.trim(), homework: planForm.homework.trim() || null, notes: planForm.notes.trim() || null,
    };
    try {
      if (editingPlanId) { await api.put(`/api/platform/admin/study-plans/plans/${editingPlanId}`, payload); toast.success("تم تعديل موضوع الدرس بنجاح"); }
      else { await api.post("/api/platform/admin/study-plans/plans", payload); toast.success("تمت إضافة موضوع الدرس بنجاح"); }
      closePlan(); await loadData();
    } catch (e) { console.error(e); toast.error(errorMessage(e, "حدث خطأ أثناء حفظ الخطة")); }
  };
  const deletePlan = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف موضوع الدرس؟")) return;
    try { await api.delete(`/api/platform/admin/study-plans/plans/${id}`); toast.success("تم حذف موضوع الدرس"); await loadData(); }
    catch (e) { console.error(e); toast.error(errorMessage(e, "تعذر حذف موضوع الدرس")); }
  };

  return <div style={{ direction: "rtl", padding: 30 }}>
    <div style={headerStyle}>
      <div><h2 style={{ margin: 0, fontSize: 20 }}>إدارة الخطط الدراسية</h2><p style={{ margin: "6px 0 0", opacity: .9, fontSize: 13 }}>بنك موضوعات الدروس والواجبات والملاحظات</p></div>
      <button onClick={loadData} style={refreshButton}><RefreshCw size={16} /> تحديث</button>
    </div>

    <div style={tabsStyle}>
      <TabButton active={activeTab === "plans"} icon={<FileText size={17}/>} label="بنك الخطط" onClick={() => setActiveTab("plans")}/>
      <TabButton active={activeTab === "terms"} icon={<BookOpen size={17}/>} label="الفصول الدراسية" onClick={() => setActiveTab("terms")}/>
      <TabButton active={activeTab === "levels"} icon={<Layers size={17}/>} label="المراحل" onClick={() => setActiveTab("levels")}/>
      <TabButton active={activeTab === "grades"} icon={<GraduationCap size={17}/>} label="الصفوف" onClick={() => setActiveTab("grades")}/>
      <TabButton active={activeTab === "subjects"} icon={<BookOpen size={17}/>} label="المواد" onClick={() => setActiveTab("subjects")}/>
    </div>

    {loading ? <div style={loadingStyle}>جارٍ تحميل البيانات...</div> : <>
      {activeTab === "plans" && <>
        <div style={filterCard}>
          <Filter label="الفصل الدراسي" value={selectedTerm} onChange={setSelectedTerm} options={terms} all="جميع الفصول"/>
          <Filter label="المرحلة" value={selectedLevel} onChange={v => { setSelectedLevel(v); setSelectedGrade(""); setSelectedSubject(""); }} options={levels} all="جميع المراحل"/>
          <Filter label="الصف" value={selectedGrade} onChange={v => { setSelectedGrade(v); setSelectedSubject(""); }} options={filteredGrades} all="جميع الصفوف"/>
          <Filter label="المادة" value={selectedSubject} onChange={setSelectedSubject} options={filteredSubjects} all="جميع المواد"/>
          <div style={{ display: "flex", gap: 8 }}><button style={secondarySmall} onClick={() => {setSelectedTerm("");setSelectedLevel("");setSelectedGrade("");setSelectedSubject("");}}>مسح</button><button style={primaryButton} onClick={openAddPlan}><Plus size={17}/> إضافة موضوع</button></div>
        </div>
        <div style={tableContainer}>
          <table style={tableStyle}><thead><tr>
            {['الفصل','المرحلة','الصف','المادة','موضوع الدرس','الواجبات','الملاحظات','الإجراءات'].map(h => <th key={h} style={thStyle}>{h}</th>)}
          </tr></thead><tbody>
            {filteredPlans.map(p => <tr key={p.id}>
              <td style={tdStyle}>{p.term_name || "—"}</td><td style={tdStyle}>{p.level_name}</td><td style={tdStyle}>{p.grade_name}</td><td style={{...tdStyle,fontWeight:700}}>{p.subject_name}</td>
              <td style={{...tdStyle,textAlign:"right",minWidth:220}}>{p.lesson_topic}</td><td style={{...tdStyle,textAlign:"right",minWidth:180}}>{p.homework || "—"}</td><td style={{...tdStyle,textAlign:"right",minWidth:180}}>{p.notes || "—"}</td>
              <td style={tdStyle}><div style={actions}><IconButton icon={<Edit size={15}/>} color="#2563EB" onClick={() => openEditPlan(p)}/><IconButton icon={<Trash2 size={15}/>} color="#EF4444" onClick={() => deletePlan(p.id)}/></div></td>
            </tr>)}
          </tbody></table>
          {!filteredPlans.length && <Empty text="لا توجد موضوعات دراسية"/>}
        </div>
      </>}

      {activeTab === "terms" && <EntitySection title="الفصول الدراسية" addLabel="إضافة فصل" onAdd={() => openEntity("term")}><SimpleTable headers={["#","الفصل الدراسي","الإجراءات"]} rows={terms.map((x,i) => [i+1,x.name,<ActionButtons key={x.id} onEdit={() => openEntity("term",x)} onDelete={() => deleteEntity("term",x.id)}/>])}/></EntitySection>}
      {activeTab === "levels" && <EntitySection title="المراحل الدراسية" addLabel="إضافة مرحلة" onAdd={() => openEntity("level")}><SimpleTable headers={["#","المرحلة","الإجراءات"]} rows={levels.map((x,i) => [i+1,x.name,<ActionButtons key={x.id} onEdit={() => openEntity("level",x)} onDelete={() => deleteEntity("level",x.id)}/>])}/></EntitySection>}
      {activeTab === "grades" && <EntitySection title="الصفوف الدراسية" addLabel="إضافة صف" onAdd={() => openEntity("grade")}><SimpleTable headers={["#","المرحلة","الصف","الإجراءات"]} rows={grades.map((x,i) => [i+1,x.level_name || "—",x.name,<ActionButtons key={x.id} onEdit={() => openEntity("grade",x)} onDelete={() => deleteEntity("grade",x.id)}/>])}/></EntitySection>}
      {activeTab === "subjects" && <EntitySection title="المواد الدراسية" addLabel="إضافة مادة" onAdd={() => openEntity("subject")}><SimpleTable headers={["#","المرحلة","الصف","المادة","الإجراءات"]} rows={subjects.map((x,i) => [i+1,x.level_name || "—",x.grade_name || "—",x.name,<ActionButtons key={x.id} onEdit={() => openEntity("subject",x)} onDelete={() => deleteEntity("subject",x.id)}/>])}/></EntitySection>}
    </>}

    {showEntityModal && <Modal title={`${editingEntityId ? "تعديل" : "إضافة"} ${entityName(entityType)}`} onClose={closeEntity}>
      <Field label={entityName(entityType)}><input style={inputStyle} value={entityForm.name} onChange={e => setEntityForm({...entityForm,name:e.target.value})}/></Field>
      {(entityType === "grade" || entityType === "subject") && <Field label="المرحلة"><select style={inputStyle} value={entityForm.levelId} onChange={e => setEntityForm({...entityForm,levelId:e.target.value,gradeId:""})}><option value="">اختر المرحلة</option>{levels.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>}
      {entityType === "subject" && <Field label="الصف"><select style={inputStyle} value={entityForm.gradeId} onChange={e => setEntityForm({...entityForm,gradeId:e.target.value})}><option value="">اختر الصف</option>{grades.filter(g=>!entityForm.levelId||String(g.level_id)===entityForm.levelId).map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>}
      <ModalButtons onSave={saveEntity} onCancel={closeEntity}/>
    </Modal>}

    {showPlanModal && <Modal wide title={editingPlanId ? "تعديل موضوع الدرس" : "إضافة موضوع درس"} onClose={closePlan}>
      <div style={twoCol}>
        <Field label="الفصل الدراسي"><select style={inputStyle} value={planForm.termId} onChange={e=>setPlanForm({...planForm,termId:e.target.value})}><option value="">اختر الفصل الدراسي</option>{terms.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        <Field label="المرحلة"><select style={inputStyle} value={planForm.levelId} onChange={e=>setPlanForm({...planForm,levelId:e.target.value,gradeId:"",subjectId:""})}><option value="">اختر المرحلة</option>{levels.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>
        <Field label="الصف"><select style={inputStyle} value={planForm.gradeId} onChange={e=>setPlanForm({...planForm,gradeId:e.target.value,subjectId:""})}><option value="">اختر الصف</option>{planGrades.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
        <Field label="المادة"><select style={inputStyle} value={planForm.subjectId} onChange={e=>setPlanForm({...planForm,subjectId:e.target.value})}><option value="">اختر المادة</option>{planSubjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="موضوع الدرس"><textarea style={textareaStyle} rows={3} value={planForm.lessonTopic} onChange={e=>setPlanForm({...planForm,lessonTopic:e.target.value})}/></Field>
        <Field label="الواجبات"><textarea style={textareaStyle} rows={3} value={planForm.homework} onChange={e=>setPlanForm({...planForm,homework:e.target.value})}/></Field>
        <Field label="الملاحظات"><textarea style={textareaStyle} rows={3} value={planForm.notes} onChange={e=>setPlanForm({...planForm,notes:e.target.value})}/></Field>
      </div>
      <ModalButtons onSave={savePlan} onCancel={closePlan} saveLabel={editingPlanId ? "حفظ التعديل" : "إضافة الموضوع"}/>
    </Modal>}
  </div>;
}

function Filter({label,value,onChange,options,all}:{label:string;value:string;onChange:(v:string)=>void;options:{id:number;name:string}[];all:string}) { return <div style={filterGroup}><label>{label}</label><select style={inputStyle} value={value} onChange={e=>onChange(e.target.value)}><option value="">{all}</option>{options.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></div>; }
function Field({label,children}:{label:string;children:React.ReactNode}) { return <div style={{marginBottom:14}}><label style={labelStyle}>{label}</label>{children}</div>; }
function Modal({title,onClose,children,wide=false}:{title:string;onClose:()=>void;children:React.ReactNode;wide?:boolean}) { return <div style={overlayStyle}><div style={{...modalStyle,maxWidth:wide?720:500}}><div style={modalHeader}><h3 style={{margin:0}}>{title}</h3><button onClick={onClose} style={closeButton}><X size={18}/></button></div>{children}</div></div>; }
function ModalButtons({onSave,onCancel,saveLabel="حفظ"}:{onSave:()=>void;onCancel:()=>void;saveLabel?:string}) { return <div style={{display:"flex",gap:10,marginTop:18}}><button onClick={onSave} style={{...primaryButton,flex:1}}>{saveLabel}</button><button onClick={onCancel} style={secondaryButton}>إلغاء</button></div>; }
function TabButton({active,icon,label,onClick}:{active:boolean;icon:React.ReactNode;label:string;onClick:()=>void}) { return <button onClick={onClick} style={{...tabButton,...(active?activeTabButton:{})}}>{icon}{label}</button>; }
function EntitySection({title,addLabel,onAdd,children}:{title:string;addLabel:string;onAdd:()=>void;children:React.ReactNode}) { return <div><div style={sectionHeader}><h3 style={{margin:0}}>{title}</h3><button onClick={onAdd} style={primaryButton}><Plus size={17}/>{addLabel}</button></div><div style={tableContainer}>{children}</div></div>; }
function SimpleTable({headers,rows}:{headers:string[];rows:React.ReactNode[][]}) { return <table style={tableStyle}><thead><tr>{headers.map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j} style={tdStyle}>{c}</td>)}</tr>)}</tbody></table>; }
function ActionButtons({onEdit,onDelete}:{onEdit:()=>void;onDelete:()=>void}) { return <div style={actions}><IconButton icon={<Edit size={15}/>} color="#2563EB" onClick={onEdit}/><IconButton icon={<Trash2 size={15}/>} color="#EF4444" onClick={onDelete}/></div>; }
function IconButton({icon,color,onClick}:{icon:React.ReactNode;color:string;onClick:()=>void}) { return <button onClick={onClick} style={{border:"none",background:`${color}12`,color,width:32,height:32,borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{icon}</button>; }
function Empty({text}:{text:string}) { return <div style={{padding:40,textAlign:"center",color:"#9CA3AF"}}>{text}</div>; }
function entityName(t:EntityType) { return ({term:"الفصل الدراسي",level:"المرحلة",grade:"الصف",subject:"المادة"})[t]; }

const headerStyle:React.CSSProperties={background:"#9EC5C7",color:"#fff",padding:"20px 24px",borderRadius:14,marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"};
const refreshButton:React.CSSProperties={display:"flex",alignItems:"center",gap:7,border:"none",background:"#ffffff33",color:"#fff",padding:"9px 14px",borderRadius:9,cursor:"pointer"};
const tabsStyle:React.CSSProperties={display:"flex",gap:8,flexWrap:"wrap",borderBottom:"1px solid #E5E7EB",marginBottom:20};
const tabButton:React.CSSProperties={display:"flex",alignItems:"center",gap:7,padding:"11px 16px",border:"none",background:"transparent",color:"#6B7280",cursor:"pointer",fontSize:13,borderBottom:"2px solid transparent"};
const activeTabButton:React.CSSProperties={color:"#2D7D82",fontWeight:700,borderBottom:"2px solid #2D7D82"};
const sectionHeader:React.CSSProperties={display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:15};
const filterCard:React.CSSProperties={background:"#fff",border:"1px solid #E5E7EB",borderRadius:14,padding:18,display:"grid",gridTemplateColumns:"repeat(4,1fr) auto",gap:12,alignItems:"end",marginBottom:18};
const filterGroup:React.CSSProperties={display:"flex",flexDirection:"column",gap:6,fontSize:12,color:"#6B7280",fontWeight:600};
const inputStyle:React.CSSProperties={width:"100%",boxSizing:"border-box",padding:"10px 12px",border:"1px solid #E5E7EB",borderRadius:8,outline:"none",background:"#fff",fontSize:13};
const textareaStyle:React.CSSProperties={...inputStyle,resize:"vertical",fontFamily:"inherit",lineHeight:1.6};
const primaryButton:React.CSSProperties={display:"flex",alignItems:"center",justifyContent:"center",gap:7,padding:"10px 16px",background:"#2D7D82",color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"};
const secondaryButton:React.CSSProperties={flex:1,padding:11,border:"none",background:"#F3F4F6",color:"#6B7280",borderRadius:9,cursor:"pointer"};
const secondarySmall:React.CSSProperties={padding:"10px 14px",border:"none",background:"#F3F4F6",color:"#6B7280",borderRadius:9,cursor:"pointer",whiteSpace:"nowrap"};
const tableContainer:React.CSSProperties={background:"#fff",border:"1px solid #E5E7EB",borderRadius:14,overflowX:"auto",padding:10};
const tableStyle:React.CSSProperties={width:"100%",borderCollapse:"collapse"};
const thStyle:React.CSSProperties={border:"1px solid #E5E7EB",padding:12,background:"#F9FAFB",color:"#6B7280",fontSize:12,fontWeight:700,textAlign:"center"};
const tdStyle:React.CSSProperties={border:"1px solid #E5E7EB",padding:11,color:"#374151",fontSize:13,textAlign:"center",verticalAlign:"top"};
const actions:React.CSSProperties={display:"flex",gap:6,justifyContent:"center"};
const overlayStyle:React.CSSProperties={position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000};
const modalStyle:React.CSSProperties={background:"#fff",borderRadius:16,width:"90%",padding:25,boxSizing:"border-box",maxHeight:"90vh",overflowY:"auto"};
const modalHeader:React.CSSProperties={display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20};
const closeButton:React.CSSProperties={border:"none",background:"#F3F4F6",width:32,height:32,borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"};
const labelStyle:React.CSSProperties={display:"block",marginBottom:6,fontSize:12,color:"#6B7280",fontWeight:600};
const twoCol:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"0 15px"};
const loadingStyle:React.CSSProperties={textAlign:"center",padding:60,color:"#6B7280"};
