import { tags } from '@/lib/db/schema';
import { eq, ilike } from 'drizzle-orm';
import { BaseRepository } from '../db';

// Tag数据类型定义
export type TagData = typeof tags.$inferSelect;

// 创建输入类型
export type TagCreateInput = Omit<TagData, 'id'>;

// 更新输入类型
export type TagUpdateInput = Partial<TagData> & { id: number };

/**
 * Tag持久化服务
 */
export class TagPersistenceService extends BaseRepository<typeof tags, TagData> {
    constructor(connectionString?: string) {
        super(tags);
    }

    /**
     * 根据用户ID查找标签
     * @param userId 用户ID
     * @param options 查询选项，可以包含 kind 类型筛选
     * @returns 标签数组
     */
    async findByUserId(userId: string, options?: {
        kind?: string;
        search?: string;
    }): Promise<TagData[]> {
        const query: any = { userId };

        if (options?.kind) {
            return this.findMany({
                userId,
                kind: options.kind
            });
        }

        let tags = await this.findMany({
            userId
        });

        // 如果有搜索关键词，在内存中过滤
        if (options?.search && options.search.trim()) {
            const searchTerm = options.search.toLowerCase().trim();
            tags = tags.filter(tag =>
                tag.name.toLowerCase().includes(searchTerm)
            );
        }

        return tags;
    }

    /**
     * 根据名称和用户ID查找标签
     * @param name 标签名称
     * @param userId 用户ID
     * @returns 标签或null
     */
    async findByNameAndUserId(name: string, userId: string): Promise<TagData | null> {
        const results = await this.findMany({
            name,
            userId
        });

        return results.length > 0 ? results[0] : null;
    }

    /**
     * 创建标签，如果已存在则返回现有标签
     * @param data 标签数据
     * @returns 创建或找到的标签
     */
    async createIfNotExists(data: TagCreateInput): Promise<TagData> {
        // 检查标签是否已存在
        const existingTag = await this.findByNameAndUserId(data.name, data.userId);

        if (existingTag) {
            return existingTag;
        }

        // 创建新标签
        return this.create(data);
    }

    /**
     * 根据类型查找用户的标签
     * @param userId 用户ID
     * @param kind 标签类型
     * @returns 标签数组
     */
    async findByKind(userId: string, kind: string): Promise<TagData[]> {
        return this.findMany({
            userId,
            kind
        });
    }

    /**
     * 搜索用户的标签
     * @param userId 用户ID
     * @param searchTerm 搜索关键词
     * @returns 标签数组
     */
    async searchTags(userId: string, searchTerm: string, kind?: string): Promise<TagData[]> {
        let query = this.db
            .select()
            .from(tags)
            .where(eq(tags.userId, userId));

        // 如果提供了类型，也按类型筛选
        if (kind) {
            query = query.where(eq(tags.kind, kind));
        }

        // 添加搜索条件
        if (searchTerm && searchTerm.trim()) {
            query = query.where(ilike(tags.name, `%${searchTerm.trim()}%`));
        }

        return query;
    }

    /**
     * 批量获取标签
     * @param ids 标签ID数组
     * @param userId 用户ID（用于安全校验）
     * @returns 标签数组
     */
    async findByIds(ids: number[], userId?: string): Promise<TagData[]> {
        const query: any = { id: { in: ids } };

        // 如果提供了用户ID，确保只返回该用户的标签
        if (userId) {
            query.userId = userId;
        }

        return this.db
            .select()
            .from(tags)
            .where(query);
    }
}
