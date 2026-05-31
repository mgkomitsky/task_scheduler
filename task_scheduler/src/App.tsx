import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";

import { TaskTable } from "./TaskTable";
import { TaskNode } from "./types";

function App() {
  const [tasks, setTasks] = useState<TaskNode[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskNode | null>(null);
  const [fileContent, setFileContent] = useState<string>("");

  useEffect(() => {
    invoke("get_tree").then((tree) => {
      setTasks(tree as TaskNode[]);
    });
  }, []);

  function handleDoubleClick(task: TaskNode) {
    setSelectedTask(task);
    invoke("get_task_body", { path: task.task.path }).then((content) => {
      setFileContent(content as string);
    });
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ width: "45%", borderRight: "1px solid #333" }}>
        <TaskTable data={tasks} onDoubleClick={handleDoubleClick} />
      </div>

      <div style={{ flex: 1 }}>
        {selectedTask ? (
          <textarea
            style={{
              width: "100%",
              height: "100%",
              background: "#1e1e1e",
              color: "#d4d4d4",
              border: "none",
              padding: "16px",
              fontSize: "13px",
              fontFamily: "monospace",
            }}
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
          />
        ) : (
          <p style={{ color: "#666", padding: "20px" }}>
            Double click a task to edit
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
