import { useSyncExternalStore } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell, Toaster, TooltipProvider } from "@/components";
import { AnnouncementsPage } from "./pages/AnnouncementsPage";
import { AuditPage } from "./pages/AuditPage";
import { CopyPage } from "./pages/CopyPage";
import { DiscoverPage } from "./pages/DiscoverPage";
import { FlagsPage } from "./pages/FlagsPage";
import { LoginPage } from "./pages/LoginPage";
import { ModelsPage } from "./pages/ModelsPage";
import { QuotasPage } from "./pages/QuotasPage";
import { TemplatesPage } from "./pages/TemplatesPage";
import { ToolsPage } from "./pages/ToolsPage";
import { UserDetailPage, UserThreadPage } from "./pages/UserDetailPage";
import { UsagePage } from "./pages/UsagePage";
import { UsersPage } from "./pages/UsersPage";
import { getSession, subscribeSession } from "./session";

function useSession() {
  return useSyncExternalStore(subscribeSession, getSession);
}

export function App() {
  const session = useSession();
  if (!session.accessToken || session.user?.role !== "ADMIN") {
    return (
      <>
        <Toaster />
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Toaster />
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/models" replace />} />
          <Route path="/models" element={<ModelsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/:id" element={<UserDetailPage />} />
          <Route path="/users/:id/c/:conversationId" element={<UserThreadPage />} />
          <Route path="/usage" element={<UsagePage />} />
          <Route path="/flags" element={<FlagsPage />} />
          <Route path="/quotas" element={<QuotasPage />} />
          <Route path="/copy" element={<CopyPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="*" element={<Navigate to="/models" replace />} />
        </Routes>
      </AppShell>
    </TooltipProvider>
  );
}
