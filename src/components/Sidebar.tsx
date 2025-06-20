import React, { useState, useRef, useEffect, ComponentType } from "react";
if (typeof window !== "undefined") {
  window.React = React;
}
import { IFile, ExtensionSidebarItem } from "../types";
import { open } from "@tauri-apps/api/dialog";
import NavFiles from "./NavFiles";
import { readDirectory, readFile, writeFile } from "../helpers/filesys";
import { saveFileObject, getFileObject } from "../stores/file";
import { motion } from "framer-motion";
import { useSource } from "../context/SourceContext";
import * as fileStore from "../stores/file";
import { invoke } from "@tauri-apps/api/tauri";

const sidebarTabs = [
  { key: "explorer", label: "Explorer", icon: "ri-file-list-2-line" },
  { key: "search", label: "Search", icon: "ri-search-line" },
  { key: "scm", label: "Source Control", icon: "ri-git-branch-line" },
  { key: "run", label: "Run & Debug", icon: "ri-bug-line" },
  { key: "ext", label: "Extensions", icon: "ri-store-2-line" },
];

interface SidebarProps {
  width: number;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  activeTab: string | null;
  setActiveTab: (tab: string | null) => void;
}

export default function Sidebar({ width, collapsed, setCollapsed, activeTab, setActiveTab }: SidebarProps) {
  const { projectName, setProjectName, recentProjects, setRecentProjects } = useSource();
  const [files, setFiles] = useState<IFile[]>([]);
  const lastActiveTab = useRef<string | null>(activeTab);

  const [searchValue, setSearchValue] = useState<string>("");
  const [results, setResults] = useState<{ file: IFile, line: number, text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const allFiles: IFile[] = Object.values((fileStore as any).entries || {});

  const handleSearch = async (value: string) => {
    setLoading(true);
    setResults([]);

    if (!value || !projectName) {
      setLoading(false);
      return;
    }
    try {
      const matches = await invoke("search_in_project", {
        root: projectName,
        keyword: value,
      }) as {
        file: string;
        line_number: number;
        line: string;
        match_indices: [number, number][];
      }[];

      const mapped = matches.map(m => {
        const fileObj = { name: m.file.split(/[\\/]/).pop() || m.file, path: m.file, kind: 'file' as 'file', id: m.file };
        saveFileObject(fileObj);
        return {
          file: fileObj,
          line: m.line_number,
          text: m.line,
          match_indices: m.match_indices,
        };
      });
      setResults(mapped);
    } catch (e) {
      console.error("Search error:", e);
      setResults([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!searchValue) {
      setResults([]);
      setLoading(false);
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      handleSearch(searchValue);
    }, 500);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchValue]);

  if (activeTab && !collapsed) {
    lastActiveTab.current = activeTab;
  }

  useEffect(() => {
    const handler = (e: any) => {
      if (e && e.detail && e.detail.path) {
        setProjectName(e.detail.path);
        setRecentProjects([
          e.detail.path,
          ...recentProjects.filter(p => p !== e.detail.path)
        ].slice(0, 10));
        readDirectory(e.detail.path + '/').then(files => {
          setFiles(files)
          files.forEach(file => saveFileObject(file));
        })
      } else {
        loadFile();
      }
    };
    window.addEventListener('open-folder', handler);
    return () => window.removeEventListener('open-folder', handler);
  }, [recentProjects, setRecentProjects, setProjectName]);

  const loadFile = async () => {
    const selected = await open({
      directory: true
    })
    if (!selected) {
      setProjectName("");
      setFiles([]);
      return;
    }
    setProjectName(selected as string)
    setRecentProjects([
      selected as string,
      ...recentProjects.filter(p => p !== selected)
    ].slice(0, 10));
    readDirectory(selected + '/').then(files => {
      setFiles(files)
      files.forEach(file => saveFileObject(file));
    })
  }

  const handleTabClick = (tabKey: string) => {
    if (activeTab === tabKey) {
      setCollapsed(!collapsed);
      setActiveTab(null);
    } else {
      setActiveTab(tabKey);
      setCollapsed(false);
    }
  }

  function highlightMatches(line: string, indices: [number, number][], keyword: string) {
    if (!indices || indices.length === 0) return line;
    let last = 0;
    const parts = [];
    for (const [start, end] of indices) {
      parts.push(<span key={last}>{line.slice(last, start)}</span>);
      parts.push(<span key={start} className="bg-accent-hover text-text-inverted rounded">{line.slice(start, end)}</span>);
      last = end;
    }
    parts.push(<span key={last + 1000}>{line.slice(last)}</span>);
    return parts;
  }

  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});

  const [extensionTabs, setExtensionTabs] = useState<ExtensionSidebarItem[]>([]);

  const extensionContext = {
    registerSidebarItem: (item: ExtensionSidebarItem) => {
      setExtensionTabs(prev => prev.some(tab => tab.key === item.key) ? prev : [...prev, item]);
    },
  };

  const allTabs = [
    ...sidebarTabs,
    ...extensionTabs.map(tab => ({ key: tab.key, label: tab.label, icon: tab.icon }))
  ];

  const [loadedExtensions, setLoadedExtensions] = useState<any[]>([]);
  const [appDataDir, setAppDataDir] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const dir = await invoke('app_data_dir') as string;
      setAppDataDir(dir);
    })();
  }, []);

  useEffect(() => {
    if (!appDataDir) return;
    (async () => {
      try {
        const baseDir = appDataDir.replace(/\\VesperExtensions$/, '').replace(/\\/g, '/');
        const files = await invoke('list_extensions', { root: baseDir }) as string[];
        const metas: any[] = [];
        for (const file of files) {
          const content = await invoke('get_file_content', { filePath: `${baseDir}/VesperExtensions/${file}` }) as string;
          try {
            const exports: any = {};
            let activate = undefined;

            eval(content + '\nif (typeof exports.activate === "function") { exports.__vesperActivate = exports.activate; } else if (typeof activate === "function") { exports.__vesperActivate = activate; }');

            if (typeof exports.__vesperActivate === 'function') {
              const context = {
                registerSidebarItem: (item: Omit<ExtensionSidebarItem, 'label'>) => {
                  if (!exports.meta || !exports.meta.name) {
                    console.error(`[Vesper] Extension ${file} must export meta with a name to register a sidebar item.`);
                    return;
                  }
                  const newItem = {
                    ...item,
                    label: exports.meta.name,
                  };
                  setExtensionTabs(prev => prev.some(tab => tab.key === item.key) ? prev : [...prev, newItem]);
                },
              };

              exports.__vesperActivate(context);

              if (exports.meta) {
                metas.push({ ...exports.meta, file });
              } else {
                metas.push({ name: file, file });
              }
            } else {
              console.warn(`[Vesper] Extension ${file} does not export activate()`);
            }
          } catch (e) {
            console.error(`[Vesper] Error eval extension ${file}:`, e);
          }
        }
        setLoadedExtensions(metas);
      } catch (e) {
        console.error('[Vesper] Error loading extensions:', e);
      }
    })();
  }, [appDataDir]);

  const renderTabContent = (tabKey: string | null, mini = false) => {
    if (!tabKey) return null;
    if (tabKey === "explorer") {
      return (
        <div className={mini ? "p-2 text-xs bg-secondary rounded shadow-lg absolute left-12 top-4 z-50 w-64 border border-border-primary" : "p-4 text-text-primary text-xs flex flex-col gap-1"}>
          <div className="font-semibold text-base mb-2 tracking-wide flex items-center gap-2">
            <i className="ri-file-list-2-line text-highlight-yellow text-lg"></i>
            Explorer
          </div>
          {projectName && (
            <div className="file-tree">
              <div className="font-bold text-accent-tertiary text-xs mb-1 flex items-center gap-1">
                <i className="ri-folder-fill text-highlight-yellow"></i>
                <span>{projectName.split(/[\\/]/).pop()}</span>
              </div>
              <NavFiles visible={true} files={files} depth={0} />
            </div>
          )}
          {!projectName && (
            <div className="p-4 text-text-secondary text-xs">First open the project</div>
          )}
        </div>
      );
    }
    if (tabKey === "search") {
      return (
        <div className={mini ? "p-2 text-xs bg-secondary rounded shadow-lg absolute left-12 top-4 z-50 w-64 border border-border-primary" : "p-4 text-text-primary text-xs flex flex-col gap-1"}>
          <div className="font-semibold text-base mb-2 tracking-wide flex items-center gap-2">
            <i className="ri-search-line text-accent-secondary text-lg"></i>
            Search
          </div>
          <input
            className="w-full px-2 py-1 rounded bg-tertiary border border-border-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus mb-1"
            placeholder="Search..."
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            style={{ minHeight: 28 }}
          />
          <div className="text-xs text-text-secondary mb-1">Results</div>
          <div className="flex-1 flex flex-col overflow-y-auto gap-1">
            {results.length === 0 && !loading && searchValue && <div className="text-text-muted text-xs">No results</div>}
            {loading && <div className="text-text-secondary text-xs">Searching...</div>}
            {Object.entries(results.reduce((acc, res) => {
              if (!acc[res.file.path]) acc[res.file.path] = { file: res.file, matches: [] };
              acc[res.file.path].matches.push(res);
              return acc;
            }, {} as Record<string, { file: any, matches: any[] }>)
            ).map(([filePath, { file, matches }], idx) => {
              const isCollapsed = collapsedFiles[filePath] ?? true;
              return (
                <div key={filePath} className="mb-0.5">
                  <div
                    className="flex items-center gap-1 cursor-pointer font-semibold text-accent-secondary text-xs"
                    onClick={() => setCollapsedFiles(prev => ({
                      ...prev,
                      [filePath]: !isCollapsed
                    }))}
                  >
                    <span className={`ri-arrow-right-s-line transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}></span>
                    <span className="truncate">{file.name}</span>
                    <span className="text-text-secondary text-[10px]">({matches.length})</span>
                  </div>
                  {!isCollapsed && (
                    <div className="flex flex-col gap-0.5">
                      {matches.map((res, i) => (
                        <div
                          key={res.file.path + res.line + i}
                          className="rounded py-0.5 px-1 text-xs cursor-pointer hover:bg-accent-emphasis transition-colors flex items-center gap-2"
                          title={res.text}
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              window.dispatchEvent(new CustomEvent('open-file-line', { detail: { path: res.file.path, line: res.line } }));
                            }
                          }}
                        >
                          <span className="inline-block bg-secondary text-text-secondary rounded px-1 select-none text-[10px]" style={{ fontVariantNumeric: 'tabular-nums' }}>{res.line}</span>
                          <span className="inline-block align-middle overflow-hidden text-ellipsis whitespace-nowrap font-mono text-text-primary">
                            {highlightMatches(res.text, res.match_indices, searchValue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    if (tabKey === "scm") return (
      <div className={mini ? "p-2 text-xs bg-secondary rounded shadow-lg absolute left-12 top-4 z-50 w-64 border border-border-primary" : "p-4 text-text-secondary text-xs flex flex-col gap-3"}>
        <div className="font-semibold text-base mb-2 tracking-wide flex items-center gap-2">
          <i className="ri-git-branch-line text-highlight-pink text-lg"></i>
          Source Control
        </div>
        <div className="p-4 text-text-secondary text-xs">Source Control (not implemented)</div>
      </div>
    );
    if (tabKey === "run") return (
      <div className={mini ? "p-2 text-xs bg-secondary rounded shadow-lg absolute left-12 top-4 z-50 w-64 border border-border-primary" : "p-4 text-text-secondary text-xs flex flex-col gap-3"}>
        <div className="font-semibold text-base mb-2 tracking-wide flex items-center gap-2">
          <i className="ri-bug-line text-highlight-green text-lg"></i>
          Run & Debug
        </div>
        <div className="p-4 text-text-secondary text-xs">Run & Debug (not implemented)</div>
      </div>
    );
    if (tabKey === "ext") {
      return (
        <div className={mini ? "p-2 text-xs bg-secondary rounded shadow-lg absolute left-12 top-4 z-50 w-64 border border-border-primary" : "p-4 text-text-primary text-xs flex flex-col gap-3"}>
          <div className="font-semibold text-base tracking-wide flex items-center gap-2">
            <i className="ri-store-2-line text-accent-secondary text-lg"></i>
            Extensions
          </div>
          <div className="text-xs text-text-secondary">Your extensions:</div>
          <div className="flex flex-col gap-4">
            {loadedExtensions.length === 0 && (
              <div className="text-text-muted text-xs italic">No installed extensions</div>
            )}
            {loadedExtensions.map(ext => (
              <div
                key={ext.file}
                className="flex items-center gap-2 bg-secondary rounded-lg p-2 border border-border-secondary hover:border-accent-primary transition-all duration-150"
                style={{ minWidth: 0, boxShadow: 'none' }}
              >
                {ext.icon && (
                  <img src={ext.icon} alt="icon" className="w-12 h-12 rounded object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-text-primary text-xs truncate">{ext.name || ext.file}</div>
                  <div className="text-[11px] text-text-secondary truncate">{ext.description}</div>
                  <div className="text-[10px] text-text-secondary mt-0.5">Author: <span className="text-accent-tertiary">{ext.author || 'N/A'}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (extensionTabs.some(tab => tab.key === tabKey)) {
      const extTab = extensionTabs.find(tab => tab.key === tabKey);
      return extTab ? <extTab.render /> : null;
    }
    return null;
  };

  return (
    <motion.aside
      id="sidebar"
      className={`h-full flex flex-row pb-4`}
      animate={{ width: width, backgroundColor: 'var(--color-sidebar-bg)' }}
      initial={false}
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
      style={{ overflow: 'hidden', position: 'relative' }}
    >
      <div className="sidebar-iconbar flex flex-col items-center pb-2 gap-2">
        {allTabs.map(tab => (
          <button
            key={tab.key}
            className={`sidebar-icon-btn w-10 h-10 flex items-center justify-center rounded-xl text-xl transition-colors ${activeTab === tab.key ? 'text-accent-secondary shadow-inner' : 'text-text-secondary hover:text-accent-tertiary hover:bg-secondary'}`}
            onClick={() => handleTabClick(tab.key)}
            title={tab.label}
          >
            <i className={tab.icon}></i>
          </button>
        ))}
      </div>
      {!collapsed && activeTab && (
        <div className="sidebar-content flex-1 overflow-y-auto">
          {renderTabContent(activeTab)}
        </div>
      )}
      {collapsed && lastActiveTab.current && (
        <div className="sidebar-content flex-1 overflow-y-auto" style={{ pointerEvents: 'none' }}>
          {renderTabContent(lastActiveTab.current)}
        </div>
      )}
    </motion.aside>
  );
}
