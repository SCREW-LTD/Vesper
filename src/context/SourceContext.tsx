import { createContext, useContext, useState, useCallback } from "react"

interface ISourceContext {
  selected: string;
  setSelect: (id: string) => void;
  opened: string[];
  addOpenedFile: (id: string) => void;
  delOpenedFile: (id: string) => void;
  projectName: string;
  setProjectName: (name: string) => void;
  recentProjects: string[];
  setRecentProjects: (paths: string[]) => void;
}

const SourceContext = createContext<ISourceContext>({
  selected: '',
  setSelect: (id) => { },
  opened: [],
  addOpenedFile: (id) => { },
  delOpenedFile: (id) => { },
  projectName: '',
  setProjectName: (name) => {},
  recentProjects: [],
  setRecentProjects: (paths) => {},
});

export const SourceProvider = ({ children }: { children: JSX.Element | JSX.Element[] }) => {
  const [selected, setSelected] = useState('');
  const [opened, updateOpenedFiles] = useState<string[]>([]);
  const [projectName, setProjectName] = useState('');
  const [recentProjects, setRecentProjects] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('recentProjects');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const setSelect = (id: string) => {
    setSelected(id)
  }

  const addOpenedFile = useCallback((id: string) => {
    updateOpenedFiles(prevOpen => (prevOpen.includes(id) ? prevOpen : [...prevOpen, id]));
    setSelected(id);
  }, [])

  const delOpenedFile = useCallback((id: string) => {
    updateOpenedFiles(prevOpen => prevOpen.filter(opened => opened !== id))
  }, [opened])

  const updateRecentProjects = (paths: string[]) => {
    setRecentProjects(paths);
    try {
      localStorage.setItem('recentProjects', JSON.stringify(paths));
    } catch {}
  }

  return <SourceContext.Provider value={{
    selected,
    setSelect,
    opened,
    addOpenedFile,
    delOpenedFile,
    projectName,
    setProjectName,
    recentProjects,
    setRecentProjects: updateRecentProjects
  }}>
    {children}
  </SourceContext.Provider>
}

export const useSource = () => {
  const { selected, setSelect, opened, addOpenedFile, delOpenedFile, projectName, setProjectName, recentProjects, setRecentProjects } = useContext(SourceContext)

  return { selected, setSelect, opened, addOpenedFile, delOpenedFile, projectName, setProjectName, recentProjects, setRecentProjects }
}
