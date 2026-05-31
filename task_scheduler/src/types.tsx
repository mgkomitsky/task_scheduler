export interface Task {
  id: string
  title: string
  tasktype: string
  status: string
  priority: string
  created: string | null
  due: string | null
  ended: string | null
  depends_on: string[]
  tags: string[]
  general_status: string | null
  blocker: string | null
  risk: string | null
  ask: string | null
  outcome: string | null
}

export interface TaskNode {
  task: Task
  sub_rows: TaskNode[]
}