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
  low: "#b7b7b7",
  med: "#ffd700",
  high: "#ff6b6b",
};

const priorityBackground: Record<string, string> = {
  low: "#2f2f2f",
  med: "#2a2a2a",
  high: "#3d1a1a",
};
function getDaysOpen(
  created: string | null,
  status: string,
  ended: string | null,
): string {
  if (!created) return "—";

  const parseTimestamp = (ts: string) => {
    const year = ts.slice(0, 4);
    const month = ts.slice(4, 6);
    const day = ts.slice(6, 8);
    const hour = ts.slice(8, 10);
    const min = ts.slice(10, 12);
    const sec = ts.slice(12, 14);
    return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`);
  };

  const createdDate = parseTimestamp(created);
  const endDate =
    status === "closed" && ended && ended !== "null"
      ? parseTimestamp(ended)
      : new Date();

  const diffDays = Math.floor(
    (endDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "1 day";
  if (diffDays === 1) return "1 day";
  return `${diffDays} days`;
}

function getDueDateColor(value: string | null): string {
  if (!value) return "#00844b"; // default green

  const due = new Date(value);
  const now = new Date();
  const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays < -1) return "#800000"; // overdue — red
  if (diffDays <= 1) return "#8c7700"; // due soon — yellow
  return "#00844b"; // plenty of time — green
}

function DueDateCell({ path, value, onRefresh }: any) {
  const divRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<any>(null);
  const pathRef = useRef(path);
  const onRefreshRef = useRef(onRefresh);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest?.('[class*="vc"]')) {
        return; // click inside calendar — ignore
      }
      if (divRef.current && !divRef.current.contains(target)) {
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
        selectedDates: value ? [value] : [],
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
    if (!open) {
      calendarRef.current = null;
    }
  }, [open]);
  return (
    <div>
      <button
        style={{
          background: getDueDateColor(value),
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
      {open &&
        createPortal(
          <>
            <div
              onClick={() => setOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 9998 }}
            />
            <div
              ref={divRef}
              onClick={(e) => e.stopPropagation()} // ← stops bubbling to the row
              style={{
                position: "absolute",
                top: pos.top,
                left: pos.left,
                zIndex: 9999,
              }}
            />
          </>,
          document.body,
        )}
    </div>
  );
}

function TitleCell({ title: initialTitle, path, onRefresh }: any) {
  const [title, setTitle] = useState(initialTitle);

  return (
    <input
      style={{
        background: "#2a2a2a",
        color: "#ffffff",
        padding: "2px 8px",
        borderRadius: "20px",
        fontSize: "11px",
        fontWeight: 500,
        border: "none",
      }}
      type="text"
      value={title}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={() =>
        invoke("update_field", { path, data: title, field: "title:" })
          .then(() => invoke("refresh_tasks"))
          .then(() => onRefresh())
      }
    />
  );
}

export const TaskTable = ({
  data,
  onSingleClick,
  onRefresh,
  onDelete,
  onClick,
  parentSelectMode,
  onParentSelectMode,
}: any) => {
  const columns = [
    // {
    //   header: " ",
    //   cell: ({ row }) => {
    //     return (
    //       <div style={{ display: "flex", flexDirection: "row" }}>
    //         <button
    //           style={{
    //             background: "#fd32324a",
    //             color: "#ffffff4a",
    //             padding: "0px 0px",
    //             height: "20px",
    //             width: "20px",
    //             borderRadius: "50%",
    //             fontSize: "15px",
    //             fontWeight: 500,
    //             border: "none",
    //             display: "flex",
    //             alignItems: "center",
    //             justifyContent: "center",
    //           }}
    //           onClick={(e) => {
    //             e.currentTarget.disabled = true;
    //             e.stopPropagation();
    //             onDelete(row.original);
    //           }}
    //         >
    //           <svg width="10" height="10" viewBox="0 0 10 10">
    //             <line
    //               x1="1"
    //               y1="1"
    //               x2="9"
    //               y2="9"
    //               stroke="white"
    //               strokeWidth="1"
    //             />
    //             <line
    //               x1="9"
    //               y1="1"
    //               x2="1"
    //               y2="9"
    //               stroke="white"
    //               strokeWidth="1"
    //             />
    //           </svg>
    //         </button>
    //         <button
    //           style={{
    //             background: parentSelectMode ? "#ffffff30" : "#fdef324a",
    //             border: parentSelectMode ? "1px solid #ffffff60" : "none",
    //             color: "#ffffff4a",
    //             padding: "0px 0px",
    //             height: "20px",
    //             width: "20px",
    //             borderRadius: "50%",
    //             fontSize: "15px",
    //             fontWeight: 500,
    //             display: "flex",
    //             alignItems: "center",
    //             justifyContent: "center",
    //           }}
    //           onClick={(e) => {
    //             console.log(parentSelectMode);
    //             onParentSelectMode(
    //               row.original.task.path,
    //               row.original.task.path,
    //             );
    //             e.stopPropagation();
    //             invoke("change_parent_select_mode", {
    //               path: row.original.task.path,
    //               id: row.original.task.path,
    //             });
    //           }}
    //         ></button>
    //       </div>
    //     );
    //   },
    // },
    {
      accessorKey: "title",
      header: "Title",
      //cell: (props: any) => <p>{props.row.original.task.title}</p>,
      cell: (props: any) => (
        <TitleCell
          title={props.row.original.task.title}
          path={props.row.original.task.path}
          onRefresh={onRefresh}
        />
      ),
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
    {
      accessorKey: "created",
      header: "Open For",
      cell: (props: any) => {
        const { created, status, ended } = props.row.original.task;
        return (
          <span
            style={{
              color: "#d4d4d4",
              fontSize: "11px",
              padding: "2px 8px",
            }}
          >
            {getDaysOpen(created, status, ended)}
          </span>
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
            style={{
              paddingLeft: `${Math.min(row.depth, 4) * 10}px`,
              marginTop: row.depth === 0 ? "15px" : "0px",
              border: row.depth === 0 ? "3px solid #ffffff44" : "none",

              borderRadius: row.depth === 0 ? "20px" : "20px",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSingleClick(row.original);
            }}
            onContextMenu={(e) => onClick(e, row.original)}
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
