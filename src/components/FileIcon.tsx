import icons from '@exuanbo/file-icons-js';
import { useEffect, useState } from 'react';

interface IFileIconProps {
  name: string;
  size?: 'sm' | 'base'
}

export default function FileIcon({ name, size = 'base' }: IFileIconProps) {
  const [iconClass, setIconClass] = useState('icon file-icon');

  useEffect(() => {
    async function getIcon() {
      const cls = await icons.getClass(name);
      if (cls) {
        setIconClass(cls);
      }
    }
    getIcon();
  }, [name]);

  const sizeCls = size === 'base' ? '' : 'text-sm';
  
  return <i className={`${iconClass} ${sizeCls}`} />;
}

