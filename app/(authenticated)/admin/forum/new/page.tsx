"use client";

import { NewForumPostForm } from "@/components/forum";
import { useAuthToken } from "@/hooks/useAuthToken";

export default function AdminNewForumPostPage() {
  const token = useAuthToken();

  return <NewForumPostForm token={token} basePath="/admin/forum" />;
}
