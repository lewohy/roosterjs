import { createFormatContext } from '../../../lib/formatHandlers/createFormatContext';
import { FormatContext } from '../../../lib/formatHandlers/FormatContext';
import { VerticalAlignFormat } from '../../../lib/publicTypes/format/formatParts/VerticalAlignFormat';
import { verticalAlignFormatHandler } from '../../../lib/formatHandlers/common/verticalAlignFormatHandler';

describe('verticalAlignFormatHandler.parse', () => {
    let div: HTMLElement;
    let format: VerticalAlignFormat;
    let context: FormatContext;

    beforeEach(() => {
        div = document.createElement('div');
        format = {};
        context = createFormatContext();
    });

    function runTest(
        cssValue: string | null,
        attrValue: string | null,
        expectedValue: 'top' | 'middle' | 'bottom'
    ) {
        if (cssValue) {
            div.style.verticalAlign = cssValue;
        }

        if (attrValue) {
            div.setAttribute('valign', attrValue);
        }

        verticalAlignFormatHandler.parse(format, div, context);

        expect(format).toEqual({
            verticalAlign: expectedValue,
        });
    }

    it('No alignment', () => {
        verticalAlignFormatHandler.parse(format, div, context);
        expect(format).toEqual({});
    });

    it('Align in CSS', () => {
        runTest('top', null, 'top');
    });

    it('Align in attribute', () => {
        runTest(null, 'top', 'top');
    });

    it('Align in both CSS and attribute', () => {
        runTest('top', 'bottom', 'top');
    });

    it('Other values', () => {
        runTest('baseline', null, 'top');
        runTest('initial', null, 'top');
        runTest('super', null, 'top');
        runTest('sub', null, 'top');
        runTest('text-top', null, 'top');
        runTest('text-bottom', null, 'top');
        runTest('bottom', null, 'bottom');
    });
});

describe('verticalAlignFormatHandler.apply', () => {
    let div: HTMLElement;
    let format: VerticalAlignFormat;
    let context: FormatContext;

    beforeEach(() => {
        div = document.createElement('div');
        format = {};
        context = createFormatContext();
    });

    it('No alignment', () => {
        verticalAlignFormatHandler.apply(format, div, context);
        expect(div.outerHTML).toBe('<div></div>');
    });

    it('top', () => {
        format.verticalAlign = 'top';
        verticalAlignFormatHandler.apply(format, div, context);
        expect(div.outerHTML).toBe('<div style="vertical-align: top;"></div>');
    });

    it('middle', () => {
        format.verticalAlign = 'middle';
        verticalAlignFormatHandler.apply(format, div, context);
        expect(div.outerHTML).toBe('<div style="vertical-align: middle;"></div>');
    });

    it('bottom', () => {
        format.verticalAlign = 'bottom';
        verticalAlignFormatHandler.apply(format, div, context);
        expect(div.outerHTML).toBe('<div style="vertical-align: bottom;"></div>');
    });
});