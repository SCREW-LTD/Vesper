import { useState } from "react";
import { appWindow } from "@tauri-apps/api/window";

export default function Titlebar() {
  const [isScaleup, setScaleup] = useState(false);
  const onMinimize = () => appWindow.minimize();
  const onScaleup = () => {
    appWindow.toggleMaximize();
    setScaleup(true);
  }

  const onScaledown = () => {
    appWindow.toggleMaximize();
    setScaleup(false);
  }

  const onClose = () => appWindow.close();

  return <div id="titlebar" data-tauri-drag-region className="flex items-center justify-between h-[26px] px-2 from-darker select-none">
    <div className="titlebar-logo flex items-center gap-2">
      <div className="rounded-full bg-secondary shadow-md flex items-center justify-center w-5 h-5 border border-border-primary">
        <img src="/logo.png" alt="Vesper" className="w-4 h-4 object-cover" />
      </div>
      <span className="text-sm font-bold uppercase tracking-widest text-text-primary drop-shadow">Vesper</span>
    </div>

    <div className="titlebar-actions flex items-center gap-2">
      <button data-tauri-drag-region className="titlebar-action-btn rounded-lg px-1 hover:bg-accent-hover hover:text-text-inverted transition focus:outline-none" onClick={onMinimize} title="Minimize">
        <i className="titlebar-icon ri-subtract-line"></i>
      </button>

      {isScaleup ? (
        <button data-tauri-drag-region className="titlebar-action-btn rounded-lg px-1 hover:bg-accent-hover hover:text-text-inverted transition focus:outline-none" onClick={onScaledown} title="Restore">
          <i className="titlebar-icon ri-file-copy-line"></i>
        </button>
      ) : (
        <button data-tauri-drag-region className="titlebar-action-btn rounded-lg px-1 hover:bg-accent-hover hover:text-text-inverted transition focus:outline-none" onClick={onScaleup} title="Maximize">
          <i className="titlebar-icon ri-stop-line"></i>
        </button>
      )}

      <button id="ttb-close" data-tauri-drag-region className="titlebar-action-btn rounded-lg px-1 hover:bg-highlight-red hover:text-text-inverted transition focus:outline-none" onClick={onClose} title="Close">
        <i className="titlebar-icon ri-close-fill"></i>
      </button>
    </div>
  </div>
}
