import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { useRef } from "react";

import { TaskTable } from "./TaskTable";
import { TaskNode } from "./types";

function App() {
  const [tasks, setTasks] = useState<TaskNode[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskNode | null>(null);
  const [fileContent, setFileContent] = useState<string>("");

  useEffect(() => {
    fetchTasks();
  }, []);

  function fetchTasks() {
    invoke("get_tree").then((tree) => {
      setTasks(tree as TaskNode[]);
    });
  }

  function handleDelete(task: TaskNode) {
    console.log("DELETE");
    invoke("delete_task", { path: task.task.path }).then(() => {
      invoke("refresh_tasks").then(() => fetchTasks());
    });
  }

  const debounceTimer = useRef<any>(null);

  function handleTextAreaChange(content: string) {
    setFileContent(content);

    // clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // set new timer
    debounceTimer.current = setTimeout(() => {
      invoke("save_task_body", {
        path: selectedTask?.task.path,
        content: content,
      }).then(() =>
        invoke("refresh_tasks").then(() => {
          fetchTasks();
        }),
      );
    }, 800);
  }

  function handleDoubleClick(task: TaskNode) {
    setSelectedTask(task);
    console.log(task);
    invoke("get_task_body", { path: task.task.path }).then((content) => {
      setFileContent(content as string);
    });
  }

  return (
    <div>
      <div className="menu">
        <button
          style={{
            background: "#4b81ff",
            color: "#ffffffa1",
            border: "none",
            fontSize: "16px",
            fontWeight: "700",
            borderRadius: "5px 5px",
            width: "100px",
            height: "30px",
          }}
          onClick={() => {
            invoke("create_task", {
              folderPath: "/Users/mkomitsky/All My Stuff/Project_Scheduler/",
            }).then(() => {
              invoke("refresh_tasks").then(() => {
                fetchTasks();
              });
            });
          }}
        >
          New Task
        </button>
      </div>

      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <div style={{ width: "75%", borderRight: "1px solid #333" }}>
          <TaskTable
            data={tasks}
            onDoubleClick={handleDoubleClick}
            onRefresh={fetchTasks}
            onDelete={handleDelete}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            width: "100%",
          }}
        >
          {/* <div>
            <input type="text" style={{ height: "20px", resize: "none" }} />
          </div>

          <div>
            <input type="text" style={{ height: "20px", resize: "none" }} />
          </div> */}

          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            {selectedTask ? (
              <textarea
                style={{
                  flex: 1,
                  background: "#1e1e1e",
                  color: "#d4d4d4",
                  border: "none",
                  padding: "16px",
                  fontSize: "13px",
                  fontFamily: "monospace",
                }}
                value={fileContent}
                onChange={(e) => handleTextAreaChange(e.target.value)}
              />
            ) : (
              <p style={{ color: "#666", padding: "20px" }}>
                Double click a task to edit
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
