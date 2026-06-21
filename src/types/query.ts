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
  | "$regexp"
  | "$like"
  | "$glob"
  | "$between"
  | "$notBetween"
  | "$not"
  | "$inSubquery"
  | "$notInSubquery"
  | "$subqueryEq"
  | "$subqueryNeq"
  | "$subqueryGt"
  | "$subqueryGte"
  | "$subqueryLt"
  | "$subqueryLte";

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

export type AggregateFn = "$count" | "$sum" | "$avg" | "$min" | "$max";

export interface AggregateSpec {
  function: AggregateFn;
  field?: string;
  alias?: string;
}

export type WindowFn = "ROW_NUMBER" | "RANK" | "DENSE_RANK" | "NTILE" | "LEAD" | "LAG" | "FIRST_VALUE" | "LAST_VALUE" | "NTH_VALUE" | "COUNT" | "SUM" | "AVG" | "MIN" | "MAX";

export interface WindowSpec {
  function: WindowFn;
  field?: string;
  partitionBy?: string[];
  orderBy?: SortSpec[];
  alias?: string;
}

export interface JoinOnCondition {
  left: string;
  operator?: "=" | "!=" | ">" | ">=" | "<" | "<=";
  right: string;
}

export interface FromSubqueryWire {
  alias: string;
  collection?: string;
  query: {
    collection?: string;
    wheres?: import("../query-builder/state").WhereClause[];
    orders?: import("../query-builder/state").OrderClause[];
    limit?: number;
    offset?: number;
  };
}

export interface JoinSpec {
  type: "inner" | "left" | "cross";
  target: string;
  subquery?: {
    collection?: string;
    query: {
      collection?: string;
      wheres?: import("../query-builder/state").WhereClause[];
      orders?: import("../query-builder/state").OrderClause[];
      limit?: number;
      offset?: number;
    };
  };
  on?: JoinOnCondition[];
}

export interface WithRelation {
  collection?: string;
  localKey?: string;
  foreignKey?: string;
  filter?: Filter;
  fields?: string[];
  sort?: SortSpec[];
  limit?: number;
  offset?: number;
  multiple?: boolean;
  with?: Record<string, boolean | WithRelation>;
}

export interface QueryOptions {
  collection: string;
  fromSubquery?: FromSubqueryWire;
  filter?: Filter;
  sort?: SortSpec[];
  fields?: string[];
  expand?: string[];
  limit?: number;
  offset?: number;
  search?: string;
  searchFields?: string[];
  aggregate?: AggregateSpec;
  multiAggregate?: AggregateSpec[];
  groupBy?: string | string[];
  having?: Filter;
  windows?: WindowSpec[];
  joins?: JoinSpec[];
  with?: Record<string, boolean | WithRelation>;
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
