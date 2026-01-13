import React from "react";
import ForceGraph3D, {
    ForceGraphMethods,
    GraphData,
    LinkObject,
    NodeObject,
} from "react-force-graph-3d";
import { GraphEdge, GraphNode, MetadataGraph } from "$/domain/metadata/MetadataGraph";
import { resourceTypeLabels } from "$/domain/metadata/ResourceType";

type ForceNode = NodeObject & {
    id: string;
    name: string;
    type: GraphNode["type"];
    raw: GraphNode;
    val: number;
    fx?: number;
    fy?: number;
    fz?: number;
};

type ForceLink = LinkObject<ForceNode> & {
    source: string;
    target: string;
    label: string;
};

type MetadataGraphView3DProps = {
    graph: MetadataGraph;
    onOpenApi?: (node: GraphNode) => void;
    onFocus?: (node: GraphNode) => void;
    layoutMode?: "radial" | "timeline";
};

export const MetadataGraphView3D: React.FC<MetadataGraphView3DProps> = ({
    graph,
    onOpenApi,
    onFocus,
    layoutMode = "radial",
}) => {
    const graphRef = React.useRef<ForceGraphMethods<ForceNode, ForceLink>>();
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [size, setSize] = React.useState({ width: 0, height: 420 });

    const forceData = React.useMemo(() => {
        const layout = layoutMode === "timeline" ? buildTimelineLayout(graph) : undefined;
        return toForceGraphData(graph, layout);
    }, [graph, layoutMode]);

    React.useLayoutEffect(() => {
        const measure = () => {
            if (!containerRef.current) return;
            const { clientWidth, clientHeight } = containerRef.current;
            setSize({
                width: clientWidth,
                height: clientHeight || 420,
            });
        };

        measure();
        const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;

        if (observer && containerRef.current) {
            observer.observe(containerRef.current);
        }

        if (!observer) {
            window.addEventListener("resize", measure);
        }

        return () => {
            observer?.disconnect();
            if (!observer) {
                window.removeEventListener("resize", measure);
            }
        };
    }, []);

    React.useEffect(() => {
        if (!graphRef.current) return;
        graphRef.current.zoomToFit(600, 60);
        graphRef.current.cameraPosition({ x: 0, y: 0, z: 320 }, { x: 0, y: 0, z: 0 }, 800);
    }, [forceData, size]);

    const handleFocus = React.useCallback(
        (node: ForceNode) => {
            onFocus?.(node.raw);
        },
        [onFocus]
    );

    const handleOpenApi = React.useCallback(
        (node: ForceNode) => {
            onOpenApi?.(node.raw);
        },
        [onOpenApi]
    );

    return (
        <div className="metadata-graph__view3d" ref={containerRef}>
            <ForceGraph3D
                key={layoutMode}
                ref={graphRef}
                graphData={forceData}
                width={size.width}
                height={size.height}
                nodeId="id"
                linkSource="source"
                linkTarget="target"
                nodeLabel={node => `${resourceTypeLabels[node.type] ?? node.type}: ${node.name}`}
                linkLabel={link => link.label}
                nodeAutoColorBy="type"
                backgroundColor="#0f172a"
                showNavInfo={false}
                dagMode={layoutMode === "radial" ? "radialout" : undefined}
                dagLevelDistance={80}
                cooldownTicks={layoutMode === "timeline" ? 0 : undefined}
                cooldownTime={layoutMode === "timeline" ? 0 : undefined}
                linkDirectionalArrowLength={4}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.006}
                enableNodeDrag={false}
                onNodeClick={node => handleFocus(node as ForceNode)}
                onNodeRightClick={node => handleOpenApi(node as ForceNode)}
            />

            <div className="metadata-graph__hint">
                Click para enfocar - Boton derecho abre la API
            </div>
        </div>
    );
};

function toForceGraphData(
    graph: MetadataGraph,
    layout?: Map<string, { x: number; y: number; z: number }>
): GraphData<ForceNode, ForceLink> {
    const nodes: ForceNode[] = graph.nodes.map(node => {
        const position = layout?.get(node.key);
        return {
            id: node.key,
            name: node.displayName,
            type: node.type,
            raw: node,
            val: node.key === graph.center ? 12 : 6,
            ...(position ? { fx: position.x, fy: position.y, fz: position.z } : {}),
        };
    });

    const links: ForceLink[] = graph.edges.map(edge => {
        const oriented = orientEdge(edge, graph.center);
        return { source: oriented.source, target: oriented.target, label: edge.label };
    });

    return { nodes, links };
}

function buildTimelineLayout(
    graph: MetadataGraph
): Map<string, { x: number; y: number; z: number }> {
    const layout = new Map<string, { x: number; y: number; z: number }>();
    const nodeByKey = new Map(graph.nodes.map(node => [node.key, node]));

    const parentGroups = graph.groups.filter(group => group.direction === "parent");
    const childGroups = graph.groups.filter(group => group.direction === "child");

    const sectionSpacing = 180;
    const bandSpacing = 140;
    const nodeSpacing = 48;

    const placeBand = (group: typeof graph.groups[number], x: number, z: number) => {
        const nodes = group.nodeKeys
            .map(key => nodeByKey.get(key))
            .filter((node): node is GraphNode => Boolean(node));
        const sorted = nodes.sort((a, b) => a.displayName.localeCompare(b.displayName));
        const startY = -((sorted.length - 1) / 2) * nodeSpacing;
        sorted.forEach((node, index) => {
            if (layout.has(node.key)) return;
            layout.set(node.key, {
                x,
                y: startY + index * nodeSpacing,
                z,
            });
        });
    };

    parentGroups.forEach((group, index) => {
        const x = -sectionSpacing * (index + 1);
        const z = (index - (parentGroups.length - 1) / 2) * bandSpacing;
        placeBand(group, x, z);
    });

    childGroups.forEach((group, index) => {
        const x = sectionSpacing * (index + 1);
        const z = (index - (childGroups.length - 1) / 2) * bandSpacing;
        placeBand(group, x, z);
    });

    const ungrouped = graph.nodes.filter(node => !layout.has(node.key));
    if (ungrouped.length) {
        const x = sectionSpacing * (childGroups.length + 1);
        const startY = -((ungrouped.length - 1) / 2) * nodeSpacing;
        const sorted = ungrouped.sort((a, b) => {
            if (a.type === b.type) {
                return a.displayName.localeCompare(b.displayName);
            }
            return a.type.localeCompare(b.type);
        });
        sorted.forEach((node, index) => {
            layout.set(node.key, { x, y: startY + index * nodeSpacing, z: 0 });
        });
    }

    if (!layout.has(graph.center)) {
        layout.set(graph.center, { x: 0, y: 0, z: 0 });
    }

    return layout;
}

function orientEdge(edge: GraphEdge, centerKey: string) {
    if (edge.to === centerKey) {
        return { source: centerKey, target: edge.from };
    }
    return { source: edge.from, target: edge.to };
}
