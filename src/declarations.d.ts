declare module '@exuanbo/file-icons-js' {
  const icons: {
    getClass(name: string): Promise<string | null>;
  };
  export default icons;
} 