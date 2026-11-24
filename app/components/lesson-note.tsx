import { useState } from "react";
import { useFetcher } from "react-router";
import { Lock, NotebookPen } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { cn, formatRelativeTime } from "~/lib/utils";
import { noteDraftStatus } from "~/modules/lesson-note";

export type SavedNote = { body: string; updatedAt: string } | null;

export function LessonNote({ note }: { note: SavedNote }) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [draft, setDraft] = useState(note?.body ?? "");
  const isSaving = fetcher.state !== "idle";
  const error = fetcher.state === "idle" ? fetcher.data?.error : undefined;
  const status = noteDraftStatus(draft, note?.body ?? null);

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <LessonNoteHeader />

        <fetcher.Form method="post" className="space-y-2">
          <input type="hidden" name="intent" value="save-note" />
          <Textarea
            name="body"
            rows={4}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Jot down what you want to remember from this lesson. Only you can read it."
            aria-label="Your notes"
            className="resize-y"
          />

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              size="sm"
              disabled={isSaving || !status.canSave}
            >
              {isSaving ? "Saving..." : "Save note"}
            </Button>
            <NoteSaveState error={error} note={note} unsaved={status.unsaved} />
            <span
              className={cn(
                "ml-auto text-xs",
                status.tooLong ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {status.length} / {status.max}
            </span>
          </div>
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}

function LessonNoteHeader() {
  return (
    <div className="mb-4 flex items-center gap-2">
      <NotebookPen className="size-5 text-primary" />
      <h2 className="text-xl font-semibold">Your notes</h2>
      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        <Lock className="size-3" />
        Private
      </span>
    </div>
  );
}

function NoteSaveState({
  error,
  note,
  unsaved,
}: {
  error: string | undefined;
  note: SavedNote;
  unsaved: boolean;
}) {
  if (error) return <span className="text-sm text-destructive">{error}</span>;
  if (!note) return null;
  return (
    <span suppressHydrationWarning className="text-xs text-muted-foreground">
      {unsaved ? "Unsaved changes · " : "Saved · "}
      last edited {formatRelativeTime(note.updatedAt)}
    </span>
  );
}
