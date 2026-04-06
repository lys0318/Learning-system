import { redirect } from "next/navigation";

// middleware에서 역할별 라우팅을 처리하므로 여기엔 도달하지 않음
export default function RootPage() {
  redirect("/login");
}
