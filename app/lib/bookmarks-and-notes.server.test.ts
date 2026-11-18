import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import {
  getNote,
  isBookmarked,
  listBookmarks,
  listNotes,
  saveNote,
  toggleBookmark,
} from "./bookmarks-and-notes.server";
import { MAX_NOTE_LENGTH } from "./notes";

type TestDb = ReturnType<typeof createTestDb>;

const NOW = new Date(2026, 9, 6, 12, 0, 0);

function minutesLater(minutes: number) {
  return new Date(NOW.getTime() + minutes * 60_000);
}

let db: TestDb;
let base: ReturnType<typeof seedBaseData>;
let lessonIds: number[];
let otherStudentId: number;

beforeEach(() => {
  db = createTestDb();
  base = seedBaseData(db);

  const module = db
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "Basics", position: 1 })
    .returning()
    .get();

  lessonIds = [1, 2, 3].map(
    (position) =>
      db
        .insert(schema.lessons)
        .values({ moduleId: module.id, title: `Lesson ${position}`, position })
        .returning()
        .get().id
  );

  otherStudentId = db
    .insert(schema.users)
    .values({
      name: "Other Student",
      email: "other@example.com",
      role: schema.UserRole.Student,
    })
    .returning()
    .get().id;
});

function savedNote(studentId: number, lessonId: number) {
  const note = getNote(db, studentId, lessonId);
  if (!note) throw new Error("Expected the Student to have a Note");
  return note;
}

describe("toggling a Bookmark", () => {
  it("bookmarks a Lesson that has no Bookmark", () => {
    expect(isBookmarked(db, base.user.id, lessonIds[0])).toBe(false);

    expect(toggleBookmark(db, base.user.id, lessonIds[0], NOW)).toBe(true);

    expect(isBookmarked(db, base.user.id, lessonIds[0])).toBe(true);
  });

  it("removes the Bookmark when toggled again", () => {
    toggleBookmark(db, base.user.id, lessonIds[0], NOW);

    expect(toggleBookmark(db, base.user.id, lessonIds[0], NOW)).toBe(false);

    expect(isBookmarked(db, base.user.id, lessonIds[0])).toBe(false);
    expect(listBookmarks(db, base.user.id)).toEqual([]);
  });

  it("never leaves a Student with two Bookmarks on one Lesson", () => {
    toggleBookmark(db, base.user.id, lessonIds[0], NOW);
    toggleBookmark(db, base.user.id, lessonIds[0], NOW);
    toggleBookmark(db, base.user.id, lessonIds[0], NOW);

    expect(listBookmarks(db, base.user.id)).toHaveLength(1);
    expect(() =>
      db
        .insert(schema.bookmarks)
        .values({ userId: base.user.id, lessonId: lessonIds[0] })
        .run()
    ).toThrow();
  });

  it("leaves another Student's Bookmark on the same Lesson alone", () => {
    toggleBookmark(db, otherStudentId, lessonIds[0], NOW);

    toggleBookmark(db, base.user.id, lessonIds[0], NOW);
    toggleBookmark(db, base.user.id, lessonIds[0], NOW);

    expect(isBookmarked(db, otherStudentId, lessonIds[0])).toBe(true);
  });
});

