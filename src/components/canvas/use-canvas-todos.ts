"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createTodo,
  listTodos,
  TodoApiError,
} from "@/lib/todos/client";
import type { CreateTodoInput, TodoDto } from "@/lib/todos/contracts";
import { listProjects } from "@/lib/projects/client";
import type { ProjectDto } from "@/lib/projects/contracts";
import { canvasStore } from "@/lib/canvas-store";

export type CanvasPosition = {
  readonly x: number;
  readonly y: number;
};

type UseCanvasTodosOptions = {
  readonly onPlaceTodo: (todo: TodoDto) => Promise<void>;
};

type CanvasTodos = {
  readonly todos: readonly TodoDto[];
  readonly projects: readonly ProjectDto[];
  readonly projectsLoading: boolean;
  readonly error: string | null;
  readonly createAndPlaceTodo: (input: CreateTodoInput) => Promise<boolean>;
  readonly placeTodo: (todo: TodoDto, position?: CanvasPosition) => Promise<void>;
};

function todoErrorMessage(error: unknown): string {
  if (error instanceof TodoApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "The Todo request failed. Please try again.";
}

export function useCanvasTodos({ onPlaceTodo }: UseCanvasTodosOptions): CanvasTodos {
  const [todos, setTodos] = useState<readonly TodoDto[]>([]);
  const [projects, setProjects] = useState<readonly ProjectDto[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void listTodos()
      .then((nextTodos) => {
        if (!cancelled) setTodos(nextTodos);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(todoErrorMessage(loadError));
      });

    void listProjects()
      .then((nextProjects) => {
        if (!cancelled) setProjects(nextProjects);
      })
      .catch((loadError: unknown) => {
        if (!cancelled && loadError instanceof Error) {
          setError(`Unable to load projects: ${loadError.message}`);
        }
      })
      .finally(() => {
        if (!cancelled) setProjectsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const createAndPlaceTodo = useCallback(
    async (input: CreateTodoInput): Promise<boolean> => {
      setError(null);
      try {
        const todo = await createTodo(input);
        setTodos((current) => [...current, todo]);
        await onPlaceTodo(todo);
        return true;
      } catch (createError) {
        setError(todoErrorMessage(createError));
        return false;
      }
    },
    [onPlaceTodo],
  );

  const placeTodo = useCallback(
    async (todo: TodoDto, position?: CanvasPosition): Promise<void> => {
      setTodos((current) =>
        current.some((t) => t.id === todo.id) ? current : [...current, todo],
      );
      if (position) {
        await canvasStore.upsertTodoNode(todo.id, position.x, position.y);
        return;
      }
      await onPlaceTodo(todo);
    },
    [onPlaceTodo],
  );

  return {
    todos,
    projects,
    projectsLoading,
    error,
    createAndPlaceTodo,
    placeTodo,
  };
}
