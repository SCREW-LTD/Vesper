import { IFile } from "../types"

interface IEntries {
  [key: string]: IFile
}

const entries: IEntries = {}

export const saveFileObject = (file: IFile): void => {
  entries[file.path] = { ...file, id: file.path };
}

export const getFileObject = (path: string): IFile | undefined => {
  return entries[path];
}

