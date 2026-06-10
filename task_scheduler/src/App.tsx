import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { useRef } from "react";

import { TaskTable } from "./TaskTable";
import { TaskNode } from "./types";

function App() {
  const [contextMenu, setContextMenu] = useState({
    position: { x: 0, y: 0 },
    toggled: false,
  });

  const [tasks, setTasks] = useState<TaskNode[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskNode | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [parentSelectMode, setParentSelectMode] = useState(false);

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

  function handleSingleClick(task: TaskNode) {
    if (parentSelectMode) {
      invoke("change_parent", {
        path: task.task.path,
        id: task.task.id,
      })
        .then(() => setParentSelectMode(false))
        .then(() => invoke("refresh_tasks"))
        .then(() => fetchTasks());
      return;
    }
    setSelectedTask(task);
    //console.log(task);
    invoke("get_task_body", { path: task.task.path }).then((content) => {
      setFileContent(content as string);
    });
  }

  function getRowID(e, task: TaskNode) {
    e.preventDefault();
    console.log(task.task.id);
  }

  return (
    <div>
      <div className="menu" style={{ padding: "10px" }}>
        <button
          style={{
            background: "#0037438d",
            color: "#ffffffa1",
            border: "none",
            fontSize: "16px",
            ///fontWeight: "700",
            borderRadius: "10px 10px",
            width: "100px",
            height: "25px",
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
            onSingleClick={handleSingleClick}
            onRefresh={fetchTasks}
            onDelete={handleDelete}
            onClick={getRowID}
            parentSelectMode={parentSelectMode}
            onParentSelectMode={(path, id) => {
              setParentSelectMode(true);
              invoke("change_parent_select_mode", { path, id });
            }}
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
