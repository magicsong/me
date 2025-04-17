import { BaseRequest, BaseResponse, BusinessObject, FilterOptions, PatchRequest, BatchPatchRequest, BaseBatchRequest } from '../types';

/**
 * API处理器接口，定义API处理器应该具有的核心方法
 */
export interface IApiHandler<T, BO extends BusinessObject = any> {

    getResourceName(): string;
    // 处理创建请求 - 单个对象
    handleCreate(request: BaseRequest<BO>): Promise<BaseResponse<BO>>;

    // 处理批量创建请求 - 使用专门的批量请求接口
    handleBatchCreate(request: BaseBatchRequest<BO>): Promise<BaseResponse<BO[]>>;
    
    // 处理更新请求 - 单个对象
    handleUpdate(request: BaseRequest<BO>): Promise<BaseResponse<BO>>;

    // 处理批量更新请求 - 使用专门的批量请求接口
    handleBatchUpdate(request: BaseBatchRequest<BO>): Promise<BaseResponse<BO[]>>;
    
    // 根据ID获取单个资源
    getById(id: string): Promise<BO | null>;
    
    // 获取所有资源
    getAll(userId?: string): Promise<BO[]>;
    
    // 分页获取资源
    getPage(page?: number, pageSize?: number, userId?: string): Promise<{
        items: BO[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    }>;
    
    // 使用过滤器获取资源
    getWithFilters(filters: FilterOptions, userId?: string): Promise<{
        items: BO[];
        total: number;
        metadata?: Record<string, any>;
    }>;
    
    // 分页获取并过滤资源
    getPageWithFilters(
        filters: FilterOptions,
        page?: number,
        pageSize?: number,
        userId?: string
    ): Promise<{
        items: BO[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
        metadata?: Record<string, any>;
    }>;

    /**
     * 处理部分更新请求 - 只更新指定字段
     * @param request 包含要更新资源ID和指定字段的请求
     */
    handlePatch(request: PatchRequest<BO>): Promise<BaseResponse<BO>>;
    
    /**
     * 处理批量部分更新请求 - 将多个资源的相同字段更新为相同值
     * @param request 包含要批量更新的资源ID列表和指定字段的请求
     */
    handleBatchPatch(request: BatchPatchRequest<BO>): Promise<BaseResponse<BO>>;

    /**
     * 使用AI根据用户提示生成单个BO对象
     * @param request 请求对象，其中 userPrompt 字段必填，可以包含部分数据作为提示
     * @returns 返回AI生成的BO对象(不含ID)
     */
    generateWithAI(request: BaseRequest<Partial<BO>>): Promise<BaseResponse<BO>>;
    
    /**
     * 使用AI根据用户提示批量生成多个BO对象
     * @param request 请求对象，其中 userPrompt 字段必填，batchSize 字段用于指定生成数量
     *                如果 generateBothCreatedAndUpdated 为 true，则必须提供 data 字段作为更新基础
     * @returns 返回区分新生成和更新的BO对象集合，created数组包含新生成的项，updated数组包含更新的现有项
     *          - 当 generateBothCreatedAndUpdated 为 false 时，只返回 created 数组中的新对象
     *          - 当 generateBothCreatedAndUpdated 为 true 时，同时返回 created 和 updated 数组
     */
    generateBatchWithAI(request: BaseBatchRequest<BO>): Promise<BaseResponse<{
        created: Partial<BO>[];
        updated: BO[];
    }>>;

    /**
     * 处理删除请求 - 删除单个资源
     * @param request 包含要删除资源ID的请求
     */
    handleDelete(request: { id: string, [key: string]: any }): Promise<BaseResponse<{ success: boolean }>>;
    
    /**
     * 处理批量删除请求 - 删除多个资源
     * @param request 包含要删除资源ID列表的请求
     */
    handleBatchDelete(request: { ids: string[], [key: string]: any }): Promise<BaseResponse<{ success: boolean, count: number }>>;
}
