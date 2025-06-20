#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod fc;

use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn open_folder(folder_path: &str) -> String {
    let files = fc::read_directory(folder_path);
    files
}

#[tauri::command]
fn get_file_content(file_path: &str) -> String {
    let content = fc::read_file(file_path);
    content
}

#[tauri::command]
fn write_file(file_path: &str, content: &str) -> String {
    fc::write_file(file_path, content);
    String::from("OK")
}

fn main() {
    tauri::Builder::default()
        .manage(Arc::new(AtomicBool::new(false)))
        .invoke_handler(tauri::generate_handler![greet, open_folder, get_file_content, write_file, fc::search_in_project, fc::save_extension_file, fc::list_extensions, fc::app_data_dir])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
