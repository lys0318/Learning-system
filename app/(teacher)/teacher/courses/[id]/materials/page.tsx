import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MaterialUploader from "@/components/teacher/MaterialUploader";
import DeleteButton from "@/components/DeleteButton";
import { deleteMaterial } from "./actions";

const FILE_ICON: Record<string, string> = {
  pdf: "📄",
  ppt: "📊",
  image: "🖼️",
  video: "🎬",
  text: "📝",
  other: "📎",
};

function getFileCategory(mimeType: string) {
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    mimeType === "application/vnd.ms-powerpoint"
  ) return "ppt";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("text/")) return "text";
  return "other";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function CourseMaterialsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "teacher") redirect("/login");

  const { data: course } = await supabase
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .eq("teacher_id", user.id)
    .single();

  if (!course) notFound();

  const { data: materials } = await supabase
    .from("course_materials")
    .select("id, name, file_path, file_type, file_size, created_at")
    .eq("course_id", courseId)
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      <header className="border-b border-gray-700/50 px-8 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2 text-sm text-gray-400">
          <Link href="/teacher" className="hover:text-white transition-colors">
            강의 관리
          </Link>
          <span>/</span>
          <span className="text-white truncate">{course.title}</span>
          <span>/</span>
          <span className="text-white">학습 자료</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">학습 자료 관리</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {course.title} · 총 {materials?.length ?? 0}개 파일
            </p>
          </div>
          <MaterialUploader courseId={courseId} />
        </div>

        {materials && materials.length > 0 ? (
          <div className="space-y-2">
            {materials.map((m) => {
              const cat = getFileCategory(m.file_type);
              const icon = FILE_ICON[cat];
              const canUseForQuiz =
                cat === "pdf" || cat === "image" || cat === "text" || cat === "ppt";
              return (
                <div
                  key={m.id}
                  className="bg-[#16213e] rounded-xl border border-gray-700/50 px-5 py-4 flex items-center gap-4"
                >
                  <span className="text-2xl shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{m.name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {formatBytes(m.file_size)} ·{" "}
                      {new Date(m.created_at).toLocaleDateString("ko-KR")}
                      {canUseForQuiz && (
                        <span className="ml-2 text-blue-400">· AI 퀴즈 소스 사용 가능</span>
                      )}
                      {cat === "video" && (
                        <span className="ml-2 text-gray-500">· 영상 (퀴즈 소스 미지원)</span>
                      )}
                    </p>
                  </div>
                  <DeleteButton
                    action={async () => {
                      "use server";
                      await deleteMaterial(m.id, m.file_path);
                    }}
                    confirmMessage={`"${m.name}" 파일을 삭제하시겠습니까?`}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-16 text-center">
            <p className="text-gray-400 mb-2">업로드된 자료가 없습니다.</p>
            <p className="text-gray-500 text-sm">
              PDF, PPT/PPTX, 이미지, 텍스트 파일은 AI 퀴즈 생성 소스로 사용할 수 있습니다.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
