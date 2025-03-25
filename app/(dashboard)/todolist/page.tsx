import { Metadata } from "next";
import { TodoListContainer } from "./components/todolist-container";

export const metadata: Metadata = {
  title: "待办事项",
  description: "管理您的待办事项，提高工作效率",
};

export default function TodoListPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-8">待办事项管理</h1>
      <TodoListContainer />
    </div>
  );
}
