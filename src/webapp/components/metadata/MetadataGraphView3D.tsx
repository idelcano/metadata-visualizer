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
};

export const MetadataGraphView3D: React.FC<MetadataGraphView3DProps> = ({
    graph,
    onOpenApi,
    onFocus,
}) => {
    const graphRef = React.useRef<ForceGraphMethods<ForceNode, ForceLink>>();
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [size, setSize] = React.useState({ width: 0, height: 420 });

    const forceData = React.useMemo(() => toForceGraphData(graph), [graph]);

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
                dagMode="radialout"
                dagLevelDistance={80}
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

function toForceGraphData(graph: MetadataGraph): GraphData<ForceNode, ForceLink> {
    const nodes: ForceNode[] = graph.nodes.map(node => ({
        id: node.key,
        name: node.displayName,
        type: node.type,
        raw: node,
        val: node.key === graph.center ? 12 : 6,
    }));

    const links: ForceLink[] = graph.edges.map(edge => {
        const oriented = orientEdge(edge, graph.center);
        return { source: oriented.source, target: oriented.target, label: edge.label };
    });

    return { nodes, links };
}

function orientEdge(edge: GraphEdge, centerKey: string) {
    if (edge.to === centerKey) {
        return { source: centerKey, target: edge.from };
    }
    return { source: edge.from, target: edge.to };
}
