import * as React from 'react';
import Editor from '@monaco-editor/react';
import { MainPane } from '../controlsV2/mainPane/MainPane';

export function App() {
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
                <MainPane />
            </div>
            <div
                style={{
                    width: 'auto',
                    height: '100%',
                    flex: 1,
                }}>
                <Editor />
            </div>
        </div>
    );
}
