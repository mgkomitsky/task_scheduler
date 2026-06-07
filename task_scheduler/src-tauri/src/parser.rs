use serde::{Deserialize, Serialize};
use std::sync::Mutex;

use std::collections::HashMap;
use std::collections::HashSet;

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
    outcome: String,
    #[serde(skip_deserializing, default)]
    path: String,
}

#[derive(Debug, Deserialize, Clone, Serialize)]
pub struct TaskParent {
    pub task: Task,
    pub sub_rows: Vec<TaskParent>,
}

fn status_parse() {
    //This function needs to take the current tree, and set the status to "blocked" if there are any open dependencies
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
    tasks
}
