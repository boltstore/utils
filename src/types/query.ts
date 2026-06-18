export type FilterOperator =
  | "$eq"
  | "$neq"
  | "$gt"
  | "$gte"
  | "$lt"
  | "$lte"
  | "$in"
  | "$nin"
  | "$contains"
  | "$startsWith"
  | "$endsWith"
  | "$exists"
  | "$regexp";

export interface FilterCondition {
  [field: string]: unknown | { [op in FilterOperator]?: unknown };
}

export interface FilterGroup {
  $and?: Filter[];
  $or?: Filter[];
  $not?: Filter;
}

export type Filter = FilterCondition | FilterGroup;

export interface SortSpec {
  field: string;
  direction: "asc" | "desc";
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export type FilterValue = string | number | boolean | null | (string | number | boolean)[];

export interface ListOptions {
  filter?: Record<string, FilterValue>;
  sort?: string;
  direction?: "asc" | "desc";
  limit?: number;
  offset?: number;
  page?: number;
  perPage?: number;
  fields?: string[];
  expand?: string[];
}

export type AggregateFn = "$count" | "$sum" | "$avg" | "$min" | "$max";

export interface AggregateSpec {
  function: AggregateFn;
  field?: string;
  alias?: string;
}

export interface QueryOptions {
  collection: string;
  filter?: Filter;
  sort?: SortSpec[];
  fields?: string[];
  limit?: number;
  offset?: number;
  search?: string;
  aggregate?: AggregateSpec;
  groupBy?: string;
  having?: Filter;
}

export interface BatchOperation {
  action: "create" | "update" | "delete";
  id?: string;
  data?: Record<string, unknown>;
}

export interface BatchResult {
  created: number;
  updated: number;
  deleted: number;
}
