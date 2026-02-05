import { type dia, g, connectors } from '@joint/plus';

/**
 * The number of cubic Bézier segments that will be generated as a result of cubicConnector.
 * This is a necessary in order for the links to be animated smoothly.
 * @see {@link cubicConnector}
 * @see {@link lineToCubic}
 * @see {@link ensureCubicCount}
 */
const LINK_CURVES_COUNT = 9;

/**
 * JointJS connector that converts all path segments to cubic Bézier segments. So that CSS transitions can interpolate smoothly between the states of the link.
 */
export default function cubicConnector<K extends connectors.ConnectorType = 'normal'>(
    sourcePoint: g.Point,
    targetPoint: g.Point,
    routePoints: g.Point[],
    _: connectors.GenericConnectorArguments<K>,
    linkView: dia.LinkView
): g.Path {
    const opt: connectors.StraightConnectorArguments = {
        cornerType: 'cubic',
        cornerRadius: 12,
        raw: true // Return the path object directly
    };

    // `cubic` corner type ensures that the result path consists of Moveto, Curveto, and Lineto segments.
    const path = connectors.straight(sourcePoint, targetPoint, routePoints, opt, linkView) as g.Path;

    const segmentsCount = path.segments.length;

    for (let i = 0; i < segmentsCount; i++) {
        const segment = path.segments[i];
        if (segment.type === 'M' || segment.type === 'C') continue;
        else if (!segment.start || !segment.end) continue;
        // Replace line segments with cubic segments
        path.replaceSegment(i, lineToCubic(segment.start, segment.end));
    }

    return ensureCubicCount(path, LINK_CURVES_COUNT);
}

// - Helper functions

/**
 * Converts a line segment to a cubic segment
 * @param from - The start point of the line segment
 * @param to - The end point of the line segment
 * @returns The cubic segment
 */
function lineToCubic(from: g.Point, to: g.Point): g.Segment {
    const cp1 = new g.Point(
        from.x + (to.x - from.x) / 3,
        from.y + (to.y - from.y) / 3
    );
    const cp2 = new g.Point(
        from.x + (to.x - from.x) * 2 / 3,
        from.y + (to.y - from.y) * 2 / 3
    );

    return g.Path.createSegment('C', cp1, cp2, to.clone()) as g.Segment;
}

/**
 * Ensures a path has exactly `targetCurves` cubic Bézier segments by
 * subdividing existing cubics at their midpoint (round-robin).
 * @param path - The path to ensure the cubic count of, expects to start with a MoveTo and otherwise only contain cubic segments
 * @param targetCurves - The target number of cubic segments
 * @returns The path with the target number of cubic segments
 */
function ensureCubicCount(path: g.Path, targetCurves: number): g.Path {
    const result = path.clone();
    const segments = result.segments;

    if (!segments.length || segments[0].type !== 'M') return result;

    // Collect indices of all cubic segments
    const cubicIndices: number[] = [];
    for (let i = 1; i < segments.length; i++) {
        if (segments[i].type === 'C') cubicIndices.push(i);
    }

    if (cubicIndices.length >= targetCurves) return result;

    // Subdivide existing cubics until we reach the target count
    const curvesToAdd = targetCurves - cubicIndices.length;

    for (let i = 0; i < curvesToAdd; i++) {
        const listIndex = i % cubicIndices.length;
        const segmentIndex = cubicIndices[listIndex];

        // Split this cubic in half
        const segment = result.getSegment(segmentIndex)!;

        if (!segment) continue;

        const [first, second] = segment.divideAt(0.5);
        result.replaceSegment(segmentIndex, first);
        result.insertSegment(segmentIndex + 1, second);

        // Shift all subsequent indices by 1 and insert the new segment index
        for (let j = listIndex + 1; j < cubicIndices.length; j++) {
            cubicIndices[j]++;
        }
        cubicIndices.splice(listIndex + 1, 0, segmentIndex + 1);
    }

    return result;
}
