use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Deserialize, Clone, Serialize)]
pub struct Task {
    id: String,
    title: String,
    tasktype: String,
    status: String,
    priority: String,
    created: Option<String>,
    due: Option<String>,
    ended: Option<String>,
    depends_on: Vec<String>,
    tags: Vec<String>,
    general_status: String,
    blocker: String,
    risk: String,
    ask: String,
    outcome: String,
}





pub fn parse_item(file_content: &str) -> Task {
    let first = file_content.strip_prefix("---\n").unwrap();
    let end = first.find("\n---").unwrap();
    let yaml_block = &first[..end];
    serde_yaml::from_str(yaml_block).unwrap()
}

pub fn parse_all_items(folder_path: &str) -> Vec<Task> {

    let mut tasks = Vec::new();

    for entry in std::fs::read_dir(folder_path).unwrap() {

        let entry = entry.unwrap();
        let path = entry.path();

         // skip non-.md files
        if path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }

        let file_content = std::fs::read_to_string(&path).unwrap();
        let task = parse_item(&file_content);
        tasks.push(task);
    }

    tasks

}