/**
 * Open the native file picker dialog and upload an image.
 */
export function openImagePicker(callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => {
        const [file] = Array.from(input.files);
        if (!file)
            return;
        const reader = new FileReader();
        reader.onloadend = () => callback(reader.result);
        reader.readAsDataURL(file);
    };
    input.click();
}

/**
 * Prepend https:// to humanized URLs
 */
export function prependHttp(url, { https = true } = {}) {
    url = url.trim();
    if (/^\.*\/|^(?!localhost)\w+?:/.test(url)) {
        return url;
    }
    return url.replace(/^(?!(?:\w+?:)?\/\/)/, https ? 'https://' : 'http://');
}

/**
 * Gets keyboard-focusable text field elements within a specified element
 */
export function getFocusableTextFieldElements(element) {
    const textFields = Array.from(element.querySelectorAll('input, textarea'));
    return textFields.filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
}
