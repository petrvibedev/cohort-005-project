import { createTestDb, seedBaseData, type TestDb } from "~/test/setup";
import * as schema from "~/db/schema";
import { setCurrentUserId } from "~/lib/session";
import { markdown } from "~/lib/text";

/** A course with two modules: "Basics" (lessons 1, 2) and "Next" (lesson 3). */
export function seedCourse(db: TestDb) {
  const base = seedBaseData(db);
  const addModule = (title: string, position: number) =>
    db
      .insert(schema.modules)
      .values({ courseId: base.course.id, title, position })
      .returning()
      .get();
  const basics = addModule("Basics", 1);
  const next = addModule("Next", 2);
  const addLesson = (moduleId: number, title: string, position: number) =>
    db
      .insert(schema.lessons)
      .values({ moduleId, title, position, content: markdown(`# ${title}`) })
      .returning()
      .get();
  const lessons = [
    addLesson(basics.id, "One", 1),
    addLesson(basics.id, "Two", 2),
    addLesson(next.id, "Three", 1),
  ];
  return { ...base, lessons };
}

export function enroll(db: TestDb, userId: number, courseId: number) {
  db.insert(schema.enrollments).values({ userId, courseId }).run();
}

/** A true/false quiz on the lesson; returns the option ids. */
export function addQuiz(db: TestDb, lessonId: number) {
  const quiz = db
    .insert(schema.quizzes)
    .values({ lessonId, title: "Check", passingScore: 0.7 })
    .returning()
    .get();
  const question = db
    .insert(schema.quizQuestions)
    .values({
      quizId: quiz.id,
      questionText: "Is TS typed?",
      questionType: schema.QuestionType.TrueFalse,
      position: 1,
    })
    .returning()
    .get();
  const option = (optionText: string, isCorrect: boolean) =>
    db
      .insert(schema.quizOptions)
      .values({ questionId: question.id, optionText, isCorrect })
      .returning()
      .get().id;
  return {
    quizId: quiz.id,
    questionId: question.id,
    right: option("True", true),
    wrong: option("False", false),
  };
}

const URL_BASE = "http://localhost/courses/test-course/lessons";

async function cookieFor(userId: number | null) {
  if (userId === null) return "";
  const setCookie = await setCurrentUserId(new Request(URL_BASE), userId);
  return setCookie.split(";")[0];
}

export async function getAs(userId: number | null, lessonId: number) {
  return new Request(`${URL_BASE}/${lessonId}`, {
    headers: { Cookie: await cookieFor(userId) },
  });
}

export async function postAs(
  userId: number,
  lessonId: number,
  fields: Record<string, string>
) {
  return new Request(`${URL_BASE}/${lessonId}`, {
    method: "POST",
    headers: { Cookie: await cookieFor(userId) },
    body: new URLSearchParams(fields),
  });
}

export function params(lessonId: number) {
  return { slug: "test-course", lessonId: String(lessonId) };
}

export { createTestDb, type TestDb };
