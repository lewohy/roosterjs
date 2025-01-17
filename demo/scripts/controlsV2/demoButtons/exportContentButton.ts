import { exportContent } from 'roosterjs-content-model-core';
import { extracHtml } from '../../src/extracter';
import type { RibbonButton } from '../roosterjsReact/ribbon';

/**
 * Key of localized strings of Zoom button
 */
export type ExportButtonStringKey = 'buttonNameExport';

/**
 * "Export content" button on the format ribbon
 */
export const exportContentButton: RibbonButton<ExportButtonStringKey> = {
    key: 'buttonNameExport',
    unlocalizedText: 'Export',
    iconName: 'Export',
    flipWhenRtl: true,
    onClick: editor => {
        const win = editor.getDocument().defaultView.open();
        // const html = exportContent(editor);
        const html = extracHtml(editor);
        win.document.write(editor.getTrustedHTMLHandler()(html));
    },
    commandBarProperties: {
        buttonStyles: {
            icon: { paddingBottom: '10px' },
        },
    },
};
