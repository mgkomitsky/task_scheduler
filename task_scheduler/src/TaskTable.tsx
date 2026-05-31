import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getExpandedRowModel,
} from "@tanstack/react-table";
import { useState } from "react";
import "./TaskTable.css";

const statusColors: Record<string, string> = {
  open: "#ffd700",
  blocked: "#ff6b6b",
  closed: "#4dff91",
};

const statusBackground: Record<string, string> = {
  open: "#3d3a1a",
  blocked: "#3d1a1a",
  closed: "#1a3d2a",
};

const priorityColors: Record<string, string> = {
  low: "#ffd700",
  medium: "#ff6b6b",
  high: "#4dff91",
};

const priorityBackground: Record<string, string> = {
  low: "#3d3a1a",
  medium: "#3d1a1a",
  high: "#1a3d2a",
};

const columns = [
  {
    accessorKey: "title",
    header: "Title",
    cell: (props: any) => <p>{props.row.original.task.title}</p>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: (props: any) => {
      const status = props.row.original.task.status;
      return (
        <span
          style={{
            background: statusBackground[status] ?? "#2a2a2a",
            color: statusColors[status] ?? "#888",
            padding: "2px 8px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: 500,
          }}
        >
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: (props: any) => {
      const priority = props.row.original.task.priority;
      return (
        <span
          style={{
            background: priorityBackground[priority] ?? "#2a2a2a",
            color: priorityColors[priority] ?? "#888",
            padding: "2px 8px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: 500,
          }}
        >
          {priority}
        </span>
      );
    },
  },
];

export const TaskTable = ({ data, onDoubleClick }: any) => {
  const [expanded, setExpanded] = useState(true);
  const table = useReactTable({
    data,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getSubRows: (row) => row.sub_rows, // ← must match your field name
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  console.log(table.getHeaderGroups());
  return (
    <div>
      <div className="table">
        {table.getHeaderGroups().map((headerGroup) => (
          <div className="tr" key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <div className="th" key={header.id}>
                {header.column.columnDef.header}
              </div>
            ))}
          </div>
        ))}

        {table.getRowModel().rows.map((row) => (
          <div
            className="tr"
            key={row.id}
            style={{ paddingLeft: `${row.depth * 20}px` }}
            onDoubleClick={() => onDoubleClick(row.original)}
          >
            {row.getVisibleCells().map((cell) => (
              <div className="td" key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskTable;
