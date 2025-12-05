"use client";

import { ForumPostsList } from "@/components/forum";
import { useAuthToken } from "@/hooks/useAuthToken";

export default function EventsOfficeForumPage() {
  const token = useAuthToken();

  return <ForumPostsList token={token} basePath="/events-office/forum" />;
}
