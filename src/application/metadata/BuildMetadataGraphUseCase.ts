import { Future } from "$/domain/entities/generic/Future";
import { FutureData } from "$/domain/entities/generic/FutureData";
import {
    GraphEdge,
    GraphGroup,
    GraphNode,
    MetadataGraph,
    graphNodeKey,
} from "$/domain/metadata/MetadataGraph";
import { MetadataItem } from "$/domain/metadata/MetadataItem";
import { ResourceType } from "$/domain/metadata/ResourceType";
import { MetadataRepository } from "$/domain/repositories/MetadataRepository";

type Named = { id: string; displayName?: string; name?: string };

export class BuildMetadataGraphUseCase {
    constructor(private options: { metadataRepository: MetadataRepository }) {}

    public execute(input: { type: ResourceType; id: string }): FutureData<MetadataGraph> {
        return Future.block(async $ => {
            switch (input.type) {
                case "dataElements":
                    return await $(this.buildDataElementGraph(input.id));
                case "categoryCombos":
                    return await $(this.buildCategoryComboGraph(input.id));
                case "categories":
                    return await $(this.buildCategoryGraph(input.id));
                case "categoryOptions":
                    return await $(this.buildCategoryOptionGraph(input.id));
                case "categoryOptionCombos":
                    return await $(this.buildCategoryOptionComboGraph(input.id));
            }
        });
    }

    private buildDataElementGraph(id: string): FutureData<MetadataGraph> {
        return Future.block(async $ => {
            const dataElement = (await $(
                this.options.metadataRepository.get(
                    "dataElements",
                    id,
                    "id,displayName,categoryCombo[id,displayName,categories[id,displayName,categoryOptions[id,displayName]]]"
                )
            )) as DataElement;

            const { getNodes, edges, addNode, addEdge } = graphBuilder();
            const centerKey = addNode("dataElements", dataElement);

            const combo = dataElement.categoryCombo;
            const comboKey = combo ? addNode("categoryCombos", combo) : null;
            if (comboKey) {
                addEdge(centerKey, comboKey, "categoryCombo");
            }

            const { categoryKeys, optionKeys } = addCategories(combo, comboKey, addNode, addEdge);

            const groups = buildGroups([
                { id: "category-combo", title: "Category combo", nodeKeys: comboKey ? [comboKey] : [], direction: "parent" },
                { id: "categories", title: "Categories", nodeKeys: categoryKeys, direction: "child" },
                { id: "category-options", title: "Category options", nodeKeys: optionKeys, direction: "child" },
            ]);

            return {
                center: centerKey,
                nodes: getNodes(),
                edges,
                groups,
                lazy: combo
                    ? { categoryOptionCombos: { categoryComboId: combo.id } }
                    : undefined,
            };
        });
    }

    private buildCategoryComboGraph(id: string): FutureData<MetadataGraph> {
        return Future.block(async $ => {
            const combo = (await $(
                this.options.metadataRepository.get(
                    "categoryCombos",
                    id,
                    "id,displayName,categories[id,displayName,categoryOptions[id,displayName]]"
                )
            )) as CategoryCombo;

            const dataElementsList = await $(
                this.options.metadataRepository.list({
                    type: "dataElements",
                    fields: "id,displayName",
                    filters: [`categoryCombo.id:eq:${id}`],
                    paging: false,
                })
            );

            const { getNodes, edges, addNode, addEdge } = graphBuilder();
            const centerKey = addNode("categoryCombos", combo);

            const { categoryKeys, optionKeys } = addCategories(combo, centerKey, addNode, addEdge);

            const dataElementKeys = dataElementsList.items.map(item => {
                const key = addNode("dataElements", item);
                addEdge(centerKey, key, "dataElements");
                return key;
            });

            const groups = buildGroups([
                { id: "categories", title: "Categories", nodeKeys: categoryKeys, direction: "child" },
                { id: "category-options", title: "Category options", nodeKeys: optionKeys, direction: "child" },
                { id: "data-elements", title: "Data elements", nodeKeys: dataElementKeys, direction: "child" },
            ]);

            return {
                center: centerKey,
                nodes: getNodes(),
                edges,
                groups,
                lazy: { categoryOptionCombos: { categoryComboId: combo.id } },
            };
        });
    }

    private buildCategoryGraph(id: string): FutureData<MetadataGraph> {
        return Future.block(async $ => {
            const category = (await $(
                this.options.metadataRepository.get(
                    "categories",
                    id,
                    "id,displayName,categoryOptions[id,displayName]"
                )
            )) as Category;

            const combosList = await $(
                this.options.metadataRepository.list({
                    type: "categoryCombos",
                    fields: "id,displayName",
                    filters: [`categories.id:eq:${id}`],
                    paging: false,
                })
            );

            const { getNodes, edges, addNode, addEdge } = graphBuilder();
            const centerKey = addNode("categories", category);

            const comboKeys = combosList.items.map(combo => {
                const key = addNode("categoryCombos", combo);
                addEdge(key, centerKey, "categories");
                return key;
            });

            const optionKeys = (category.categoryOptions ?? []).map(option => {
                const key = addNode("categoryOptions", option);
                addEdge(centerKey, key, "categoryOptions");
                return key;
            });

            const groups = buildGroups([
                { id: "category-combos", title: "Category combos", nodeKeys: comboKeys, direction: "parent" },
                { id: "category-options", title: "Category options", nodeKeys: optionKeys, direction: "child" },
            ]);

            return { center: centerKey, nodes: getNodes(), edges, groups };
        });
    }

