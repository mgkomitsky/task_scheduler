use serde::{Deserialize, Serialize};
use std::sync::Mutex;

use std::collections::HashMap;
use std::collections::HashSet;

use crate::update_field;

#[derive(Debug, Deserialize, Clone, Serialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub tasktype: String,
    pub status: String,
    pub priority: String,
    pub created: Option<String>,
    pub due: Option<String>,
    pub ended: Option<String>,
    pub depends_on: Vec<String>,
    pub outcome: String,
    #[serde(skip_deserializing, default)]
    pub path: String,
}

#[derive(Debug, Deserialize, Clone, Serialize)]
pub struct TaskParent {
    pub task: Task,
    pub sub_rows: Vec<TaskParent>,
}
fn status_parse(tasks: &mut Vec<Task>) {
    let closed_ids: HashSet<String> = tasks
        .iter()
        .filter(|t| t.status == "closed")
        .map(|t| t.id.clone())
        .collect();

    for task in tasks.iter_mut() {
        if task.depends_on.is_empty() {
            // no dependencies — set to open if it was blocked
            if task.status == "blocked" {
                task.status = "open".to_string();
                update_field(task.path.clone(), "status:".to_string(), "open".to_string()).unwrap();
            }
            continue;
        }

        let is_blocked = task
            .depends_on
            .iter()
            .any(|dep_id| !closed_ids.contains(dep_id));

        if is_blocked && task.status != "blocked" {
            task.status = "blocked".to_string();
            update_field(
                task.path.clone(),
                "status:".to_string(),
                "blocked".to_string(),
            )
            .unwrap();
        } else if !is_blocked && task.status == "blocked" {
            task.status = "open".to_string();
            update_field(task.path.clone(), "status:".to_string(), "open".to_string()).unwrap();
        }
    }
}
fn build_node(id: &str, map: &HashMap<String, TaskParent>) -> TaskParent {
    let node = map.get(id).unwrap().clone();
    let sub_rows = node
        .task
        .depends_on
        .iter()
        .filter(|dep_id| *dep_id != id)
        .filter_map(|dep_id| {
            if map.contains_key(dep_id.as_str()) {
                Some(build_node(dep_id, map))
            } else {
                None
            }
        })
        .collect();
    TaskParent {
        task: node.task,
        sub_rows,
    }
}

pub fn build_tree(tasks: Vec<Task>) -> Vec<TaskParent> {
    let map: HashMap<String, TaskParent> = tasks
        .into_iter()
        .map(|t| {
            (
                t.id.clone(),
                TaskParent {
                    task: t,
                    sub_rows: vec![],
                },
            )
        })
        .collect();

    let nested_ids: HashSet<String> = map
        .values()
        .flat_map(|node| node.task.depends_on.iter().cloned())
        .collect();

    let mut roots: Vec<TaskParent> = map
        .keys()
        .filter(|id| !nested_ids.contains(*id))
        .map(|id| build_node(id, &map))
        .collect();

    roots.sort_by(|a, b| a.task.id.cmp(&b.task.id));
    roots
}

pub fn parse_single_md_file(file_content: &str) -> Result<Task, String> {
    let first = match file_content.strip_prefix("---\n") {
        Some(f) => f,
        None => return Err("File does not start with ---".to_string()),
    };
    let end = match first.find("\n---") {
        Some(f) => f,
        None => return Err("File does not end with ---".to_string()),
    };
    let yaml_block = &first[..end];
    match serde_yaml::from_str(yaml_block) {
        Ok(task) => Ok(task),
        Err(e) => Err(e.to_string()),
    }
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
        match parse_single_md_file(&file_content) {
            Ok(mut task) => {
                task.path = match path.to_str() {
                    Some(p) => p.to_string(),
                    None => {
                        println!("Skipping {:?}: invalid path", path);
                        continue;
                    }
                };
                tasks.push(task);
            }
            Err(e) => {
                println!("Skipping {:?}: {}", path, e);
            }
        }
    }
    status_parse(&mut tasks);
    tasks
}
