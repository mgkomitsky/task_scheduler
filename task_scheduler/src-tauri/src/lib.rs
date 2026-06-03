// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod parser;
use crate::parser::{build_tree, parse_all_items, Task, TaskNode};
use std::sync::Mutex;
use tauri::State;

struct AppState {
    tasks: Mutex<Vec<Task>>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn test() {
    //let file_content = std::fs::read_to_string("/Users/mkomitsky/All My Stuff/Project_Scheduler/_task.md").unwrap();
    let tasks = parse_all_items("/Users/mkomitsky/All My Stuff/Project_Scheduler/");
    println!("{:#?}", tasks);
}

#[tauri::command]
fn get_tasks(state: State<AppState>) -> Vec<Task> {
    state.tasks.lock().unwrap().clone()
}

#[tauri::command]
fn get_tree(state: State<AppState>) -> Vec<TaskNode> {
    let tasks = state.tasks.lock().unwrap().clone();
    build_tree(tasks)
}

#[tauri::command]
fn get_task_body(path: String) -> String {
    std::fs::read_to_string(&path).unwrap()
}

#[tauri::command]
fn refresh_tasks(state: State<AppState>) {
    let tasks = parse_all_items("/Users/mkomitsky/All My Stuff/Project_Scheduler/");
    *state.tasks.lock().unwrap() = tasks;
}

#[tauri::command]
fn save_task_body(path: String, content: String) {
    std::fs::write(&path, content).unwrap();
}

#[tauri::command]
fn update_status(path: String, status: String) {
    let content = std::fs::read_to_string(&path).unwrap();
    let first = content.strip_prefix("---\n").unwrap();
    let end = first.find("\n---").unwrap();
    let yaml_block = &first[..end];

    // for line in content.lines() {
    //     println!("{}", line);
    // }

    let mut lines: Vec<String> = content.lines().map(|l| l.to_string()).collect();
    let index = lines
        .iter()
        .position(|line| line.contains("status:"))
        .unwrap();
    lines[index] = format!("status: {}", status);

    // println!("{:?}", index);
    // println!("{}", lines[4]);

    let header = lines.join("\n");
    std::fs::write(&path, header).unwrap();
}

#[tauri::command]
fn create_task(folder_path: String) {
    let id = chrono::Local::now().format("%Y%m%d%H%M%S").to_string();

    let content = format!(
        "---
id: {}
title: New task
tasktype: task
status: open
priority: low
created: null
due: null
ended: null
depends_on: []
outcome: \"\"
---
## Notes
",
        id
    );

    let file_path = format!("{}/{}.md", folder_path, id);
    std::fs::write(&file_path, content).unwrap();
}

// #[tauri::command]
// fn refresh_tasks() {
//     let tasks = parse_all_items("/Users/mkomitsky/All My Stuff/Project_Scheduler/");
//     *state.tasks.lock().unwrap() = tasks;
// }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let tasks = parse_all_items("/Users/mkomitsky/All My Stuff/Project_Scheduler/");

    let app_state = AppState {
        tasks: Mutex::new(tasks),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            greet,
            test,
            get_tasks,
            get_tree,
            get_task_body,
            update_status,
            refresh_tasks,
            save_task_body,
            create_task,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
