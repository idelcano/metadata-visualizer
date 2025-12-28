export const resourceTypes = [
    "dataElements",
    "categories",
    "categoryCombos",
    "categoryOptions",
    "categoryOptionCombos",
] as const;

export type ResourceType = (typeof resourceTypes)[number];

export function isResourceType(value: string): value is ResourceType {
    return (resourceTypes as readonly string[]).includes(value);
}

export const resourceTypeLabels: Record<ResourceType, string> = {
    dataElements: "Data elements",
    categories: "Categories",
    categoryCombos: "Category combos",
    categoryOptions: "Category options",
    categoryOptionCombos: "Category option combos",
};
