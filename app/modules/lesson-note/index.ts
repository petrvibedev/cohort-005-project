import { draftStatus, type NoteDraftStatus } from "./lib/draft-status";

export type { NoteDraftStatus };

/**
 * What the Lesson page's Note editor shows for the Student's draft: the
 * character count against the limit, whether the draft differs from the saved
 * Note, and whether Save would be accepted.
 */
export function noteDraftStatus(
  draft: string,
  savedBody: string | null
): NoteDraftStatus {
  return draftStatus(draft, savedBody);
}
