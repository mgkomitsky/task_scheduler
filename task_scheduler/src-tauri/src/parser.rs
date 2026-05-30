use serde::{Deserialize, Serialize};
use std::sync::Mutex;

use std::collections::HashMap;

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

#[derive(Debug, Deserialize, Clone, Serialize)]
pub struct TaskNode {
    pub task: Task,
    pub sub_rows: Vec<TaskNode>,
}

pub fn build_tree(tasks: Vec<Task>) -> Vec<TaskNode> {

    let mut map: HashMap<String, TaskNode> = tasks
    .into_iter().map(|t| (t.id.clone(), TaskNode {task: t, sub_rows: vec![]}))
    .collect();


    let ids: Vec<String> = map.keys().map(|s| s.clone()).collect();

    for id in &ids {
        let depends_on = match map.get(id){
            Some(node) => node.task.depends_on.clone(),
            None => continue,
        };

        for blocker_id in depends_on {
            if blocker_id == *id {
                continue;
            }

            if let Some(blocker) = map.remove(&blocker_id) {
                if let Some(node) = map.get_mut(id) {
                node.sub_rows.push(blocker);
            }
            }
            
        }
    }
    map.into_values().collect()
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





