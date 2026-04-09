import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  )
    return "ppt";
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

export default async function StudentCourseDetailPage({
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
  if (profile?.role !== "student") redirect("/login");

  // 수강 여부 확인
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", user.id)
    .eq("course_id", courseId)
    .single();
  if (!enrollment) notFound();

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, description, profiles(full_name)")
    .eq("id", courseId)
    .single();
  if (!course) notFound();

  const teacher = (course.profiles as unknown) as { full_name: string } | null;

  // admin 클라이언트로 RLS 우회하여 자료 조회 + 서명 URL 생성
  const admin = createAdminClient();

  const { data: materials } = await admin
    .from("course_materials")
    .select("id, name, file_path, file_type, file_size, created_at")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  // 각 자료에 대한 서명된 다운로드 URL 생성 (1시간 유효)
  const materialsWithUrls = await Promise.all(
    (materials ?? []).map(async (m) => {
      const { data: urlData } = await admin.storage
        .from("course-materials")
        .createSignedUrl(m.file_path, 3600, { download: m.name });
      return { ...m, downloadUrl: urlData?.signedUrl ?? null };
    })
  );

  return (
    <main className="max-w-3xl mx-auto px-8 py-8">
      {/* 브레드크럼 */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/student" className="hover:text-white transition-colors">
          내 강의
        </Link>
        <span>/</span>
        <span className="text-white truncate">{course.title}</span>
      </nav>

      {/* 강의 헤더 */}
      <div className="bg-[#16213e] rounded-2xl border border-gray-700/50 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">{course.title}</h1>
            <p className="text-gray-400 text-sm mt-1">{teacher?.full_name} 선생님</p>
            {course.description && (
              <p className="text-gray-300 text-sm mt-3 leading-relaxed">{course.description}</p>
            )}
          </div>
          <Link
            href={`/student/courses/${courseId}/chat`}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-400 text-sm font-medium transition-colors"
          >
            🎓 AI 튜터
          </Link>
        </div>
      </div>

      {/* 학습 자료 */}
      <div>
        <h2 className="text-base font-semibold mb-3">
          학습 자료{" "}
          <span className="text-gray-400 font-normal text-sm">
            ({materialsWithUrls.length}개)
          </span>
        </h2>

        {materialsWithUrls.length > 0 ? (
          <div className="space-y-2">
            {materialsWithUrls.map((m) => {
              const cat = getFileCategory(m.file_type);
              const icon = FILE_ICON[cat];
              return (
                <div
                  key={m.id}
                  className="bg-[#16213e] rounded-xl border border-gray-700/50 px-5 py-4 flex items-center gap-4"
                >
                  <span className="text-2xl shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{m.name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {formatBytes(m.file_size)} ·{" "}
                      {new Date(m.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  {m.downloadUrl ? (
                    <a
                      href={m.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium transition-colors"
                    >
                      ⬇ 다운로드
                    </a>
                  ) : (
                    <span className="shrink-0 text-gray-600 text-xs">다운로드 불가</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-12 text-center text-gray-400">
            아직 업로드된 학습 자료가 없습니다.
          </div>
        )}
      </div>
    </main>
  );
}
