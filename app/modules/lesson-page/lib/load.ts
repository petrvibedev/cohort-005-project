import { data } from "react-router";
import { db } from "~/db";
import {
  coursePermissions,
  type CourseRef,
  type DenialReason,
} from "~/modules/permissions/course-permissions.server";
import { isBookmarked } from "~/lib/bookmarks.server";
import { getNote } from "~/lib/notes.server";
import { renderMarkdown } from "~/lib/markdown.server";
import {
  adjacentLessons,
  curriculumOf,
  getCourseWithDetails,
  getLessonById,
  getModuleById,
  getUserById,
  type CourseWithDetails,
} from "./course";
import {
  calculateWatchProgress,
  getLastWatchPosition,
  getLessonProgress,
  getLessonProgressForCourse,
  markLessonInProgress,
} from "./progress";
import { getRenderedThread } from "./thread";
import { loadLessonQuiz } from "./quiz";
import { lessonIdSchema } from "./schemas";

type Lesson = NonNullable<ReturnType<typeof getLessonById>>;

/**
 * The course named by this route's slug, through this lesson. A lesson in
 * another course, or a malformed lesson id, counts as not found.
 */
export function lessonRef(params: {
  slug: string;
  lessonId: string;
}): CourseRef {
  return { slug: params.slug, lessonId: params.lessonId };
}

/** The lesson id from the route; a malformed one counts as not found. */
export function lessonIdOf(params: { lessonId: string }): number {
  const parsed = lessonIdSchema.safeParse(params.lessonId);
  if (!parsed.success) throw data("Lesson not found", { status: 404 });
  return parsed.data;
}

function courseSummary(course: CourseWithDetails) {
  return { id: course.id, title: course.title, slug: course.slug };
}

function loadProgress(userId: number, courseId: number, lesson: Lesson) {
  markLessonInProgress(userId, lesson.id);
  const lessonStatus = getLessonProgress(userId, lesson.id)?.status ?? null;

  const lessonProgressMap: Record<number, string> = {};
  for (const record of getLessonProgressForCourse(userId, courseId)) {
    lessonProgressMap[record.lessonId] = record.status;
  }

  let lastWatchPosition = 0;
  let watchProgress = 0;
  if (lesson.videoUrl) {
    lastWatchPosition = getLastWatchPosition(userId, lesson.id);
    const videoDurationSeconds = (lesson.durationMinutes ?? 0) * 60;
    if (videoDurationSeconds > 0) {
      watchProgress = calculateWatchProgress(
        userId,
        lesson.id,
        videoDurationSeconds
      );
    }
  }
  return { lessonStatus, lastWatchPosition, watchProgress, lessonProgressMap };
}

const NO_PROGRESS = {
  lessonStatus: null as string | null,
  lastWatchPosition: 0,
  watchProgress: 0,
  lessonProgressMap: {} as Record<number, string>,
};

/** Everything here is confidential to people who can view the content. */
async function loadContent(lesson: Lesson, currentUserId: number | null) {
  const note = currentUserId
    ? getNote(db, currentUserId, lesson.id)
    : undefined;
  return {
    comments: await getRenderedThread(lesson.id),
    bookmarked: currentUserId
      ? isBookmarked(db, currentUserId, lesson.id)
      : false,
    note: note ? { body: note.body, updatedAt: note.updatedAt } : null,
    contentHtml: lesson.content ? await renderMarkdown(lesson.content) : null,
    ...loadLessonQuiz(lesson.id, currentUserId),
  };
}

function findLesson(courseId: number, lessonId: number) {
  const courseWithDetails = getCourseWithDetails(courseId);
  const lesson = getLessonById(lessonId);
  const mod = lesson ? getModuleById(lesson.moduleId) : undefined;
  if (!courseWithDetails || !lesson || !mod) {
    throw data("Lesson not found", { status: 404 });
  }
  return { courseWithDetails, lesson, mod };
}

async function requireLessonDecisions(
  request: Request,
  params: { slug: string; lessonId: string }
) {
  // Not found covers an unknown course, a malformed lesson id, and a lesson
  // from another course.
  const decisions = await coursePermissions.getCourseDecisions(
    request,
    lessonRef(params)
  );
  if (!decisions.found) {
    throw data("Lesson not found", { status: 404 });
  }
  return decisions;
}

export async function loadLessonPage(
  request: Request,
  params: { slug: string; lessonId: string }
) {
  const decisions = await requireLessonDecisions(request, params);
  const { course, person, enrolled, view, take, manage } = decisions;
  const currentUserId = person?.id ?? null;
  const { courseWithDetails, lesson, mod } = findLesson(
    course.id,
    lessonIdOf(params)
  );
  const shared = {
    course: courseSummary(courseWithDetails),
    curriculum: curriculumOf(courseWithDetails),
    module: { id: mod.id, title: mod.title },
    enrolled,
  };

  // Someone who can't view the content gets the lesson's title, its module and
  // the course outline — never the body, video or quiz — plus the reason, so
  // the page can show the right call to action.
  if (!view.allowed) {
    const lockedReason: DenialReason = view.reason;
    return {
      view: "locked" as const,
      ...shared,
      lesson: { id: lesson.id, title: lesson.title },
      lockedReason,
    };
  }

  // Progress is recorded only for people who can take the course, so a
  // Student under a Country Lock gets none.
  const progress =
    currentUserId && take.allowed
      ? loadProgress(currentUserId, course.id, lesson)
      : NO_PROGRESS;
  const instructor = getUserById(course.instructorId);

  return {
    view: "full" as const,
    ...shared,
    lesson,
    currentUserId,
    ...adjacentLessons(courseWithDetails, lesson.id),
    ...progress,
    ...(await loadContent(lesson, currentUserId)),
    canModerate: manage.allowed,
    instructorName: instructor?.name ?? "your instructor",
  };
}
