import { reducedModelChildProcessor } from '../../modelApi/common/reducedModelChildProcessor';
import { retrieveModelFormatState } from 'roosterjs-content-model-dom';
import type { IEditor, ContentModelFormatState } from 'roosterjs-content-model-types';

/**
 * Get current format state
 * @param editor The editor to get format from
 */
export function getFormatState(editor: IEditor): ContentModelFormatState {
    const pendingFormat = editor.getPendingFormat();
    const manager = editor.getSnapshotsManager();
    const result: ContentModelFormatState = {
        canUndo: manager.hasNewContent || manager.canMove(-1),
        canRedo: manager.canMove(1),
        isDarkMode: editor.isDarkMode(),
    };

    editor.formatContentModel(
        model => {
            retrieveModelFormatState(model, pendingFormat, result);

            return false;
        },
        undefined /*options*/,
        {
            processorOverride: {
                child: reducedModelChildProcessor,
            },
        }
    );

    return result;
}
