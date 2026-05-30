// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod parser;
use crate::parser::{Task, TaskNode, parse_all_items, build_tree};
use std::sync::Mutex;
use::tauri::State;


struct AppState {
    tasks: Mutex<Vec<Task>>,
}


#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
} 


#[tauri::command]
fn test(){
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
        .invoke_handler(tauri::generate_handler![greet, test, get_tasks, get_tree])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
