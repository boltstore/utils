import type { AggregateSpec, QueryOptions } from "../types/query";
import { validateIdentifier } from "../validation";
import type {
  BuilderState,
  WhereClause,
  OrderClause,
  JoinClause,
  WithClause,
  UnionClause,
} from "./state";
import { createDefaultState } from "./state";
import { compileFilter } from "./compile";

type WhereValue = unknown;
type BasicOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "startsWith" | "endsWith" | "regexp";

export class QueryBuilder {
  state: BuilderState;

  constructor(state?: BuilderState) {
    this.state = state ? this.cloneState(state) : createDefaultState();
  }

  protected cloneState(s: BuilderState): BuilderState {
    return {
      collection: s.collection,
      selectExprs: s.selectExprs ? s.selectExprs.map((e) => ({ ...e })) : undefined,
      orderByExprs: s.orderByExprs ? s.orderByExprs.map((e) => ({ ...e })) : undefined,
      fromSubquery: s.fromSubquery ? { ...s.fromSubquery, query: { ...s.fromSubquery.query } } : undefined,
      wheres: s.wheres.map((w) => ({ ...w })),
      orders: s.orders.map((o) => ({ ...o })),
      limit: s.limit,
      offset: s.offset,
      fields: s.fields ? [...s.fields] : undefined,
      expand: s.expand ? [...s.expand] : undefined,
      search: s.search,
      searchFields: s.searchFields ? [...s.searchFields] : undefined,
      aggregate: s.aggregate ? s.aggregate.map((a) => ({ ...a })) : undefined,
      groupBy: s.groupBy ? [...s.groupBy] : undefined,
      having: s.having ? s.having.map((w) => ({ ...w })) : undefined,
      joins: s.joins.map((j) => ({ ...j, subquery: j.subquery ? { ...j.subquery, query: { ...j.subquery.query } } : undefined, on: j.on ? j.on.map((o) => ({ ...o })) : undefined })),
      withs: s.withs.map((w) => ({ ...w })),
      unions: s.unions.map((u) => ({ ...u })),
      windows: s.windows ? s.windows.map((w) => ({ ...w })) : undefined,
      with: s.with,
    };
  }

  clone(): QueryBuilder {
    return new QueryBuilder(this.cloneState(this.state));
  }

  from(collection: string): this;
  from(subquery: (q: QueryBuilder) => void, alias: string): this;
  from(collectionOrSubquery: string | ((q: QueryBuilder) => void), alias?: string): this {
    if (typeof collectionOrSubquery === "string") {
      validateIdentifier(collectionOrSubquery, "collection name");
      this.state.collection = collectionOrSubquery;
      this.state.fromSubquery = undefined;
    } else {
      const child = new QueryBuilder();
      collectionOrSubquery(child);
      if (!alias) throw new Error("Alias is required for subquery in FROM.");
      validateIdentifier(alias, "subquery alias");
      this.state.collection = undefined;
      this.state.fromSubquery = {
        alias,
        collection: child.state.collection,
        query: {
          collection: child.state.collection,
          wheres: child.state.wheres,
          orders: child.state.orders,
          limit: child.state.limit,
          offset: child.state.offset,
        },
      };
    }
    return this;
  }

  private addWhere(clause: WhereClause): this {
    this.state.wheres.push(clause);
    return this;
  }

  where(field: string | ((q: QueryBuilder) => void), operator?: WhereValue, value?: WhereValue): this {
    if (typeof field === "function") {
      const child = new QueryBuilder();
      field(child);
      return this.addWhere({ type: "nested", query: child.state.wheres, boolean: "and" });
    }
    if (value === undefined) {
      return this.addWhere({ type: "basic", field, operator: "eq", value: operator, boolean: "and" });
    }
    return this.addWhere({ type: "basic", field, operator: operator as BasicOperator, value, boolean: "and" });
  }

  orWhere(field: string | ((q: QueryBuilder) => void), operator?: WhereValue, value?: WhereValue): this {
    if (typeof field === "function") {
      const child = new QueryBuilder();
      field(child);
      return this.addWhere({ type: "nested", query: child.state.wheres, boolean: "or" });
    }
    if (value === undefined) {
      return this.addWhere({ type: "basic", field, operator: "eq", value: operator, boolean: "or" });
    }
    return this.addWhere({ type: "basic", field, operator: operator as BasicOperator, value, boolean: "or" });
  }

