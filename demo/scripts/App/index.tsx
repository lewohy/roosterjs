import * as React from 'react';
import Editor from '@monaco-editor/react';
import { exportContent } from 'roosterjs-content-model-core';
import { extracHtml } from '../src/extracter';
import { IEditor } from 'roosterjs-content-model-types';
import { MainPane } from '../controlsV2/mainPane/MainPane';

export function App() {
    const [roosterEditor, setRoosterEditor] = React.useState<IEditor | null>(null);
    const [monacoContent, setMonacoContent] = React.useState<string>('');
    const [previewHtml, setPreviewHtml] = React.useState<string>('');
    const previewElement = React.useRef<HTMLDivElement>(null);

    const exportRoosterToMonaco = React.useCallback(() => {
        if (roosterEditor) {
            const html = extracHtml(roosterEditor);
            setMonacoContent(html);
            setPreviewHtml(html);
        }
    }, [roosterEditor]);

    React.useEffect(() => {
        if (roosterEditor) {
            roosterEditor
                .getDocument()
                .getElementById('RoosterJsContentDiv').innerHTML = monacoContent;
            setPreviewHtml(monacoContent);
        }
    }, [monacoContent]);

    React.useEffect(() => {
        if (previewElement.current) {
            previewElement.current.innerHTML = previewHtml;
        }
    }, [previewHtml]);

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}>
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flex: 2,
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
                        display: 'flex',
                        flexDirection: 'column',
                        alignContent: 'center',
                    }}>
                    <button
                        onClick={() => {
                            exportRoosterToMonaco();
                        }}>
                        HTML로 변환
                    </button>
                </div>
                <div
                    style={{
                        width: 'auto',
                        height: '100%',
                        display: 'flex',
                        flex: 1,
                        flexDirection: 'column',
                    }}>
                    <div
                        style={{
                            width: '100%',
                            height: 'auto',
                            display: 'flex',
                            flex: 1,
                        }}>
                        <Editor
                            defaultLanguage="html"
                            options={{
                                readOnly: false,
                                wordWrap: 'on',
                                minimap: {
                                    enabled: true,
                                },
                            }}
                            value={monacoContent}
                            onChange={(value, event) => {
                                setMonacoContent(value);
                            }}
                        />
                    </div>
                </div>
            </div>
            <div
                style={{
                    width: '100%',
                    height: '100px',
                    display: 'flex',
                    flex: 1,
                    padding: '10px',
                    boxSizing: 'border-box',
                }}>
                <div ref={previewElement} />
            </div>
        </div>
    );
}
