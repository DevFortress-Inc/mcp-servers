"use client";

import { useState, useEffect } from "react";
import {
  useWidgetProps,
  useMaxHeight,
  useDisplayMode,
  useRequestDisplayMode,
  useIsChatGptApp,
  useCallTool,
} from "./hooks";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

interface WidgetData extends Record<string, unknown> {
  todos?: Todo[];
  action?: string;
  message?: string;
  structuredContent?: {
    todos?: Todo[];
    action?: string;
    message?: string;
  };
  result?: {
    structuredContent?: {
      todos?: Todo[];
      action?: string;
      message?: string;
    };
    todos?: Todo[];
    action?: string;
    message?: string;
  };
}

export default function Home() {
  const toolOutput = useWidgetProps<WidgetData>();
  const maxHeight = useMaxHeight() ?? undefined;
  const displayMode = useDisplayMode();
  const requestDisplayMode = useRequestDisplayMode();
  const isChatGptApp = useIsChatGptApp();
  const callTool = useCallTool();

  // Extract todos from tool output (undefined when no tool output is available)
  const serverTodos =
    toolOutput?.result?.structuredContent?.todos ??
    toolOutput?.result?.todos ??
    toolOutput?.structuredContent?.todos ??
    toolOutput?.todos;

  // Local state for UI
  const [todos, setTodos] = useState<Todo[]>(() => serverTodos ?? []);

  // Sync from server whenever tool output changes (e.g., ChatGPT triggers a tool)
  useEffect(() => {
    if (serverTodos) {
      setTodos(serverTodos);
    }
  }, [serverTodos]);

  const handleToggleTodo = async (id: string) => {
    // Optimistic update
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
    await callTool("complete_todo", { id });
  };

  const handleDeleteTodo = async (id: string) => {
    // Optimistic update
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
    await callTool("delete_todo", { id });
  };

  const completedCount = todos.filter((t) => t.completed).length;

  return (
    <div
      className="font-sans min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-zinc-900 dark:to-zinc-800 p-4"
      style={{
        maxHeight,
        height: displayMode === "fullscreen" ? maxHeight : undefined,
        overflow: "auto",
      }}
    >
      {/* Fullscreen button */}
      {displayMode !== "fullscreen" && isChatGptApp && (
        <button
          aria-label="Enter fullscreen"
          className="fixed top-4 right-4 z-50 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-lg ring-1 ring-slate-900/10 dark:ring-white/10 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          onClick={() => requestDisplayMode("fullscreen")}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
            />
          </svg>
        </button>
      )}

      <main className="max-w-md mx-auto">
        {/* Not in ChatGPT warning */}
        {!isChatGptApp && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 mb-4">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                  This widget works inside ChatGPT.
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  MCP endpoint: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">/mcp</code>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Todo Container */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✅</span>
              <div>
                <h1 className="text-xl font-bold text-white">My Todo List</h1>
                <p className="text-emerald-100 text-sm">
                  {todos.length === 0
                    ? "No tasks yet"
                    : `${completedCount}/${todos.length} completed`}
                </p>
              </div>
            </div>
          </div>

          {/* Todo List */}
          <div className="p-4">
            {todos.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-zinc-500 dark:text-zinc-400 text-lg">
                  Your todo list is empty
                </p>
                <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-2">
                  Ask ChatGPT to add a task!
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {todos.map((todo) => (
                  <li
                    key={todo.id}
                    className={`flex items-center gap-3 p-4 rounded-xl transition-all ${
                      todo.completed
                        ? "bg-zinc-100 dark:bg-zinc-800 opacity-60"
                        : "bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleTodo(todo.id)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                        todo.completed
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-zinc-300 dark:border-zinc-600 hover:border-emerald-500"
                      }`}
                    >
                      {todo.completed && (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={3}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>

                    {/* Text */}
                    <span
                      className={`flex-1 text-sm ${
                        todo.completed
                          ? "line-through text-zinc-400 dark:text-zinc-500"
                          : "text-zinc-700 dark:text-zinc-200"
                      }`}
                    >
                      {todo.text}
                    </span>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteTodo(todo.id)}
                      className="w-8 h-8 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition-all"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {todos.length > 0 && (
            <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-700">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                Click checkbox to complete • Click trash to delete
              </p>
            </div>
          )}
        </div>

        {/* Powered by */}
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-4">
          Todo List MCP
        </p>
      </main>
    </div>
  );
}
