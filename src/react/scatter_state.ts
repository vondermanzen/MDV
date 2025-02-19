import type { Matrix4 } from "@math.gl/core";
import type { PickingInfo } from "@deck.gl/core";
import type { ScatterPlotConfig } from "./components/VivMDVReact";
import { useChart } from "./context";
import {
    useChartID,
    useChartSize,
    useConfig,
    useFilteredIndices,
    useParamColumns,
} from "./hooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getVivId } from "./components/avivatorish/MDVivViewer";
import { useMetadata } from "./components/avivatorish/state";
import type { ViewState } from "./components/VivScatterComponent";
import SpatialLayer from "@/webgl/SpatialLayer";
import {
    ScatterSquareExtension,
    ScatterDensityExension,
} from "../webgl/ScatterDeckExtension";
import { useHighlightedIndex } from "./selectionHooks";
import { useLegacyDualContour } from "./contour_state";

export function useRegionScale() {
    const metadata = useMetadata();
    const chart = useChart();
    const regionScale = chart.dataStore.regions.scale;
    const regionUnit = chart.dataStore.regions.scale_unit;

    //see also getPhysicalScalingMatrix
    //- consider state, matrices for image, scatterplot/other layers, and options to manipulate them
    //MDVProject.set_region_scale assumes that all regions have the same scale?
    if (!metadata) return 1; // / regionScale?; // might want to start using this with non-image data that has real units
    const { Pixels } = metadata;
    if (Pixels.PhysicalSizeXUnit !== regionUnit)
        console.warn(
            `physical size unit mismatch ${Pixels.PhysicalSizeXUnit} !== ${regionUnit}`,
        );
    const scale = Pixels.PhysicalSizeX / regionScale;
    return scale;
}


function useZoomOnFilter(modelMatrix: Matrix4) {
    const config = useConfig<ScatterPlotConfig>();
    const data = useFilteredIndices();
    const [cx, cy] = useParamColumns();
    const [chartWidth, chartHeight] = useChartSize(); //not sure we want this, potentially re-rendering too often...
    // not using as dependency for scaling viewState to data - we don't want to zoom as chart size changes
    // (at least for now - may consider making this configurable / testing it out)

    const [viewState, setViewState] = useState<ViewState>(null); //we should consider how this interacts with viv ViewerStore
    useEffect(() => {
        if (!config.zoom_on_filter) return;
        if (data.length === 0) {
            setViewState(null);
            return;
        }
        // Step 1: Calculate the bounding box of the data
        // with a loop to avoid spread operator & stack overflow etc
        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        for (let i = 0; i < data.length; i++) {
            const d = data[i];
            try {
                const x = cx.data[d];
                const y = cy.data[d];
                if (!Number.isFinite(x) || !Number.isFinite(y)) {
                    console.warn("undefined data in scatterplot");
                    continue;
                }
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            } catch (e) {
                console.error("error calculating bounding box", e);
                return;
            }
        }

        // Step 2: Calculate the center of the bounding box
        // - take into account transform matrices
        // could review using scatterplotLayer.project / projectPosition
        // quicker to do once than for every point
        [minX, minY] = modelMatrix.transformAsPoint([minX, minY, 0]);
        [maxX, maxY] = modelMatrix.transformAsPoint([maxX, maxY, 0]);

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // modelMatrix.transformPoint([centerX, centerY, 0]);

        // Step 3: Calculate the zoom level
        // see viv's getDefaultInitialViewState for reference, especially when it comes to 3D in the future
        // should allow some padding around the edges, based on radius, and/or some config value
        const { min, log2 } = Math;
        const maxZoom = 5;
        const trueSelectionWidth = maxX - minX; // * scale;
        const trueSelectionHeight = maxY - minY; // * scale;
        const xZoom = log2(chartWidth / trueSelectionWidth);
        const yZoom = log2(chartHeight / trueSelectionHeight);
        const zoomBackOff = 0.05;
        const zoom = min(maxZoom, min(xZoom, yZoom) - zoomBackOff);
        // Step 4: Set the view state that will be picked up by the user of this hook
        // may want to use viv viewerStore - but we don't want scatterplot to depend on that
        setViewState({
            target: [centerX, centerY, 0],
            zoom: zoom,
            // minZoom: -10,
            maxZoom,
            transitionDuration: 400, // Smooth transition
            transitionEasing: (x) => -(Math.cos(Math.PI * x) - 1) / 2, //https://easings.net/#easeInOutSine
            // transitionInterpolator: new FlyToInterpolator({speed: 1}), //applicable for MapState - latitude is required
        });
    }, [
        data,
        cx,
        cy,
        chartHeight,
        chartWidth,
        config.zoom_on_filter,
        modelMatrix.transformAsPoint,
    ]);
    return viewState;
}

