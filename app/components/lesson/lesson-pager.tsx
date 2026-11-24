import { Link } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Neighbour = { id: number; title: string } | null;

function PagerLink({
  to,
  label,
  title,
  align,
}: {
  to: string;
  label: string;
  title: string;
  align: "left" | "right";
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 ${align === "right" ? "text-right " : ""}text-sm text-muted-foreground hover:text-foreground`}
    >
      {label === "Previous" && <ChevronLeft className="size-4" />}
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium text-foreground">{title}</div>
      </div>
      {label !== "Previous" && <ChevronRight className="size-4" />}
    </Link>
  );
}

export function LessonPager({
  course,
  prevLesson,
  nextLesson,
}: {
  course: { title: string; slug: string };
  prevLesson: Neighbour;
  nextLesson: Neighbour;
}) {
  const lessonPath = (id: number) => `/courses/${course.slug}/lessons/${id}`;
  return (
    <div className="flex items-center justify-between border-t pt-6">
      {prevLesson ? (
        <PagerLink
          to={lessonPath(prevLesson.id)}
          label="Previous"
          title={prevLesson.title}
          align="left"
        />
      ) : (
        <div />
      )}

      {nextLesson ? (
        <PagerLink
          to={lessonPath(nextLesson.id)}
          label="Next"
          title={nextLesson.title}
          align="right"
        />
      ) : (
        <PagerLink
          to={`/courses/${course.slug}`}
          label="Back to"
          title={course.title}
          align="left"
        />
      )}
    </div>
  );
}
