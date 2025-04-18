import { sql, eq, and, or, desc, asc, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgTableWithColumns } from 'drizzle-orm/pg-core';
import { db, FilterCondition, PaginationOptions, RepositoryHooks, PersistenceService, PaginatedResult } from '.';

// 基础仓库类
export class BaseRepository<T extends PgTableWithColumns<any>, I extends Record<string, any>> implements PersistenceService<I> {
    protected db: NodePgDatabase;
    protected table: T;
    protected primaryKey: keyof I;
    protected hooks: RepositoryHooks<I>;

    constructor(table: T, primaryKey: keyof I = 'id' as keyof I) {
        this.db = db;
        this.table = table;
        this.primaryKey = primaryKey;
        this.hooks = {};
    }

    getDb() {
        return this.db;
    }

    // 设置钩子
    setHooks(hooks: Partial<RepositoryHooks<I>>): void {
        this.hooks = { ...this.hooks, ...hooks };
    }

    // 创建记录
    async create(data: Partial<I>): Promise<I> {
        let processedData = data;
        if (this.hooks.beforeCreate) {
            processedData = await Promise.resolve(this.hooks.beforeCreate(data));
        }

        const result = await this.db.insert(this.table).values(processedData as any).returning();
        let createdData = result[0] as I;

        if (this.hooks.afterCreate) {
            createdData = await Promise.resolve(this.hooks.afterCreate(data, createdData));
        }

        return createdData;
    }

    // 批量创建记录
    async createMany(data: Partial<I>[]): Promise<I[]> {
        let processedData = [...data];

        // 移除所有数据中的 id 字段，让数据库自动生成
        processedData = processedData.map(item => {
            const newItem = { ...item };
            if ('id' in newItem) {
                delete newItem.id;
            }
            return newItem;
        });

        if (this.hooks.beforeCreate) {
            processedData = await Promise.all(
                processedData.map(item => Promise.resolve(this.hooks.beforeCreate!(item)))
            );
        }

        const result = await this.db.insert(this.table).values(processedData as any).returning();
        let createdData = result as I[];

        if (this.hooks.afterCreate) {
            createdData = await Promise.all(
                createdData.map(item => Promise.resolve(this.hooks.afterCreate!(item)))
            );
        }

        return createdData;
    }

    // 通过ID查找记录
    async findById(id: string | number): Promise<I | null> {
        let filter = { [this.primaryKey]: id } as FilterCondition<I>;

        if (this.hooks.beforeQuery) {
            filter = await Promise.resolve(this.hooks.beforeQuery(filter));
        }

        const condition = this.buildWhereCondition(filter);
        const result = await this.db
            .select()
            .from(this.table)
            .where(condition)
            .limit(1);

        let data = result.length > 0 ? this.purifyResult(result[0]) : null;

        if (this.hooks.afterQuery && data) {
            data = await Promise.resolve(this.hooks.afterQuery(data) as I | null);
        }

        return data;
    }

    // 获取所有记录
    async getAll(userId?: string): Promise<I[]> {
        let filter = {} as FilterCondition<I>;

        if (userId) {
            filter = { user_id: userId } as unknown as FilterCondition<I>;
        }

        return this.findMany(filter);
    }

    // 查找单条记录
    async findOne(filter: FilterCondition<I>): Promise<I | null> {
        if (this.hooks.beforeQuery) {
            filter = await Promise.resolve(this.hooks.beforeQuery(filter));
        }

        const condition = this.buildWhereCondition(filter);
        const result = await this.db
            .select()
            .from(this.table)
            .where(condition)
            .limit(1);

        let data = result.length > 0 ? this.purifyResult(result[0]) : null;

        if (this.hooks.afterQuery && data) {
            data = await Promise.resolve(this.hooks.afterQuery(data) as I | null);
        }

        return data;
    }

    // 查找多条记录
    async findMany(filter: FilterCondition<I> = {}): Promise<I[]> {
        if (this.hooks.beforeQuery) {
            filter = await Promise.resolve(this.hooks.beforeQuery(filter));
        }

        const condition = this.buildWhereCondition(filter);
        const result = await this.db
            .select()
            .from(this.table)
            .where(condition);

        let data = this.purifyResults(result);

        if (this.hooks.afterQuery) {
            data = await Promise.resolve(this.hooks.afterQuery(data) as I[]);
        }

        return data;
    }

