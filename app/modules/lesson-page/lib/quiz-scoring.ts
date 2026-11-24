import { db } from "~/db";
import {
  quizQuestions,
  quizOptions,
  quizAttempts,
  quizAnswers,
} from "~/db/schema";
import { and, eq } from "drizzle-orm";
import { getQuizById } from "./quiz";

function calculateGrade(score: number): string {
  if (score >= 0.9) return "A";
  if (score >= 0.8) return "B";
  if (score >= 0.7) return "C";
  if (score >= 0.6) return "D";
  return "F";
}

type QuestionResult = {
  questionId: number;
  correct: boolean;
  selectedOptionId: number | null;
  correctOptionId: number | null;
};

type Question = typeof quizQuestions.$inferSelect;

function correctOptionIdFor(q: Question): number | null {
  if (q.questionType === "multiple_choice") {
    const opts = db
      .select()
      .from(quizOptions)
      .where(eq(quizOptions.questionId, q.id))
      .all();
    const correctOpt = opts.find((o) => o.isCorrect === true);
    return correctOpt ? correctOpt.id : null;
  }
  if (q.questionType === "true_false") {
    const correctOpt = db
      .select()
      .from(quizOptions)
      .where(
        and(eq(quizOptions.questionId, q.id), eq(quizOptions.isCorrect, true))
      )
      .get();
    return correctOpt ? correctOpt.id : null;
  }
  return null;
}

function scoreQuestion(
  q: Question,
  selected: number | undefined
): QuestionResult {
  if (!selected) {
    return {
      questionId: q.id,
      correct: false,
      selectedOptionId: null,
      correctOptionId: null,
    };
  }
  const correctOptionId = correctOptionIdFor(q);
  return {
    questionId: q.id,
    correct: selected === correctOptionId,
    selectedOptionId: selected,
    correctOptionId,
  };
}

function recordAttempt(attempt: {
  userId: number;
  quizId: number;
  score: number;
  passed: boolean;
  questionResults: QuestionResult[];
}) {
  const row = db
    .insert(quizAttempts)
    .values({
      userId: attempt.userId,
      quizId: attempt.quizId,
      score: attempt.score,
      passed: attempt.passed,
    })
    .returning()
    .get();

  for (const result of attempt.questionResults) {
    if (result.selectedOptionId === null) continue;
    db.insert(quizAnswers)
      .values({
        attemptId: row.id,
        questionId: result.questionId,
        selectedOptionId: result.selectedOptionId,
      })
      .run();
  }
  return row;
}

function scoreAttempt(
  userId: number,
  quizId: number,
  selectedAnswers: Record<number, number>
) {
  const questions = db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(quizQuestions.position)
    .all();

  const questionResults = questions.map((q) =>
    scoreQuestion(q, selectedAnswers[q.id])
  );
  const correct = questionResults.filter((r) => r.correct).length;
  const total = questions.length;
  const score = total > 0 ? correct / total : 0;
  const passed = score > 0.7;
  const attempt = recordAttempt({
    userId,
    quizId,
    score,
    passed,
    questionResults,
  });

  return {
    attemptId: attempt.id,
    score,
    passed,
    grade: calculateGrade(score),
    totalCorrect: correct,
    totalQuestions: total,
    questionResults,
  };
}

export function computeResult(
  userId: number,
  quizId: number,
  selectedAnswers: Record<number, number>
) {
  try {
    if (!getQuizById(quizId)) {
      console.error("quiz not found");
      return null;
    }
    return scoreAttempt(userId, quizId, selectedAnswers);
  } catch (error) {
    console.error(error);
    return null;
  }
}
