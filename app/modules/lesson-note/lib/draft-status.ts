import { MAX_NOTE_LENGTH } from "~/lib/notes";

export type NoteDraftStatus = {
  length: number;
  max: number;
  empty: boolean;
  tooLong: boolean;
  unsaved: boolean;
  canSave: boolean;
};

export function draftStatus(
  draft: string,
  savedBody: string | null
): NoteDraftStatus {
  // The server saves the trimmed body, so judge the draft the way it will.
  const body = draft.trim();
  const length = body.length;
  const empty = length === 0;
  const tooLong = length > MAX_NOTE_LENGTH;
  const unsaved = body !== (savedBody ?? "");
  return {
    length,
    max: MAX_NOTE_LENGTH,
    empty,
    tooLong,
    unsaved,
    canSave: unsaved && !empty && !tooLong,
  };
}
