import { useSyncExternalStore } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { AnnouncementsPage } from "./pages/AnnouncementsPage";
import { AuditPage } from "./pages/AuditPage";
import { FlagsPage } from "./pages/FlagsPage";
import { LoginPage } from "./pages/LoginPage";
import { ModelsPage } from "./pages/ModelsPage";
import { UsagePage } from "./pages/UsagePage";
import { UsersPage } from "./pages/UsersPage";
import { clearSession, client, getSession, subscribeSession } from "./session";

function useSession() {
  return useSyncExternalStore(subscribeSession, getSession);
}

export function App() {
  const session = useSession();
  if (!session.accessToken || session.user?.role !== "ADMIN") {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <div className="shell">
      <nav className="nav">
        <div className="brand">
          智泉
          <small>ADMIN · GWGW</small>
        </div>
        <NavLink to="/models">模型</NavLink>
        <NavLink to="/users">用戶</NavLink>
        <NavLink to="/usage">用量</NavLink>
        <NavLink to="/flags">旗標</NavLink>
        <NavLink to="/announcements">公告</NavLink>
        <NavLink to="/audit">審計</NavLink>
        <button
          type="button"
          onClick={() => {
            void client.logout(false).catch(() => undefined);
            clearSession();
          }}
        >
          登出
        </button>
      </nav>
      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/models" replace />} />
          <Route path="/models" element={<ModelsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/usage" element={<UsagePage />} />
          <Route path="/flags" element={<FlagsPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="*" element={<Navigate to="/models" replace />} />
        </Routes>
      </main>
    </div>
  );
}
