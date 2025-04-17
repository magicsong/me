// 2. 引入 pg-core + ORM 核心工具
import {
    eq,
    gt,
    gte,
    inArray, like,
    lt,
    lte,
    ne,
    type AnyColumn,
    type SQL
} from 'drizzle-orm';

import { FilterCondition, FilterOperator } from '../types';

// 3. 把单个 FilterCondition 转成 SQL 表达式
function buildCondition<TRow>(
    table: { [K in keyof TRow]: AnyColumn },
    cond: FilterCondition<TRow>,
): SQL {
    const col = table[cond.field] as AnyColumn;
    switch (cond.operator) {
        case FilterOperator.EQ: return eq(col, cond.value);
        case FilterOperator.NE: return ne(col, cond.value);
        case FilterOperator.GT: return gt(col, cond.value);
        case FilterOperator.GTE: return gte(col, cond.value);
        case FilterOperator.LT: return lt(col, cond.value);
        case FilterOperator.LTE: return lte(col, cond.value);
        case FilterOperator.IN:
            return inArray(col, Array.isArray(cond.value) ? cond.value : [cond.value]);
        case FilterOperator.LIKE:
            return like(col, `%${cond.value}%`);
        default:
            throw new Error(`Unsupported operator: ${cond.operator}`);
    }
}

// 4. 收集所有 SQL 表达式
export function collectConditions<TRow>(
    table: { [K in keyof TRow]: AnyColumn },
    filters: FilterCondition<TRow>[],
): SQL[] {
    return filters.map(f => buildCondition(table, f));
}
