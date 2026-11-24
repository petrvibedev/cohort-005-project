import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeNotifications } from "~/lib/notifications.fake.server";
import {
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
vi.mock("~/lib/notifications.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/lib/notifications.server")>()),
  defaultNotifications: async () => fakeNotifications(),
}));

const { loadLessonPage, runLessonAction } = await import(
  "~/modules/lesson-page/index.server"
);

let seeded: ReturnType<typeof seedCourse>;
let student: number;
let instructor: number;
let lessonId: number;

beforeEach(() => {
  testDb = createTestDb();
  seeded = seedCourse(testDb);
  student = seeded.user.id;
  instructor = seeded.instructor.id;
  lessonId = seeded.lessons[0].id;
  enroll(testDb, student, seeded.course.id);
});

async function act(
  userId: number,
  fields: Record<string, string>,
  onLesson = lessonId
) {
  return runLessonAction(
    await postAs(userId, onLesson, fields),
    params(onLesson)
  );
}

async function thread(onLesson = lessonId) {
  const page = await loadLessonPage(
    await getAs(student, onLesson),
    params(onLesson)
  );
  if (page.view !== "full") throw new Error("expected the full lesson");
  return page.comments;
}

const ask = (userId: number, body: string, extra = {}) =>
  act(userId, { intent: "create-comment", body, ...extra });

describe("Lesson Discussion", () => {
  it("shows a Student's question with its body rendered", async () => {
    expect(await ask(student, "What is **this**?")).toEqual({ ok: true });
    const [question] = await thread();
    expect(question.bodyHtml).toContain("<strong>this</strong>");
    expect(question.author).toMatchObject({
      id: student,
      isInstructor: false,
      isPlatformAdmin: false,
    });
  });

  it("nests the Instructor's reply under the question", async () => {
    await ask(student, "Question");
    const [question] = await thread();
    expect(
      await ask(instructor, "Answer", { parentId: String(question.id) })
    ).toEqual({ ok: true });
    const [withReply] = await thread();
    expect(withReply.replies).toHaveLength(1);
    expect(withReply.replies[0].author.isInstructor).toBe(true);
  });

  it("refuses an empty comment", async () => {
    expect(await ask(student, "")).toMatchObject({ ok: false });
  });

  it("edits the author's own comment", async () => {
    await ask(student, "Frist");
    const [question] = await thread();
    const edited = await act(student, {
      intent: "edit-comment",
      commentId: String(question.id),
      body: "First",
    });
    expect(edited).toEqual({ ok: true });
    const [after] = await thread();
    expect(after.body).toBe("First");
    expect(after.editedAt).not.toBeNull();
  });

  it("throws 404 for a comment posted on another lesson", async () => {
    const other = seeded.lessons[1].id;
    await act(student, { intent: "create-comment", body: "Elsewhere" }, other);
    const [elsewhere] = await thread(other);
    await expect(
      act(student, {
        intent: "delete-comment",
        commentId: String(elsewhere.id),
      })
    ).rejects.toMatchObject({ init: { status: 404 } });
  });

  it("drops a deleted question that has no replies", async () => {
    await ask(student, "Never mind");
    const [question] = await thread();
    expect(
      await act(student, {
        intent: "delete-comment",
        commentId: String(question.id),
      })
    ).toEqual({ ok: true });
    expect(await thread()).toEqual([]);
  });

  it("keeps a deleted question with replies, without its body", async () => {
    await ask(student, "Secret");
    const [question] = await thread();
    await ask(instructor, "Reply", { parentId: String(question.id) });
    await act(instructor, {
      intent: "delete-comment",
      commentId: String(question.id),
    });
    const [kept] = await thread();
    expect(kept).toMatchObject({ deleted: true, body: "", bodyHtml: "" });
    expect(kept.replies).toHaveLength(1);
  });

  it("does not let a Student delete someone else's comment", async () => {
    await ask(instructor, "Welcome");
    const [welcome] = await thread();
    const result = await act(student, {
      intent: "delete-comment",
      commentId: String(welcome.id),
    });
    expect(result).toMatchObject({ ok: false });
    expect(await thread()).toHaveLength(1);
  });
});
