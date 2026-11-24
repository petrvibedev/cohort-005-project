import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addQuiz,
  createTestDb,
  enroll,
  getAs,
  params,
  postAs,
  seedCourse,
  type TestDb,
} from "./fixtures";

let testDb: TestDb;
// The permissions module binds `db` when it loads, so hand it a stand-in that
// forwards to whichever test database the current test made.
vi.mock("~/db", () => ({
  db: new Proxy(
    {},
    { get: (_target, key) => Reflect.get(testDb, key, testDb) }
  ),
}));

const { loadLessonPage, runLessonAction } = await import(
  "~/modules/lesson-page/index.server"
);

let seeded: ReturnType<typeof seedCourse>;
let student: number;

beforeEach(() => {
  testDb = createTestDb();
  seeded = seedCourse(testDb);
  student = seeded.user.id;
});

async function load(userId: number | null, lessonId: number) {
  return loadLessonPage(await getAs(userId, lessonId), params(lessonId));
}

async function act(
  userId: number,
  lessonId: number,
  fields: Record<string, string>
) {
  return runLessonAction(
    await postAs(userId, lessonId, fields),
    params(lessonId)
  );
}

async function loadFull(userId: number | null, lessonId: number) {
  const page = await load(userId, lessonId);
  if (page.view !== "full") throw new Error("expected the full lesson");
  return page;
}

describe("loadLessonPage", () => {
  it("locks the lesson for a signed-in Student who has not enrolled", async () => {
    const page = await load(student, seeded.lessons[0].id);
    expect(page.view).toBe("locked");
    expect(page).not.toHaveProperty("contentHtml");
  });

  it("shows an enrolled Student the lesson and marks it in progress", async () => {
    enroll(testDb, student, seeded.course.id);
    const page = await loadFull(student, seeded.lessons[0].id);
    expect(page.contentHtml).toContain("One");
    expect(page.lessonStatus).toBe("in_progress");
    expect(page.lessonProgressMap).toEqual({
      [seeded.lessons[0].id]: "in_progress",
    });
    expect(page.note).toBeNull();
    expect(page.instructorName).toBe("Test Instructor");
  });

  it("links the lessons either side, across modules", async () => {
    enroll(testDb, student, seeded.course.id);
    const [one, two, three] = seeded.lessons;
    const page = await loadFull(student, two.id);
    expect(page.prevLesson?.id).toBe(one.id);
    expect(page.nextLesson?.id).toBe(three.id);
    expect(page.nextLesson?.moduleTitle).toBe("Next");
    expect(page.curriculum.map((m) => m.lessons.length)).toEqual([2, 1]);
  });

  it("throws 404 for a lesson id that is not a number", async () => {
    const request = await getAs(student, 1);
    await expect(
      loadLessonPage(request, { slug: "test-course", lessonId: "abc" })
    ).rejects.toMatchObject({ init: { status: 404 } });
  });

  it("hides quiz answers from the page", async () => {
    enroll(testDb, student, seeded.course.id);
    addQuiz(testDb, seeded.lessons[0].id);
    const page = await loadFull(student, seeded.lessons[0].id);
    expect(page.quiz?.questions[0].options).toEqual([
      { id: expect.any(Number), optionText: "True" },
      { id: expect.any(Number), optionText: "False" },
    ]);
    expect(page.bestAttempt).toBeNull();
  });
});

describe("runLessonAction", () => {
  beforeEach(() => enroll(testDb, student, seeded.course.id));

  it("saves the Student's Note and shows it on the next load", async () => {
    const lessonId = seeded.lessons[0].id;
    expect(
      await act(student, lessonId, { intent: "save-note", body: " Hi " })
    ).toEqual({ ok: true });
    const page = await loadFull(student, lessonId);
    expect(page.note?.body).toBe("Hi");
  });

  it("refuses an empty Note with a message", async () => {
    const result = await act(student, seeded.lessons[0].id, {
      intent: "save-note",
      body: "   ",
    });
    expect(result).toEqual({
      ok: false,
      error: "Write something before saving your note.",
    });
  });

  it("marks the lesson complete", async () => {
    const lessonId = seeded.lessons[0].id;
    expect(await act(student, lessonId, { intent: "mark-complete" })).toEqual({
      success: true,
    });
    expect((await loadFull(student, lessonId)).lessonStatus).toBe("completed");
  });

  it("toggles the Bookmark", async () => {
    const lessonId = seeded.lessons[0].id;
    expect(await act(student, lessonId, { intent: "toggle-bookmark" })).toEqual(
      { ok: true, bookmarked: true }
    );
    expect((await loadFull(student, lessonId)).bookmarked).toBe(true);
  });

  it("scores a quiz and records the best attempt", async () => {
    const lessonId = seeded.lessons[0].id;
    const quiz = addQuiz(testDb, lessonId);
    const result = await act(student, lessonId, {
      intent: "submit-quiz",
      quizId: String(quiz.quizId),
      [`question-${quiz.questionId}`]: String(quiz.right),
    });
    expect(result).toMatchObject({
      quizResult: { score: 1, passed: true, grade: "A", totalCorrect: 1 },
    });
    expect((await loadFull(student, lessonId)).bestAttempt).toEqual({
      score: 1,
      passed: true,
    });
  });

  it("fails a quiz answered wrongly", async () => {
    const lessonId = seeded.lessons[0].id;
    const quiz = addQuiz(testDb, lessonId);
    const result = await act(student, lessonId, {
      intent: "submit-quiz",
      quizId: String(quiz.quizId),
      [`question-${quiz.questionId}`]: String(quiz.wrong),
    });
    expect(result).toMatchObject({
      quizResult: { score: 0, passed: false, grade: "F" },
    });
  });

  it("throws 404 for a quiz on another lesson", async () => {
    const quiz = addQuiz(testDb, seeded.lessons[1].id);
    await expect(
      act(student, seeded.lessons[0].id, {
        intent: "submit-quiz",
        quizId: String(quiz.quizId),
      })
    ).rejects.toMatchObject({ init: { status: 404 } });
  });

  it("throws 400 for an unknown intent", async () => {
    await expect(
      act(student, seeded.lessons[0].id, { intent: "toString" })
    ).rejects.toMatchObject({ init: { status: 400 } });
  });

  it("refuses progress to someone who has not enrolled", async () => {
    const instructor = seeded.instructor.id;
    await expect(
      act(instructor, seeded.lessons[0].id, { intent: "mark-complete" })
    ).rejects.toMatchObject({ init: { status: 403 } });
  });
});
