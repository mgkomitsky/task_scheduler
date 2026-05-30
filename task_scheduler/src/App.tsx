import { useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { useEffect } from 'react'

function App() {
  const [tasks, setTasks] = useState([])

  // useEffect(() => {
  //   invoke('get_tasks').then((tasks) => {
  //     console.log(tasks)
  //     setTasks(tasks as any[])
  //   })
  // }, [])

   useEffect(() => {
    invoke('get_tree').then((tree) => {
      console.log(tree)
    })
  }, [])

  return (
    <main>
      <h1>Task Scheduler</h1>
      <p>{tasks.length} tasks loaded</p>
    </main>
  )
}

export default App