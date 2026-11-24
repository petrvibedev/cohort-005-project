import { db } from "~/db";
import {
  lessonProgress,
  lessons,
  modules,
  videoWatchEvents,
  LessonProgressStatus,
} from "~/db/schema";
import { and, desc, eq, getTableColumns, sql } from "drizzle-orm";

export function getLessonProgress(userId: number, lessonId: number) {
  return db
    .select()
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.lessonId, lessonId)
      )
    )
    .get();
}

export function getLessonProgressForCourse(userId: number, courseId: number) {
  return db
    .select(getTableColumns(lessonProgress))
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .where(
      and(eq(lessonProgress.userId, userId), eq(modules.courseId, courseId))
    )
    .all();
}

export function markLessonComplete(
  userId: number,
  lessonId: number,
  now: Date
) {
  const existing = getLessonProgress(userId, lessonId);

  if (existing) {
    return db
      .update(lessonProgress)
      .set({
        status: LessonProgressStatus.Completed,
        completedAt: now.toISOString(),
      })
      .where(eq(lessonProgress.id, existing.id))
      .returning()
      .get();
  }

  return db
    .insert(lessonProgress)
    .values({
      userId,
      lessonId,
      status: LessonProgressStatus.Completed,
      completedAt: now.toISOString(),
    })
    .returning()
    .get();
}

export function markLessonInProgress(userId: number, lessonId: number) {
  const existing = getLessonProgress(userId, lessonId);

  if (existing) {
    if (existing.status === LessonProgressStatus.Completed) {
      return existing;
    }
    return db
      .update(lessonProgress)
      .set({ status: LessonProgressStatus.InProgress })
      .where(eq(lessonProgress.id, existing.id))
      .returning()
      .get();
  }

  return db
    .insert(lessonProgress)
    .values({
      userId,
      lessonId,
      status: LessonProgressStatus.InProgress,
    })
    .returning()
    .get();
}

export function getLastWatchPosition(userId: number, lessonId: number) {
  const lastEvent = db
    .select()
    .from(videoWatchEvents)
    .where(
      and(
        eq(videoWatchEvents.userId, userId),
        eq(videoWatchEvents.lessonId, lessonId)
      )
    )
    .orderBy(desc(videoWatchEvents.createdAt))
    .limit(1)
    .get();

  return lastEvent?.positionSeconds ?? 0;
}

export function calculateWatchProgress(
  userId: number,
  lessonId: number,
  videoDurationSeconds: number
) {
  if (videoDurationSeconds <= 0) return 0;

  const result = db
    .select({ maxPos: sql<number>`max(${videoWatchEvents.positionSeconds})` })
    .from(videoWatchEvents)
    .where(
      and(
        eq(videoWatchEvents.userId, userId),
        eq(videoWatchEvents.lessonId, lessonId)
      )
    )
    .get();

  const maxPosition = result?.maxPos ?? 0;

  return Math.min(Math.round((maxPosition / videoDurationSeconds) * 100), 100);
}