  whereEq(field: string, value: WhereValue): this {
    return this.addWhere({ type: "basic", field, operator: "eq", value, boolean: "and" });
  }
  orWhereEq(field: string, value: WhereValue): this {
    return this.addWhere({ type: "basic", field, operator: "eq", value, boolean: "or" });
  }

  whereNeq(field: string, value: WhereValue): this {
    return this.addWhere({ type: "basic", field, operator: "neq", value, boolean: "and" });
  }
  orWhereNeq(field: string, value: WhereValue): this {
    return this.addWhere({ type: "basic", field, operator: "neq", value, boolean: "or" });
  }

  whereGt(field: string, value: WhereValue): this {
    return this.addWhere({ type: "basic", field, operator: "gt", value, boolean: "and" });
  }
  orWhereGt(field: string, value: WhereValue): this {
    return this.addWhere({ type: "basic", field, operator: "gt", value, boolean: "or" });
  }

  whereGte(field: string, value: WhereValue): this {
    return this.addWhere({ type: "basic", field, operator: "gte", value, boolean: "and" });
  }
  orWhereGte(field: string, value: WhereValue): this {
    return this.addWhere({ type: "basic", field, operator: "gte", value, boolean: "or" });
  }

  whereLt(field: string, value: WhereValue): this {
    return this.addWhere({ type: "basic", field, operator: "lt", value, boolean: "and" });
  }
  orWhereLt(field: string, value: WhereValue): this {
    return this.addWhere({ type: "basic", field, operator: "lt", value, boolean: "or" });
  }

  whereLte(field: string, value: WhereValue): this {
    return this.addWhere({ type: "basic", field, operator: "lte", value, boolean: "and" });
  }
  orWhereLte(field: string, value: WhereValue): this {
    return this.addWhere({ type: "basic", field, operator: "lte", value, boolean: "or" });
  }

  whereIn(field: string, value: unknown[]): this {
    return this.addWhere({ type: "in", field, operator: "in", value, boolean: "and" });
  }
  orWhereIn(field: string, value: unknown[]): this {
    return this.addWhere({ type: "in", field, operator: "in", value, boolean: "or" });
  }

  whereNotIn(field: string, value: unknown[]): this {
    return this.addWhere({ type: "in", field, operator: "notIn", value, boolean: "and" });
  }
  orWhereNotIn(field: string, value: unknown[]): this {
    return this.addWhere({ type: "in", field, operator: "notIn", value, boolean: "or" });
  }

  whereNull(field: string): this {
    return this.addWhere({ type: "null", field, operator: "null", boolean: "and" });
  }
  orWhereNull(field: string): this {
    return this.addWhere({ type: "null", field, operator: "null", boolean: "or" });
  }

  whereNotNull(field: string): this {
    return this.addWhere({ type: "null", field, operator: "notNull", boolean: "and" });
  }
  orWhereNotNull(field: string): this {
    return this.addWhere({ type: "null", field, operator: "notNull", boolean: "or" });
  }

  whereBetween(field: string, value: [WhereValue, WhereValue]): this {
    return this.addWhere({ type: "between", field, operator: "between", value, boolean: "and" });
  }
  orWhereBetween(field: string, value: [WhereValue, WhereValue]): this {
    return this.addWhere({ type: "between", field, operator: "between", value, boolean: "or" });
  }

  whereNotBetween(field: string, value: [WhereValue, WhereValue]): this {
    return this.addWhere({ type: "between", field, operator: "notBetween", value, boolean: "and" });
  }
  orWhereNotBetween(field: string, value: [WhereValue, WhereValue]): this {
    return this.addWhere({ type: "between", field, operator: "notBetween", value, boolean: "or" });
  }

  whereLike(field: string, value: string): this {
    return this.addWhere({ type: "like", field, operator: "like", value, boolean: "and" });
  }
  orWhereLike(field: string, value: string): this {
    return this.addWhere({ type: "like", field, operator: "like", value, boolean: "or" });
  }

  whereGlob(field: string, value: string): this {
    return this.addWhere({ type: "like", field, operator: "glob", value, boolean: "and" });
  }
  orWhereGlob(field: string, value: string): this {
    return this.addWhere({ type: "like", field, operator: "glob", value, boolean: "or" });
  }

