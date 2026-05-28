// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod parser;
use crate::parser::parse_all_items;


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


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, test])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
