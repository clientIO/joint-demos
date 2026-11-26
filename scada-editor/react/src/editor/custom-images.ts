import type { ElementRecord } from '@joint/react-plus';
import { CUSTOM_IMAGE } from '../shapes/diagram';
import { isImageDataUrl } from '../files/guards';
import type { ImageEntry } from '../shapes/images';
import type { ShapeData } from '../shapes/types';
import { GRID_SIZE } from './connection-rules';
import { createShape } from './new-cells';

/*
 * The images of the user: uploaded into the diagram (saved with it, once, however many elements show them), in the
 * Custom group of the palette, renamed or deleted in its preview.
 */

// The default size of an image: as much area as a square of this side (a wide image is wider, not smaller)...
const IMAGE_SIZE = 100;
// ...with its longer side at most this long...
const IMAGE_MAX_SIDE = 240;
// ...in two steps of the grid.
const IMAGE_SIZE_STEP = 2 * GRID_SIZE;
/** The key of an image in the palette and the favorites: `CustomImage:<id>`. */
const IMAGE_KEY_PREFIX = 'CustomImage:';

/** The key of the image in the palette and the favorites. */
export const imageKeyOf = (imageId: string): string => `${IMAGE_KEY_PREFIX}${imageId}`;

/** The image id of a palette key, if it is an image's. */
export const imageIdOfKey = (key: string): string | null => (key.startsWith(IMAGE_KEY_PREFIX) ? key.slice(IMAGE_KEY_PREFIX.length) : null);

/** A new element showing the image: in its aspect ratio, as much area as the default size, named after it. */
export function imageShapeOf(imageId: string, image: ImageEntry): ElementRecord<ShapeData> {
    const areaScale = IMAGE_SIZE / Math.sqrt(image.width * image.height);
    const scale = Math.min(areaScale, IMAGE_MAX_SIDE / Math.max(image.width, image.height));
    const step = (value: number) => Math.max(IMAGE_SIZE_STEP, Math.round((value * scale) / IMAGE_SIZE_STEP) * IMAGE_SIZE_STEP);
    const record = createShape(CUSTOM_IMAGE, { data: { imageId, label: { text: image.name, position: 'bottom' } } });
    return { ...record, size: { width: step(image.width), height: step(image.height) } };
}

/** A file name without its extension. */
const baseName = (fileName: string) => fileName.replace(/\.[^.]+$/, '');

/** The image of a file (a data URL, its natural size, its name), or `null` if it is not an image. */
export function readImageFile(file: File): Promise<ImageEntry | null> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => {
            const href = reader.result;
            // A data URL of an image only: nothing else is shown as one (nor saved with the diagram).
            if (!isImageDataUrl(href)) {
                resolve(null);
                return;
            }
            const image = new Image();
            image.onload = () => resolve({ href, width: image.naturalWidth, height: image.naturalHeight, name: baseName(file.name) });
            image.onerror = () => resolve(null);
            image.src = href;
        });
        reader.addEventListener('error', () => resolve(null));
        reader.readAsDataURL(file);
    });
}
