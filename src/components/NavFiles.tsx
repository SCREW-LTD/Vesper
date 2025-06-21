import { useSource } from "../context/SourceContext"
import { IFile } from "../types"
import FileIcon from "./FileIcon"
import NavFolderItem from "./NavFolderItem"
import { saveFileObject } from "../stores/file"
import { useState, useEffect } from "react";
import { nanoid } from "nanoid";
import { writeFile } from "../helpers/filesys";

const folderIcons: Record<string, { default: string }> = import.meta.glob('../assets/folders/*.svg', { eager: true });

interface Props {
  files: IFile[]
  visible: boolean
  depth?: number
  rootName?: string
}

export default function NavFiles({ rootName, files, visible, depth = 0 }: Props) {
  const { setSelect, selected, addOpenedFile, projectName } = useSource()
  const [expanded, setExpanded] = useState(false)
  const [iconUrl, setIconUrl] = useState<string | undefined>('');
  const [newFile, setNewFile] = useState(false)
  const [filename, setFilename] = useState('')
  const [localFiles, setLocalFiles] = useState(files);

  useEffect(() => {
    setLocalFiles(files);
  }, [files]);

  useEffect(() => {
    if (!projectName) {
      setIconUrl('');
      return;
    }
    const defaultOpen = '../assets/folders/folder-open.svg';
    const defaultClosed = '../assets/folders/folder.svg';

    const iconPath = expanded
      ? folderIcons[defaultOpen]?.default
      : folderIcons[defaultClosed]?.default;

    setIconUrl(iconPath);
  }, [projectName, expanded]);


  const onShow = (file: IFile) => {
    if (file.kind === "file") {
      setSelect(file.id)
      addOpenedFile(file.id)
    }
  }

  const onEnter = (key: string) => {
    if (key === 'Escape') {
      setNewFile(false)
      setFilename('')
      return;
    }
    if (key !== 'Enter') return;
    const filePath = `${projectName}/${filename}`
    writeFile(filePath, '').then(() => {
      const id = nanoid();
      const newFileI: IFile = {
        id,
        name: filename,
        path: filePath,
        kind: 'file'
      }
      saveFileObject(newFileI)
      setLocalFiles(prevEntries => {
        const updatedEntries = [...prevEntries, newFileI];
        // Sort folders and files alphabetically
        const folders = updatedEntries.filter(entry => entry.kind === 'directory');
        const files = updatedEntries.filter(entry => entry.kind === 'file');
        
        folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        
        return [...folders, ...files];
      })
      setNewFile(false)
      setFilename('')
    })
  }

  const fileListContent = localFiles.map(file => {
    saveFileObject(file)
    const isSelected = file.id === selected
    if (file.kind === 'directory') {
      return (
        <div key={file.id}>
          <NavFolderItem active={isSelected} file={file} depth={depth} />
        </div>
      )
    }
    return (
      <div
        onClick={() => onShow(file)}
        key={file.id}
        className={`file-item flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-[12px] transition-colors relative ${isSelected ? 'bg-accent-emphasis text-accent-tertiary' : 'text-text-primary hover:text-accent-tertiary hover:bg-secondary'}`}
        style={{
          paddingLeft: `${(depth * 14) + 8}px`
        }}
      >
        <FileIcon name={file.name} />
        <span className="truncate">{file.name}</span>
      </div>
    )
  });

  if (rootName) {
    return (
      <div className={`source-codes ${visible ? '' : 'hidden'}`}>
        <div
          className="text-[12px] pr-[7px] group mb-1 flex items-center justify-between gap-1 cursor-pointer select-none"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-1">
            {iconUrl ? (
              <img src={iconUrl} className="w-4 h-4" alt="folder icon" />
            ) : (
              <i className="ri-folder-fill text-highlight-yellow"></i>
            )}
            <span className="">{rootName}</span>
          </div>
          <i
            onClick={(e) => {
              e.stopPropagation();
              setNewFile(true);
              if (!expanded) setExpanded(true);
            }}
            className="ri-add-line ml-auto text-text-secondary hover:text-highlight-blue opacity-0 group-hover:opacity-100 transition-opacity"
          ></i>
        </div>
        <div className={`${expanded ? '' : 'hidden'}`}>
          {newFile ? <div
            className="flex items-center gap-2 border-border-secondary rounded px-2 py-1 focus-within:border-accent-primary mb-[2px] mr-2 border"
            style={{
              marginLeft: `${(depth * 14) + 8}px`,
            }}
          >
            <i className="ri-file-edit-line text-text-primary"></i>
            <input type="text" value={filename}
              onChange={(ev) => setFilename(ev.target.value)}
              onKeyUp={(ev) => onEnter(ev.key)}
              placeholder="Name..."
              className="w-full text-xs bg-transparent focus:outline-none text-text-primary"
              autoFocus
            />
          </div> : null}
          {fileListContent}
        </div>
      </div>
    )
  }

  return <div className={`source-codes ${visible ? '' : 'hidden'}`}>
    {fileListContent}
  </div>
}
