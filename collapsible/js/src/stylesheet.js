import semiboldFontUrl from '../assets/fonts/sourcesanspro-semibold-webfont.woff2';

function base64convert(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

let cachedStyleSheet = null;

export async function paperStyleSheet() {
    if (!cachedStyleSheet) {
        const semiboldFont = await fetch(semiboldFontUrl);
        const semiboldFontBase64 = await base64convert(await semiboldFont.blob());

        cachedStyleSheet = `
            @font-face {
                font-family: 'sourcesanspro_semibold';
                src: url(${semiboldFontBase64}) format('woff2');
                font-style: normal;
                font-weight: 600;
            }
        `;
    }

    return cachedStyleSheet;
}
