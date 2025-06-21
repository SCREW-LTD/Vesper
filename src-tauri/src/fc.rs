use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::io::{BufRead, BufReader, Write};
use walkdir::WalkDir;
use rayon::prelude::*;
use tauri::async_runtime::spawn_blocking;
use std::sync::{Arc, atomic::AtomicBool};

#[derive(Serialize, Deserialize, Debug)]
pub struct FileInfo {
    name: String,
    kind: String,
    path: String,
}

#[derive(Serialize, Deserialize)]
pub struct Post {
    title: String,
    created: String,
    link: String,
    description: String,
    content: String,
    author: String,
}

#[derive(Serialize)]
pub struct SearchMatch {
    pub file: String,
    pub line_number: usize,
    pub line: String,
    pub match_indices: Vec<(usize, usize)>,
}

fn is_binary_ext(path: &Path) -> bool {
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        let ext = ext.to_ascii_lowercase();
        return matches!(
            ext.as_str(),
            "exe" | "dll" | "bin" | "obj" | "so" | "png" | "jpg" | "jpeg" | "gif" | "bmp" | "ico" | "icns" | "svg" | "pdf" | "zip" | "tar" | "gz" | "7z" | "rar" | "mp3" | "mp4" | "avi" | "mov" | "mkv" | "wav" | "ogg" | "webm" | "ttf" | "otf" | "woff" | "woff2" | "eot" | "class" | "jar" | "pyc" | "pyo" | "apk" | "dmg" | "iso" | "img" | "msi" | "cab" | "sys" | "dat" | "db" | "sqlite" | "log" | "tmp" | "bak" | "swp" | "lock"
        );
    }
    false
}

fn walk_directory(dir_path: &Path, base_path: &str, files: &mut Vec<FileInfo>) {
    if let Ok(entries) = fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            let meta = entry.metadata();
            if let Ok(meta_unwrap) = meta {
                let mut kind = String::from("file");
                if meta_unwrap.is_dir() {
                    kind = String::from("directory");
                }
                let filename = entry.file_name().into_string().unwrap_or_else(|_| String::from("ERROR"));
                let file_path = format!("{}/{}", base_path.trim_end_matches('/'), filename);
                let entry_path = entry.path();
                if kind == "file" && is_binary_ext(&entry_path) {
                    continue;
                }
                let new_file_info = FileInfo {
                    name: filename.clone(),
                    kind: kind.clone(),
                    path: file_path.clone(),
                };
                files.push(new_file_info);
            }
        }
    }
}

pub fn read_directory(dir_path: &str) -> String {
    let new_path = Path::new(dir_path);
    let mut files: Vec<FileInfo> = Vec::new();
    walk_directory(new_path, dir_path, &mut files);
    let files_str = match serde_json::to_string(&files) {
        Ok(str) => str,
        Err(error) => panic!("Problem opening the file: {:?}", error),
    };
    files_str
}

pub fn read_file(path: &str) -> String {
    match fs::read_to_string(path) {
        Ok(mut contents) => {
            if contents.starts_with('\u{feff}') {
                contents = contents.trim_start_matches('\u{feff}').to_string();
            }
            contents
        },
        Err(_) => String::from("[Error: Could not read file as UTF-8]")
    }
}

pub fn write_file(path: &str, content: &str) -> String {
    let file_path = Path::new(path);
    let result = match fs::write(file_path, content) {
        Ok(()) => String::from("OK"),
        Err(_err) => String::from("ERROR")
    };

    result
}

pub fn create_directory(path: &str) -> Result<(), ()> {
    let dir_path = Path::new(path);
    fs::create_dir(dir_path);
    Ok(())
}

pub fn remove_file(path: &str) -> Result<(), ()> {
    let file_path = Path::new(path);
    fs::remove_file(file_path);
    Ok(())
}

pub fn remove_folder(path: &str) -> Result<(), ()> {
    let folder_path = Path::new(path);
    fs::remove_dir_all(folder_path);
    Ok(())
}

#[tauri::command]
pub async fn search_in_project(
    root: String,
    keyword: String,
    window: tauri::Window,
    cancel_flag: tauri::State<'_, Arc<AtomicBool>>,
) -> Result<Vec<SearchMatch>, String> {
    let root_clone = root.clone();
    let keyword_clone = keyword.clone();
    let cancel = cancel_flag.inner().clone();
    let result = spawn_blocking(move || {
        let lower_keyword = keyword_clone.to_lowercase();
        let walker = WalkDir::new(&root_clone).into_iter().filter_map(|e| e.ok()).collect::<Vec<_>>();
        let results: Vec<SearchMatch> = walker.par_iter().filter_map(|entry| {
            if cancel.load(std::sync::atomic::Ordering::Relaxed) {
                return None;
            }
            let path = entry.path();
            if path.is_file() {
                if is_binary_ext(path) {
                    return None;
                }
                let file = fs::File::open(path);
                if let Ok(file) = file {
                    let reader = BufReader::new(file);
                    let mut matches = Vec::new();
                    for (idx, line) in reader.lines().enumerate() {
                        match line {
                            Ok(mut line) => {
                                if idx == 0 {
                                    line = line.trim_start_matches('\u{feff}').to_string();
                                }
                                let mut match_indices = Vec::new();
                                let mut search_start = 0;
                                let lower_line = line.to_lowercase();
                                while let Some(pos) = lower_line[search_start..].find(&lower_keyword) {
                                    let start = search_start + pos;
                                    let end = start + keyword_clone.len();
                                    match_indices.push((start, end));
                                    search_start = end;
                                }
                                if !match_indices.is_empty() {
                                    matches.push(SearchMatch {
                                        file: path.to_string_lossy().to_string(),
                                        line_number: idx + 1,
                                        line: line.clone(),
                                        match_indices,
                                    });
                                }
                            },
                            Err(_) => {
                                continue;
                            }
                        }
                    }
                    if !matches.is_empty() {
                        return Some(matches);
                    }
                }
            }
            None
        }).flatten().collect();
        results
    }).await.map_err(|e| format!("Search thread error: {:?}", e))?;
    Ok(result)
}

#[tauri::command]
pub fn save_extension_file(root: String, name: String, content: String) -> Result<(), String> {
    let ext_dir = Path::new(&root).join("VesperExtensions");
    if !ext_dir.exists() {
        if let Err(e) = fs::create_dir_all(&ext_dir) {
            return Err(format!("Failed to create extensions dir: {}", e));
        }
    }
    let file_path = ext_dir.join(&name);
    let mut file = match fs::File::create(&file_path) {
        Ok(f) => f,
        Err(e) => return Err(format!("Failed to create extension file: {}", e)),
    };
    if let Err(e) = file.write_all(content.as_bytes()) {
        return Err(format!("Failed to write extension file: {}", e));
    }
    Ok(())
}

#[tauri::command]
pub fn list_extensions(root: String) -> Result<Vec<String>, String> {
    let ext_dir = Path::new(&root).join("VesperExtensions");
    let mut files = Vec::new();
    if ext_dir.exists() {
        if let Ok(entries) = fs::read_dir(&ext_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    if let Some(ext) = path.extension() {
                        if ext == "js" {
                            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                                files.push(name.to_string());
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(files)
}

#[tauri::command]
pub fn app_data_dir() -> Result<String, String> {
    match tauri::api::path::data_dir() {
        Some(path) => Ok(path.join("VesperExtensions").to_string_lossy().to_string()),
        None => Err("Could not determine app data dir".to_string()),
    }
}
