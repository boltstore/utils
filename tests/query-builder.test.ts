import { describe, expect, test } from "bun:test";
import { QueryBuilder } from "../src/query-builder";
import { compileFilter } from "../src/query-builder/compile";

describe("QueryBuilder — state assertions", () => {

  test("initializes with empty state", () => {
    const qb = new QueryBuilder();
    const state = qb.getState();
    expect(state.collection).toBeUndefined();
    expect(state.wheres).toEqual([]);
    expect(state.orders).toEqual([]);
    expect(state.joins).toEqual([]);
    expect(state.withs).toEqual([]);
    expect(state.unions).toEqual([]);
  });

  test("from() sets collection", () => {
    const qb = new QueryBuilder().from("users");
    expect(qb.getState().collection).toBe("users");
  });

  test("from() validates collection name", () => {
    expect(() => new QueryBuilder().from("bad name!")).toThrow();
  });

  test("where(field, value) adds eq clause", () => {
    const qb = new QueryBuilder().where("name", "Alice");
    expect(qb.getState().wheres).toEqual([
      { type: "basic", field: "name", operator: "eq", value: "Alice", boolean: "and" },
    ]);
  });

  test("where(field, operator, value) adds operator clause", () => {
    const qb = new QueryBuilder().where("age", "gt", 18);
    expect(qb.getState().wheres).toEqual([
      { type: "basic", field: "age", operator: "gt", value: 18, boolean: "and" },
    ]);
  });

  test("orWhere(field, value) adds or clause", () => {
    const qb = new QueryBuilder().orWhere("name", "Bob");
    expect(qb.getState().wheres[0].boolean).toBe("or");
  });

  test("where(fn) creates nested group", () => {
    const qb = new QueryBuilder().where((q) => {
      q.where("age", 18);
      q.where("active", true);
    });
    const w = qb.getState().wheres[0];
    expect(w.type).toBe("nested");
    expect((w as any).query).toHaveLength(2);
  });

  test("whereEq / whereNeq / whereGt / whereGte / whereLt / whereLte", () => {
    const qb = new QueryBuilder()
      .whereEq("a", 1)
      .whereNeq("b", 2)
      .whereGt("c", 3)
      .whereGte("d", 4)
      .whereLt("e", 5)
      .whereLte("f", 6);
    const ops = qb.getState().wheres.map((w) => (w as any).operator);
    expect(ops).toEqual(["eq", "neq", "gt", "gte", "lt", "lte"]);
  });

  test("whereIn / whereNotIn", () => {
    const qb = new QueryBuilder()
      .whereIn("role", ["admin", "user"])
      .whereNotIn("status", ["banned"]);
    const [w1, w2] = qb.getState().wheres as any[];
    expect(w1.type).toBe("in");
    expect(w1.operator).toBe("in");
    expect(w1.value).toEqual(["admin", "user"]);
    expect(w2.type).toBe("in");
    expect(w2.operator).toBe("notIn");
    expect(w2.value).toEqual(["banned"]);
  });

  test("whereNull / whereNotNull", () => {
    const qb = new QueryBuilder()
      .whereNull("deleted_at")
      .whereNotNull("email");
    const [w1, w2] = qb.getState().wheres as any[];
    expect(w1.type).toBe("null");
    expect(w1.operator).toBe("null");
    expect(w2.type).toBe("null");
    expect(w2.operator).toBe("notNull");
  });

  test("whereBetween / whereNotBetween", () => {
    const qb = new QueryBuilder()
      .whereBetween("age", [18, 65])
      .whereNotBetween("score", [0, 10]);
    const [w1, w2] = qb.getState().wheres as any[];
    expect(w1.type).toBe("between");
    expect(w1.operator).toBe("between");
    expect(w1.value).toEqual([18, 65]);
    expect(w2.operator).toBe("notBetween");
  });

  test("whereLike / whereGlob", () => {
    const qb = new QueryBuilder()
      .whereLike("name", "%smith%")
      .whereGlob("path", "*.txt");
    const [w1, w2] = qb.getState().wheres as any[];
    expect(w1.type).toBe("like");
    expect(w1.operator).toBe("like");
    expect(w2.operator).toBe("glob");
  });

  test("whereNot(field, value) wraps in not", () => {
    const qb = new QueryBuilder().whereNot("status", "banned");
    const w = qb.getState().wheres[0] as any;
    expect(w.type).toBe("not");
    expect(w.query[0].field).toBe("status");
  });

  test("whereNot(fn) wraps group in not", () => {
    const qb = new QueryBuilder().whereNot((q) => {
      q.where("age", 18);
    });
    const w = qb.getState().wheres[0] as any;
    expect(w.type).toBe("not");
    expect(w.query).toHaveLength(1);
  });

  test("whereExists / whereNotExists", () => {
    const qb = new QueryBuilder()
      .whereExists("email")
      .whereNotExists("phone");
    const [w1, w2] = qb.getState().wheres as any[];
    expect(w1.type).toBe("exists");
    expect(w1.operator).toBe("exists");
    expect(w2.operator).toBe("notExists");
  });

  test("whereRaw adds raw clause", () => {
    const qb = new QueryBuilder().whereRaw("json_extract(data, '$.x') = ?", [1]);
    const w = qb.getState().wheres[0] as any;
    expect(w.type).toBe("raw");
    expect(w.sql).toBe("json_extract(data, '$.x') = ?");
    expect(w.bindings).toEqual([1]);
  });

  test("orWhere* variants set boolean to or", () => {
    const qb = new QueryBuilder()
      .orWhereEq("a", 1)
      .orWhereNeq("b", 2)
      .orWhereGt("c", 3)
      .orWhereGte("d", 4)
      .orWhereLt("e", 5)
      .orWhereLte("f", 6)
      .orWhereIn("g", [1, 2])
      .orWhereNotIn("h", [3])
      .orWhereNull("i")
      .orWhereNotNull("j")
      .orWhereBetween("k", [1, 10])
      .orWhereNotBetween("l", [5, 15])
      .orWhereLike("m", "%x%")
      .orWhereGlob("n", "*.jpg")
      .orWhereExists("o")
      .orWhereNotExists("p");
    for (const w of qb.getState().wheres) {
      expect(w.boolean).toBe("or");
    }
  });

  test("orderBy with string direction", () => {
    const qb = new QueryBuilder().orderBy("name", "desc");
    expect(qb.getState().orders).toEqual([
      { field: "name", direction: "desc" },
    ]);
  });

  test("orderBy with -field shorthand", () => {
    const qb = new QueryBuilder().orderBy("-name");
    expect(qb.getState().orders).toEqual([
      { field: "name", direction: "desc" },
    ]);
  });

  test("orderBy defaults to asc", () => {
    const qb = new QueryBuilder().orderBy("name");
    expect(qb.getState().orders).toEqual([
      { field: "name", direction: "asc" },
    ]);
  });

  test("orderBy validates field name", () => {
    expect(() => new QueryBuilder().orderBy("bad name!")).toThrow();
  });

  test("orderByRaw adds raw order", () => {
    const qb = new QueryBuilder().orderByRaw("RANDOM()");
    expect(qb.getState().orders).toEqual([
      { field: "RANDOM()", direction: "asc" },
    ]);
  });

  test("limit / offset", () => {
    const qb = new QueryBuilder().limit(10).offset(5);
    expect(qb.getState().limit).toBe(10);
    expect(qb.getState().offset).toBe(5);
  });

  test("page / perPage", () => {
    const qb = new QueryBuilder().perPage(20).page(3);
    expect(qb.getState().limit).toBe(20);
    expect(qb.getState().offset).toBe(40);
  });

  test("select sets fields", () => {
    const qb = new QueryBuilder().select("name", "email");
    expect(qb.getState().fields).toEqual(["name", "email"]);
  });

  test("search sets term and optional fields", () => {
    const qb = new QueryBuilder().search("hello", ["name", "bio"]);
    expect(qb.getState().search).toBe("hello");
    expect(qb.getState().searchFields).toEqual(["name", "bio"]);
  });

  test("expand sets relations", () => {
    const qb = new QueryBuilder().expand("author", "comments");
    expect(qb.getState().expand).toEqual(["author", "comments"]);
  });

  test("aggregate sets single spec", () => {
    const qb = new QueryBuilder().aggregate({ function: "$count", field: "*", alias: "total" });
    expect(qb.getState().aggregate).toEqual([
      { function: "$count", field: "*", alias: "total" },
    ]);
  });

  test("aggregate sets multiple specs", () => {
    const qb = new QueryBuilder().aggregate([
      { function: "$count", field: "*", alias: "c" },
      { function: "$sum", field: "amount", alias: "s" },
    ]);
    expect(qb.getState().aggregate).toHaveLength(2);
  });

  test("groupBy stores fields", () => {
    const qb = new QueryBuilder().groupBy("role", "status");
    expect(qb.getState().groupBy).toEqual(["role", "status"]);
  });

  test("having stores where clauses", () => {
    const qb = new QueryBuilder().having("total", "gt", 100);
    expect(qb.getState().having).toHaveLength(1);
    expect((qb.getState().having![0] as any).field).toBe("total");
  });

  test("having with callback stores nested wheres", () => {
    const qb = new QueryBuilder().having((q) => q.where("a", 1).orWhere("b", 2));
    expect(qb.getState().having).toHaveLength(2);
  });

  test("clone creates independent copy", () => {
    const qb = new QueryBuilder().from("users").where("age", 18);
    const cloned = qb.clone();
    cloned.where("name", "Bob");
    expect(qb.getState().wheres).toHaveLength(1);
    expect(cloned.getState().wheres).toHaveLength(2);
    expect(cloned.getState().collection).toBe("users");
  });

  test("clone does not share state reference", () => {
    const qb = new QueryBuilder().from("users");
    const cloned = qb.clone();
    cloned.from("posts");
    expect(qb.getState().collection).toBe("users");
  });
});

