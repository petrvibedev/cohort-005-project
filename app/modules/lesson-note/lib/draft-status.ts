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
  const length = draft.length;
  const empty = draft.trim().length === 0;
  const tooLong = length > MAX_NOTE_LENGTH;
  const unsaved = draft !== (savedBody ?? "");
  return {
    length,
    max: MAX_NOTE_LENGTH,
    empty,
    tooLong,
    unsaved,
    canSave: unsaved && !empty && !tooLong,
  };
}
