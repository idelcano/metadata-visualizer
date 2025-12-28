import React from "react";
import { GraphGroup, GraphNode, MetadataGraph } from "$/domain/metadata/MetadataGraph";
import { IdenticonAvatar } from "$/webapp/components/metadata/IdenticonAvatar";

type MetadataGraphViewProps = {
    graph: MetadataGraph;
};

type Line = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    label: string;
};

export const MetadataGraphView: React.FC<MetadataGraphViewProps> = ({ graph }) => {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const nodeRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
    const [lines, setLines] = React.useState<Line[]>([]);

    const nodeMap = React.useMemo(() => {
        return new Map(graph.nodes.map(node => [node.key, node]));
    }, [graph.nodes]);

    const parentGroups = graph.groups.filter(group => group.direction === "parent");
    const childGroups = graph.groups.filter(group => group.direction === "child");

    const registerNode = React.useCallback((key: string) => {
        return (element: HTMLDivElement | null) => {
            nodeRefs.current[key] = element;
        };
    }, []);

    React.useLayoutEffect(() => {
        const measure = () => {
            if (!containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();

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
        <div className="graph-layout" ref={containerRef}>
            <svg className="graph-layout__edges">
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
                <GraphColumn
                    title="Parents"
                    groups={parentGroups}
                    nodeMap={nodeMap}
                    registerNode={registerNode}
                />

                <div className="graph-layout__column graph-layout__column--center">
                    {centerNode && (
                        <GraphNodeCard
                            node={centerNode}
                            registerNode={registerNode}
                            isCenter
                        />
                    )}
                </div>

                <GraphColumn
                    title="Children"
                    groups={childGroups}
                    nodeMap={nodeMap}
                    registerNode={registerNode}
                />
            </div>
        </div>
    );
};

const GraphColumn: React.FC<{
    title: string;
    groups: GraphGroup[];
    nodeMap: Map<string, GraphNode>;
    registerNode: (key: string) => (element: HTMLDivElement | null) => void;
}> = ({ title, groups, nodeMap, registerNode }) => {
    if (!groups.length) {
        return <div className="graph-layout__column graph-layout__column--empty">No {title.toLowerCase()}</div>;
    }

    return (
        <div className="graph-layout__column">
            {groups.map(group => (
                <div key={group.id} className="graph-layout__group">
                    <div className="graph-layout__group-title">{group.title}</div>
                    <div className="graph-layout__group-nodes">
                        {group.nodeKeys.map(key => {
                            const node = nodeMap.get(key);
                            if (!node) return null;
                            return <GraphNodeCard key={key} node={node} registerNode={registerNode} />;
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

const GraphNodeCard: React.FC<{
    node: GraphNode;
    registerNode: (key: string) => (element: HTMLDivElement | null) => void;
    isCenter?: boolean;
}> = ({ node, registerNode, isCenter = false }) => {
    return (
        <div
            ref={registerNode(node.key)}
            className={isCenter ? "graph-node graph-node--center" : "graph-node"}
        >
            <IdenticonAvatar type={node.type} uid={node.id} size={28} className="graph-node__avatar" />
            <div className="graph-node__label">
                <div className="graph-node__title">{node.displayName}</div>
                <div className="graph-node__subtitle">{node.id}</div>
            </div>
        </div>
    );
};
