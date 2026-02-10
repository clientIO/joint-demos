import { ui, mvc, util } from '@joint/plus';
import { COLORS, FONT_FAMILIES, FONT_SIZES } from './config';

export class RichTextToolbar extends mvc.View {

    constructor(options) {
        super(options);
    }

    preinitialize() {
        this.className = 'rich-text-toolbar';
        this.defaultTheme = null;
    }

    init() {
        const { openPolicy = 'coverBelow' } = this.options;

        // Text Color
        const textColorInput = new ui.ColorPalette({
            target: this.el,
            placeholder: 'N/A',
            openPolicy,
            options: COLORS.map(color => ({ content: color })),
        });
        textColorInput.render();
        textColorInput.on('option:select', (_option, _index, opt) => {
            if (opt.silent)
                return;
            this.setCurrentAnnotation();
        });
        this.el.appendChild(textColorInput.el);
        this.textColorInput = textColorInput;

        // Text Style
        const textStyleInput = new ui.SelectButtonGroup({
            multi: true,
            selected: [],
            options: [
                { value: 'underline', content: '<span style="text-decoration: underline">U</span>' },
                { value: 'italic', content: '<span style="font-style: italic">I</span>' },
                { value: 'bold', content: '<span style="font-weight: bold">B</span>' }
            ]
        });
        textStyleInput.render();
        textStyleInput.on('option:select', (_option, _index, opt) => {
            if (opt.silent)
                return;
            this.setCurrentAnnotation();
        });
        this.el.appendChild(textStyleInput.el);
        this.textStyleInput = textStyleInput;

        // Font Size
        const fontSizeInput = new ui.SelectBox({
            openPolicy,
            target: this.el,
            width: 150,
            placeholder: 'N/A',
            options: FONT_SIZES.map(size => ({ content: size }))
        });
        fontSizeInput.render();
        fontSizeInput.on('option:select', (_option, _index, opt) => {
            if (opt.silent)
                return;
            this.setCurrentAnnotation();
        });
        this.el.appendChild(fontSizeInput.el);
        this.fontSizeInput = fontSizeInput;

        // Font Family
        const fontFamilyInput = new ui.SelectBox({
            openPolicy,
            target: this.el,
            width: 150,
            placeholder: 'N/A',
            options: FONT_FAMILIES.map(font => {
                const [fontName] = font.split(',');
                return {
                    value: font,
                    content: `<span style="font-family:${font}">${fontName}</span>`
                };
            })
        });
        fontFamilyInput.render();
        fontFamilyInput.on('option:select', (_option, _index, opt) => {
            if (opt.silent)
                return;
            this.setCurrentAnnotation();
        });
        this.el.appendChild(fontFamilyInput.el);
        this.fontFamilyInput = fontFamilyInput;

        // Clear Formatting
        const clearFormattingButton = document.createElement('button');
        clearFormattingButton.className = 'clear-formatting-button';
        clearFormattingButton.textContent = 'Ⱦ';
        clearFormattingButton.addEventListener('click', () => {
            this.resetAnnotation();
        });
        this.el.appendChild(clearFormattingButton);
        this.clearFormattingInput = clearFormattingButton;
    }

    enable() {
        this.textColorInput.enable();
        this.textStyleInput.enable();
        this.fontSizeInput.enable();
        this.fontFamilyInput.enable();
        this.clearFormattingInput.disabled = false;
    }

    disable() {
        this.textColorInput.disable();
        this.textStyleInput.disable();
        this.fontSizeInput.disable();
        this.fontFamilyInput.disable();
        this.clearFormattingInput.disabled = true;
    }

    onRemove() {
        this.textColorInput.remove();
        this.textStyleInput.remove();
        this.fontSizeInput.remove();
        this.fontFamilyInput.remove();
    }

    resetAnnotation() {

        const { options } = this;
        const { defaultAttributes = {}, setAttributes = () => { } } = options;
        const attrs = Object.assign({}, defaultAttributes);
        setAttributes(attrs);
        this.updateInputs(attrs);
    }

    setCurrentAnnotation() {

        const { options, textColorInput, textStyleInput, fontSizeInput, fontFamilyInput } = this;
        const { defaultAttributes = {}, setAttributes = () => { } } = options;

        const textStyle = textStyleInput.getSelectionValue();
        const textColor = textColorInput.getSelectionValue();
        const fontSize = fontSizeInput.getSelectionValue();
        const fontFamily = fontFamilyInput.getSelectionValue();

        const attrs = Object.assign({}, defaultAttributes);

        if (fontSize === undefined) {
            delete attrs['font-size'];
        }
        else {
            attrs['font-size'] = parseInt(fontSize, 10);
        }
        if (fontFamily === undefined) {
            delete attrs['font-family'];
        }
        else {
            attrs['font-family'] = fontFamily;
        }
        if (textColor === undefined) {
            delete attrs['fill'];
        }
        else {
            attrs['fill'] = textColor;
        }
        if (textStyle.includes('bold')) {
            attrs['font-weight'] = 'bold';
        }
        else if (this.fontWeightUndefined) {
            delete attrs['font-weight'];
        }
        if (textStyle.includes('italic')) {
            attrs['font-style'] = 'italic';
        }
        else if (this.fontStyleUndefined) {
            delete attrs['font-style'];
        }
        if (textStyle.includes('underline')) {
            attrs['text-decoration'] = 'underline';
        }
        else if (this.textDecorationUndefined) {
            delete attrs['text-decoration'];
        }

        this.fontWeightUndefined = false;
        this.fontStyleUndefined = false;
        this.textDecorationUndefined = false;

        setAttributes(attrs);
    }

    updateInputs(attrs) {

        const { textColorInput, textStyleInput, fontSizeInput, fontFamilyInput } = this;
        const silently = { silent: true };

        if (attrs['fill']) {
            textColorInput.selectByValue(attrs['fill'], silently);
        }
        else {
            textColorInput.select(-1, silently);
        }

        if (attrs['font-size']) {
            fontSizeInput.selectByValue(attrs['font-size'] + 'px', silently);
        }
        else {
            fontSizeInput.select(-1, silently);
        }

        if (attrs['font-family']) {
            fontFamilyInput.selectByValue(attrs['font-family'], silently);
        }
        else {
            fontFamilyInput.select(-1, silently);
        }

        textStyleInput.deselect();

        if (attrs['font-weight'] === undefined) {
            this.fontWeightUndefined = true;
        }
        else if (attrs['font-weight'] === 'bold') {
            textStyleInput.selectByValue('bold', silently);
        }

        if (attrs['text-decoration'] === undefined) {
            this.textDecorationUndefined = true;
        }
        else if (attrs['text-decoration'] === 'underline') {
            textStyleInput.selectByValue('underline', silently);
        }

        if (attrs['font-style'] === undefined) {
            this.fontStyleUndefined = true;
        }
        else if (attrs['font-style'] === 'italic') {
            textStyleInput.selectByValue('italic', silently);
        }
    }

    updateInputsDebounced = util.debounce((attrs) => {
        this.updateInputs(attrs);
    }, 50);
}
