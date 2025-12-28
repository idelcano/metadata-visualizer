import React from "react";
import { GraphGroup, GraphNode, MetadataGraph } from "$/domain/metadata/MetadataGraph";
import { resourceTypeLabels } from "$/domain/metadata/ResourceType";
import { IdenticonAvatar } from "$/webapp/components/metadata/IdenticonAvatar";

type MetadataGraphViewProps = {
    graph: MetadataGraph;
    onNodeClick?: (node: GraphNode, event: React.MouseEvent<HTMLDivElement>) => void;
};

type Line = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    label: string;
};

export const MetadataGraphView: React.FC<MetadataGraphViewProps> = ({ graph, onNodeClick }) => {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const nodeRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
    const [lines, setLines] = React.useState<Line[]>([]);
    const [canvasSize, setCanvasSize] = React.useState<{ width: number; height: number }>({
        width: 0,
        height: 0,
    });

    const nodeMap = React.useMemo(() => {
        return new Map(graph.nodes.map(node => [node.key, node]));
    }, [graph.nodes]);

    const parentGroups = graph.groups.filter(group => group.direction === "parent");
    const childGroups = graph.groups.filter(group => group.direction === "child");
    const leftGroups = parentGroups.length > 0 ? parentGroups : childGroups;
    const rightGroups = parentGroups.length > 0 ? childGroups : [];

    const registerNode = React.useCallback((key: string) => {
        return (element: HTMLDivElement | null) => {
            nodeRefs.current[key] = element;
        };
    }, []);

    React.useLayoutEffect(() => {
        const measure = () => {
            if (!containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            setCanvasSize({
                width: containerRef.current.scrollWidth,
                height: containerRef.current.scrollHeight,
            });

            const nextLines = graph.edges
                .map(edge => {
                    const fromEl = nodeRefs.current[edge.from];
                    const toEl = nodeRefs.current[edge.to];
                    if (!fromEl || !toEl) return null;
                    const fromRect = fromEl.getBoundingClientRect();
                    const toRect = toEl.getBoundingClientRect();

                    return {
                        x1: fromRect.left + fromRect.width / 2 - containerRect.left,
                        y1: fromRect.top + fromRect.height / 2 - containerRect.top,
                        x2: toRect.left + toRect.width / 2 - containerRect.left,
                        y2: toRect.top + toRect.height / 2 - containerRect.top,
                        label: edge.label,
                    };
                })
                .filter((line): line is Line => Boolean(line));

            setLines(nextLines);
        };

        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, [graph.edges, graph.nodes, graph.groups]);

    const centerNode = nodeMap.get(graph.center);

    return (
        <div className="graph-layout">
            <div className="graph-layout__canvas" ref={containerRef}>
                <svg
                    className="graph-layout__edges"
                    style={{ width: canvasSize.width, height: canvasSize.height }}
                >
                {lines.map((line, index) => (
                    <line
                        key={`${line.label}-${index}`}
                        x1={line.x1}
                        y1={line.y1}
                        x2={line.x2}
                        y2={line.y2}
                        stroke="#9aa8bf"
                        strokeWidth={1}
                    />
                ))}
                </svg>

                <div className="graph-layout__columns">
                    {leftGroups.map(group => (
                        <GraphGroupColumn
                            key={group.id}
                            group={group}
                            nodeMap={nodeMap}
                            registerNode={registerNode}
                            onNodeClick={onNodeClick}
                        />
                    ))}

                    <div className="graph-layout__column graph-layout__column--center">
                        {centerNode && (
                            <>
                                <div className="graph-layout__group-title">
                                    {resourceTypeLabels[centerNode.type]}
                                </div>
                                <GraphNodeCard
                                    node={centerNode}
                                    registerNode={registerNode}
                                    isCenter
                                    onNodeClick={onNodeClick}
                                />
                            </>
                        )}
                    </div>

                    {rightGroups.map(group => (
                        <GraphGroupColumn
                            key={group.id}
                            group={group}
                            nodeMap={nodeMap}
                            registerNode={registerNode}
                            onNodeClick={onNodeClick}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

const GraphGroupColumn: React.FC<{
    group: GraphGroup;
    nodeMap: Map<string, GraphNode>;
    registerNode: (key: string) => (element: HTMLDivElement | null) => void;
    onNodeClick?: (node: GraphNode, event: React.MouseEvent<HTMLDivElement>) => void;
}> = ({ group, nodeMap, registerNode, onNodeClick }) => {
    if (!group.nodeKeys.length) {
        return null;
    }

    return (
        <div className="graph-layout__column">
            <div className="graph-layout__group">
                <div className="graph-layout__group-title">{group.title}</div>
                <div className="graph-layout__group-nodes">
                    {group.nodeKeys.map(key => {
                        const node = nodeMap.get(key);
                        if (!node) return null;
                        return (
                            <GraphNodeCard
                                key={key}
                                node={node}
                                registerNode={registerNode}
                                onNodeClick={onNodeClick}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const GraphNodeCard: React.FC<{
    node: GraphNode;
    registerNode: (key: string) => (element: HTMLDivElement | null) => void;
    isCenter?: boolean;
    onNodeClick?: (node: GraphNode, event: React.MouseEvent<HTMLDivElement>) => void;
}> = ({ node, registerNode, isCenter = false, onNodeClick }) => {
    return (
        <div
            ref={registerNode(node.key)}
            className={isCenter ? "graph-node graph-node--center" : "graph-node"}
            role={onNodeClick ? "button" : undefined}
            tabIndex={onNodeClick ? 0 : undefined}
            onClick={event => onNodeClick?.(node, event)}
            onKeyDown={event => {
                if (event.key === "Enter" || event.key === " ") {
                    onNodeClick?.(node, event as unknown as React.MouseEvent<HTMLDivElement>);
                }
            }}
        >
            <IdenticonAvatar type={node.type} uid={node.id} size={28} className="graph-node__avatar" />
            <div className="graph-node__label">
                <div className="graph-node__title">{node.displayName}</div>
                <div className="graph-node__subtitle">{node.id}</div>
            </div>
        </div>
    );
};
