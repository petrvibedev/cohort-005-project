import { describe, expect, it } from "vitest";
import { noteDraftStatus } from "~/modules/lesson-note";
import { MAX_NOTE_LENGTH } from "~/lib/notes";

describe("noteDraftStatus", () => {
  it("counts the draft against the Note limit", () => {
    const status = noteDraftStatus("hello", null);
    expect(status.length).toBe(5);
    expect(status.max).toBe(MAX_NOTE_LENGTH);
  });

  it("cannot save an empty or whitespace-only draft", () => {
    expect(noteDraftStatus("", null)).toMatchObject({
      empty: true,
      canSave: false,
    });
    expect(noteDraftStatus("   \n", null)).toMatchObject({
      empty: true,
      unsaved: false,
      canSave: false,
    });
  });

  it("has no unsaved changes before the Student writes their first Note", () => {
    expect(noteDraftStatus("", null).unsaved).toBe(false);
  });

  it("can save a new draft when there is no saved Note", () => {
    expect(noteDraftStatus("first thought", null)).toMatchObject({
      empty: false,
      tooLong: false,
      unsaved: true,
      canSave: true,
    });
  });

  it("has nothing to save when the draft matches the saved Note", () => {
    expect(noteDraftStatus("same", "same")).toMatchObject({
      unsaved: false,
      canSave: false,
    });
  });

  it("can save an edit to the saved Note", () => {
    expect(noteDraftStatus("same, edited", "same")).toMatchObject({
      unsaved: true,
      canSave: true,
    });
  });

  it("allows a draft exactly at the limit", () => {
    expect(noteDraftStatus("a".repeat(MAX_NOTE_LENGTH), null)).toMatchObject({
      tooLong: false,
      canSave: true,
    });
  });

  it("refuses a draft one character over the limit", () => {
    expect(
      noteDraftStatus("a".repeat(MAX_NOTE_LENGTH + 1), null)
    ).toMatchObject({ tooLong: true, canSave: false });
  });

  it("has nothing to save when the draft differs from the saved Note only by surrounding whitespace", () => {
    expect(noteDraftStatus("same  \n", "same")).toMatchObject({
      unsaved: false,
      canSave: false,
    });
  });

  it("does not count surrounding whitespace against the limit", () => {
    expect(
      noteDraftStatus(` ${"a".repeat(MAX_NOTE_LENGTH)}\n`, null)
    ).toMatchObject({ length: MAX_NOTE_LENGTH, tooLong: false, canSave: true });
  });
});