  whereNot(field: string | ((q: QueryBuilder) => void), operator?: WhereValue, value?: WhereValue): this {
    if (typeof field === "function") {
      const child = new QueryBuilder();
      field(child);
      return this.addWhere({ type: "not", query: child.state.wheres, boolean: "and" });
    }
    if (value === undefined) {
      return this.addWhere({ type: "not", query: [{ type: "basic", field, operator: "eq", value: operator, boolean: "and" }], boolean: "and" });
    }
    return this.addWhere({ type: "not", query: [{ type: "basic", field, operator: operator as BasicOperator, value, boolean: "and" }], boolean: "and" });
  }
  orWhereNot(field: string | ((q: QueryBuilder) => void), operator?: WhereValue, value?: WhereValue): this {
    if (typeof field === "function") {
      const child = new QueryBuilder();
      field(child);
      return this.addWhere({ type: "not", query: child.state.wheres, boolean: "or" });
    }
    if (value === undefined) {
      return this.addWhere({ type: "not", query: [{ type: "basic", field, operator: "eq", value: operator, boolean: "and" }], boolean: "or" });
    }
    return this.addWhere({ type: "not", query: [{ type: "basic", field, operator: operator as BasicOperator, value, boolean: "and" }], boolean: "or" });
  }

  whereExists(field: string): this {
    return this.addWhere({ type: "exists", field, operator: "exists", boolean: "and" });
  }
  orWhereExists(field: string): this {
    return this.addWhere({ type: "exists", field, operator: "exists", boolean: "or" });
  }

  whereNotExists(field: string): this {
    return this.addWhere({ type: "exists", field, operator: "notExists", boolean: "and" });
  }
  orWhereNotExists(field: string): this {
    return this.addWhere({ type: "exists", field, operator: "notExists", boolean: "or" });
  }

  whereRaw(sql: string, bindings?: unknown[]): this {
    return this.addWhere({ type: "raw", sql, bindings, boolean: "and" });
  }
  orWhereRaw(sql: string, bindings?: unknown[]): this {
    return this.addWhere({ type: "raw", sql, bindings, boolean: "or" });
  }

  orderBy(field: string, direction?: "asc" | "desc"): this {
    validateIdentifier(field.replace(/^-/, ""), "order field");
    const desc = field.startsWith("-");
    this.state.orders.push({
      field: desc ? field.slice(1) : field,
      direction: direction ?? (desc ? "desc" : "asc"),
    });
    return this;
  }

  orderByRaw(sql: string): this {
    this.state.orders.push({ field: sql, direction: "asc" });
    return this;
  }

  selectExpr(...exprs: import("../types/query").SqlExpr[]): this {
    this.state.selectExprs = exprs;
    return this;
  }

  orderByExpr(expr: import("../types/query").SqlExpr): this {
    this.state.orderByExprs = [expr];
    return this;
  }

  limit(value: number): this {
    this.state.limit = value;
    return this;
  }

  offset(value: number): this {
    this.state.offset = value;
    return this;
  }

  page(p: number): this {
    this.state.offset = this.state.limit ? (p - 1) * this.state.limit : 0;
    return this;
  }

  perPage(n: number): this {
    this.state.limit = n;
    return this;
  }

  select(...fields: string[]): this {
    this.state.fields = fields;
    return this;
  }

  search(term: string, fields?: string[]): this {
    this.state.search = term;
    if (fields) this.state.searchFields = fields;
    return this;
  }

  expand(...relations: string[]): this {
    this.state.expand = relations;
    return this;
  }

  aggregate(spec: AggregateSpec | AggregateSpec[]): this {
    this.state.aggregate = Array.isArray(spec) ? spec : [spec];
    return this;
  }

  groupBy(...fields: string[]): this {
    this.state.groupBy = fields;
    return this;
  }

  window(spec: import("../types/query").WindowSpec | import("../types/query").WindowSpec[]): this {
    this.state.windows = Array.isArray(spec) ? spec : [spec];
    return this;
  }

  having(field: string | ((q: QueryBuilder) => void), operator?: WhereValue, value?: WhereValue): this {
    if (typeof field === "function") {
      const child = new QueryBuilder();
      field(child);
      this.state.having = child.state.wheres;
      return this;
    }
    if (value === undefined) {
      this.state.having = [{ type: "basic", field, operator: "eq", value: operator, boolean: "and" }];
      return this;
    }
    this.state.having = [{ type: "basic", field, operator: operator as BasicOperator, value, boolean: "and" }];
    return this;
  }

