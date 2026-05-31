import { useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { useEffect } from 'react'

import { TaskTable } from './TaskTable'
import { TaskNode } from './types'

import styles from './App.module.css'

function App() {
  const [tasks, setTasks] = useState([])
  const [selectedTask, setSelectedTask] = useState<TaskNode | null>(null)

  // useEffect(() => {
  //   invoke('get_tasks').then((tasks) => {
  //     console.log(tasks)
  //     setTasks(tasks as any[])
  //   })
  // }, [])

  useEffect(() => {
    invoke('get_tree').then((tree) => {
      console.log(tree)
      setTasks(tree as TaskNode[])
    })
  }, [])

  return (
    <div className={styles.layout}>
      <div className={styles.tablePane}>
        <TaskTable data={tasks} onDoubleClick={setSelectedTask} />
      </div>

      <div className={styles.editorPane}>
        {
          selectedTask
            ? <div>{selectedTask.task.title}</div>
            : <div className={styles.emptyState}>Double click a task to edit</div>
        }
      </div>
    </div >
  )
}

export default App