import * as cv from '@techstark/opencv-js';

function blur(evt) {
    const image = evt.data.data[0];
    const size = evt.data.data[1];

    try {
        const mat = new cv.matFromArray(image[0], image[1], image[2], image[3]);
        const result = new cv.Mat();
        cv.blur(mat, result, new cv.Size(size, size));

        evt.ports[0].postMessage({ result: [result.rows, result.cols, result.type(), result.data] });
    } catch (error) {
        evt.ports[0].postMessage({ error: error.message });
    }
}

onmessage = async(evt) => {
    switch (evt.data.msg) {
        case 'load': {
            // eslint-disable-next-line no-import-assign
            cv.onRuntimeInitialized = () => {
                evt.ports[0].postMessage({});
            };
            break;
        }
        case 'blur': {
            blur(evt);
            break;
        }
        default:
            break;
    }
};
