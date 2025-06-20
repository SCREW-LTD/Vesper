import { ComponentType } from 'react';

export interface IFile {
  id: string;
  name: string;
  kind: 'file' | 'directory';
  path: string;
}

export interface ExtensionSidebarItem {
  key: string;
  label: string;
  icon: string;
  render: ComponentType;
}

declare global {
  interface Window {
    VesperApi: {
      readFile: (path: string) => Promise<string>;
      writeFile: (path: string, content: string) => Promise<void>;
      search: (keyword: string) => Promise<any>;
      on: (event: string, handler: EventListenerOrEventListenerObject) => void;
      off: (event: string, handler: EventListenerOrEventListenerObject) => void;
      registerSidebarItem?: (item: Omit<ExtensionSidebarItem, 'label'>) => void;
    };
    VesperProjectRoot?: string;
    VesperExtensionMeta?: any;
    React: any;
  }
}
