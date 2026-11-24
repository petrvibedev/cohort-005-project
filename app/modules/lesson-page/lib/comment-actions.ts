import { data } from "react-router";
import { db } from "~/db";
import {
  coursePermissions,
  type CourseRef,
} from "~/modules/permissions/course-permissions.server";
import {
  createComment,
  deleteComment,
  editComment,
} from "~/lib/comments.server";
import { defaultNotifications } from "~/lib/notifications.server";
import { parseFormData } from "~/lib/validation";
import { getCommentById } from "./thread";
import {
  createCommentSchema,
  deleteCommentSchema,
  editCommentSchema,
} from "./schemas";

export type IntentContext = {
  formData: FormData;
  person: Parameters<typeof coursePermissions.decide>[0];
  ref: CourseRef;
  currentUserId: number;
  lessonId: number;
  now: Date;
};

// Scope the id to this lesson so a comment elsewhere can't be reached by
// posting its id to this route.
function requireLessonComment(commentId: number, lessonId: number) {
  const existing = getCommentById(commentId);
  if (!existing || existing.lessonId !== lessonId) {
    throw data("Comment not found", { status: 404 });
  }
}

async function createIntent({
  formData,
  currentUserId,
  lessonId,
  now,
}: IntentContext) {
  const parsed = parseFormData(formData, createCommentSchema);
  if (!parsed.success) {
    return { ok: false, error: "Enter a comment before posting." };
  }
  const created = await createComment(
    db,
    currentUserId,
    lessonId,
    parsed.data.parentId ?? null,
    parsed.data.body,
    now,
    await defaultNotifications()
  );
  if (!created.ok) return created;
  return { ok: true };
}

function editIntent({ formData, currentUserId, lessonId, now }: IntentContext) {
  const parsed = parseFormData(formData, editCommentSchema);
  if (!parsed.success) {
    return { ok: false, error: "Enter a comment before saving." };
  }
  requireLessonComment(parsed.data.commentId, lessonId);
  const edited = editComment(
    db,
    parsed.data.commentId,
    currentUserId,
    parsed.data.body,
    now
  );
  if (!edited.ok) return edited;
  return { ok: true };
}

async function deleteIntent(context: IntentContext) {
  const { formData, person, ref, currentUserId, lessonId, now } = context;
  const parsed = parseFormData(formData, deleteCommentSchema);
  if (!parsed.success) {
    return { ok: false, error: "Could not delete that comment." };
  }
  requireLessonComment(parsed.data.commentId, lessonId);
  // Anyone who can view may delete their own posts; moderating someone
  // else's takes the manage capability.
  const decisions = coursePermissions.decide(person, ref);
  const canModerate = decisions.found && decisions.manage.allowed;
  const deleted = await deleteComment(
    db,
    parsed.data.commentId,
    currentUserId,
    canModerate,
    now,
    await defaultNotifications()
  );
  if (!deleted.ok) return deleted;
  return { ok: true };
}

const COMMENT_INTENTS = {
  "create-comment": createIntent,
  "edit-comment": editIntent,
  "delete-comment": deleteIntent,
};

export function isCommentIntent(
  intent: string
): intent is keyof typeof COMMENT_INTENTS {
  return Object.hasOwn(COMMENT_INTENTS, intent);
}

export async function runCommentIntent(
  intent: keyof typeof COMMENT_INTENTS,
  context: IntentContext
) {
  try {
    return await COMMENT_INTENTS[intent](context);
  } catch (error) {
    // Service validation failures are user-correctable; anything thrown as a
    // Response (404 above) should keep bubbling.
    if (error instanceof Error) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}
