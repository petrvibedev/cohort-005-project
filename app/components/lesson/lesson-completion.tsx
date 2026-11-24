import { Link, type useFetcher } from "react-router";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";

type Neighbour = { id: number; title: string } | null;

export function LessonCompletion({
  courseSlug,
  nextLesson,
  isCompleted,
  isMarking,
  fetcher,
}: {
  courseSlug: string;
  nextLesson: Neighbour;
  isCompleted: boolean;
  isMarking: boolean;
  fetcher: ReturnType<typeof useFetcher>;
}) {
  if (isCompleted) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="size-5" />
            <span className="font-medium">Lesson completed</span>
          </div>
          {nextLesson && (
            <Link to={`/courses/${courseSlug}/lessons/${nextLesson.id}`}>
              <Button variant="outline" size="sm">
                Up next: {nextLesson.title}
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="mark-complete" />
        <Button disabled={isMarking}>
          <MarkCompleteLabel nextLesson={nextLesson} isMarking={isMarking} />
        </Button>
      </fetcher.Form>
    </div>
  );
}

function MarkCompleteLabel({
  nextLesson,
  isMarking,
}: {
  nextLesson: Neighbour;
  isMarking: boolean;
}) {
  if (nextLesson) {
    if (isMarking) return "Completing...";
    return (
      <>
        Up next: {nextLesson.title}
        <ChevronRight className="ml-1 size-4" />
      </>
    );
  }
  return (
    <>
      <CheckCircle2 className="mr-2 size-4" />
      {isMarking ? "Marking..." : "Mark as Complete"}
    </>
  );
}
