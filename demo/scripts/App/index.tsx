import * as React from 'react';
import Editor from '@monaco-editor/react';
import { exportContent } from 'roosterjs-content-model-core';
import { IEditor } from 'roosterjs-content-model-types';
import { MainPane } from '../controlsV2/mainPane/MainPane';

export function App() {
    const [roosterEditor, setRoosterEditor] = React.useState<IEditor | null>(null);
    const [rawContent, setRawContent] = React.useState<string>('');

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                top: 0,
                left: 0,
                display: 'flex',
                flexDirection: 'row',
            }}>
            <div
                style={{
                    width: 'auto',
                    height: '100%',
                    flex: 1,
                }}>
                <MainPane onEditorInit={editor => setRoosterEditor(editor)} />
            </div>
            <div
                style={{
                    margin: '0 10px',
                }}>
                <button
                    onClick={() => {
                        if (roosterEditor) {
                            const html = exportContent(roosterEditor);
                            setRawContent(html);
                        }
                    }}>
                    Export
                </button>
            </div>
            <div
                style={{
                    width: 'auto',
                    height: '100%',
                    flex: 1,
                }}>
                <Editor
                    defaultLanguage="html"
                    options={{
                        readOnly: true,
                        wordWrap: 'on',
                        minimap: { enabled: false },
                    }}
                    value={rawContent}
                />
            </div>
        </div>
    );
}
