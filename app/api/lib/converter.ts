/**
     * 转换API过滤条件为持久层过滤条件
     * @param filters API过滤选项
     * @returns 持久层过滤条件
     */
export function convertFilters(filters: FilterOptions): FilterCondition<T> {
    const result: FilterCondition<T> = {} as FilterCondition<T>;
    if (filters.conditions && filters.conditions.length > 0) {
        for (const condition of filters.conditions) {
            // 处理eq操作符，这会覆盖之前的任何条件
            if (condition.operator === 'eq') {
                result[condition.field] = condition.value;
                continue;
            }
            
            // 处理其他操作符
            // 如果字段尚未初始化或不是对象，需要初始化为对象
            if (!result[condition.field] || typeof result[condition.field] !== 'object') {
                // 如果已经有值，它是一个简单值（eq操作符的结果），记录警告
                if (result[condition.field] !== undefined) {
                    console.warn(`字段 ${condition.field} 已有等于条件，添加 ${condition.operator} 条件可能导致意外结果`);
                }
                result[condition.field] = {};
            }
            
            // 根据操作符设置条件
            switch (condition.operator) {
                case 'neq':
                    result[condition.field].ne = condition.value;
                    break;
                case 'gt':
                    result[condition.field].gt = condition.value;
                    break;
                case 'gte':
                    result[condition.field].gte = condition.value;
                    break;
                case 'lt':
                    result[condition.field].lt = condition.value;
                    break;
                case 'lte':
                    result[condition.field].lte = condition.value;
                    break;
                case 'like':
                    result[condition.field].like = condition.value;
                    break;
                case 'in':
                    result[condition.field].in = condition.value;
                    break;
            }
        }
    }
    
    return result;
}