import React from "react";
import {
    GraphEdge,
    GraphGroup,
    GraphNode,
    MetadataGraph,
    graphNodeKey,
} from "$/domain/metadata/MetadataGraph";
import { MetadataItem, MetadataList } from "$/domain/metadata/MetadataItem";
import { ResourceType } from "$/domain/metadata/ResourceType";
import { useAppContext } from "$/webapp/contexts/app-context";
import { MetadataGraphView } from "$/webapp/components/metadata/MetadataGraphView";

type MetadataGraphPanelProps = {
    selectedItem: MetadataItem | null;
    resourceType: ResourceType;
};

const defaultCocPageSize = 20;

export const MetadataGraphPanel: React.FC<MetadataGraphPanelProps> = ({
    selectedItem,
    resourceType,
}) => {
    const { compositionRoot } = useAppContext();
    const [graphState, setGraphState] = React.useState<GraphState>({ type: "idle" });
    const [cocState, setCocState] = React.useState<CocState>({
        type: "idle",
        items: [],
        page: 1,
        pageSize: defaultCocPageSize,
    });
    const requestId = React.useRef(0);

    React.useEffect(() => {
        if (!selectedItem) {
            setGraphState({ type: "idle" });
            return;
        }

        const currentRequest = ++requestId.current;
        setGraphState({ type: "loading" });

        compositionRoot.metadata.graph
            .execute({ type: resourceType, id: selectedItem.id })
            .toPromise()
            .then(data => {
                if (requestId.current !== currentRequest) return;
                setGraphState({ type: "loaded", data });
            })
            .catch(error => {
                if (requestId.current !== currentRequest) return;
                setGraphState({ type: "error", error });
            });
    }, [compositionRoot, resourceType, selectedItem]);

    React.useEffect(() => {
        setCocState({ type: "idle", items: [], page: 1, pageSize: defaultCocPageSize });
    }, [selectedItem?.id, resourceType]);

    if (!selectedItem) {
        return <div className="metadata-graph__placeholder">Select a row to view relationships.</div>;
    }

    if (graphState.type === "loading") {
        return <div className="metadata-graph__placeholder">Loading graph...</div>;
    }

    if (graphState.type === "error") {
        return <div className="metadata-graph__placeholder">{graphState.error.message}</div>;
    }

    if (graphState.type !== "loaded") {
        return null;
    }

    const mergedGraph = mergeCategoryOptionCombos(graphState.data, cocState.items);
    const lazyCombo = graphState.data.lazy?.categoryOptionCombos;

    const handleLoadMore = () => {
        if (!lazyCombo || cocState.type === "loading") return;
        const basePage = cocState.items.length ? cocState.page : 0;
        const pageToLoad = basePage + 1;

        setCocState(prev => ({ ...prev, type: "loading" }));

        compositionRoot.metadata.listCategoryOptionCombos
            .execute({
                categoryComboId: lazyCombo.categoryComboId,
                page: pageToLoad,
                pageSize: cocState.pageSize,
            })
            .toPromise()
            .then(data => {
                setCocState(prev => ({
                    type: "loaded",
                    items: pageToLoad === 1 ? data.items : [...prev.items, ...data.items],
                    pager: data.pager,
                    page: pageToLoad,
                    pageSize: prev.pageSize,
                }));
            })
            .catch(error => {
                setCocState(prev => ({ ...prev, type: "error", error }));
            });
    };

    const cocPager = cocState.pager;
    const cocTotal = cocPager?.total;
    const cocCanLoadMore = cocPager
        ? cocState.page < cocPager.pageCount
        : cocState.type !== "loaded";

    const lazyButtonLabel =
        cocState.type === "loading"
            ? "Loading..."
            : cocState.type === "idle"
              ? "Load combos"
              : cocCanLoadMore
                ? "Load more"
                : "All loaded";

    return (
        <div className="metadata-graph__panel">
            <MetadataGraphView graph={mergedGraph} />

            {lazyCombo && (
                <div className="metadata-graph__lazy">
                    <div className="metadata-graph__lazy-header">
                        Category option combos{" "}
                        {cocTotal !== undefined ? `(${cocTotal})` : ""}
                    </div>
                    {cocState.type === "error" && (
                        <div className="metadata-graph__lazy-error">{cocState.error?.message}</div>
                    )}
                    <button
                        type="button"
                        className="metadata-graph__lazy-button"
                        onClick={handleLoadMore}
                        disabled={cocState.type === "loading" || !cocCanLoadMore}
                    >
                        {lazyButtonLabel}
                    </button>
                </div>
            )}
        </div>
    );
};

type GraphState =
    | { type: "idle" }
    | { type: "loading" }
    | { type: "loaded"; data: MetadataGraph }
    | { type: "error"; error: Error };

type CocState =
    | {
          type: "idle" | "loading";
          items: MetadataItem[];
          page: number;
          pageSize: number;
          error?: Error;
          pager?: MetadataList["pager"];
      }
    | {
          type: "loaded";
          items: MetadataItem[];
          page: number;
          pageSize: number;
          pager?: MetadataList["pager"];
      }
    | {
          type: "error";
          items: MetadataItem[];
          page: number;
          pageSize: number;
          error: Error;
          pager?: MetadataList["pager"];
      };

function mergeCategoryOptionCombos(
    graph: MetadataGraph,
    combos: MetadataItem[]
): MetadataGraph {
    if (!combos.length || !graph.lazy?.categoryOptionCombos) {
        return graph;
    }

    const comboId = graph.lazy.categoryOptionCombos.categoryComboId;
    const comboKey = graphNodeKey("categoryCombos", comboId);

    const newNodes: GraphNode[] = combos.map(item => ({
        key: graphNodeKey("categoryOptionCombos", item.id),
        type: "categoryOptionCombos",
        id: item.id,
        displayName: item.displayName ?? item.name ?? item.id,
    }));

    const newEdges: GraphEdge[] = newNodes.map(node => ({
        from: comboKey,
        to: node.key,
        label: "categoryOptionCombos",
    }));

    const nodesByKey = new Map<string, GraphNode>(graph.nodes.map(node => [node.key, node]));
    newNodes.forEach(node => nodesByKey.set(node.key, node));

    const groupId = "category-option-combos";
    const filteredGroups = graph.groups.filter(group => group.id !== groupId);
    const group: GraphGroup = {
        id: groupId,
        title: "Category option combos",
        nodeKeys: newNodes.map(node => node.key),
        direction: "child",
    };

    return {
        ...graph,
        nodes: Array.from(nodesByKey.values()),
        edges: [...graph.edges, ...newEdges],
        groups: [...filteredGroups, group],
    };
}
