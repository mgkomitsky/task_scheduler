// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod parser;
use crate::parser::{build_tree, parse_all_items, Task, TaskParent};
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
fn get_tree(state: State<AppState>) -> Vec<TaskParent> {
    let tasks = state.tasks.lock().unwrap().clone();
    build_tree(tasks)
}

#[tauri::command]
fn get_task_body(path: String) -> String {
    println!("{}", &path.to_string());
    std::fs::read_to_string(&path).unwrap()

    //let file_content = std::fs::read_to_string(&path).unwrap();
    // let first = file_content.strip_prefix("---\n").unwrap();
    // let end = first.find("\n---").unwrap();
    // let yaml_block = &first[end..];
    // serde_yaml::from_str(yaml_block).unwrap()
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
fn delete_task(path: String) {
    std::fs::remove_file(&path);
}

// #[tauri::command]
// fn update_status(path: String, status: String) -> Result<(), String> {
//     match std::fs::read_to_string(&path) {
//         Ok(content) => match content.strip_prefix("---\n") {
//             Some(first) => match first.find("\n---") {
//                 Some(end) => {
//                     let yaml_block = &first[..end];
//                     let mut lines: Vec<String> = content.lines().map(|l| l.to_string()).collect();
//                     match lines.iter().position(|line| line.contains("status:")) {
//                         Some(index) => {
//                             lines[index] = format!("status: {}", status);
//                             let header = lines.join("\n");
//                             match std::fs::write(&path, header) {
//                                 Ok(_) => Ok(()),
//                                 Err(_) => Err("Error".to_string()),
//                             }
//                         }
//                         None => Err("Error".to_string()),
//                     }
//                 }
//                 None => Err("Error".to_string()),
//             },
//             None => Err("Error".to_string()),
//         },
//         Err(..) => Err("Error".to_string()),
//     }
// }

#[tauri::command]
fn update_status(path: String, status: String) -> Result<(), String> {
    let content = match std::fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => "Error".to_string(),
    };

    let first = match content.strip_prefix("---\n") {
        Some(f) => f,
        None => "Error",
    };

    let end = match first.find("\n---") {
        Some(e) => e,
        None => 1,
    };

    let yaml_block = &first[..end];
    let mut lines: Vec<String> = content.lines().map(|l| l.to_string()).collect();

    let index = match lines.iter().position(|line| line.contains("status:")) {
        Some(i) => i,
        None => 1,
    };

    lines[index] = format!("status: {}", status);
    let header = lines.join("\n");
    match std::fs::write(&path, header) {
        Ok(_) => Ok(()),
        Err(_) => Err("Error".to_string()),
    }
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
            delete_task,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
