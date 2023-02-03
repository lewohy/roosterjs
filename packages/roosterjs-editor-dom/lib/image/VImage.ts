import applyChange from './editInfoUtils/applyChange';
import canRegenerateImage from './api/canRegenerateImage';
import DragAndDropContext, { DNDDirectionX, DnDDirectionY } from './types/DragAndDropContext';
import DragAndDropHandler from '../utils/DragAndDropHandler';
import DragAndDropHelper from '../utils/DragAndDropHelper';
import getGeneratedImageSize from './editInfoUtils/getGeneratedImageSize';
import ImageEditInfo from './types/ImageEditInfo';
import ImageHtmlOptions from './types/ImageHtmlOptions';
import { Cropper, getCropHTML } from './imageEditors/Cropper';
import { getEditInfoFromImage } from './editInfoUtils/editInfo';
import { getRotateHTML, Rotator, updateRotateHandlePosition } from './imageEditors/Rotator';
import { ImageEditElementClass } from './types/ImageEditElementClass';
import {
    arrayPush,
    Browser,
    createElement,
    getComputedStyle,
    getObjectKeys,
    safeInstanceOf,
    toArray,
    unwrap,
    wrap,
} from 'roosterjs-editor-dom';
import {
    Resizer,
    doubleCheckResize,
    getSideResizeHTML,
    getCornerResizeHTML,
    OnShowResizeHandle,
    getResizeBordersHTML,
} from './imageEditors/Resizer';
import {
    ImageEditOperation,
    ImageEditOptions,
    IEditor,
    CreateElementData,
    KnownCreateElementDataIndex,
    ModeIndependentColor,
    ChangeSource,
} from 'roosterjs-editor-types';
import type { CompatibleImageEditOperation } from 'roosterjs-editor-types/lib/compatibleTypes';

const PI = Math.PI;
const DIRECTIONS = 8;
const DirectionRad = (PI * 2) / DIRECTIONS;
const DirectionOrder = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/**
 * Default image edit options
 */
const DefaultOptions: Required<ImageEditOptions> = {
    borderColor: '#DB626C',
    minWidth: 10,
    minHeight: 10,
    preserveRatio: false,
    minRotateDeg: 5,
    imageSelector: 'img',
    rotateIconHTML: '',
    disableCrop: false,
    disableRotate: false,
    disableSideResize: false,
    onSelectState: ImageEditOperation.ResizeAndRotate,
};

/**
 * Map the image edit operation to a function that returns editing elements HTML to help
 * build image editing UI
 */
const ImageEditHTMLMap = {
    [ImageEditOperation.CornerResize]: getCornerResizeHTML,
    [ImageEditOperation.SideResize]: getSideResizeHTML,
    [ImageEditOperation.Rotate]: getRotateHTML,
    [ImageEditOperation.Crop]: getCropHTML,
};

/**
 * Default background colors for rotate handle
 */
const LIGHT_MODE_BGCOLOR = 'white';
const DARK_MODE_BGCOLOR = '#333';

/**
 * The biggest area of image with 4 handles
 */
const MAX_SMALL_SIZE_IMAGE = 10000;

/**
 * ImageEdit plugin provides the ability to edit an inline image in editor, including image resizing, rotation and cropping
 */
export default class VImage {
    protected editor: IEditor | null = null;
    protected options: ImageEditOptions;

    // Allowed editing operations
    private allowedOperations: ImageEditOperation;

    // Current editing image
    private image: HTMLImageElement | null = null;

    // Image cloned from the current editing image
    private clonedImage: HTMLImageElement | null = null;

    // The image wrapper
    private wrapper: HTMLSpanElement | null = null;

    // Current edit info of the image. All changes user made will be stored in this object.
    // We use this object to update the editing UI, and finally we will use this object to generate
    // the new image if necessary
    private editInfo: ImageEditInfo | null = null;

    // Src of the image before current editing
    private lastSrc: string | null = '';

    // Drag and drop helper objects
    private dndHelpers: (DragAndDropHelper<DragAndDropContext, any> | undefined)[] = [];

    /**
     * Identify if the image was resized by the user.
     */
    private wasResized: boolean = false;

    /**
     * The span element that wraps the image and opens shadow dom
     */
    private shadowSpan: HTMLSpanElement | null = null;

