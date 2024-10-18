import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type RangeDimension from "../datastore/RangeDimension";
import type { BaseReactChart } from "./components/BaseReactChart";
import { PolygonLayer } from "@deck.gl/layers";
import { useScatterplotLayer } from "./scatter_state";
import { DrawPolygonByDraggingMode, EditableGeoJsonLayer, type GeoJsonEditMode } from "@deck.gl-community/editable-layers";
import type { FeatureCollection, Geometry, Position } from '@turf/helpers';
import { getVivId } from "./components/avivatorish/MDVivViewer";
import { useChartID, useRangeDimension } from "./hooks";
import { DrawRectangleByDraggingMode } from "@/editable-layers/deck-community-ish/draw-rectangle-by-dragging-mode";
/*****
 * Persisting some properties related to SelectionOverlay in "SpatialAnnotationProvider"... >>subject to change<<.
 * Not every type of chart will have a range dimension, and not every chart will have a selection overlay etc.
 * Needs will also get more complex, and now we have a somewhat convoluted way of doing something simple.
 * Probably going to be a zustand store in not too long.
 */

type P = [number, number];
type RefP = React.MutableRefObject<P>;
type RangeState = {
    polygonLayer: PolygonLayer;
    rangeDimension: RangeDimension;
    start: P;
    setStart: (p: P) => void;
    startRef: RefP;
    end: P;
    setEnd: (p: P) => void;
    endRef: RefP;
    selectionFeatureCollection: FeatureCollection;
    editableLayer: EditableGeoJsonLayer;
    selectionMode: GeoJsonEditMode;
    setSelectionMode: (mode: GeoJsonEditMode) => void;
};
type MeasureState = {
    startPixels: P;
    setStart: (p: P) => void;
    endPixels: P;
    setEnd: (p: P) => void;
};
type SpatialAnnotationState = {
    rectRange: RangeState;
    measure: MeasureState;
};

// Could more usefully be thought of as SpatialContext?
const SpatialAnnotationState = createContext<SpatialAnnotationState>(undefined);

const getEmptyFeatureCollection = () => ({
    type: "FeatureCollection",
    features: []
} as FeatureCollection);

function useSelectionCoords(selection: FeatureCollection) {
    const feature = selection.features[0];
    const coords = useMemo(() => {
        if (!feature) return [];
        //these casts are unsafe in a general sense, but should be ok in our editor.
        const geometry = feature.geometry as Geometry;
        const raw = geometry.coordinates as Position[][];
        return raw[0];
    }, [feature]);
    return coords as [number, number][];
}


function useCreateRange(chart: BaseReactChart<any>) {
    const ds = chart.dataStore;
    const id = useChartID();
    const [selectionFeatureCollection, setSelectionFeatureCollection] = useState<FeatureCollection>(getEmptyFeatureCollection());
    const [selectionMode, setSelectionMode] = useState<GeoJsonEditMode>(new DrawPolygonByDraggingMode());
    // tried simpler `rangeDimesion = useMemo(...)`, but it can lead to non-destroyed rangeDimensions with HMR.
    const rangeDimension = useRangeDimension();
    const cols = chart.config.param;
    const coords = useSelectionCoords(selectionFeatureCollection);
    useEffect(() => {
        if (coords.length === 0) {
            rangeDimension.removeFilter();
            return;
        }
        //rangeDimension.filterPoly(coords, [cols[0], cols[1]]); //this doesn't notify 🙄
        rangeDimension.filter("filterPoly", [cols[0], cols[1]], coords);
    }, [coords, cols, rangeDimension]);
    const [start, setStartX] = useState<P>([0, 0]);
    const [end, setEndX] = useState<P>([0, 0]);
    const polygonLayer = useMemo(() => {
        const data = [[start, [end[0], start[1]], end, [start[0], end[1]]]];
        const layer_id = `rect_${getVivId(`${id}detail-react`)}`;
        const layer = new PolygonLayer({
            id: layer_id, //todo: may want to be viv-like? <<
            data,

            getPolygon: d => d,
            getFillColor: [140, 140, 140, 50],
            getLineColor: [255, 255, 255, 200],
            getLineWidth: 1,
            lineWidthMinPixels: 1,
            // fillOpacity: 0.1, //not working? why is there a prop for it if it doesn't work?
            // opacity: 0.2,
        });
        return layer;
    }, [start, end, id]);
    const editableLayer = useMemo(() => {
        return new EditableGeoJsonLayer({
            id: `selection_${getVivId(`${id}detail-react`)}`,
            data: selectionFeatureCollection as any,
            mode: selectionMode,
            getFillColor: [140, 140, 140, 50],
            getLineColor: [255, 255, 255, 200],
            getLineWidth: 1,
            lineWidthMinPixels: 1,
            selectedFeatureIndexes: [0],
            onEdit: ({ updatedData, editType }) => {
                // console.log("onEdit", editType, updatedData);
                const feature = updatedData.features.pop();
                updatedData.features = [feature];
                setSelectionFeatureCollection(updatedData);
            }
        })
    }, [selectionFeatureCollection, selectionMode, id]);
    // still not sure I want these refs (- almost certainly not now)
    
    const startRef = useMemo(() => ({ current: start }), [start]);
    const endRef = useMemo(() => ({ current: end }), [end]);
    const setStart = (p: P) => {
        startRef.current[0] = p[0];
        startRef.current[1] = p[1];
        console.log("setting start", p);
        setStartX(p);
    };
    const setEnd = (p: P) => {
        endRef.current = p;
        setEndX(p);
    };
    return {
        polygonLayer,
        editableLayer,
        rangeDimension,
        start,
        setStart,
        startRef,
        end,
        setEnd,
        endRef,
        selectionFeatureCollection,
        selectionMode,
        setSelectionMode
    };
}
function useCreateMeasure() {
    const [startPixels, setStart] = useState<P>([0, 0]);
    const [endPixels, setEnd] = useState<P>([0, 0]);
    return { startPixels, setStart, endPixels, setEnd };
}
function useCreateSpatialAnnotationState(chart: BaseReactChart<any>) {
    // should we use zustand for this state?
    // doesn't matter too much as it's just used once by SpatialAnnotationProvider
    // consider for project-wide annotation stuff as opposed to ephemeral selections
    const rectRange = useCreateRange(chart);
    const measure = useCreateMeasure();
    return { rectRange, measure };
}

export function SpatialAnnotationProvider({
    chart,
    children,
}: { chart: BaseReactChart<any> } & React.PropsWithChildren) {
    const annotationState = useCreateSpatialAnnotationState(chart);
    return (
        <SpatialAnnotationState.Provider value={annotationState}>
            {children}
        </SpatialAnnotationState.Provider>
    );
}

export function useRange() {
    const range = useContext(SpatialAnnotationState).rectRange;
    if (!range) throw new Error("no range context");
    return range;
}

export function useMeasure() {
    const measure = useContext(SpatialAnnotationState).measure;
    if (!measure) throw new Error("no measure context");
    return measure;
}

/** work in progress... should this now be the thing we use? */
export function useSpatialLayers() {
    const { rectRange } = useContext(SpatialAnnotationState);
    const scatterProps = useScatterplotLayer();
    const { scatterplotLayer, getTooltip } = scatterProps;
    // const layers = [rectRange.polygonLayer, scatterplotLayer]; /// should probably be in a CompositeLayer?
    return { getTooltip, scatterProps, rectLayer: rectRange.polygonLayer, selectionLayer: rectRange.editableLayer };
}