    private buildCategoryOptionGraph(id: string): FutureData<MetadataGraph> {
        return Future.block(async $ => {
            const option = (await $(
                this.options.metadataRepository.get("categoryOptions", id, "id,displayName")
            )) as CategoryOption;

            const categoriesList = await $(
                this.options.metadataRepository.list({
                    type: "categories",
                    fields: "id,displayName",
                    filters: [`categoryOptions.id:eq:${id}`],
                    paging: false,
                })
            );

            const { getNodes, edges, addNode, addEdge } = graphBuilder();
            const centerKey = addNode("categoryOptions", option);

            const categoryKeys = categoriesList.items.map(category => {
                const key = addNode("categories", category);
                addEdge(key, centerKey, "categoryOptions");
                return key;
            });

            const groups = buildGroups([
                { id: "categories", title: "Categories", nodeKeys: categoryKeys, direction: "parent" },
            ]);

            return { center: centerKey, nodes: getNodes(), edges, groups };
        });
    }

    private buildCategoryOptionComboGraph(id: string): FutureData<MetadataGraph> {
        return Future.block(async $ => {
            const coc = (await $(
                this.options.metadataRepository.get(
                    "categoryOptionCombos",
                    id,
                    "id,displayName,categoryCombo[id,displayName],categoryOptions[id,displayName]"
                )
            )) as CategoryOptionCombo;

            const { getNodes, edges, addNode, addEdge } = graphBuilder();
            const centerKey = addNode("categoryOptionCombos", coc);

            const comboKey = coc.categoryCombo ? addNode("categoryCombos", coc.categoryCombo) : null;
            if (comboKey) {
                addEdge(comboKey, centerKey, "categoryOptionCombos");
            }

            const optionKeys = (coc.categoryOptions ?? []).map(option => {
                const key = addNode("categoryOptions", option);
                addEdge(centerKey, key, "categoryOptions");
                return key;
            });

            const groups = buildGroups([
                { id: "category-combo", title: "Category combo", nodeKeys: comboKey ? [comboKey] : [], direction: "parent" },
                { id: "category-options", title: "Category options", nodeKeys: optionKeys, direction: "child" },
            ]);

            return { center: centerKey, nodes: getNodes(), edges, groups };
        });
    }
}

type CategoryOption = MetadataItem & { displayName?: string; name?: string };
type Category = MetadataItem & { categoryOptions?: CategoryOption[] };
type CategoryCombo = MetadataItem & { categories?: Category[] };
type DataElement = MetadataItem & { categoryCombo?: CategoryCombo };
type CategoryOptionCombo = MetadataItem & {
    categoryCombo?: CategoryCombo;
    categoryOptions?: CategoryOption[];
};

function graphBuilder() {
    const nodesMap = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];

    const addNode = (type: ResourceType, item: Named) => {
        const key = graphNodeKey(type, item.id);
        if (!nodesMap.has(key)) {
            nodesMap.set(key, {
                key,
                type,
                id: item.id,
                displayName: item.displayName ?? item.name ?? item.id,
            });
        }
        return key;
    };

    const addEdge = (from: string, to: string, label: string) => {
        edges.push({ from, to, label });
    };

    return {
        edges,
        addNode,
        addEdge,
        getNodes: () => Array.from(nodesMap.values()),
    };
}

function addCategories(
    combo: CategoryCombo | undefined,
    comboKey: string | null,
    addNode: (type: ResourceType, item: Named) => string,
    addEdge: (from: string, to: string, label: string) => void
) {
    const categoryKeys = new Set<string>();
    const optionKeys = new Set<string>();

    const categories = combo?.categories ?? [];
    categories.forEach(category => {
        const categoryKey = addNode("categories", category);
        categoryKeys.add(categoryKey);
        if (comboKey) {
            addEdge(comboKey, categoryKey, "categories");
        }
        (category.categoryOptions ?? []).forEach(option => {
            const optionKey = addNode("categoryOptions", option);
            optionKeys.add(optionKey);
            addEdge(categoryKey, optionKey, "categoryOptions");
        });
    });

    return { categoryKeys: Array.from(categoryKeys), optionKeys: Array.from(optionKeys) };
}

function buildGroups(groups: GraphGroup[]) {
    return groups.filter(group => group.nodeKeys.length > 0);
}
