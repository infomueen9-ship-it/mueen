interface TeacherClassroomProps {
  schemaName: string
}

export function TeacherClassroom({ schemaName }: TeacherClassroomProps) {
  return (
    <div style={{ padding: '20px', direction: 'rtl' }}>
      <h2>الصف الافتراضي</h2>
      <p>هذه الصفحة للصف الافتراضي للمدرسة: {schemaName}</p>
    </div>
  )
}
