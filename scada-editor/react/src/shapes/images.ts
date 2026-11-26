import { createContext, useContext } from 'react';

/** An uploaded image of the diagram: its data URL, natural size and name. */
export interface ImageEntry {
    readonly href: string;
    readonly width: number;
    readonly height: number;
    readonly name: string;
}

/** The uploaded images of the diagram, by their ids: saved with it, shown by the image shapes. */
export type DiagramImages = Readonly<Record<string, ImageEntry>>;

/** The images of the diagram, for the image shapes. */
export const ImagesContext = createContext<DiagramImages>({});

/** The image of the id, if the diagram has it. */
export function useImage(imageId: unknown): ImageEntry | undefined {
    const images = useContext(ImagesContext);
    return typeof imageId === 'string' && Object.hasOwn(images, imageId) ? images[imageId] : undefined;
}
