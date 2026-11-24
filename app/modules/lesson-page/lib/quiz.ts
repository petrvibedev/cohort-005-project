import { db } from "~/db";
import { quizzes, quizQuestions, quizOptions, quizAttempts } from "~/db/schema";
import { and, desc, eq } from "drizzle-orm";

export function getQuizById(quizId: number) {
  return db.select().from(quizzes).where(eq(quizzes.id, quizId)).get();
}

function getQuizByLessonId(lessonId: number) {
  return db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).get();
}

function getQuizWithQuestions(quizId: number) {
  const quiz = getQuizById(quizId);
  if (!quiz) return null;

  const questions = db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(quizQuestions.position)
    .all();

  const questionsWithOptions = questions.map((question) => {
    const options = db
      .select()
      .from(quizOptions)
      .where(eq(quizOptions.questionId, question.id))
      .all();
    return { ...question, options };
  });

  return { ...quiz, questions: questionsWithOptions };
}

function getBestAttempt(userId: number, quizId: number) {
  return db
    .select()
    .from(quizAttempts)
    .where(
      and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quizId))
    )
    .orderBy(desc(quizAttempts.score))
    .limit(1)
    .get();
}

type StudentQuiz = {
  id: number;
  title: string;
  passingScore: number;
  questions: Array<{
    id: number;
    questionText: string;
    questionType: string;
    position: number;
    options: Array<{ id: number; optionText: string }>;
  }>;
};

function toStudentQuiz(quizId: number): StudentQuiz | null {
  const quizData = getQuizWithQuestions(quizId);
  if (!quizData) return null;
  // Strip isCorrect from options so answers aren't leaked to the client
  return {
    id: quizData.id,
    title: quizData.title,
    passingScore: quizData.passingScore,
    questions: quizData.questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      position: q.position,
      options: q.options.map((o) => ({
        id: o.id,
        optionText: o.optionText,
      })),
    })),
  };
}

/** The lesson's quiz without its answers, and the person's best attempt. */
export function loadLessonQuiz(lessonId: number, userId: number | null) {
  const quizRecord = getQuizByLessonId(lessonId);
  if (!quizRecord) {
    return {
      quiz: null,
      bestAttempt: null as { score: number; passed: boolean } | null,
    };
  }
  const best = userId ? getBestAttempt(userId, quizRecord.id) : undefined;
  return {
    quiz: toStudentQuiz(quizRecord.id),
    bestAttempt: best ? { score: best.score, passed: best.passed } : null,
  };
}
