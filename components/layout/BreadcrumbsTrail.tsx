"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import { useMemo } from "react";

const HIDDEN_SEGMENTS = new Set(["", "dashboard"]);

function formatSegment(segment: string) {
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function BreadcrumbsTrail() {
  const pathname = usePathname();
  const router = useRouter();

  const crumbs = useMemo(() => {
    const segments = pathname.split("/").filter((segment) => !HIDDEN_SEGMENTS.has(segment));
    const built: Array<{ href: string; label: string }> = [];

    segments.reduce((acc, segment) => {
      const href = `${acc}/${segment}`;
      built.push({ href, label: formatSegment(segment) });
      return href;
    }, "");

    return built;
  }, [pathname]);

  if (crumbs.length <= 1) {
    return null;
  }

  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.25 }}>
      <IconButton
        size="small"
        aria-label="Go back"
        onClick={() => router.back()}
        sx={{
          width: 28,
          height: 28,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <ArrowBackIcon fontSize="small" />
      </IconButton>
      <Breadcrumbs aria-label="breadcrumb" sx={{ color: "text.secondary", fontSize: 13 }}>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          if (isLast) {
            return (
              <Typography key={crumb.href} color="text.primary" fontWeight={500}>
                {crumb.label}
              </Typography>
            );
          }
          return (
            <Link key={crumb.href} href={crumb.href}>
              {crumb.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Stack>
  );
}
