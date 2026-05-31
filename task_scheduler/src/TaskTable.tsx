import styles from './TaskTable.module.css'

import {
    useReactTable,
    getCoreRowModel,
    getExpandedRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table'
import { useState } from 'react'
import { TaskNode } from './types'

const columnHelper = createColumnHelper<TaskNode>()

const columns = [
    columnHelper.accessor(row => row.task.id, {
        id: 'id',
        header: 'ID',
    }),
    columnHelper.accessor(row => row.task.title, {
        id: 'title',
        header: 'Title',
    }),
    columnHelper.accessor(row => row.task.status, {
        id: 'status',
        header: 'Status',
    }),
    columnHelper.accessor(row => row.task.priority, {
        id: 'priority',
        header: 'Priority',
    }),
    columnHelper.accessor(row => row.task.due, {
        id: 'due',
        header: 'Due',
    }),
]

interface Props {
    data: TaskNode[]
    onDoubleClick: (task: TaskNode) => void
}

// The expand/collapse button
function ExpandButton({ row }: { row: any }) {
  return (
    <span style={{ width: '20px', display: 'inline-block' }}>
      {row.getCanExpand() && (
        <button
          className={styles.expandBtn}
          onClick={e => {
            e.stopPropagation()
            row.toggleExpanded()
          }}
        >
          {row.getIsExpanded() ? '▾' : '▸'}
        </button>
      )}
    </span>
  )
}

// A single table row
function TaskRow({ row, onDoubleClick }: { row: any, onDoubleClick: (task: TaskNode) => void }) {
  return (
    <tr className={styles.row} onDoubleClick={() => onDoubleClick(row.original)}>
      {row.getVisibleCells().map((cell: any, i: number) => (
        <td
          key={cell.id}
          className={styles.cell}
          style={i === 0 ? { paddingLeft: `${row.depth * 20 + 12}px` } : {}}
        >
          {i === 0 && <ExpandButton row={row} />}
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  )
}

// The table headers
function TableHeaders({ table }: { table: any }) {
  return (
    <thead>
      <tr>
        {table.getFlatHeaders().map((header: any) => (
          <th key={header.id} className={styles.header}>
            {flexRender(header.column.columnDef.header, header.getContext())}
          </th>
        ))}
      </tr>
    </thead>
  )
}

export function TaskTable({ data, onDoubleClick }: Props) {
    const [expanded, setExpanded] = useState({})

    const table = useReactTable({
        data,
        columns,
        state: { expanded },
        onExpandedChange: setExpanded,
        getSubRows: row => row.sub_rows,
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
    })



return (
  <table className={styles.table}>
    <TableHeaders table={table} />
    <tbody>
      {table.getRowModel().rows.map(row => (
        <TaskRow key={row.id} row={row} onDoubleClick={onDoubleClick} />
      ))}
    </tbody>
  </table>
)



}