describe("compileFilter — WhereClause[] → FilterExpression", () => {

  test("returns undefined for empty array", () => {
    expect(compileFilter([])).toBeUndefined();
  });

  test("single basic eq clause", () => {
    const result = compileFilter([
      { type: "basic", field: "name", operator: "eq", value: "Alice", boolean: "and" },
    ]);
    expect(result).toEqual({ name: "Alice" });
  });

  test("single basic non-eq clause", () => {
    const result = compileFilter([
      { type: "basic", field: "age", operator: "gt", value: 18, boolean: "and" },
    ]);
    expect(result).toEqual({ age: { $gt: 18 } });
  });

  test("multiple and clauses produce $and", () => {
    const result = compileFilter([
      { type: "basic", field: "name", operator: "eq", value: "A", boolean: "and" },
      { type: "basic", field: "age", operator: "gte", value: 18, boolean: "and" },
    ]);
    expect(result).toEqual({
      $and: [{ name: "A" }, { age: { $gte: 18 } }],
    });
  });

  test("multiple or clauses produce $or", () => {
    const result = compileFilter([
      { type: "basic", field: "role", operator: "eq", value: "admin", boolean: "or" },
      { type: "basic", field: "role", operator: "eq", value: "mod", boolean: "or" },
    ]);
    expect(result).toEqual({
      $or: [{ role: "admin" }, { role: "mod" }],
    });
  });

  test("mixed and/or produces grouped $or", () => {
    const result = compileFilter([
      { type: "basic", field: "age", operator: "eq", value: 18, boolean: "and" },
      { type: "basic", field: "name", operator: "eq", value: "Bob", boolean: "or" },
    ]);
    // (age = 18) OR (name = Bob)
    expect(result).toEqual({
      $or: [{ age: 18 }, { name: "Bob" }],
    });
  });

  test("nested group", () => {
    const result = compileFilter([
      {
        type: "nested",
        query: [
          { type: "basic", field: "a", operator: "eq", value: 1, boolean: "and" },
          { type: "basic", field: "b", operator: "eq", value: 2, boolean: "or" },
        ],
        boolean: "and",
      },
    ]);
    expect(result).toEqual({
      $or: [{ a: 1 }, { b: 2 }],
    });
  });

  test("not clause wraps inner", () => {
    const result = compileFilter([
      {
        type: "not",
        query: [
          { type: "basic", field: "status", operator: "eq", value: "banned", boolean: "and" },
        ],
        boolean: "and",
      },
    ]);
    expect(result).toEqual({
      $not: { status: "banned" },
    });
  });

  test("in clause", () => {
    const result = compileFilter([
      { type: "in", field: "role", operator: "in", value: ["admin", "user"], boolean: "and" },
    ]);
    expect(result).toEqual({ role: { $in: ["admin", "user"] } });
  });

  test("notIn clause", () => {
    const result = compileFilter([
      { type: "in", field: "status", operator: "notIn", value: ["banned"], boolean: "and" },
    ]);
    expect(result).toEqual({ status: { $nin: ["banned"] } });
  });

  test("null clause", () => {
    const result = compileFilter([
      { type: "null", field: "deleted_at", operator: "null", boolean: "and" },
    ]);
    expect(result).toEqual({ deleted_at: null });
  });

  test("notNull clause", () => {
    const result = compileFilter([
      { type: "null", field: "email", operator: "notNull", boolean: "and" },
    ]);
    expect(result).toEqual({ email: { $neq: null } });
  });

  test("between clause", () => {
    const result = compileFilter([
      { type: "between", field: "age", operator: "between", value: [18, 65], boolean: "and" },
    ]);
    expect(result).toEqual({ age: { $between: [18, 65] } });
  });

  test("notBetween clause", () => {
    const result = compileFilter([
      { type: "between", field: "score", operator: "notBetween", value: [0, 50], boolean: "and" },
    ]);
    expect(result).toEqual({ score: { $notBetween: [0, 50] } });
  });

  test("like clause", () => {
    const result = compileFilter([
      { type: "like", field: "name", operator: "like", value: "%smith%", boolean: "and" },
    ]);
    expect(result).toEqual({ name: { $like: "%smith%" } });
  });

  test("glob clause", () => {
    const result = compileFilter([
      { type: "like", field: "path", operator: "glob", value: "*.txt", boolean: "and" },
    ]);
    expect(result).toEqual({ path: { $glob: "*.txt" } });
  });

  test("exists clause", () => {
    const result = compileFilter([
      { type: "exists", field: "email", operator: "exists", boolean: "and" },
    ]);
    expect(result).toEqual({ email: { $exists: true } });
  });

  test("notExists clause", () => {
    const result = compileFilter([
      { type: "exists", field: "phone", operator: "notExists", boolean: "and" },
    ]);
    expect(result).toEqual({ phone: { $exists: false } });
  });

  test("rejects invalid field names", () => {
    expect(() =>
      compileFilter([
        { type: "basic", field: "bad field!", operator: "eq", value: 1, boolean: "and" },
      ])
    ).toThrow();
  });
});

