import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getExpandedRowModel,
} from "@tanstack/react-table";
import { useState, useRef, useEffect } from "react";
import "./TaskTable.css";
import { invoke } from "@tauri-apps/api/core";
import { Calendar } from "vanilla-calendar-pro";
import "vanilla-calendar-pro/styles/index.css";
import { createPortal } from "react-dom";

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
function DueDateCell({ path, value, onRefresh }: any) {
  const divRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<any>(null);
  const pathRef = useRef(path);
  const onRefreshRef = useRef(onRefresh);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    pathRef.current = path;
    onRefreshRef.current = onRefresh;
  }, [path, onRefresh]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (divRef.current && !divRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setPos({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
    });
    setOpen(true);
  };

  useEffect(() => {
    if (open && divRef.current && !calendarRef.current) {
      calendarRef.current = new Calendar(divRef.current, {
        onClickDate(self) {
          const picked = self.context?.selectedDates[0];
          invoke("update_field", {
            path: pathRef.current,
            data: picked,
            field: "due:",
          })
            .then(() => invoke("refresh_tasks"))
            .then(() => onRefreshRef.current());
        },
      });
      calendarRef.current.init();
    }
  }, [open]);

  return (
    <div>
      <button
        style={{
          background: "#006c10",
          color: "#ffffff",
          border: "none",
          fontSize: "12px",
          ///fontWeight: "700",
          borderRadius: "10px 10px",
          width: "100px",
          height: "20px",
        }}
        onClick={handleOpen}
      >
        {value ?? "Pick Date"}
      </button>
      {createPortal(
        <div
          ref={divRef}
          style={{
            display: open ? "block" : "none",
            position: "absolute",
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
          }}
        />,
        document.body,
      )}
    </div>
  );
}

export const TaskTable = ({
  data,
  onDoubleClick,
  onRefresh,
  onDelete,
}: any) => {
  const columns = [
    {
      header: " ",
      cell: ({ row }) => {
        return (
          <button
            style={{
              background: "#fd32324a",
              color: "#ffffff4a",
              padding: "0px 0px",
              height: "20px",
              width: "20px",
              borderRadius: "50%",
              fontSize: "15px",
              fontWeight: 500,
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={(e) => {
              e.currentTarget.disabled = true;
              e.stopPropagation();
              onDelete(row.original);
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <line
                x1="1"
                y1="1"
                x2="9"
                y2="9"
                stroke="white"
                strokeWidth="1"
              />
              <line
                x1="9"
                y1="1"
                x2="1"
                y2="9"
                stroke="white"
                strokeWidth="1"
              />
            </svg>
          </button>
        );
      },
    },
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
        const path = props.row.original.task.path;
        return (
          <select
            value={status}
            onChange={(e) => {
              invoke("update_field", {
                path: path,
                data: e.target.value,
                field: "status:",
              }).then(() => {
                invoke("refresh_tasks").then(() => {
                  onRefresh();
                });
              });
            }}
            style={{
              background: statusBackground[status] ?? "#2a2a2a",
              color: statusColors[status] ?? "#888",
              padding: "2px 8px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: 500,
            }}
          >
            <option value="open">open</option>
            <option value="blocked">blocked</option>
            <option value="closed">closed</option>
            <option value="WFC">WFC</option>

            {status}
          </select>
        );
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: (props: any) => {
        const path = props.row.original.task.path;
        const priority = props.row.original.task.priority;
        return (
          <select
            value={priority}
            onChange={(e) => {
              invoke("update_field", {
                path: path,
                data: e.target.value,
                field: "priority:",
              }).then(() => {
                invoke("refresh_tasks").then(() => {
                  onRefresh();
                });
              });
            }}
            style={{
              background: priorityBackground[priority] ?? "#2a2a2a",
              color: priorityColors[priority] ?? "#888",
              padding: "2px 8px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: 500,
            }}
          >
            <option value="low">low</option>
            <option value="med">med</option>
            <option value="high">high</option>
            {priority}
          </select>
        );
      },
    },
    {
      accessorKey: "due",
      header: "Due",
      cell: (props: any) => {
        return (
          <DueDateCell
            path={props.row.original.task.path}
            onRefresh={onRefresh}
            value={props.row.original.task.due}
          />
        );
      },
    },
  ];
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
            style={{ paddingLeft: `${Math.min(row.depth, 1) * 20}px` }}
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
