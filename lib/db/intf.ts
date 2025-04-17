// 分页结果接口
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// 排序类型
export type SortOrder = 'asc' | 'desc';

// 分页选项
export interface PaginationOptions {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: SortOrder;
}

// 钩子类型定义
export interface RepositoryHooks<T> {
    beforeCreate?: (data: Partial<T>) => Promise<Partial<T>> | Partial<T>;
    afterCreate?: (data: T) => Promise<T> | T;
    beforeUpdate?: (id: any, data: Partial<T>) => Promise<Partial<T>> | Partial<T>;
    afterUpdate?: (data: T) => Promise<T> | T;
    beforeDelete?: (id: any) => Promise<boolean> | boolean;
    afterDelete?: (data: T) => Promise<T> | T;
    beforeQuery?: (filter: FilterCondition<T>) => Promise<FilterCondition<T>> | FilterCondition<T>;
    afterQuery?: (data: T | T[] | null) => Promise<T | T[] | null> | T | T[] | null;
    afterPagination?: (result: PaginatedResult<T>) => Promise<PaginatedResult<T>> | PaginatedResult<T>;
}

// 过滤条件
export type FilterCondition<T> = Partial<{
    [K in keyof T]: T[K] | { eq?: T[K]; neq?: T[K]; gt?: T[K]; gte?: T[K]; lt?: T[K]; lte?: T[K]; in?: T[K][]; like?: string }
}>;


/**
 * 持久化服务接口
 */
export interface PersistenceService<T> {
    /**
     * 创建单个记录
     */
    create(data: Partial<T>): Promise<T>;

    /**
     * 批量创建记录
     */
    createMany(data: Partial<T>[]): Promise<T[]>;

    /**
     * 根据ID获取记录
     */
    findById(id: string | number): Promise<T | null>;

    /**
     * 获取所有记录
     */
    getAll(userId?: string): Promise<T[]>;

    /**
     * 根据过滤条件获取单条记录
     */
    findOne(filter: FilterCondition<T>): Promise<T | null>;

    /**
     * 根据过滤条件获取多条记录
     */
    findMany(filter: FilterCondition<T>): Promise<T[]>;

    /**
     * 更新记录
     */
    update(id: string | number, data: Partial<T>): Promise<T>;

    /**
     * 批量更新，每个项目允许不同，一般就是for循环调用update
     * @param data 
     */
    updateMany(data: Partial<T>[]): Promise<T[]>;

    /**
     * 批量更新某个字段
     */
    patchMany(filter: FilterCondition<T>, data: Partial<T>): Promise<T[]>;

    /**
     * 删除记录
     */
    delete(id: string | number): Promise<T>;

    /**
     * 批量删除记录
     */
    deleteMany?(filter: FilterCondition<T>): Promise<T[]>;

    /**
     * 通过用户ID获取记录
     */
    getByUserId?(userId: string): Promise<T[]>;

    /**
     * 通用过滤方法
     */
    getWithFilters?(
        filter: FilterCondition<T>,
        userId?: string
    ): Promise<{
        items: T[];
        total: number;
        metadata?: Record<string, any>;
    }>;

    /**
     * 带分页的通用过滤方法
     */
    getPageWithFilters?(
        page: PaginationOptions,
        filter?: FilterCondition<T>,
        userId?: string
    ): Promise<{
        items: T[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
        metadata?: Record<string, any>;
    }>;
}