  join(target: string, on?: Array<{ left: string; operator?: "=" | "!=" | ">" | ">=" | "<" | "<="; right: string }>): this;
  join(subquery: (q: QueryBuilder) => void, alias: string, on?: Array<{ left: string; operator?: "=" | "!=" | ">" | ">=" | "<" | "<="; right: string }>): this;
  join(targetOrSubquery: string | ((q: QueryBuilder) => void), aliasOrOn?: string | Array<{ left: string; operator?: "=" | "!=" | ">" | ">=" | "<" | "<="; right: string }>, on?: Array<{ left: string; operator?: "=" | "!=" | ">" | ">=" | "<" | "<="; right: string }>): this {
    if (typeof targetOrSubquery === "string") {
      validateIdentifier(targetOrSubquery, "join target");
      const onArr = (aliasOrOn as Array<{ left: string; operator?: string; right: string }> | undefined);
      this.state.joins.push({
        type: "inner",
        target: targetOrSubquery,
        on: onArr?.map((o) => ({ left: o.left, operator: (o.operator || "=") as "=" | "!=" | ">" | ">=" | "<" | "<=", right: o.right })),
      });
    } else {
      const child = new QueryBuilder();
      targetOrSubquery(child);
      const alias = aliasOrOn as string;
      if (!alias) throw new Error("Alias is required for subquery in JOIN.");
      validateIdentifier(alias, "join alias");
      this.state.joins.push({
        type: "inner",
        target: alias,
        subquery: {
          collection: child.state.collection,
          query: {
            collection: child.state.collection,
            wheres: child.state.wheres,
            orders: child.state.orders,
            limit: child.state.limit,
            offset: child.state.offset,
          },
        },
        on: on?.map((o) => ({ left: o.left, operator: o.operator ?? "=", right: o.right })),
      });
    }
    return this;
  }

  leftJoin(target: string, on?: Array<{ left: string; operator?: "=" | "!=" | ">" | ">=" | "<" | "<="; right: string }>): this;
  leftJoin(subquery: (q: QueryBuilder) => void, alias: string, on?: Array<{ left: string; operator?: "=" | "!=" | ">" | ">=" | "<" | "<="; right: string }>): this;
  leftJoin(targetOrSubquery: string | ((q: QueryBuilder) => void), aliasOrOn?: string | Array<{ left: string; operator?: "=" | "!=" | ">" | ">=" | "<" | "<="; right: string }>, on?: Array<{ left: string; operator?: "=" | "!=" | ">" | ">=" | "<" | "<="; right: string }>): this {
    if (typeof targetOrSubquery === "string") {
      validateIdentifier(targetOrSubquery, "join target");
      const onArr = (aliasOrOn as Array<{ left: string; operator?: string; right: string }> | undefined);
      this.state.joins.push({
        type: "left",
        target: targetOrSubquery,
        on: onArr?.map((o) => ({ left: o.left, operator: (o.operator || "=") as "=" | "!=" | ">" | ">=" | "<" | "<=", right: o.right })),
      });
    } else {
      const child = new QueryBuilder();
      targetOrSubquery(child);
      const alias = aliasOrOn as string;
      if (!alias) throw new Error("Alias is required for subquery in JOIN.");
      validateIdentifier(alias, "join alias");
      this.state.joins.push({
        type: "left",
        target: alias,
        subquery: {
          collection: child.state.collection,
          query: {
            collection: child.state.collection,
            wheres: child.state.wheres,
            orders: child.state.orders,
            limit: child.state.limit,
            offset: child.state.offset,
          },
        },
        on: on?.map((o) => ({ left: o.left, operator: o.operator ?? "=", right: o.right })),
      });
    }
    return this;
  }

  crossJoin(target: string): this {
    validateIdentifier(target, "join target");
    this.state.joins.push({ type: "cross", target });
    return this;
  }

