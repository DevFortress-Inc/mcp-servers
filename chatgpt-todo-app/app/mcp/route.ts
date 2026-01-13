import { baseURL } from "@/baseUrl";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

const getAppsSdkCompatibleHtml = async (baseUrl: string, path: string) => {
  const result = await fetch(`${baseUrl}${path}`);
  return await result.text();
};

// In-memory storage for todos
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

const todos: Map<string, Todo> = new Map();

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function getAllTodos(): Todo[] {
  return Array.from(todos.values());
}

const handler = createMcpHandler(async (server) => {
  const html = await getAppsSdkCompatibleHtml(baseURL, "/");

  const widgetUri = "ui://widget/todo-template.html";
  const widgetDescription = "Interactive todo list widget";

  const toolMeta = {
    "openai/outputTemplate": widgetUri,
    "openai/toolInvocation/invoking": "Loading...",
    "openai/toolInvocation/invoked": "Done",
    "openai/widgetAccessible": false,
    "openai/resultCanProduceWidget": true,
  } as const;

  // Register the widget resource
  server.registerResource(
    "todo-widget",
    widgetUri,
    {
      title: "Todo List Widget",
      description: widgetDescription,
      mimeType: "text/html+skybridge",
      _meta: {
        "openai/widgetDescription": widgetDescription,
        "openai/widgetPrefersBorder": true,
      },
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/html+skybridge",
          text: `<html>${html}</html>`,
          _meta: {
            "openai/widgetDescription": widgetDescription,
            "openai/widgetPrefersBorder": true,
            "openai/widgetDomain": baseURL,
          },
        },
      ],
    })
  );

  // Tool: Add a new todo
  // @ts-ignore - Type instantiation too deep
  server.registerTool(
    "add_todo",
    {
      title: "Add Todo",
      description: "Add a new task to the todo list",
      inputSchema: {
        text: z.string().describe("The task description"),
      },
      _meta: toolMeta,
    },
    async ({ text }) => {
      const id = generateId();
      const todo: Todo = {
        id,
        text,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      todos.set(id, todo);

      return {
        content: [{ type: "text", text: `Added: "${text}"` }],
        structuredContent: {
          todos: getAllTodos(),
          action: "added",
        },
      };
    }
  );

  // Tool: List all todos
  // @ts-ignore - Type instantiation too deep
  server.registerTool(
    "list_todos",
    {
      title: "List Todos",
      description: "Show all tasks in the todo list",
      inputSchema: {},
      _meta: toolMeta,
    },
    async () => {
      const allTodos = getAllTodos();
      return {
        content: [
          {
            type: "text",
            text: allTodos.length > 0
              ? `You have ${allTodos.length} task(s)`
              : "Your todo list is empty",
          },
        ],
        structuredContent: {
          todos: allTodos,
          action: "list",
        },
      };
    }
  );

  // Tool: Complete a todo
  // @ts-ignore - Type instantiation too deep
  server.registerTool(
    "complete_todo",
    {
      title: "Complete Todo",
      description: "Mark a task as completed",
      inputSchema: {
        id: z.string().describe("The ID of the task to complete"),
      },
      _meta: toolMeta,
    },
    async ({ id }) => {
      const todo = todos.get(id);

      if (!todo) {
        return {
          content: [{ type: "text", text: `Todo "${id}" not found` }],
          structuredContent: { todos: getAllTodos(), action: "error" },
        };
      }

      todo.completed = true;
      todos.set(id, todo);

      return {
        content: [{ type: "text", text: `Completed: "${todo.text}"` }],
        structuredContent: { todos: getAllTodos(), action: "completed" },
      };
    }
  );

  // Tool: Delete a todo
  // @ts-ignore - Type instantiation too deep
  server.registerTool(
    "delete_todo",
    {
      title: "Delete Todo",
      description: "Remove a task from the todo list",
      inputSchema: {
        id: z.string().describe("The ID of the task to delete"),
      },
      _meta: toolMeta,
    },
    async ({ id }) => {
      const todo = todos.get(id);

      if (!todo) {
        return {
          content: [{ type: "text", text: `Todo "${id}" not found` }],
          structuredContent: { todos: getAllTodos(), action: "error" },
        };
      }

      todos.delete(id);

      return {
        content: [{ type: "text", text: `Deleted: "${todo.text}"` }],
        structuredContent: { todos: getAllTodos(), action: "deleted" },
      };
    }
  );

  // Tool: Clear completed todos
  // @ts-ignore - Type instantiation too deep
  server.registerTool(
    "clear_completed",
    {
      title: "Clear Completed",
      description: "Remove all completed tasks from the list",
      inputSchema: {},
      _meta: toolMeta,
    },
    async () => {
      let count = 0;
      for (const [id, todo] of todos.entries()) {
        if (todo.completed) {
          todos.delete(id);
          count++;
        }
      }

      return {
        content: [
          {
            type: "text",
            text: count > 0 ? `Cleared ${count} task(s)` : "Nothing to clear",
          },
        ],
        structuredContent: { todos: getAllTodos(), action: "cleared" },
      };
    }
  );
});

export const GET = handler;
export const POST = handler;
