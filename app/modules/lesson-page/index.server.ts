import { loadLessonPage as load } from "./lib/load";
import { runLessonAction as run } from "./lib/action";

type LessonParams = { slug: string; lessonId: string };

/**
 * Everything the Lesson page shows: the locked view for someone who cannot
 * view the content, otherwise the lesson with progress, Discussion, Bookmark,
 * Note and quiz. Viewing marks the lesson in progress for a Student who can
 * take the course. Throws a 404 for a lesson outside the course.
 */
export function loadLessonPage(request: Request, params: LessonParams) {
  return load(request, params);
}

/**
 * Runs one Lesson page form intent after checking the capability it needs.
 * Throws 400 for an unknown intent and 404 for a comment or quiz from another
 * lesson.
 */
export function runLessonAction(request: Request, params: LessonParams) {
  return run(request, params);
}

export type LessonPageData = Awaited<ReturnType<typeof load>>;