    /**
     * The span element that wraps the image and opens shadow dom
     */
    private isCropping: boolean = false;

    /**
     * Create a new instance of ImageEdit
     * @param options Image editing options
     * @param onShowResizeHandle An optional callback to allow customize resize handle element of image resizing.
     * To customize the resize handle element, add this callback and change the attributes of elementData then it
     * will be picked up by ImageEdit code
     */
    constructor(
        editor: IEditor,
        options?: ImageEditOptions,
        private onShowResizeHandle?: OnShowResizeHandle
    ) {
        this.editor = editor;
        this.options = {
            ...DefaultOptions,
            ...(options || {}),
        };

        this.allowedOperations =
            ImageEditOperation.CornerResize |
            (this.options.disableCrop ? 0 : ImageEditOperation.Crop) |
            (this.options.disableRotate ? 0 : ImageEditOperation.Rotate) |
            (this.options.disableSideResize ? 0 : ImageEditOperation.SideResize);
    }

    /**
     * Check if the given image edit operation is allowed by this plugin
     * @param operation The image edit operation to check
     * @returns True means it is allowed, otherwise false
     */
    isOperationAllowed(operation: ImageEditOperation): boolean {
        return !!(this.allowedOperations & operation);
    }

    /**
     * Set current image for edit. If there is already image in editing, it will quit editing mode and any pending editing
     * operation will be submitted
     * @param image The image to edit
     * @param operation The editing operation
     */
    setEditingImage(
        image: HTMLImageElement,
        operation: ImageEditOperation | CompatibleImageEditOperation
    ): void;

    /**
     * Stop editing image. If there is already image in editing, it will quit editing mode and any pending editing
     * operation will be submitted
     * @param image The image to edit
     * @param selectImage True to select this image after quit editing mode
     */
    setEditingImage(image: null, selectImage?: boolean): void;

    setEditingImage(
        image: HTMLImageElement | null,
        operationOrSelect?: ImageEditOperation | CompatibleImageEditOperation | boolean
    ) {
        let operation =
            typeof operationOrSelect === 'number' ? operationOrSelect : ImageEditOperation.None;
        const selectImage = typeof operationOrSelect === 'number' ? false : !!operationOrSelect;

        if (
            !image &&
            this.image &&
            this.editor &&
            this.editInfo &&
            this.clonedImage &&
            this.lastSrc
        ) {
            // When there is image in editing, clean up any cached objects and elements
            this.clearDndHelpers();

            // Apply the changes, and add undo snapshot if necessary
            applyChange(
                this.editor,
                this.image,
                this.editInfo,
                this.lastSrc,
                this.wasResized,
                this.clonedImage
            );

            // Remove editing wrapper
            this.removeWrapper();

            this.editor.addUndoSnapshot(() => this.image, ChangeSource.ImageResize);

            if (selectImage) {
                this.editor.select(this.image);
            }

            this.image = null;
            this.editInfo = null;
            this.lastSrc = '';
            this.clonedImage = null;
            this.isCropping = false;
        }

        if (!this.image && image?.isContentEditable && this.editor) {
            // If there is new image to edit, enter editing mode for this image
            this.editor.addUndoSnapshot();
            this.image = image;

            // Get initial edit info
            this.editInfo = getEditInfoFromImage(image);

            //Check if the image was resized by the user
            this.wasResized = checkIfImageWasResized(this.image);

            operation =
                (canRegenerateImage(image) ? operation : ImageEditOperation.Resize) &
                this.allowedOperations;

            // Create and update editing wrapper and elements
            this.createWrapper(operation);
            this.updateWrapper();

            // Init drag and drop
            this.dndHelpers = [
                ...this.createDndHelpers(ImageEditElementClass.ResizeHandle, Resizer),
                ...this.createDndHelpers(ImageEditElementClass.RotateHandle, Rotator),
                ...this.createDndHelpers(ImageEditElementClass.CropHandle, Cropper),
                ...this.createDndHelpers(ImageEditElementClass.CropContainer, Cropper),
            ];

            this.editor.select(this.image);
        }
    }

