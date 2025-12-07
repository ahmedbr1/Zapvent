"use client";

import { ForumPostDetailView } from "@/components/forum";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";

export default function AdminForumPostDetailPage() {
  const token = useAuthToken();
  const user = useSessionUser();

  return (
    <ForumPostDetailView
      token={token}
      userId={user?.id}
      userRole={user?.role}
      basePath="/admin/forum"
    />
  );
}
