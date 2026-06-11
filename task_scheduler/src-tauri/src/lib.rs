// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod parser;
use crate::parser::{build_tree, parse_all_items, Task, TaskParent};
use std::sync::Mutex;
use tauri::State;

struct AppState {
    tasks: Mutex<Vec<Task>>,
    parent_select_mode: Mutex<bool>,
    parent: Mutex<std::string::String>,
}

#[tauri::command]
fn change_parent_select_mode(state: State<AppState>, path: String, id: String) {
    //println!("{}", *state.parent_select_mode.lock().unwrap());
    println!("path received: {}", path);
    println!("id received: {}", id);
    if *state.parent_select_mode.lock().unwrap() == false {
        *state.parent_select_mode.lock().unwrap() = true;
        *state.parent.lock().unwrap() = path;
    }
}

#[tauri::command]
fn remove_dependency(path: String, dependency: String) -> Result<(), String> {
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;

    let frontmatter = content
        .trim_start_matches("---\n")
        .split("\n---")
        .next()
        .unwrap_or("");

    let mut doc: serde_yaml::Value =
        serde_yaml::from_str(frontmatter).map_err(|e| e.to_string())?;

    if let Some(depends) = doc.get_mut("depends_on") {
        if let Some(arr) = depends.as_sequence_mut() {
            arr.retain(|v| v.as_str() != Some(&dependency));
        }
    }

    let body = content
        .split("\n---")
        .skip(1)
        .collect::<Vec<_>>()
        .join("\n---");

    let new_content = format!(
        "---\n{}---{}",
        serde_yaml::to_string(&doc).map_err(|e| e.to_string())?,
        body
    );

    std::fs::write(&path, new_content).map_err(|e| e.to_string())
}

#[tauri::command]
fn add_dependency(path: String, dependency: String) -> Result<(), String> {
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;

    let frontmatter = content
        .trim_start_matches("---\n")
        .split("\n---")
        .next()
        .unwrap_or("");

    let mut doc: serde_yaml::Value =
        serde_yaml::from_str(frontmatter).map_err(|e| e.to_string())?;

    if let Some(depends) = doc.get_mut("depends_on") {
        if let Some(arr) = depends.as_sequence_mut() {
            // check if it already exists
            if arr.iter().any(|v| v.as_str() == Some(&dependency)) {
                return Err("Dependency already exists".to_string());
            }
            arr.push(serde_yaml::Value::String(dependency));
        }
    }

    let body = content
        .split("\n---")
        .skip(1)
        .collect::<Vec<_>>()
        .join("\n---");

    let new_content = format!(
        "---\n{}---{}",
        serde_yaml::to_string(&doc).map_err(|e| e.to_string())?,
        body
    );

    std::fs::write(&path, new_content).map_err(|e| e.to_string())
}

// #[tauri::command]
// fn change_parent(state: State<AppState>, path: String, id: String) -> Result<(), String> {
//     if *state.parent_select_mode.lock().unwrap() == true {
//         let parent_path = state.parent.lock().unwrap().clone();
//         add_dependency(parent_path, id)?;
//         *state.parent_select_mode.lock().unwrap() = false;
//     }
//     Ok(())
// }

#[tauri::command]
fn change_parent(state: State<AppState>, path: String, id: String) -> Result<(), String> {
    if *state.parent_select_mode.lock().unwrap() == true {
        let parent_path = state.parent.lock().unwrap().clone();
        println!("parent_path: {}", parent_path);
        println!("child path: {}", path);
        println!("child id: {}", id);
        add_dependency(parent_path, id)?;
        *state.parent_select_mode.lock().unwrap() = false;
    }
    Ok(())
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
    //println!("{}", &path.to_string());
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
fn delete_task(state: State<AppState>, path: String, id: String) -> Result<(), String> {
    let tasks = state.tasks.lock().unwrap().clone();

    for task in &tasks {
        if task.depends_on.contains(&id) {
            remove_dependency(task.path.clone(), id.clone())?;
        }
    }

    std::fs::remove_file(&path).map_err(|e| e.to_string())
}
#[tauri::command]
fn update_field(path: String, field: String, data: String) -> Result<(), String> {
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

    let index = match lines.iter().position(|line| line.contains(&field)) {
        Some(i) => i,
        None => 1,
    };

    lines[index] = format!("{} {}", field, data);
    let header = lines.join("\n");
    match std::fs::write(&path, header) {
        Ok(_) => Ok(()),
        Err(_) => Err("Error".to_string()),
    }
}

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
fn create_and_link_dependency(folder_path: String, parent_path: String) -> Result<(), String> {
    let id = create_task(folder_path);
    add_dependency(parent_path, id)?;
    Ok(())
}

#[tauri::command]
fn create_task(folder_path: String) -> String {
    let id = chrono::Local::now().format("%Y%m%d%H%M%S").to_string();

    let content = format!(
        "---
id: {}
title: New task
tasktype: task
status: open
priority: low
created: {}
due: null
ended: null
depends_on: []
outcome: \"\"
---
## Notes
",
        id, id
    );

    let file_path = format!("{}/{}.md", folder_path, id);
    std::fs::write(&file_path, content).unwrap();

    id
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
        parent_select_mode: false.into(),
        parent: Mutex::new(String::new()),
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
            update_field,
            change_parent_select_mode,
            change_parent,
            remove_dependency,
            add_dependency,
            create_and_link_dependency
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
