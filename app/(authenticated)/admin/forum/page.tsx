"use client";

import { ForumPostsList } from "@/components/forum";
import { useAuthToken } from "@/hooks/useAuthToken";

export default function AdminForumPage() {
  const token = useAuthToken();

  return <ForumPostsList token={token} basePath="/admin/forum" />;
}
