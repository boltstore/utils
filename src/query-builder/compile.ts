import type { Filter, FilterCondition, FilterGroup } from "../types/query";
import { validateIdentifier } from "../validation";
import type { WhereClause } from "./state";

const OP_MAP: Record<string, string> = {
  eq: "$eq",
  neq: "$neq",
  gt: "$gt",
  gte: "$gte",
  lt: "$lt",
  lte: "$lte",
  contains: "$contains",
  startsWith: "$startsWith",
  endsWith: "$endsWith",
  regexp: "$regexp",
  in: "$in",
  notIn: "$nin",
  between: "$between",
  notBetween: "$notBetween",
  like: "$like",
  glob: "$glob",
  exists: "$exists",
  notExists: "$notExists",
};

/**
 * Compile a single WhereClause into a FilterCondition or FilterGroup.
 */
function compileClause(clause: WhereClause): Filter {
  switch (clause.type) {
    case "basic": {
      validateIdentifier(clause.field, "where field");
      const wireOp = OP_MAP[clause.operator];
      if (!wireOp) throw new Error(`Unknown operator "${clause.operator}"`);
      if (clause.operator === "eq") {
        return { [clause.field]: clause.value } as FilterCondition;
      }
      return { [clause.field]: { [wireOp]: clause.value } } as FilterCondition;
    }

    case "in": {
      validateIdentifier(clause.field, "where field");
      const wireOp = OP_MAP[clause.operator];
      return { [clause.field]: { [wireOp!]: clause.value } } as FilterCondition;
    }

    case "null": {
      validateIdentifier(clause.field, "where field");
      if (clause.operator === "null") {
        return { [clause.field]: null } as FilterCondition;
      }
      return { [clause.field]: { $neq: null } } as FilterCondition;
    }

    case "between": {
      validateIdentifier(clause.field, "where field");
      const wireOp = OP_MAP[clause.operator];
      return { [clause.field]: { [wireOp!]: clause.value } } as FilterCondition;
    }

    case "like": {
      validateIdentifier(clause.field, "where field");
      const wireOp = OP_MAP[clause.operator];
      return { [clause.field]: { [wireOp!]: clause.value } } as FilterCondition;
    }

    case "exists": {
      validateIdentifier(clause.field, "where field");
      return { [clause.field]: { $exists: clause.operator === "exists" } } as FilterCondition;
    }

    case "nested": {
      const compiled = compileFilter(clause.query);
      if (!compiled) return {};
      if (clause.boolean === "or") {
        return { $or: Array.isArray(compiled) ? compiled : [compiled] };
      }
      return compiled;
    }

    case "not": {
      const inner = compileFilter(clause.query);
      return { $not: inner || {} } as Filter;
    }

    case "raw": {
      return { $raw: { sql: clause.sql, bindings: clause.bindings ?? [] } } as unknown as Filter;
    }

    default:
      throw new Error(`Unknown WhereClause type: ${(clause as WhereClause).type}`);
  }
}

/**
 * WhereClause[] → Filter (wire format).
 *
 * Consecutive clauses with the same boolean are grouped together.
 * If all clauses are "and", returns a single $and group.
 * If all clauses are "or", returns a single $or group.
 * Mixed booleans are grouped: all "and" clauses form one group,
 * each "or" clause starts a new disjunct.
 */
export function compileFilter(wheres: WhereClause[]): Filter | undefined {
  if (wheres.length === 0) return undefined;
  if (wheres.length === 1) return compileClause(wheres[0]);

  const allAnd = wheres.every((w) => w.boolean === "and");
  const allOr = wheres.every((w) => w.boolean === "or");

  if (allAnd) {
    return { $and: wheres.map(compileClause) } as FilterGroup;
  }

  if (allOr) {
    return { $or: wheres.map(compileClause) } as FilterGroup;
  }

  // Mixed: group consecutive same-boolean clauses
  const groups: Filter[][] = [];
  let current: Filter[] = [];
  let currentBool: "and" | "or" | null = null;

  for (const w of wheres) {
    if (currentBool !== null && w.boolean !== currentBool) {
      groups.push(current);
      current = [];
    }
    currentBool = w.boolean;
    current.push(compileClause(w));
  }
  if (current.length > 0) groups.push(current);

  // Each group becomes either $and or $or depending on its boolean
  // Then all groups are OR'd together
  const compiled = groups.map((g, i) => {
    const bool = i === 0 ? "and" : "or";
    if (g.length === 1) return g[0];
    return bool === "and" ? { $and: g } as FilterGroup : { $or: g } as FilterGroup;
  });

  if (compiled.length === 1) return compiled[0];
  return { $or: compiled } as FilterGroup;
}
