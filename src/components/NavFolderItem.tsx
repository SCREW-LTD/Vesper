import { nanoid } from "nanoid";
import { useState } from "react";
import { readDirectory, writeFile } from "../helpers/filesys";
import { saveFileObject } from "../stores/file";
import { IFile } from "../types";
import NavFiles from "./NavFiles";

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

  return <div className="folder-row">
    <div
      className={`source-folder flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs transition-colors select-none ${active ? 'bg-orange-900/50 text-highlight-orange' : 'text-text-primary hover:bg-secondary'}`}
      style={{ 
        marginLeft: depth * 14,
      }}
    >
      <span onClick={onShow} className="chevron mr-1 text-base w-4 inline-flex items-center justify-center">
        <i className={`ri-arrow-right-s-line transition-transform duration-200 ${unfold ? 'rotate-90' : ''}`}></i>
      </span>
      <i className="ri-folder-fill text-highlight-yellow"></i>
      <span onClick={onShow} className="flex-1">{file.name}</span>
      <i onClick={() => setNewFile(true)} className="ri-add-line ml-auto text-text-secondary hover:text-highlight-green"></i>
    </div>
    {newFile ? <div className="mx-4 flex items-center gap-0.5 p-2" style={{ marginLeft: (depth + 1) * 14 + 10 }}>
      <i className="ri-file-edit-line text-text-primary"></i>
      <input type="text" value={filename} 
        onChange={(ev) => setFilename(ev.target.value)}
        onKeyUp={(ev) => onEnter(ev.key)}
        className="inp bg-tertiary text-text-primary w-full"
        />
    </div> : null}
    {unfold && <NavFiles visible={unfold} files={files} depth={depth + 1} />}
  </div>
}
