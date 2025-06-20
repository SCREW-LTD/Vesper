import { useEffect, useRef, useState } from "react";
import { getFileObject } from "../stores/file";
import { readFile, writeFile } from "../helpers/filesys";
import MonacoEditor, { OnMount } from "@monaco-editor/react";

interface Props {
  id: string;
  active: boolean;
  scrollToLine?: number;
}

export default function CodeEditor({ id, active, scrollToLine }: Props) {
  const [content, setContent] = useState<string>("");
  const [language, setLanguage] = useState<string>("plaintext");
  const editorRef = useRef<any>(null);
  const visible = active ? '' : 'hidden';

  useEffect(() => {
    const file = getFileObject(id);
    if (!file) return;
    const load = async () => {
      const data = await readFile(file.path);
      setContent(data);
      const ext = file.name.split('.').pop()?.toLowerCase();
      switch (ext) {
        case "js": setLanguage("javascript"); break;
        case "ts": setLanguage("typescript"); break;
        case "tsx": setLanguage("typescript"); break;
        case "json": setLanguage("json"); break;
        case "md": setLanguage("markdown"); break;
        case "html": setLanguage("html"); break;
        case "css": setLanguage("css"); break;
        case "rs": setLanguage("rust"); break;
        default: setLanguage("plaintext");
      }
    };
    load();
  }, [id]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    if (["typescript", "javascript"].includes(language)) {
      monaco.languages.typescript.typescriptDefaults.setInlayHintsOptions({
        includeInlayParameterNameHints: 'all',
        includeInlayParameterNameHintsWhenArgumentMatchesName: true,
        includeInlayFunctionParameterTypeHints: true,
        includeInlayVariableTypeHints: true,
        includeInlayPropertyDeclarationTypeHints: true,
        includeInlayFunctionLikeReturnTypeHints: true,
        includeInlayEnumMemberValueHints: true
      });
    }
  };

  const handleSave = async () => {
    if (!editorRef.current) return;
    const file = getFileObject(id);
    if (!file) return;
    const value = editorRef.current.getValue();
    await writeFile(file.path, value);
  };

  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      if (active && ev.ctrlKey && ev.key === 's') {
        ev.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, id, content]);

  useEffect(() => {
    if (scrollToLine && editorRef.current && content) {
      editorRef.current.revealLineInCenter(scrollToLine);
      editorRef.current.setPosition({ lineNumber: scrollToLine, column: 1 });
      editorRef.current.focus();
    }
  }, [scrollToLine, content]);

  return (
    <main className={`w-full h-full overflow-y-auto ${visible}`} style={{ height: 'calc(100vh - 40px)' }}>
      <MonacoEditor
        height="100%"
        width="100%"
        theme="vs-dark"
        language={language}
        value={content}
        onMount={handleEditorDidMount}
        onChange={v => setContent(v ?? "")}
        options={{
          fontSize: 15,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
        }}
      />
    </main>
  );
}