    /**
     * Create editing wrapper for the image
     */
    private createWrapper(operation: ImageEditOperation | CompatibleImageEditOperation) {
        if (this.image && this.options && this.editInfo) {
            //Clone the image and insert the clone in a entity
            this.clonedImage = this.image.cloneNode(true) as HTMLImageElement;
            this.clonedImage.removeAttribute('id');
            this.wrapper = createElement(
                KnownCreateElementDataIndex.ImageEditWrapper,
                this.image.ownerDocument
            ) as HTMLSpanElement;
            this.wrapper.firstChild?.appendChild(this.clonedImage);
            this.wrapper.style.display = Browser.isSafari ? 'inline-block' : 'inline-flex';

            // Cache current src so that we can compare it after edit see if src is changed
            this.lastSrc = this.image.getAttribute('src');

            // Set image src to original src to help show editing UI, also it will be used when regenerate image dataURL after editing
            this.clonedImage.src = this.editInfo?.src ?? '';
            this.clonedImage.style.position = 'absolute';

            // Get HTML for all edit elements (resize handle, rotate handle, crop handle and overlay, ...) and create HTML element
            const options: ImageHtmlOptions = {
                borderColor: getColorString(
                    this.options.borderColor ?? '',
                    this.editor?.isDarkMode() ?? false
                ),
                rotateIconHTML: this.options.rotateIconHTML ?? '',
                rotateHandleBackColor: this.editor?.isDarkMode()
                    ? DARK_MODE_BGCOLOR
                    : LIGHT_MODE_BGCOLOR,
                isSmallImage: isASmallImage(this.editInfo),
            };
            const htmlData: CreateElementData[] = [getResizeBordersHTML(options)];

            getObjectKeys(ImageEditHTMLMap).forEach(thisOperation => {
                const element = ImageEditHTMLMap[thisOperation](options, this.onShowResizeHandle);
                if ((operation & thisOperation) == thisOperation && element) {
                    arrayPush(htmlData, element);
                }
            });

            htmlData.forEach(data => {
                const element = this.image?.ownerDocument
                    ? createElement(data, this.image?.ownerDocument)
                    : undefined;
                if (element) {
                    this.wrapper?.appendChild(element);
                }
            });
            this.insertImageWrapper(this.image, this.wrapper);
        }
    }

    private insertImageWrapper(image: HTMLImageElement, wrapper: HTMLSpanElement) {
        this.shadowSpan = wrap(image, 'span');
        const shadowRoot = this.shadowSpan.attachShadow({
            mode: 'open',
        });

        this.shadowSpan.style.verticalAlign = 'bottom';

        shadowRoot.appendChild(wrapper);
    }

    /**
     * Remove the temp wrapper of the image
     */
    private removeWrapper = () => {
        if (
            this.editor &&
            this.image &&
            this.editor.contains(this.image) &&
            this.wrapper &&
            this.image.parentNode
        ) {
            unwrap(this.image.parentNode);
        }
        this.wrapper = null;
        this.shadowSpan = null;
    };

