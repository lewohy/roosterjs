import { IEditor } from 'roosterjs-content-model-types';

export function extracHtml(editor: IEditor) {
    const html = editor.getDocument().getElementById('RoosterJsContentDiv').innerHTML;
    const element = document.createElement('div');
    element.innerHTML = html;
    element.querySelectorAll('*').forEach(e => {
        e.removeAttribute('data-editing-info');
    });

    return element.innerHTML;
}
