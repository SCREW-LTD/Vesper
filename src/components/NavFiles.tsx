import { useSource } from "../context/SourceContext"
import { IFile } from "../types"
import FileIcon from "./FileIcon"
import NavFolderItem from "./NavFolderItem"
import { saveFileObject } from "../stores/file"

interface Props {
  files: IFile[]
  visible: boolean
  depth?: number
}

export default function NavFiles({files, visible, depth = 0}: Props) {
  const { setSelect, selected, addOpenedFile } = useSource()

  const onShow = (file: IFile) => {
    if (file.kind === "file") {
      setSelect(file.id)
      addOpenedFile(file.id)
    }
  }

  return <div className={`source-codes ${visible ? '' : 'hidden'}`}> 
    {files.map(file => {
      saveFileObject(file)
      const isSelected = file.id === selected
      if (file.kind === 'directory') {
        return (
          <div key={file.id} style={{ marginLeft: depth * 14 }}>
            <NavFolderItem active={isSelected} file={file} depth={depth} />
          </div>
        )
      }
      return (
        <div
          onClick={() => onShow(file)}
          key={file.id}
          className={`file-item flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs transition-colors relative ${isSelected ? 'bg-accent-emphasis text-accent-tertiary' : 'text-text-primary hover:text-accent-tertiary hover:bg-secondary'}`}
          style={{
            marginLeft: (depth + 1) * 14
          }}
        >
          <FileIcon name={file.name} />
          <span className="truncate">{file.name}</span>
        </div>
      )
    })}
  </div>
}
