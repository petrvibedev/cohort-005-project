import { Link, isRouteErrorResponse } from "react-router";
import { AlertTriangle } from "lucide-react";
import type { Route } from "./+types/courses.$slug.lessons.$lessonId";
import {
  loadLessonPage,
  runLessonAction,
} from "~/modules/lesson-page/index.server";
import { Button } from "~/components/ui/button";
import { FullLesson } from "~/components/lesson/full-lesson";
import { LockedLesson } from "~/components/lesson/locked-lesson";

export function meta({ loaderData }: Route.MetaArgs) {
  const title = loaderData?.lesson?.title ?? "Lesson";
  const courseTitle = loaderData?.course?.title ?? "Course";
  return [{ title: `${title} — ${courseTitle} — Cadence` }];
}

export function loader({ params, request }: Route.LoaderArgs) {
  return loadLessonPage(request, params);
}

export function action({ params, request }: Route.ActionArgs) {
  return runLessonAction(request, params, new Date());
}

export default function LessonViewer({ loaderData }: Route.ComponentProps) {
  if (loaderData.view === "locked") {
    return <LockedLesson data={loaderData} />;
  }
  return <FullLesson data={loaderData} />;
}

function errorCopy(error: unknown) {
  if (!isRouteErrorResponse(error)) {
    return {
      title: "Something went wrong",
      message: "An unexpected error occurred while loading this lesson.",
    };
  }
  if (error.status === 404) {
    return {
      title: "Lesson not found",
      message:
        "The lesson you're looking for doesn't exist or may have been removed.",
    };
  }
  if (error.status === 401) {
    return {
      title: "Sign in required",
      message:
        typeof error.data === "string"
          ? error.data
          : "Please select a user from the DevUI panel.",
    };
  }
  return {
    title: `Error ${error.status}`,
    message: typeof error.data === "string" ? error.data : error.statusText,
  };
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { title, message } = errorCopy(error);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="text-center">
        <AlertTriangle className="mx-auto mb-4 size-12 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold">{title}</h1>
        <p className="mb-6 text-muted-foreground">{message}</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/courses">
            <Button variant="outline">Browse Courses</Button>
          </Link>
          <Link to="/dashboard">
            <Button>My Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
