/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

var App = App || {};
App.config = App.config || {};

const OPEN_SANS_URL = '/assets/fonts/OpenSans.ttf';
const DM_SANS_URL = '/assets/fonts/DMSans.ttf';
const ROBOTO_FLEX_URL = '/assets/fonts/RobotoFlex.ttf';

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

(async function(){
    const openSans = await fetch(OPEN_SANS_URL);
    const openSansBase64 = await base64convert(await openSans.blob());

    const dmSans = await fetch(DM_SANS_URL);
    const dmSansBase64 = await base64convert(await dmSans.blob());

    const robotoFlex = await fetch(ROBOTO_FLEX_URL);
    const robotoFlexBase64 = await base64convert(await robotoFlex.blob());

    // font-face declarations to be used when exporting
    
    App.config.fontStyleSheet = `
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
        font-style: italic;
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
})();
