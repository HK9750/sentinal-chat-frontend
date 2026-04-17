"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn, formatTimestamp } from "@/lib/utils";
import type { Poll, PollCreatePayload } from "@/types";

const MAX_POLL_OPTIONS = 12;
const MIN_POLL_OPTIONS = 2;

interface PollMessageProps {
  poll: Poll;
  isOwn: boolean;
  disabled?: boolean;
  onVote?: (pollId: string, optionIds: string[]) => void;
}

function uniqueOptionIds(optionIds: string[]) {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const optionId of optionIds) {
    if (!optionId || seen.has(optionId)) continue;
    seen.add(optionId);
    next.push(optionId);
  }
  return next;
}

export function PollMessage({ poll, isOwn, disabled = false, onVote }: PollMessageProps) {
  const initialSelected = useMemo(() => uniqueOptionIds(poll.my_votes ?? []), [poll.my_votes]);
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSelected(uniqueOptionIds(poll.my_votes ?? []));
  }, [poll.my_votes]);

  const totalVotes = useMemo(
    () => poll.options.reduce((total, option) => total + (option.votes ?? 0), 0),
    [poll.options]
  );

  const hasSelectionChanges = useMemo(() => {
    const current = uniqueOptionIds(selected).slice().sort();
    const mine = uniqueOptionIds(poll.my_votes ?? []).slice().sort();
    if (current.length !== mine.length) {
      return true;
    }
    return current.some((item, index) => item !== mine[index]);
  }, [poll.my_votes, selected]);

  const isClosed = poll.closed;
  const hadVotes = (poll.my_votes?.length ?? 0) > 0;
  const canSubmit = !isClosed && !disabled && !submitting && hasSelectionChanges;

  const toggleOption = (optionId: string) => {
    if (disabled || isClosed) return;

    setSelected((current) => {
      const hasOption = current.includes(optionId);
      if (poll.allows_multiple) {
        if (hasOption) {
          return current.filter((id) => id !== optionId);
        }
        return uniqueOptionIds([...current, optionId]);
      }

      if (hasOption) {
        return [];
      }
      return [optionId];
    });
  };

  const submitVote = async () => {
    if (!onVote || !canSubmit) return;
    setSubmitting(true);
    try {
      await Promise.resolve(onVote(poll.id, uniqueOptionIds(selected)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-3",
        isOwn ? "border-primary/30 bg-primary/5" : "border-border/80 bg-background/70"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug text-foreground">{poll.question}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {isClosed
              ? "Poll ended"
              : poll.allows_multiple
                ? "Select one or more options"
                : "Select one option"}
          </p>
        </div>
        <Badge
          variant={isClosed ? "outline" : "secondary"}
          className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px]"
        >
          <BarChart3 className="mr-1 h-3 w-3" />
          Poll
        </Badge>
      </div>

      <div className="space-y-2">
        {poll.options
          .slice()
          .sort((left, right) => left.position - right.position)
          .map((option) => {
            const isSelected = selected.includes(option.id);
            const voteCount = option.votes ?? 0;
            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleOption(option.id)}
                disabled={disabled || isClosed}
                className={cn(
                  "group relative w-full overflow-hidden rounded-xl border px-3 py-2 text-left transition",
                  "disabled:cursor-not-allowed disabled:opacity-80",
                  isSelected
                    ? "border-primary/60 bg-primary/10"
                    : "border-border/80 bg-card/40 hover:border-primary/40 hover:bg-card"
                )}
              >
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 bg-primary/15 transition-[width] duration-200"
                  style={{ width: `${percentage}%` }}
                />
                <span className="relative flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    {isSelected ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate font-medium text-foreground">{option.text}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {totalVotes > 0 ? `${percentage}%` : ""}
                  </span>
                </span>
              </button>
            );
          })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span>
          {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
        </span>
        {poll.closes_at && !isClosed && <span>Closes {formatTimestamp(poll.closes_at)}</span>}
        {poll.closes_at && isClosed && <span>Closed {formatTimestamp(poll.closes_at)}</span>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!isClosed && onVote && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 rounded-full px-4 text-xs font-semibold"
            onClick={submitVote}
            disabled={!canSubmit}
          >
            {submitting
              ? "Submitting..."
              : selected.length === 0 && hadVotes
                ? "Clear vote"
                : hadVotes
                  ? "Update vote"
                  : "Vote"}
          </Button>
        )}
      </div>
    </div>
  );
}

