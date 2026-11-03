import { ui } from '@joint/plus';

import type { dia } from '@joint/plus';

export default class EditableTextWidget extends ui.Widget {

    preinitialize(): void {
        this.tagName = 'div';
    }

    events() {
        return {
            'blur': this.onBlur,
            'focus': this.onFocus,
            'change': this.onChange,
            'input': this.onInput
        };
    }

    render() {
        const opt = this.options;

        this.el.setAttribute('contenteditable', 'plaintext-only');

        if (opt.minWidth) {
            this.el.style.minWidth = `${opt.minWidth}px`;
        }

        if (opt.maxWidth) {
            this.el.style.maxWidth = `${opt.maxWidth}px`;
        }

        this.el.style.display = 'block';
        this.el.style.overflow = 'hidden';
        this.el.style.textOverflow = 'ellipsis';
        this.el.style.textWrap = 'nowrap';

        this.setValue(opt.value || '');

        return this;
    }

    setValue(value: string) {
        this.el.textContent = value;
    }

    onInput(evt: dia.Event) {
        const originalEvent = evt.originalEvent as InputEvent;
        if (originalEvent.inputType === 'insertLineBreak') {
            const text = this.el.textContent || '';
            this.el.textContent = text.replace(/\n/g, '');
            this.el.blur();
            return;
        }
    }

    onChange(evt: dia.Event) {
        this.trigger('change', this.el.textContent, evt);
    }

    onFocus() {
        this.el.style.textOverflow = 'unset';
    }

    onBlur(evt: dia.Event) {
        this.el.style.textOverflow = 'ellipsis';
        this.el.scrollLeft = 0;

        // Workaround for Webkit content editable focus bug
        // https://gist.github.com/shimondoodkin/1081133

        const editableFix = document.createElement('input');
        editableFix.setAttribute('disabled', 'true');
        editableFix.setAttribute('tabindex', '-1');
        editableFix.style.width = '1px';
        editableFix.style.height = '1px';
        editableFix.style.border = 'none';
        editableFix.style.margin = '0';
        editableFix.style.padding = '0';
        this.el.appendChild(editableFix);

        editableFix.focus();
        editableFix.setSelectionRange(0, 0);
        editableFix.blur();
        editableFix.remove();

        evt.target.dispatchEvent(new CustomEvent('change', { bubbles: true }));
    }
}
