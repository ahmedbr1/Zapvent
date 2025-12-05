"use client";

import { NewForumPostForm } from "@/components/forum";
import { useAuthToken } from "@/hooks/useAuthToken";

export default function EventsOfficeNewForumPostPage() {
  const token = useAuthToken();

  return <NewForumPostForm token={token} basePath="/events-office/forum" />;
}
