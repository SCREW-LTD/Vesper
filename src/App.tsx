import CodeArea from "./components/CodeArea"
import Sidebar from "./components/Sidebar"
import Titlebar from "./components/Titlebar"
import { SourceProvider, useSource } from "./context/SourceContext"
import { useState, useEffect } from "react"

const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 500;

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>("explorer");
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        let newWidth = e.clientX;
        if (newWidth < MIN_SIDEBAR_WIDTH) newWidth = MIN_SIDEBAR_WIDTH;
        if (newWidth > MAX_SIDEBAR_WIDTH) newWidth = MAX_SIDEBAR_WIDTH;
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const effectiveActiveTab = sidebarCollapsed ? null : activeTab;
  const currentSidebarWidth = sidebarCollapsed ? 43 : sidebarWidth;

  return (
    <div className={`app-shell pb-[24px] bg-primary shadow-2xl min-h-screen min-w-[900px] max-w-full mx-auto my-6 overflow-hidden flex flex-col`}>
      <Titlebar />
      <div id="editor" className="flex-1 flex overflow-hidden bg-secondary relative">
        <SourceProvider>
          <div className="flex h-full fixed left-0 top-[26px] bottom-0 z-40">
            <div className="bg-secondary border-r border-border-primary" style={{ width: currentSidebarWidth }}>
              <Sidebar
                width={currentSidebarWidth}
                collapsed={sidebarCollapsed}
                setCollapsed={setSidebarCollapsed}
                activeTab={effectiveActiveTab}
                setActiveTab={setActiveTab}
              />
            </div>
            {!sidebarCollapsed && (
              <div
                className="w-1.5 cursor-col-resize hover:bg-accent-primary transition-colors duration-200"
                style={{
                  position: 'absolute',
                  right: -3,
                  top: 0,
                  bottom: 0,
                  zIndex: 50
                }}
                onMouseDown={handleMouseDown}
              />
            )}
          </div>
          <div className="flex-1 h-full transition-all duration-100" style={{ marginLeft: currentSidebarWidth }}>
            <CodeArea />
          </div>
        </SourceProvider>
      </div>
    </div>
  )
}


