import { useRef, useEffect, useState } from "react";
import useHorizontalScroll from "../helpers/useHorizontalScroll";
import { useSource } from "../context/SourceContext";
import CodeEditor from "./CodeEditor";
import { IFile } from "../types";
import { getFileObject } from "../stores/file";
import FileIcon from "./FileIcon";
import logoUrl from '/logo.png';
import PreviewImage from "./PreviewImage";

export default function CodeArea() {
  const { opened, selected, delOpenedFile, setSelect, projectName, recentProjects, addOpenedFile } = useSource();
  const scrollRef = useHorizontalScroll();
  const [scrollTo, setScrollTo] = useState<{ file: string, line: number } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handler = (e: any) => {
        if (e && e.detail && e.detail.path && e.detail.line) {
          let fileObj = getFileObject(e.detail.path);
          if (!fileObj) {
            fileObj = {
              id: e.detail.path,
              name: e.detail.path.split(/[\\/]/).pop() || e.detail.path,
              path: e.detail.path,
              kind: 'file'
            };
          }
          addOpenedFile(fileObj.id);
          setSelect(fileObj.id);
          setScrollTo({ file: fileObj.id, line: e.detail.line });
        }
      };
      window.addEventListener('open-file-line', handler);
      return () => window.removeEventListener('open-file-line', handler);
    }
  }, [addOpenedFile, setSelect]);

  useEffect(() => {
    if (scrollTo) {
      const timeout = setTimeout(() => setScrollTo(null), 200);
      return () => clearTimeout(timeout);
    }
  }, [scrollTo]);

  const onSelectItem = (id: string) => {
    setSelect(id);
  }

  const close = (ev: React.MouseEvent<HTMLElement, MouseEvent>, id: string) => {
    ev.stopPropagation();
    delOpenedFile(id);
  }

  const isImage = (name: string) => {
    return ['.png', '.gif', '.jpeg', '.jpg', '.bmp', '.svg', '.webp'].some(ext => name.toLowerCase().endsWith(ext))
  }

  if (opened.length === 0) {
    if (!projectName) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-tertiary select-none">
          <div className="flex flex-col items-center justify-center flex-1 w-full">
            <div className="bg-secondary rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center mb-6 border border-border-primary max-w-md w-full">
              <img src={logoUrl} alt="Vesper" className="w-16 h-16 mb-2 drop-shadow-lg object-cover" />
              <div className="text-3xl font-extrabold text-text-primary mb-1 tracking-tight">Vesper</div>
              <div className="text-sm text-accent-tertiary mb-4">Free &bull; <a href="#" className="underline text-accent-secondary">Go unlimited</a></div>
              <div className="flex flex-row flex-wrap gap-3 mb-4 justify-center max-w-full w-auto">
                <button className="px-5 py-2 rounded-lg bg-accent-hover text-text-inverted text-base font-semibold shadow hover:bg-accent-strong transition flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent-secondary whitespace-nowrap" onClick={() => window.dispatchEvent(new CustomEvent('open-folder'))}>
                  <i className="ri-folder-open-line"></i> Open project
                </button>
                <button className="px-5 py-2 rounded-lg bg-secondary text-text-primary text-base font-semibold shadow flex items-center gap-2 opacity-60 cursor-not-allowed whitespace-nowrap" disabled>
                  <i className="ri-git-repository-line"></i> Clone repo
                </button>
              </div>
            </div>
            <div className="w-full max-w-md">
              <div className="bg-secondary rounded-xl border border-border-primary shadow p-4">
                <div className="text-xs text-text-secondary mb-2 font-semibold tracking-wide uppercase">Recent projects</div>
                <div className="flex flex-col gap-1">
                  {recentProjects.length === 0 && <div className="text-text-muted text-xs">No recent projects</div>}
                  {recentProjects.slice(0, 5).map((proj) => (
                    <div key={proj} className="flex items-center gap-2 text-text-primary text-sm px-3 py-1.5 rounded-lg hover:bg-secondary cursor-pointer transition group" onClick={() => { window.dispatchEvent(new CustomEvent('open-folder', { detail: { path: proj } })) }}>
                      <i className="ri-folder-3-line text-base text-accent-primary group-hover:text-accent-secondary transition"></i>
                      <span className="truncate font-medium group-hover:text-accent-secondary transition">{proj.split(/[\\/]/).pop()}</span>
                      <span className="ml-auto text-xs text-text-secondary truncate max-w-[120px] group-hover:text-text-secondary transition">{proj}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="w-full h-full flex items-center justify-center bg-tertiary">
        <div className="text-text-secondary">Select a file from the explorer to get started.</div>
      </div>
    )
  }

  return <div id="code-area" className="w-full h-full relative flex flex-col">
    <div
      ref={scrollRef}
      className="code-tab-items flex items-center gap-1 px-2 py-1 bg-primary border-b border-border-primary h-12 z-10 relative"
      style={{ minHeight: 48 }}
    >
      {opened.map(item => {
        const file = getFileObject(item) as IFile;
        if (!file) return null;
        const active = selected === item;
        return (
          <div
            onClick={() => onSelectItem(file.id)}
            className={`tab-item flex items-center gap-2 px-4 py-2 cursor-pointer text-xs font-medium transition-colors select-none ${active ? 'bg-secondary text-accent-secondary shadow-inner border-b-2 border-accent-primary' : 'text-text-secondary hover:text-accent-tertiary hover:bg-secondary'}`}
            key={item}
            style={{ height: 36, marginTop: 4, marginBottom: 4, borderRadius: 8 }}
          >
            <FileIcon name={file.name} size="sm" />
            <span className="truncate max-w-[120px]">{file.name}</span>
            <i onClick={(ev) => close(ev, item)} className="ri-close-line hover:text-highlight-red ml-1"></i>
          </div>
        )
      })}
    </div>
    <div className="code-contents w-full h-full flex-1">
      {opened.map(item => {
        const file = getFileObject(item) as IFile;
        if (!file) return null;
        const active = item === selected;
        if (isImage(file.name)) {
          return <PreviewImage key={item} path={file.path} active={active} />
        }
        return <CodeEditor key={item} id={item} active={active} scrollToLine={active && scrollTo && scrollTo.file === item ? scrollTo.line : undefined} />
      })}
    </div>
  </div>
}