describe("saving a Note", () => {
  it("creates the Note, trimmed, on a Lesson that has none", () => {
    expect(getNote(db, base.user.id, lessonIds[0])).toBeUndefined();

    const result = saveNote(
      db,
      base.user.id,
      lessonIds[0],
      "  Remember the # of steps  ",
      NOW
    );

    expect(result.ok).toBe(true);
    expect(savedNote(base.user.id, lessonIds[0])).toMatchObject({
      body: "Remember the # of steps",
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
  });

  it("replaces the body and moves the last edited time on when saved again", () => {
    saveNote(db, base.user.id, lessonIds[0], "First draft", NOW);

    saveNote(db, base.user.id, lessonIds[0], "Second draft", minutesLater(5));

    expect(listNotes(db, base.user.id)).toHaveLength(1);
    expect(savedNote(base.user.id, lessonIds[0])).toMatchObject({
      body: "Second draft",
      createdAt: NOW.toISOString(),
      updatedAt: minutesLater(5).toISOString(),
    });
  });

  it("never leaves a Student with two Notes on one Lesson", () => {
    saveNote(db, base.user.id, lessonIds[0], "Mine", NOW);

    expect(() =>
      db
        .insert(schema.notes)
        .values({ userId: base.user.id, lessonId: lessonIds[0], body: "Again" })
        .run()
    ).toThrow();
  });

  it("accepts a Note of exactly 2,000 characters", () => {
    const body = "a".repeat(MAX_NOTE_LENGTH);

    const result = saveNote(db, base.user.id, lessonIds[0], body, NOW);

    expect(MAX_NOTE_LENGTH).toBe(2000);
    expect(result.ok).toBe(true);
    expect(savedNote(base.user.id, lessonIds[0]).body).toHaveLength(2000);
  });

  it("refuses a Note over 2,000 characters and keeps the existing one", () => {
    saveNote(db, base.user.id, lessonIds[0], "Keep me", NOW);

    const result = saveNote(
      db,
      base.user.id,
      lessonIds[0],
      "a".repeat(MAX_NOTE_LENGTH + 1),
      minutesLater(5)
    );

    expect(result).toEqual({
      ok: false,
      error: "A note must be 2,000 characters or fewer.",
    });
    expect(savedNote(base.user.id, lessonIds[0]).body).toBe("Keep me");
  });

  it("removes the Note when saved with an empty body", () => {
    saveNote(db, base.user.id, lessonIds[0], "Short-lived", NOW);

    const result = saveNote(db, base.user.id, lessonIds[0], "   ", NOW);

    expect(result).toEqual({ ok: true, note: null });
    expect(getNote(db, base.user.id, lessonIds[0])).toBeUndefined();
  });

  it("keeps each Student's Note on the same Lesson separate", () => {
    saveNote(db, base.user.id, lessonIds[0], "Mine", NOW);
    saveNote(db, otherStudentId, lessonIds[0], "Theirs", NOW);

    expect(savedNote(base.user.id, lessonIds[0]).body).toBe("Mine");
    expect(savedNote(otherStudentId, lessonIds[0]).body).toBe("Theirs");
  });
});

describe("the Saved lists", () => {
  it("lists only the Student's own Bookmarks, newest first, with Lesson and Course", () => {
    toggleBookmark(db, base.user.id, lessonIds[0], NOW);
    toggleBookmark(db, base.user.id, lessonIds[1], minutesLater(10));
    toggleBookmark(db, otherStudentId, lessonIds[2], minutesLater(20));

    expect(listBookmarks(db, base.user.id)).toMatchObject([
      {
        lessonId: lessonIds[1],
        lessonTitle: "Lesson 2",
        moduleTitle: "Basics",
        courseTitle: "Test Course",
        courseSlug: "test-course",
      },
      { lessonId: lessonIds[0], lessonTitle: "Lesson 1" },
    ]);
  });

  it("lists only the Student's own Notes, most recently edited first, with Lesson and Course", () => {
    saveNote(db, base.user.id, lessonIds[0], "Older, then edited", NOW);
    saveNote(db, base.user.id, lessonIds[1], "Newer", minutesLater(10));
    saveNote(db, otherStudentId, lessonIds[2], "Not mine", minutesLater(15));
    saveNote(db, base.user.id, lessonIds[0], "Edited last", minutesLater(20));

    expect(listNotes(db, base.user.id)).toMatchObject([
      {
        lessonId: lessonIds[0],
        body: "Edited last",
        updatedAt: minutesLater(20).toISOString(),
        lessonTitle: "Lesson 1",
        courseTitle: "Test Course",
        courseSlug: "test-course",
      },
      { lessonId: lessonIds[1], body: "Newer" },
    ]);
  });
});
