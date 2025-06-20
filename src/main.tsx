import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "remixicon/fonts/remixicon.css"
import "./style.css";
import { invoke } from '@tauri-apps/api/tauri';

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (typeof window !== 'undefined') {
  window.VesperApi = {
    ...window.VesperApi,
    readFile: (path: string) => invoke('get_file_content', { filePath: path }),
    writeFile: (path: string, content: string) => invoke('write_file', { filePath: path, content }),
    search: (keyword: string) => {
      const root = window.VesperProjectRoot || '.';
      return invoke('search_in_project', { root, keyword });
    },
    on: (event: string, handler: EventListenerOrEventListenerObject) => window.addEventListener(event, handler),
    off: (event: string, handler: EventListenerOrEventListenerObject) => window.removeEventListener(event, handler),
  };
}