    // 更新记录
    async update(id: string | number, data: Partial<I>): Promise<I> {
        const result = await this._update(id, data);
        if (!result) {
            throw new Error(`记录 ${id} 不存在`);
        }
        return result;
    }

    // 内部更新方法，保留原有逻辑
    private async _update(id: any, data: Partial<I>): Promise<I | null> {
        let processedData = { ...data };

        if (this.hooks.beforeUpdate) {
            processedData = await Promise.resolve(this.hooks.beforeUpdate(id, processedData));
        }

        const result = await this.db
            .update(this.table)
            .set(processedData as any)
            .where(eq(this.table[this.primaryKey as string] as any, id))
            .returning();

        let updatedData = result.length > 0 ? (result[0] as I) : null;

        if (this.hooks.afterUpdate && updatedData) {
            updatedData = await Promise.resolve(this.hooks.afterUpdate(updatedData));
        }

        return updatedData;
    }

    // 批量更新记录
    async updateMany(data: Partial<I>[]): Promise<I[]> {
        const results: I[] = [];

        for (const item of data) {
            const id = item[this.primaryKey];
            if (!id) {
                throw new Error(`更新数据必须包含主键 ${String(this.primaryKey)}`);
            }

            const result = await this._update(id, item);
            if (result) {
                results.push(result);
            }
        }

        return results;
    }

    // 批量更新某个字段
    async patchMany(filter: FilterCondition<I>, data: Partial<I>): Promise<I[]> {
        if (this.hooks.beforeQuery) {
            filter = await Promise.resolve(this.hooks.beforeQuery(filter));
        }

        const condition = this.buildWhereCondition(filter);
        const result = await this.db
            .update(this.table)
            .set(data as any)
            .where(condition)
            .returning();

        let updatedData = result as I[];

        if (this.hooks.afterUpdate) {
            updatedData = await Promise.all(
                updatedData.map(item => Promise.resolve(this.hooks.afterUpdate!(item)))
            );
        }

        return updatedData;
    }

    // 删除记录
    async delete(id: string | number): Promise<I> {
        const result = await this._delete(id);
        if (!result) {
            throw new Error(`记录 ${id} 不存在`);
        }
        return result;
    }

    // 内部删除方法，保留原有逻辑
    private async _delete(id: any): Promise<I | null> {
        if (this.hooks.beforeDelete) {
            const shouldProceed = await Promise.resolve(this.hooks.beforeDelete(id));
            if (!shouldProceed) return null;
        }

        const result = await this.db
            .delete(this.table)
            .where(eq(this.table[this.primaryKey as string] as any, id))
            .returning();

        let deletedData = result.length > 0 ? (result[0] as I) : null;

        if (this.hooks.afterDelete && deletedData) {
            deletedData = await Promise.resolve(this.hooks.afterDelete(deletedData));
        }

        return deletedData;
    }

    // 批量删除记录
    async deleteMany(filter: FilterCondition<I>): Promise<I[]> {
        if (this.hooks.beforeQuery) {
            filter = await Promise.resolve(this.hooks.beforeQuery(filter));
        }

        const condition = this.buildWhereCondition(filter);
        const result = await this.db
            .delete(this.table)
            .where(condition)
            .returning();

        let deletedData = result as I[];

        if (this.hooks.afterDelete) {
            deletedData = await Promise.all(
                deletedData.map(item => Promise.resolve(this.hooks.afterDelete!(item)))
            );
        }

        return deletedData;
    }

    // 通过用户ID获取记录
    async getByUserId(userId: string): Promise<I[]> {
        return this.findMany({ user_id: userId } as unknown as FilterCondition<I>);
    }

    // 通用过滤方法
    async getWithFilters(
        filter: FilterCondition<I>,
        userId?: string,
        limit?: number,
    ): Promise<{
        items: I[];
        total: number;
        metadata?: Record<string, any>;
    }> {
        if (userId) {
            filter = { ...filter, user_id: userId } as unknown as FilterCondition<I>;
        }

        let data = await this.findMany(filter);
        if (limit && limit > 0) {
            data = data.slice(0, limit);
        }   
        return {
            items: data,
            total: data.length
        }
    }

