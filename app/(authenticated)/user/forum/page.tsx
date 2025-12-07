"use client";

import { ForumPostsList } from "@/components/forum";
import { useAuthToken } from "@/hooks/useAuthToken";

export default function ForumPage() {
  const token = useAuthToken();

  return <ForumPostsList token={token} basePath="/user/forum" />;
}
