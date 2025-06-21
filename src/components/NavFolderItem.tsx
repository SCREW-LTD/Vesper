import { nanoid } from "nanoid";
import { useState, useEffect } from "react";
import { readDirectory, writeFile } from "../helpers/filesys";
import { saveFileObject } from "../stores/file";
import { IFile } from "../types";
import NavFiles from "./NavFiles";

const folderIcons: Record<string, { default: string }> = import.meta.glob('../assets/folders/*.svg', { eager: true });

interface Props {
  file: IFile;
  active: boolean;
  depth?: number;
}
export default function NavFolderItem({ file, active, depth = 0 }: Props) {
  const [files, setFiles] = useState<IFile[]>([])
  const [unfold, setUnfold] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [newFile, setNewFile] = useState(false)
  const [filename, setFilename] = useState('')
  const [iconUrl, setIconUrl] = useState<string | undefined>('');

  useEffect(() => {
    const specificOpen = `../assets/folders/folder-${file.name}-open.svg`;
    const specificClosed = `../assets/folders/folder-${file.name}.svg`;
    const defaultOpen = '../assets/folders/folder-open.svg';
    const defaultClosed = '../assets/folders/folder.svg';

    let iconPath: string | undefined;

    if (unfold) {
      iconPath =
        folderIcons[specificOpen]?.default ||
        folderIcons[specificClosed]?.default ||
        folderIcons[defaultOpen]?.default ||
        folderIcons[defaultClosed]?.default;
    } else {
      iconPath =
        folderIcons[specificClosed]?.default ||
        folderIcons[defaultClosed]?.default;
    }
    setIconUrl(iconPath);
  }, [file.name, unfold]);

  const onShow = async (ev: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
    ev.stopPropagation()
    if (loaded) {
      setUnfold(!unfold)
      return;
    }
    const entries = await readDirectory(file.path + '/')
    setLoaded(true)
    setFiles(entries)
    setUnfold(!unfold)
  }

  const onEnter = (key: string) => { 
    if (key === 'Escape') {
      setNewFile(false)
      setFilename('')
      return;
    }
    if (key !== 'Enter') return;
    const filePath = `${file.path}/${filename}`
    writeFile(filePath, '').then(() => {
      const id = nanoid();
      const newFile: IFile = {
        id,
        name: filename,
        path: filePath,
        kind: 'file'
      }
      saveFileObject(newFile)
      setFiles(prevEntries => [newFile, ...prevEntries])
      setNewFile(false)
      setFilename('')
    })
  }

  return <div className="folder-row-container relative">
    <div
      className={`folder-row group flex items-center justify-between px-2 py-1 rounded cursor-pointer text-xs transition-colors select-none ${active ? 'bg-accent-emphasis text-accent-tertiary' : 'text-text-primary hover:bg-secondary hover:text-accent-tertiary'}`}
      style={{ 
        marginLeft: depth * 14,
      }}
    >
      <div className="flex items-center gap-2 flex-1" onClick={onShow}>
        {iconUrl && <img src={iconUrl} className="w-4 h-4" alt=""/>}
        <span className="flex-1">{file.name}</span>
      </div>
      <i 
        onClick={(e) => {
            e.stopPropagation();
            setNewFile(true)
        }} 
        className="ri-add-line ml-auto text-text-secondary hover:text-highlight-green opacity-0 group-hover:opacity-100 transition-opacity"
      ></i>
    </div>
    {newFile ? <div
      className="flex items-center gap-2 border-border-secondary rounded px-2 py-1 focus-within:border-accent-primary mb-[2px] mr-2 border"
      style={{
        marginLeft: `${((depth + 1) * 14) + 8}px`,

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
    {unfold && <NavFiles visible={unfold} files={files} depth={depth + 1} />}
  </div>
}
