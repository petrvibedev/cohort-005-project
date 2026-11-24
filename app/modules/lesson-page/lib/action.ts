import { data } from "react-router";
import { db } from "~/db";
import {
  coursePermissions,
  type Capability,
} from "~/modules/permissions/course-permissions.server";
import { toggleBookmark } from "~/lib/bookmarks.server";
import { saveNote } from "~/lib/notes.server";
import { parseFormData } from "~/lib/validation";
import { lessonIdOf, lessonRef } from "./load";
import { markLessonComplete } from "./progress";
import { getQuizById } from "./quiz";
import { computeResult } from "./quiz-scoring";
import { quizAnswerSchema, saveNoteSchema, submitQuizSchema } from "./schemas";
import {
  isCommentIntent,
  runCommentIntent,
  type IntentContext,
} from "./comment-actions";

/**
 * What each action intent needs: comments, Bookmarks and Notes need view;
 * progress and quizzes need take. Moderating Discussions (deleting someone
 * else's post) additionally needs manage, checked in the delete intent.
 */
const INTENT_CAPABILITY: Record<string, Capability | undefined> = {
  "create-comment": "view",
  "edit-comment": "view",
  "delete-comment": "view",
  "toggle-bookmark": "view",
  "save-note": "view",
  "mark-complete": "take",
  "submit-quiz": "take",
};

function saveNoteIntent({
  formData,
  currentUserId,
  lessonId,
  now,
}: IntentContext) {
  const parsed = parseFormData(formData, saveNoteSchema);
  if (!parsed.success) {
    return { ok: false, error: parsed.errors.body };
  }
  const saved = saveNote(db, currentUserId, lessonId, parsed.data.body, now);
  if (!saved.ok) return saved;
  return { ok: true };
}

function selectedAnswersFrom(formData: FormData) {
  const selectedAnswers: Record<number, number> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("question-")) continue;
    const answer = quizAnswerSchema.safeParse({
      questionId: key.slice("question-".length),
      optionId: value,
    });
    if (answer.success) {
      selectedAnswers[answer.data.questionId] = answer.data.optionId;
    }
  }
  return selectedAnswers;
}

function submitQuizIntent({
  formData,
  currentUserId,
  lessonId,
}: IntentContext) {
  const parsed = parseFormData(formData, submitQuizSchema);
  if (!parsed.success) {
    throw data("Invalid quiz ID", { status: 400 });
  }
  const { quizId } = parsed.data;
  // Scope the quiz to this lesson so a quiz elsewhere can't be reached by
  // posting its id to this route.
  const quiz = getQuizById(quizId);
  if (!quiz || quiz.lessonId !== lessonId) {
    throw data("Quiz not found", { status: 404 });
  }

  const result = computeResult(
    currentUserId,
    quizId,
    selectedAnswersFrom(formData)
  );
  if (!result) {
    throw data("Failed to score quiz", { status: 500 });
  }
  return { quizResult: result };
}

function runIntent(intent: string, context: IntentContext) {
  if (isCommentIntent(intent)) return runCommentIntent(intent, context);
  if (intent === "toggle-bookmark") {
    const { currentUserId, lessonId, now } = context;
    const bookmarked = toggleBookmark(db, currentUserId, lessonId, now);
    return { ok: true, bookmarked };
  }
  if (intent === "save-note") return saveNoteIntent(context);
  if (intent === "mark-complete") {
    markLessonComplete(context.currentUserId, context.lessonId, context.now);
    return { success: true };
  }
  if (intent === "submit-quiz") return submitQuizIntent(context);
  throw data("Invalid action", { status: 400 });
}

export async function runLessonAction(
  request: Request,
  params: { slug: string; lessonId: string },
  now: Date
) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  // Every intent checks its own capability here — loader guards don't protect
  // actions. The ref includes the lesson, so a lesson from another course (or
  // a malformed id) is a 404.
  const capability =
    typeof intent === "string" && Object.hasOwn(INTENT_CAPABILITY, intent)
      ? INTENT_CAPABILITY[intent]
      : undefined;
  if (typeof intent !== "string" || !capability) {
    throw data("Invalid action", { status: 400 });
  }
  const ref = lessonRef(params);
  const { person } = await coursePermissions.requireCapability(
    request,
    capability,
    ref
  );
  return runIntent(intent, {
    formData,
    person,
    ref,
    currentUserId: person.id,
    lessonId: lessonIdOf(params),
    now,
  });
}
