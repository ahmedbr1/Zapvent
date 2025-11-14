"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Radio from "@mui/material/Radio";
import FormControlLabel from "@mui/material/FormControlLabel";
import RadioGroup from "@mui/material/RadioGroup";
import Chip from "@mui/material/Chip";
import HowToVoteIcon from "@mui/icons-material/HowToVoteRounded";
import { useAuthToken } from "@/hooks/useAuthToken";
import { fetchVendorPolls, voteForVendorPoll } from "@/lib/services/polls";
import { formatDateTime } from "@/lib/date";
import { useSnackbar } from "notistack";

export default function VendorPollsPage() {
  const token = useAuthToken();
  const { enqueueSnackbar } = useSnackbar();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [votingPollId, setVotingPollId] = useState<string | null>(null);

  const pollsQuery = useQuery({
    queryKey: ["vendor-polls", token],
    queryFn: () => fetchVendorPolls(token ?? undefined),
    enabled: Boolean(token),
  });

  const polls = useMemo(() => pollsQuery.data ?? [], [pollsQuery.data]);

  useEffect(() => {
    if (!polls.length) return;
    setSelectedOptions((prev) => {
      const next = { ...prev };
      polls.forEach((poll) => {
        if (!next[poll.id] && poll.selectedVendorId) {
          next[poll.id] = poll.selectedVendorId;
        }
      });
      return next;
    });
  }, [polls]);

  const voteMutation = useMutation({
    mutationFn: ({ pollId, vendorId }: { pollId: string; vendorId: string }) =>
      voteForVendorPoll(pollId, vendorId, token ?? undefined),
    onMutate: ({ pollId }) => {
      setVotingPollId(pollId);
    },
    onSuccess: (message) => {
      enqueueSnackbar(message ?? "Vote recorded.", { variant: "success" });
      pollsQuery.refetch();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to submit your vote.";
      enqueueSnackbar(message, { variant: "error" });
    },
    onSettled: () => {
      setVotingPollId(null);
    },
  });

  const handleVote = (pollId: string) => {
    const vendorId = selectedOptions[pollId];
    if (!vendorId) {
      enqueueSnackbar("Select a vendor before voting.", { variant: "info" });
      return;
    }
    voteMutation.mutate({ pollId, vendorId });
  };

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          Vendor booth polls
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Help decide which vendors are invited to set up their booths. Each account can vote once per poll, but you can change it anytime.
        </Typography>
      </Stack>

      {pollsQuery.isLoading ? (
        <Grid container spacing={3}>
          {Array.from({ length: 2 }).map((_, index) => (
            <Grid key={index} size={{ xs: 12 }}>
              <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : pollsQuery.isError ? (
        <Alert severity="error" action={<Button onClick={() => pollsQuery.refetch()}>Retry</Button>}>
          Unable to fetch polls right now. Please try again.
        </Alert>
      ) : polls.length === 0 ? (
        <Alert severity="info">No vendor polls are active at the moment.</Alert>
      ) : (
        <Stack spacing={3}>
          {polls.map((poll) => {
            const selectedVendorId = selectedOptions[poll.id] ?? "";
            const hasVoted = Boolean(poll.selectedVendorId);
            const voteDisabled = voteMutation.isPending && votingPollId === poll.id;
            const actionDisabled =
              !selectedVendorId ||
              (hasVoted && selectedVendorId === poll.selectedVendorId) ||
              voteDisabled;

            return (
              <Card key={poll.id} sx={{ borderRadius: 3, boxShadow: "0 16px 40px rgba(15,23,42,0.08)" }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip icon={<HowToVoteIcon />} label="Open poll" color="primary" />
                      <Typography variant="body2" color="text.secondary">
                        {poll.durations
                          .map(
                            (duration) =>
                              `${formatDateTime(duration.start, "MMM D")} – ${formatDateTime(duration.end, "MMM D")}`
                          )
                          .join(" • ")}
                      </Typography>
                    </Stack>
                    <Typography variant="h6" fontWeight={700}>
                      {poll.boothName}
                    </Typography>
                    <RadioGroup
                      value={selectedVendorId}
                      onChange={(event) =>
                        setSelectedOptions((prev) => ({
                          ...prev,
                          [poll.id]: event.target.value,
                        }))
                      }
                    >
                      <Grid container spacing={2}>
                        {poll.options.map((option) => {
                          const percentage =
                            poll.totalVotes === 0
                              ? 0
                              : Math.round((option.votes / poll.totalVotes) * 100);
                          return (
                            <Grid key={option.vendorId} size={{ xs: 12, md: 6 }}>
                              <Stack
                                spacing={1}
                                sx={{
                                  border: "1px solid rgba(15,23,42,0.1)",
                                  borderRadius: 2,
                                  p: 2,
                                }}
                              >
                                <FormControlLabel
                                  value={option.vendorId}
                                  control={<Radio />}
                                  label={
                                    <Stack spacing={0.5}>
                                      <Typography fontWeight={600}>{option.vendorName}</Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {option.votes} vote{option.votes === 1 ? "" : "s"}
                                      </Typography>
                                    </Stack>
                                  }
                                />
                                <LinearProgress
                                  variant="determinate"
                                  value={percentage}
                                  sx={{ height: 6, borderRadius: 999 }}
                                />
                              </Stack>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </RadioGroup>
                    <Stack direction="row" justifyContent="flex-end">
                      <Button
                        variant="contained"
                        onClick={() => handleVote(poll.id)}
                        disabled={actionDisabled}
                      >
                        {voteMutation.isPending && votingPollId === poll.id
                          ? "Submitting..."
                          : hasVoted
                            ? "Update vote"
                            : "Vote"}
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