    /**
     * Update image edit elements to reflect current editing result
     * @param context
     */
    private updateWrapper = (context?: DragAndDropContext) => {
        const wrapper = this.wrapper;
        if (
            wrapper &&
            this.editInfo &&
            this.image &&
            this.clonedImage &&
            this.shadowSpan &&
            this.shadowSpan.parentElement
        ) {
            // Prepare: get related editing elements
            const cropContainers = getEditElements(wrapper, ImageEditElementClass.CropContainer);
            const cropOverlays = getEditElements(wrapper, ImageEditElementClass.CropOverlay);
            const resizeHandles = getEditElements(wrapper, ImageEditElementClass.ResizeHandle);
            const rotateCenter = getEditElements(wrapper, ImageEditElementClass.RotateCenter)[0];
            const rotateHandle = getEditElements(wrapper, ImageEditElementClass.RotateHandle)[0];
            const cropHandles = getEditElements(wrapper, ImageEditElementClass.CropHandle);

            // Cropping and resizing will show different UI, so check if it is cropping here first
            this.isCropping = cropContainers.length == 1 && cropOverlays.length == 4;
            const {
                angleRad,
                bottomPercent,
                leftPercent,
                rightPercent,
                topPercent,
            } = this.editInfo;

            // Width/height of the image
            const {
                targetWidth,
                targetHeight,
                originalWidth,
                originalHeight,
                visibleWidth,
                visibleHeight,
            } = getGeneratedImageSize(this.editInfo, this.isCropping);
            const marginHorizontal = (targetWidth - visibleWidth) / 2;
            const marginVertical = (targetHeight - visibleHeight) / 2;
            const cropLeftPx = originalWidth * leftPercent;
            const cropRightPx = originalWidth * rightPercent;
            const cropTopPx = originalHeight * topPercent;
            const cropBottomPx = originalHeight * bottomPercent;

            // Update size and margin of the wrapper
            wrapper.style.margin = `${marginVertical}px ${marginHorizontal}px`;
            wrapper.style.transform = `rotate(${angleRad}rad)`;
            setWrapperSizeDimensions(wrapper, this.image, visibleWidth, visibleHeight);

            // Update the text-alignment to avoid the image to overflow if the parent element have align center or right
            // or if the direction is Right To Left
            wrapper.style.textAlign = isRtl(this.shadowSpan.parentElement) ? 'right' : 'left';

            // Update size of the image

            this.clonedImage.style.width = getPx(originalWidth) ?? '';
            this.clonedImage.style.height = getPx(originalHeight) ?? '';

            if (this.isCropping) {
                // For crop, we also need to set position of the overlays
                setSize(
                    cropContainers[0],
                    cropLeftPx,
                    cropTopPx,
                    cropRightPx,
                    cropBottomPx,
                    undefined,
                    undefined
                );
                setSize(cropOverlays[0], 0, 0, cropRightPx, undefined, undefined, cropTopPx);
                setSize(cropOverlays[1], undefined, 0, 0, cropBottomPx, cropRightPx, undefined);
                setSize(cropOverlays[2], cropLeftPx, undefined, 0, 0, undefined, cropBottomPx);
                setSize(cropOverlays[3], 0, cropTopPx, undefined, 0, cropLeftPx, undefined);

                updateHandleCursor(cropHandles, angleRad);
            } else {
                // For rotate/resize, set the margin of the image so that cropped part won't be visible
                this.clonedImage.style.margin = `${-cropTopPx}px 0 0 ${-cropLeftPx}px`;

                // Double check resize
                if (context?.elementClass == ImageEditElementClass.ResizeHandle && this.options) {
                    const clientWidth = wrapper.clientWidth;
                    const clientHeight = wrapper.clientHeight;
                    this.wasResized = true;
                    doubleCheckResize(
                        this.editInfo,
                        this.options.preserveRatio ?? false,
                        clientWidth,
                        clientHeight
                    );

                    this.updateWrapper();
                }
                const viewPort = this.editor?.getVisibleViewport();
                if (viewPort) {
                    updateRotateHandlePosition(
                        this.editInfo,
                        viewPort,
                        marginVertical,
                        rotateCenter,
                        rotateHandle
                    );
                }

                updateHandleCursor(resizeHandles, angleRad);
            }
        }
    };

    /**
     * Create drag and drop helpers
     * @param wrapper
     * @param elementClass
     * @param dragAndDrop
     */
    private createDndHelpers(
        elementClass: ImageEditElementClass,
        dragAndDrop: DragAndDropHandler<DragAndDropContext, any>
    ): (DragAndDropHelper<DragAndDropContext, any> | undefined)[] {
        const commonContext = {
            editInfo: this.editInfo,
            options: this.options,
            elementClass,
        };
        const wrapper = this.wrapper;
        return wrapper
            ? getEditElements(wrapper, elementClass).map(element => {
                  const info = {
                      ...commonContext,
                      x: element.dataset.x as DNDDirectionX,
                      y: element.dataset.y as DnDDirectionY,
                  } as DragAndDropContext;
                  return this.editor && this.editor.getZoomScale()
                      ? new DragAndDropHelper<DragAndDropContext, any>(
                            element,
                            info,
                            this.updateWrapper,
                            dragAndDrop,
                            this.editor?.getZoomScale()!
                        )
                      : undefined;
              })
            : [];
    }

    /**
     * Clean up drag and drop helpers
     */
    private clearDndHelpers() {
        this.dndHelpers?.forEach(helper => helper?.dispose());
        this.dndHelpers = [];
    }
}

