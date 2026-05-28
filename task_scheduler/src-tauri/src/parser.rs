use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct Task {
    id: String,
    title: String,
}

pub fn parse_item(file_content: &str) -> Task {
    let first = file_content.strip_prefix("---\n").unwrap();
    let end = first.find("\n---").unwrap();
    let yaml_block = &first[..end];
    serde_yaml::from_str(yaml_block).unwrap()
}