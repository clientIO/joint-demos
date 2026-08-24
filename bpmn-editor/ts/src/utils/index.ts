import type { Marker } from '../shapes/shapes-typing';

/**
 * The DOM content of a marker option (icon + name) for the inspector.
 */
export function constructMarkerContent(marker: Marker) {

    // Create a span with the bpmn class
    const markerIcon = document.createElement('span');
    markerIcon.classList.add(marker.cssClass);

    // Create a span with the marker name
    const content = document.createElement('span');
    content.innerText = marker.name;

    return [markerIcon, content];
}

export * from './elements';
export * from './events';
export * from './links';
export * from './import';