function setSize(
    element: HTMLElement,
    left?: number,
    top?: number,
    right?: number,
    bottom?: number,
    width?: number,
    height?: number
) {
    if (left) {
        element.style.left = getPx(left) ?? '';
    }
    if (top) {
        element.style.top = getPx(top) ?? '';
    }
    if (right) {
        element.style.right = getPx(right) ?? '';
    }
    if (bottom) {
        element.style.bottom = getPx(bottom) ?? '';
    }
    if (width) {
        element.style.width = getPx(width) ?? '';
    }
    if (height) {
        element.style.height = getPx(height) ?? '';
    }
}

function setWrapperSizeDimensions(
    wrapper: HTMLElement,
    image: HTMLImageElement,
    width: number,
    height: number
) {
    const hasBorder = image.style.borderStyle;
    if (hasBorder) {
        const borderWidth = image.style.borderWidth ? 2 * parseInt(image.style.borderWidth) : 2;
        wrapper.style.width = getPx(width + borderWidth) ?? wrapper.style.width;
        wrapper.style.height = getPx(height + borderWidth) ?? wrapper.style.height;
        return;
    }
    const newWidth = getPx(width);
    const newHeight = getPx(height);
    if (newWidth && newHeight) {
        wrapper.style.width = newWidth;
        wrapper.style.height = newHeight;
    }
}

function getPx(value: number): string | undefined {
    return value === undefined ? undefined : value + 'px';
}

function getEditElements(wrapper: HTMLElement, elementClass: ImageEditElementClass): HTMLElement[] {
    return toArray(wrapper.querySelectorAll('.' + elementClass)) as HTMLElement[];
}

function isRtl(element: Node): boolean {
    return safeInstanceOf(element, 'HTMLElement')
        ? getComputedStyle(element, 'direction') == 'rtl'
        : false;
}

function handleRadIndexCalculator(angleRad: number): number {
    let idx = Math.round(angleRad / DirectionRad) % DIRECTIONS;
    return idx < 0 ? idx + DIRECTIONS : idx;
}

function rotateHandles(element: HTMLElement, angleRad: number): string | undefined {
    if (element.dataset.y && element.dataset.x) {
        const radIndex = handleRadIndexCalculator(angleRad);
        const originalDirection = element.dataset.y + element.dataset.x;
        const originalIndex = DirectionOrder.indexOf(originalDirection);
        const rotatedIndex: number = originalIndex >= 0 ? originalIndex + radIndex : 0;
        const order = rotatedIndex % DIRECTIONS;
        return DirectionOrder[order];
    }
}

/**
 * Rotate the resizer and cropper handles according to the image position.
 * @param handles The resizer handles.
 * @param angleRad The angle that the image was rotated.
 */
function updateHandleCursor(handles: HTMLElement[], angleRad: number) {
    handles.map(handle => {
        handle.style.cursor = `${rotateHandles(handle, angleRad)}-resize`;
    });
}

/**
 * Check if the current image was resized by the user
 * @param image the current image
 * @returns if the user resized the image, returns true, otherwise, returns false
 */
function checkIfImageWasResized(image: HTMLImageElement): boolean {
    const { width, height, style } = image;
    const isMaxWidthInitial =
        style.maxWidth === '' || style.maxWidth === 'initial' || style.maxWidth === 'auto';
    if (
        isMaxWidthInitial &&
        (isFixedNumberValue(style.height) ||
            isFixedNumberValue(style.width) ||
            isFixedNumberValue(width) ||
            isFixedNumberValue(height))
    ) {
        return true;
    } else {
        return false;
    }
}

function isFixedNumberValue(value: string | number) {
    const numberValue = typeof value === 'string' ? parseInt(value) : value;
    return !isNaN(numberValue);
}

function isASmallImage(editInfo: ImageEditInfo): boolean {
    const { widthPx, heightPx } = editInfo;
    const isSmall = widthPx && heightPx && widthPx * widthPx < MAX_SMALL_SIZE_IMAGE ? true : false;
    return isSmall;
}

function getColorString(color: string | ModeIndependentColor, isDarkMode: boolean): string {
    if (typeof color === 'string') {
        return color.trim();
    }
    return isDarkMode ? color.darkModeColor.trim() : color.lightModeColor.trim();
}