type Tooltip = (PickingInfo) => string;
type P = [number, number];
export function useScatterplotLayer(modelMatrix: Matrix4) {
    const id = useChartID();
    const chart = useChart();
    const colorBy = (chart as any).colorBy;
    const config = useConfig<ScatterPlotConfig>();

    const { opacity, radius, course_radius } = config;
    const radiusScale = radius * course_radius;

    const data = useFilteredIndices();
    const [cx, cy, contourParameter] = useParamColumns();
    const hoverInfoRef = useRef<PickingInfo>(null);
    const highlightedIndex = useHighlightedIndex();
    // const [highlightedObjectIndex, setHighlightedObjectIndex] = useState(-1);
    const getLineWidth = useCallback(
        (i: number) => {
            return i === highlightedIndex ? (0.2 * radiusScale) / scale : 0.0;
        },
        [radiusScale, highlightedIndex],
    );
    const contourLayers = useLegacyDualContour();

    const tooltipCol = useMemo(() => {
        if (!config.tooltip) return undefined;
        return chart.dataStore.columnIndex[config.tooltip.column];
    }, [config.tooltip, config.tooltip.column, chart.dataStore.columnIndex]);
    const getTooltipVal = useCallback(
        (i: number) => {
            // if (!tooltipCol?.data) return '#'+i;
            return tooltipCol.getValue(data[i]);
        },
        [tooltipCol, data],
    );
    // biome-ignore lint/correctness/useExhaustiveDependencies: fix this
    const getTooltip = useCallback(
        //todo nicer tooltip interface (and review how this hook works)
        ({ object }) => {
            if (!config.tooltip.show) return;
            // testing reading object properties --- pending further development
            // (not hardcoding DN property etc)
            // if (object && object?.properties?.DN) return `DN: ${object.properties.DN}`;
            const hoverInfo = hoverInfoRef.current;
            return (
                hoverInfo &&
                hoverInfo.index !== -1 &&
                `${config.tooltip.column}: ${getTooltipVal(hoverInfo.index)}`
            );
        },
        [hoverInfoRef, getTooltipVal, config.tooltip.show],
    );

    const scale = useRegionScale();
    // const { modelMatrix, setModelMatrix } = useScatterModelMatrix();
    const viewState = useZoomOnFilter(modelMatrix);
    const { point_shape } = config;

    const extensions = useMemo(() => {
        if (point_shape === "circle") return [];
        if (point_shape === "gaussian") return [new ScatterDensityExension()];
        return [new ScatterSquareExtension()];
    }, [point_shape]);
    const [currentLayerHasRendered, setCurrentLayerHasRendered] =
        useState(false);
    const scatterplotLayer = useMemo(() => {
        setCurrentLayerHasRendered(false); //<<< this is fishy
        return new SpatialLayer({
            //new
            // loaders //<< this will be interesting to learn about
            id: `scatter_${getVivId(`${id}detail-react`)}`, // should satisfy VivViewer, could make this tidier
            data,
            opacity,
            radiusScale,
            getFillColor: colorBy ?? [255, 255, 255],
            getRadius: 1 / scale,
            // todo review buffer data / accessors / filters...
            getPosition: (i: number, { target }) => {
                target[0] = cx.data[i];
                target[1] = cy.data[i];
                target[2] = 0;
                return target as unknown as Float32Array; // deck.gl types are wrong AFAICT
            },
            modelMatrix,
            updateTriggers: {
                getFillColor: colorBy, //this is working; removing it breaks the color change...
                // modelMatrix: modelMatrix, // this is not necessary, manipulating the matrix works anyway
                // getLineWith: clickIndex, // this does not work, seems to need something like a function
                getLineWidth,
                //as of now, the SpatialLayer implemetation needs to figure this out for each sub-layer.
                // getContourWeight1: config.category1,
            },
            pickable: true,
            onHover: (info) => {
                hoverInfoRef.current = info;
            },
            stroked: data.length < 1000, //todo make this configurable, and fix issue...
            // todo figure out why lineWidth 0 still shows up, particularly when zoomed out
            // can we make it have zero opacity? Seems like lineColor is rgb, not rgba...
            // >>> may need a layer extension to do this properly; may want that anyway for other reasons <<<
            getLineWidth,
            //trying to set line color to same as fill, but it makes things very muddy when zoomed out
            //getLineColor: i => i === clickIndexRef.current ? [255, 255, 255] : colorBy ?? [200, 200, 200],
            // lineColorBy...
            getLineColor: [255, 255, 255],
            // highlightedObjectIndex, // has some undesirable effects, but could be useful when better controlled
            onClick: ({ index }) => {
                // setHighlightedObjectIndex(index);
                //todo properly synchronise state with data store, allow deselection
                chart.dataStore.dataHighlighted([data[index]], chart);
                // timeout allowed us to highlight & redraw this chart before heavy blocking filter operations...
                // but now we get highlight from useHighlightedIndex() we'd need more logic to short-circuit that.
                // Really want to make the filtering async etc.
                // setTimeout(()=> chart.dataStore.dataHighlighted([data[index]], chart), 5);
            },
            transitions: {
                // this leads to weird behaviour when filter changes, looks ok when changing colorBy
                // getFillColor: {
                //     duration: 300,
                // },
            },
            // ...config, //make sure contour properties are passed through
            contourLayers,
            extensions,
        });
    }, [
        id,
        data,
        opacity,
        radiusScale,
        colorBy,
        cx,
        cy,
        scale,
        modelMatrix,
        extensions,
        chart,
        getLineWidth,
        contourLayers,
    ]);
    const unproject = useCallback(
        (e: MouseEvent | React.MouseEvent | P) => {
            if (!currentLayerHasRendered || !scatterplotLayer.internalState)
                throw new Error("scatterplotLayer not ready");
            if (Array.isArray(e))
                e = { clientX: e[0], clientY: e[1] } as MouseEvent;
            const r = chart.contentDiv.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;
            const p = scatterplotLayer.unproject([x, y]) as P;
            //still need to reason better about transforms...
            // const scale = 1; //this was only right when Pixels.PhysicalSizeX === regions.scale
            // const p2 = p.map(v => v * scale) as P;
            const m = modelMatrix.invert();
            const p3 = m.transform(p) as P;
            m.invert();
            return p3;
        },
        [
            scatterplotLayer,
            modelMatrix,
            currentLayerHasRendered,
            chart.contentDiv.getBoundingClientRect,
        ],
    );
    // const project =
    const onAfterRender = useCallback(
        () => setCurrentLayerHasRendered(true),
        [],
    );
    return useMemo(
        () => ({
            scatterplotLayer,
            getTooltip,
            modelMatrix,
            viewState,
            currentLayerHasRendered,
            onAfterRender,
            unproject,
        }),
        [
            scatterplotLayer,
            getTooltip,
            modelMatrix,
            viewState,
            currentLayerHasRendered,
            onAfterRender,
            unproject,
        ],
    );
}
