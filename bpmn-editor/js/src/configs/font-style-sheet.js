const OPEN_SANS_URL = 'assets/fonts/OpenSans.ttf';
const DM_SANS_URL = 'assets/fonts/DMSans.ttf';
const ROBOTO_FLEX_URL = 'assets/fonts/RobotoFlex.ttf';

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

export const fontsStyleSheet = async () => {
    
    const openSans = await fetch(OPEN_SANS_URL);
    const openSansBase64 = await base64convert(await openSans.blob());
    
    const dmSans = await fetch(DM_SANS_URL);
    const dmSansBase64 = await base64convert(await dmSans.blob());
    
    const robotoFlex = await fetch(ROBOTO_FLEX_URL);
    const robotoFlexBase64 = await base64convert(await robotoFlex.blob());
    
    // font-face declarations to be used when exporting
    return `
    @font-face {
        font-family: 'Open Sans';
        font-stretch: 75% 125%;
        font-style: normal;
        font-weight: 125 950;
        src: url(${openSansBase64}) format('truetype');
    }

    @font-face {
        font-family: 'DM Sans';
        font-stretch: 75% 125%;
        font-style: normal;
        font-weight: 125 950;
        src: url(${dmSansBase64}) format('truetype');
    }

    @font-face {
        font-family: 'Roboto Flex';
        font-stretch: 75% 125%;
        font-style: normal;
        font-weight: 125 950;
        src: url(${robotoFlexBase64}) format('truetype');
    }
    `;
};
