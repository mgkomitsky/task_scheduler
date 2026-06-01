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
    tags: Vec<String>,
    general_status: String,
    blocker: String,
    risk: String,
    ask: String,
    outcome: String,
    #[serde(skip_deserializing, default)]
    path: String,
}

#[derive(Debug, Deserialize, Clone, Serialize)]
pub struct TaskNode {
    pub task: Task,
    pub sub_rows: Vec<TaskNode>,
}

fn build_node(id: &str, map: &HashMap<String, TaskNode>) -> TaskNode {
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
    TaskNode {
        task: node.task,
        sub_rows,
    }
}
pub fn build_tree(tasks: Vec<Task>) -> Vec<TaskNode> {
    let map: HashMap<String, TaskNode> = tasks
        .into_iter()
        .map(|t| {
            (
                t.id.clone(),
                TaskNode {
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

    let mut roots: Vec<TaskNode> = map
        .keys()
        .filter(|id| !nested_ids.contains(*id))
        .map(|id| build_node(id, &map))
        .collect();

    roots.sort_by(|a, b| a.task.id.cmp(&b.task.id));
    roots
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
        let mut task = parse_item(&file_content);
        task.path = path.to_str().unwrap().to_string();
        tasks.push(task);
    }

    tasks
}