interface PollComposerProps {
  onCreate: (payload: PollCreatePayload) => void;
  onCancel: () => void;
  initialQuestion?: string;
  disabled?: boolean;
}

export function PollComposer({ onCreate, onCancel, initialQuestion = "", disabled = false }: PollComposerProps) {
  const [question, setQuestion] = useState(initialQuestion.trim());
  const [allowsMultiple, setAllowsMultiple] = useState(false);
  const [closesAt, setClosesAt] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuestion(initialQuestion.trim());
  }, [initialQuestion]);

  const updateOption = (index: number, value: string) => {
    setOptions((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  const removeOption = (index: number) => {
    setOptions((current) => {
      if (current.length <= MIN_POLL_OPTIONS) return current;
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const addOption = () => {
    setOptions((current) => {
      if (current.length >= MAX_POLL_OPTIONS) return current;
      return [...current, ""];
    });
  };

  const submit = () => {
    const trimmedQuestion = question.trim();
    const normalizedOptions = options.map((item) => item.trim()).filter(Boolean);

    if (!trimmedQuestion) {
      setError("Question is required.");
      return;
    }
    if (normalizedOptions.length < MIN_POLL_OPTIONS) {
      setError("Add at least two options.");
      return;
    }

    const seen = new Set<string>();
    for (const option of normalizedOptions) {
      const key = option.toLowerCase();
      if (seen.has(key)) {
        setError("Options must be unique.");
        return;
      }
      seen.add(key);
    }

    let closesAtISO: string | undefined;
    if (closesAt) {
      const date = new Date(closesAt);
      if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
        setError("Close time must be in the future.");
        return;
      }
      closesAtISO = date.toISOString();
    }

    setError(null);
    onCreate({
      question: trimmedQuestion,
      allows_multiple: allowsMultiple,
      closes_at: closesAtISO,
      options: normalizedOptions,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="poll-question" className="text-sm font-medium text-foreground">
          Question
        </label>
        <Input
          id="poll-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask your question"
          maxLength={500}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Options</p>
        <div className="space-y-2">
          {options.map((option, index) => (
            <div key={`poll-option-${index}`} className="flex items-center gap-2">
              <Input
                value={option}
                onChange={(event) => updateOption(index, event.target.value)}
                placeholder={`Option ${index + 1}`}
                maxLength={200}
                disabled={disabled}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeOption(index)}
                disabled={disabled || options.length <= MIN_POLL_OPTIONS}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addOption}
          disabled={disabled || options.length >= MAX_POLL_OPTIONS}
        >
          Add option
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
        <div>
          <p className="text-sm font-medium text-foreground">Allow multiple answers</p>
          <p className="text-xs text-muted-foreground">Users can choose more than one option.</p>
        </div>
        <Switch checked={allowsMultiple} onCheckedChange={setAllowsMultiple} disabled={disabled} />
      </div>

      <div className="space-y-2">
        <label htmlFor="poll-closes-at" className="text-sm font-medium text-foreground">
          Close date (optional)
        </label>
        <Input
          id="poll-closes-at"
          type="datetime-local"
          value={closesAt}
          onChange={(event) => setClosesAt(event.target.value)}
          disabled={disabled}
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={disabled}>
          Cancel
        </Button>
        <Button type="button" onClick={submit} disabled={disabled}>
          Send poll
        </Button>
      </div>
    </div>
  );
}

export function isPollCreatePayload(value: unknown): value is PollCreatePayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const payload = value as Record<string, unknown>;
  if (typeof payload.question !== "string") {
    return false;
  }
  if (typeof payload.allows_multiple !== "boolean") {
    return false;
  }
  if (!Array.isArray(payload.options)) {
    return false;
  }
  return payload.options.every((item) => typeof item === "string");
}