    // 带分页的通用过滤方法
    async getPageWithFilters(
        page: PaginationOptions,
        filter?: FilterCondition<I>,
        userId?: string
    ): Promise<{
        items: I[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
        metadata?: Record<string, any>;
    }> {
        const actualFilter = filter || {};
        console.log("db", actualFilter)
        if (userId) {
            actualFilter.user_id = userId as any;
        }

        const result = await this.findWithPagination(actualFilter, page);

        return {
            items: result.data,
            total: result.total,
            page: result.page,
            pageSize: result.pageSize,
            totalPages: result.totalPages
        };
    }

    // 内部分页查询方法
    private async findWithPagination(
        filter: FilterCondition<I> = {},
        options: PaginationOptions = {}
    ): Promise<PaginatedResult<I>> {
        if (this.hooks.beforeQuery) {
            filter = await Promise.resolve(this.hooks.beforeQuery(filter));
        }
        console.log("db", filter)
        const { page = 1, pageSize = 10, sortBy, sortOrder = 'asc' } = options;
        const offset = (page - 1) * pageSize;
        const condition = this.buildWhereCondition(filter);

        const countResult = await this.db
            .select({ count: SQL`count(*)` })
            .from(this.table)
            .where(condition);

        const total = Number(countResult[0].count);

        let query = this.db
            .select()
            .from(this.table)
            .where(condition)
            .limit(pageSize)
            .offset(offset);

        if (sortBy) {
            query = query.orderBy(
                sortOrder === 'desc'
                    ? desc(this.table[sortBy as string] as any)
                    : asc(this.table[sortBy as string] as any)
            );
        }

        const resultData = await query;
        let data = this.purifyResults(resultData);

        if (this.hooks.afterQuery) {
            data = await Promise.resolve(this.hooks.afterQuery(data) as I[]);
        }

        let result: PaginatedResult<I> = {
            data,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };

        if (this.hooks.afterPagination) {
            result = await Promise.resolve(this.hooks.afterPagination(result));
        }

        return result;
    }

    // 构建where条件
    protected buildWhereCondition(filter: FilterCondition<I>): SQL {
        const conditions: SQL[] = [];

        for (const [key, value] of Object.entries(filter)) {
            if (value === null || value === undefined) continue;

            // 检查字段是否存在于表结构中
            if (!(key in this.table)) {
                throw new Error(`字段 ${key} 在表 ${this.table.name} 中不存在`);
            }

            if (typeof value === 'object' && !Array.isArray(value)) {
                const complexFilter = value as any;

                if (complexFilter.eq !== undefined) {
                    conditions.push(eq(this.table[key] as any, complexFilter.eq));
                }
                if (complexFilter.neq !== undefined) {
                    conditions.push(sql`${this.table[key]} <> ${complexFilter.neq}`);
                }
                if (complexFilter.gt !== undefined) {
                    conditions.push(sql`${this.table[key]} > ${complexFilter.gt}`);
                }
                if (complexFilter.gte !== undefined) {
                    conditions.push(sql`${this.table[key]} >= ${complexFilter.gte}`);
                }
                if (complexFilter.lt !== undefined) {
                    conditions.push(sql`${this.table[key]} < ${complexFilter.lt}`);
                }
                if (complexFilter.lte !== undefined) {
                    conditions.push(sql`${this.table[key]} <= ${complexFilter.lte}`);
                }
                if (complexFilter.in !== undefined) {
                    conditions.push(sql`${this.table[key]} IN ${complexFilter.in}`);
                }
                if (complexFilter.like !== undefined) {
                    conditions.push(sql`${this.table[key]} LIKE ${`%${complexFilter.like}%`}`);
                }
            } else {
                conditions.push(eq(this.table[key] as any, value));
            }
        }

        return conditions.length ? and(...conditions) : sql`1=1`;
    }

    // 清除单个结果对象中的循环引用
    protected purifyResult(result: any): I {
        // 使用JSON序列化和反序列化来移除循环引用
        // 注意：这会丢失函数和其他非JSON类型
        try {
            return JSON.parse(JSON.stringify(result));
        } catch (error) {
            // 如果序列化失败，使用浅拷贝作为备选方案
            const cleanObject: any = {};
            for (const key in result) {
                if (Object.prototype.hasOwnProperty.call(result, key) &&
                    typeof result[key] !== 'function' &&
                    key !== 'db' &&
                    key !== 'session' &&
                    key !== 'client') {
                    cleanObject[key] = result[key];
                }
            }
            return cleanObject as I;
        }
    }

    // 清除结果数组中的循环引用
    protected purifyResults(results: any[]): I[] {
        return results.map(item => this.purifyResult(item));
    }
}