  with(aliasOrRelations: string | Record<string, boolean | import("../types/query").WithRelation>, query?: (q: QueryBuilder) => void, columns?: string[]): this {
    if (typeof aliasOrRelations === "string") {
      // CTE: with(alias, query, columns?)
      const child = new QueryBuilder();
      query!(child);
      this.state.withs.push({
        alias: aliasOrRelations,
        columns,
        query: {
          collection: child.state.collection,
          wheres: child.state.wheres,
          orders: child.state.orders,
          limit: child.state.limit,
          offset: child.state.offset,
        },
      });
    } else {
      // Nested relations: with({ author: true, posts: { fields: ["title"] } })
      const normalized: Record<string, import("../types/query").WithRelation> = {};
      for (const [key, val] of Object.entries(aliasOrRelations)) {
        if (val === true) {
          normalized[key] = {};
        } else if (val === false) {
          continue;
        } else {
          normalized[key] = val;
        }
      }
      this.state.with = normalized;
    }
    return this;
  }

  union(query: (q: QueryBuilder) => void): this {
    const child = new QueryBuilder();
    query(child);
    this.state.unions.push({
      type: "union",
      query: {
        collection: child.state.collection,
        wheres: child.state.wheres,
        orders: child.state.orders,
        limit: child.state.limit,
        offset: child.state.offset,
      },
    });
    return this;
  }

  unionAll(query: (q: QueryBuilder) => void): this {
    const child = new QueryBuilder();
    query(child);
    this.state.unions.push({
      type: "unionAll",
      query: {
        collection: child.state.collection,
        wheres: child.state.wheres,
        orders: child.state.orders,
        limit: child.state.limit,
        offset: child.state.offset,
      },
    });
    return this;
  }

  intersect(query: (q: QueryBuilder) => void): this {
    const child = new QueryBuilder();
    query(child);
    this.state.unions.push({
      type: "intersect",
      query: {
        collection: child.state.collection,
        wheres: child.state.wheres,
        orders: child.state.orders,
        limit: child.state.limit,
        offset: child.state.offset,
      },
    });
    return this;
  }

  except(query: (q: QueryBuilder) => void): this {
    const child = new QueryBuilder();
    query(child);
    this.state.unions.push({
      type: "except",
      query: {
        collection: child.state.collection,
        wheres: child.state.wheres,
        orders: child.state.orders,
        limit: child.state.limit,
        offset: child.state.offset,
      },
    });
    return this;
  }

  toParams(): QueryOptions {
    const filter = compileFilter(this.state.wheres);
    const validOrders = this.state.orders.filter((o) => {
      try {
        validateIdentifier(o.field, "order field");
        return true;
      } catch {
        return false;
      }
    });
    const sort = validOrders.length > 0
      ? validOrders.map((o) => ({
          field: o.field,
          direction: o.direction,
        }))
      : undefined;

    const opts: QueryOptions = {
      collection: this.state.collection ?? "",
    };
    if (filter) opts.filter = filter;
    if (sort) opts.sort = sort;
    if (this.state.fields) opts.fields = this.state.fields;
    if (this.state.expand) opts.expand = this.state.expand;
    if (this.state.limit != null) opts.limit = this.state.limit;
    if (this.state.offset != null) opts.offset = this.state.offset;
    if (this.state.search) opts.search = this.state.search;
    if (this.state.searchFields) opts.searchFields = this.state.searchFields;
    if (this.state.aggregate) {
      if (this.state.aggregate.length === 1) {
        opts.aggregate = this.state.aggregate[0];
      } else {
        opts.multiAggregate = this.state.aggregate;
      }
    }
    if (this.state.groupBy) opts.groupBy = this.state.groupBy;
    if (this.state.having) {
      const havingFilter = compileFilter(this.state.having);
      if (havingFilter) opts.having = havingFilter;
    }
    if (this.state.fromSubquery) {
      opts.fromSubquery = {
        alias: this.state.fromSubquery.alias,
        collection: this.state.fromSubquery.collection,
        query: this.state.fromSubquery.query,
      };
    }
    if (this.state.windows) opts.windows = this.state.windows;
    if (this.state.selectExprs) opts.selectExprs = this.state.selectExprs;
    if (this.state.orderByExprs) opts.orderByExprs = this.state.orderByExprs;
    if (this.state.joins.length > 0) {
      opts.joins = this.state.joins.map((j) => ({
        type: j.type,
        target: j.target,
        subquery: j.subquery ? {
          collection: j.subquery.collection,
          query: j.subquery.query,
        } : undefined,
        on: j.on?.map((o) => ({
          left: o.left,
          operator: o.operator ?? "=",
          right: o.right,
        })),
      }));
    }
    if (this.state.with) opts.with = this.state.with;

    return opts;
  }

  getState(): BuilderState {
    return this.state;
  }
}
