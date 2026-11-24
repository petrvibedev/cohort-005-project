import { useEffect } from "react";
import { useFetcher, useNavigate } from "react-router";
import { Card, CardContent } from "~/components/ui/card";
import { CommentThread } from "~/components/comment-thread";
import { LessonNote } from "~/components/lesson-note";
import { YouTubePlayer } from "~/components/youtube-player";
import { CurriculumSidebar } from "~/components/lesson/curriculum-sidebar";
import { LessonBreadcrumb } from "~/components/lesson/lesson-breadcrumb";
import { LessonCompletion } from "~/components/lesson/lesson-completion";
import { LessonHeader } from "~/components/lesson/lesson-header";
import { LessonPager } from "~/components/lesson/lesson-pager";
import { QuizSection } from "~/components/lesson/quiz-section";
import { useAutoplay } from "~/components/lesson/use-autoplay";
import { LessonProgressStatus } from "~/db/schema";
import type { LessonPageData } from "~/modules/lesson-page/index.server";

type FullData = Extract<LessonPageData, { view: "full" }>;

function useMarkComplete(data: FullData) {
  const { lesson, lessonStatus, nextLesson, course } = data;
  const fetcher = useFetcher({ key: `mark-complete-${lesson.id}` });
  const navigate = useNavigate();

  const isMarking =
    fetcher.state !== "idle" &&
    fetcher.formData?.get("intent") === "mark-complete";
  const justCompleted = fetcher.data?.success;
  const isCompleted =
    lessonStatus === LessonProgressStatus.Completed || !!justCompleted;

  // Navigate to next lesson after marking complete
  useEffect(() => {
    if (justCompleted && nextLesson) {
      navigate(`/courses/${course.slug}/lessons/${nextLesson.id}`);
    }
  }, [justCompleted, nextLesson, course.slug, navigate]);

  return { fetcher, isMarking, isCompleted };
}

export function FullLesson({ data }: { data: FullData }) {
  const { course, curriculum, module: mod, lesson, lessonProgressMap } = data;

  return (
    <div className="flex">
      <CurriculumSidebar
        course={course}
        curriculum={curriculum}
        currentLessonId={lesson.id}
        lessonProgressMap={lessonProgressMap}
        enrolled={data.enrolled}
      />

      <div className="flex-1 p-6 lg:p-8">
        <LessonBreadcrumb
          course={course}
          mod={mod}
          lessonTitle={lesson.title}
        />

        <div className="mx-auto max-w-4xl">
          <LessonHeader
            lesson={lesson}
            bookmarked={data.bookmarked}
            signedIn={!!data.currentUserId}
          />
          <LessonBody data={data} />
          <LessonActivity data={data} />
          <LessonPager
            course={course}
            prevLesson={data.prevLesson}
            nextLesson={data.nextLesson}
          />
        </div>
      </div>
    </div>
  );
}

function LessonBody({ data }: { data: FullData }) {
  const { lesson, contentHtml, currentUserId, note } = data;
  const [autoplay, toggleAutoplay] = useAutoplay();

  return (
    <>
      {lesson.videoUrl && (
        <YouTubePlayer
          videoUrl={lesson.videoUrl}
          lessonId={lesson.id}
          title={lesson.title}
          startPosition={data.lastWatchPosition}
          durationMinutes={lesson.durationMinutes}
          watchProgress={data.watchProgress}
          trackingEnabled={data.enrolled && !!currentUserId}
          autoplay={autoplay}
          onToggleAutoplay={toggleAutoplay}
        />
      )}

      {/* Note — under the video, so the Student can write while they watch.
          Keyed by lesson so the pager does not carry one lesson's draft into the next. */}
      {currentUserId && <LessonNote key={lesson.id} note={note} />}

      {contentHtml && (
        <div
          className="prose prose-neutral dark:prose-invert mb-8 max-w-none"
          // oxlint-disable-next-line react/no-danger -- the instructor wrote this Markdown
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      )}

      {!contentHtml && !lesson.videoUrl && (
        <Card className="mb-8">
          <CardContent className="py-12 text-center text-muted-foreground">
            No content has been added to this lesson yet.
          </CardContent>
        </Card>
      )}
    </>
  );
}

function LessonActivity({ data }: { data: FullData }) {
  const { lesson, quiz, enrolled, currentUserId } = data;
  const { fetcher, isMarking, isCompleted } = useMarkComplete(data);
  const quizFetcher = useFetcher({ key: `quiz-${lesson.id}` });
  const canTakePart = enrolled && !!currentUserId;

  return (
    <>
      {quiz && canTakePart && (
        <QuizSection
          quiz={quiz}
          bestAttempt={data.bestAttempt}
          quizResult={quizFetcher.data?.quizResult ?? null}
          quizFetcher={quizFetcher}
          isSubmitting={quizFetcher.state !== "idle"}
        />
      )}

      {canTakePart && (
        <LessonCompletion
          courseSlug={data.course.slug}
          nextLesson={data.nextLesson}
          isCompleted={isCompleted}
          isMarking={isMarking}
          fetcher={fetcher}
        />
      )}

      {/* Questions & Discussion — confidential to people with access */}
      <CommentThread
        comments={data.comments}
        currentUserId={currentUserId}
        canModerate={data.canModerate}
        canPost
        instructorName={data.instructorName}
      />
    </>
  );
}