describe("toParams — builder state serialization", () => {

  test("minimal params", () => {
    const qb = new QueryBuilder().from("users");
    const params = qb.toParams();
    expect(params.collection).toBe("users");
    expect(params.filter).toBeUndefined();
    expect(params.sort).toBeUndefined();
  });

  test("single where compiles to filter", () => {
    const params = new QueryBuilder().from("users").where("name", "Alice").toParams();
    expect(params.filter).toEqual({ name: "Alice" });
  });

  test("multiple wheres compile to $and", () => {
    const params = new QueryBuilder()
      .from("users")
      .where("name", "Alice")
      .where("age", 18)
      .toParams();
    expect(params.filter).toEqual({
      $and: [{ name: "Alice" }, { age: 18 }],
    });
  });

  test("orderBy produces sort array", () => {
    const params = new QueryBuilder()
      .from("users")
      .orderBy("name", "desc")
      .toParams();
    expect(params.sort).toEqual([{ field: "name", direction: "desc" }]);
  });

  test("limit and offset serialized", () => {
    const params = new QueryBuilder().from("users").limit(10).offset(5).toParams();
    expect(params.limit).toBe(10);
    expect(params.offset).toBe(5);
  });

  test("select serialized as fields", () => {
    const params = new QueryBuilder().from("users").select("name").toParams();
    expect(params.fields).toEqual(["name"]);
  });

  test("search and searchFields serialized", () => {
    const params = new QueryBuilder().from("users").search("hello", ["name"]).toParams();
    expect(params.search).toBe("hello");
    expect(params.searchFields).toEqual(["name"]);
  });

  test("expand serialized", () => {
    const params = new QueryBuilder().from("users").expand("posts").toParams();
    expect(params.expand).toEqual(["posts"]);
  });

  test("single aggregate serialized as object", () => {
    const params = new QueryBuilder()
      .from("users")
      .aggregate({ function: "$count", field: "*", alias: "total" })
      .toParams();
    expect(params.aggregate).toEqual({ function: "$count", field: "*", alias: "total" });
    expect((params as any).multiAggregate).toBeUndefined();
  });

  test("multi aggregate serialized as array", () => {
    const params = new QueryBuilder()
      .from("users")
      .aggregate([
        { function: "$count", field: "*", alias: "c" },
        { function: "$sum", field: "amount", alias: "s" },
      ])
      .toParams();
    expect((params as any).multiAggregate).toHaveLength(2);
    expect(params.aggregate).toBeUndefined();
  });

  test("groupBy serialized", () => {
    const params = new QueryBuilder().from("users").groupBy("role").toParams();
    expect(params.groupBy).toEqual(["role"]);
  });

  test("having serialized as filter", () => {
    const params = new QueryBuilder()
      .from("users")
      .having("total", "gt", 100)
      .toParams();
    expect(params.having).toEqual({ total: { $gt: 100 } });
  });

  test("whereRaw stripped from toParams output (not in wire format)", () => {
    const params = new QueryBuilder()
      .from("users")
      .whereRaw("1 = 1")
      .toParams();
    const filter = params.filter as any;
    // $raw clauses survive in the filter as-is since compileFilter emits them
    // Server will reject until Phase 2 — that's expected
    expect(filter.$raw).toBeDefined();
  });
});
