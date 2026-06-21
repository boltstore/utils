export type WhereBoolean = "and" | "or";

export interface WhereClauseBasic {
  type: "basic";
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "startsWith" | "endsWith" | "regexp";
  value: unknown;
  boolean: WhereBoolean;
}

export interface WhereClauseIn {
  type: "in";
  field: string;
  operator: "in" | "notIn";
  value: unknown[];
  boolean: WhereBoolean;
}

export interface WhereClauseNull {
  type: "null";
  field: string;
  operator: "null" | "notNull";
  boolean: WhereBoolean;
}

export interface WhereClauseBetween {
  type: "between";
  field: string;
  operator: "between" | "notBetween";
  value: [unknown, unknown];
  boolean: WhereBoolean;
}

export interface WhereClauseLike {
  type: "like";
  field: string;
  operator: "like" | "glob";
  value: string;
  boolean: WhereBoolean;
}

export interface WhereClauseNested {
  type: "nested";
  query: WhereClause[];
  boolean: WhereBoolean;
}

export interface WhereClauseNot {
  type: "not";
  query: WhereClause[];
  boolean: WhereBoolean;
}

export interface WhereClauseExists {
  type: "exists";
  field: string;
  operator: "exists" | "notExists";
  query?: WhereClause[];
  subqueryCollection?: string;
  subqueryFilter?: WhereClause[];
  boolean: WhereBoolean;
}

export interface WhereClauseRaw {
  type: "raw";
  sql: string;
  bindings?: unknown[];
  boolean: WhereBoolean;
}

export interface WhereClauseSubquery {
  type: "subquery";
  field: string;
  operator: "inSubquery" | "notInSubquery" | "subqueryEq" | "subqueryNeq" | "subqueryGt" | "subqueryGte" | "subqueryLt" | "subqueryLte";
  subqueryCollection: string;
  subqueryField?: string;
  subqueryAggregate?: { function: string; field?: string };
  subqueryFilter?: WhereClause[];
  boolean: WhereBoolean;
}

export type WhereClause =
  | WhereClauseBasic
  | WhereClauseIn
  | WhereClauseNull
  | WhereClauseBetween
  | WhereClauseLike
  | WhereClauseNested
  | WhereClauseNot
  | WhereClauseExists
  | WhereClauseRaw
  | WhereClauseSubquery;

export interface OrderClause {
  field: string;
  direction: "asc" | "desc";
}

export interface FromSubquery {
  alias: string;
  collection?: string;
  query: {
    collection?: string;
    wheres: WhereClause[];
    orders: OrderClause[];
    limit?: number;
    offset?: number;
  };
}

export interface JoinSubquery {
  collection?: string;
  query: {
    collection?: string;
    wheres: WhereClause[];
    orders: OrderClause[];
    limit?: number;
    offset?: number;
  };
}

export interface JoinClause {
  type: "inner" | "left" | "cross";
  target: string;
  subquery?: JoinSubquery;
  on?: Array<{
    left: string;
    operator: "=" | "!=" | ">" | ">=" | "<" | "<=";
    right: string;
  }>;
}

export interface WithClause {
  alias: string;
  columns?: string[];
  query: {
    collection?: string;
    wheres: WhereClause[];
    orders: OrderClause[];
    limit?: number;
    offset?: number;
  };
}

export interface UnionClause {
  type: "union" | "unionAll" | "intersect" | "except";
  query: {
    collection?: string;
    wheres: WhereClause[];
    orders: OrderClause[];
    limit?: number;
    offset?: number;
  };
}

export interface BuilderState {
  collection?: string;
  fromSubquery?: FromSubquery;
  wheres: WhereClause[];
  orders: OrderClause[];
  limit?: number;
  offset?: number;
  fields?: string[];
  expand?: string[];
  search?: string;
  searchFields?: string[];
  aggregate?: import("../types/query").AggregateSpec[];
  groupBy?: string[];
  having?: WhereClause[];
  joins: JoinClause[];
  withs: WithClause[];
  unions: UnionClause[];
  windows?: import("../types/query").WindowSpec[];
  with?: Record<string, import("../types/query").WithRelation>;
}

export function createDefaultState(): BuilderState {
  return {
    wheres: [],
    orders: [],
    joins: [],
    withs: [],
    unions: [],
    windows: undefined,
    fromSubquery: undefined,
    with: undefined,
  };
}
