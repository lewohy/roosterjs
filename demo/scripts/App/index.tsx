import { PrimaryButton } from '@fluentui/react/lib/Button';
import Editor from '@monaco-editor/react';
import * as React from 'react';
import { IEditor } from 'roosterjs-content-model-types';
import { MainPane } from '../controlsV2/mainPane/MainPane';
import { extracHtml } from '../src/extracter';

export function App() {
    const [roosterEditor, setRoosterEditor] = React.useState<IEditor | null>(null);
    const [monacoContent, setMonacoContent] = React.useState<string>('');

    const exportRoosterToMonaco = React.useCallback(() => {
        if (roosterEditor) {
            const html = extracHtml(roosterEditor);
            setMonacoContent(html);
        }
    }, [roosterEditor]);

    React.useEffect(() => {
        if (roosterEditor) {
            roosterEditor
                .getDocument()
                .getElementById('RoosterJsContentDiv').innerHTML = monacoContent;
        }
    }, [monacoContent]);

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
                    <PrimaryButton
                        style={{
                            width: 'auto',
                            display: 'flex',
                        }}
                        text="Convert to Code"
                        iconProps={{
                            iconName: 'Export',
                        }}
                        onClick={() => {
                            exportRoosterToMonaco();
                        }}></PrimaryButton>
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
        </div>
    );
}
