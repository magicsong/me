export function trimLLMContentToJsonObject(content: string): string {
    // 首先尝试从Markdown代码块中提取JSON
    const codeBlockMatches = Array.from(content.matchAll(/```(?:json)?\s*([\s\S]*?)```/g))
        .map(match => match[1].trim())
        .filter(jsonStr => {
            try {
                const parsed = JSON.parse(jsonStr);
                // 确保提取的是对象而不是数组
                return parsed && typeof parsed === 'object' && !Array.isArray(parsed);
            } catch (e) {
                return false;
            }
        });
    
    // 尝试匹配从第一个 { 到最后一个 } 的完整内容
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    
    let jsonMatches = [];
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const fullJsonCandidate = content.substring(firstBrace, lastBrace + 1);
        try {
            const parsed = JSON.parse(fullJsonCandidate);
            if (typeof parsed === 'object' && !Array.isArray(parsed)) {
                jsonMatches.push(fullJsonCandidate);
            }
        } catch (e) {
            // 如果完整内容不是有效JSON，再使用正则表达式进行更细致的匹配
            jsonMatches = Array.from(content.matchAll(/({[\s\S]*?})/g))
                .map(match => match[0])
                .filter(jsonStr => {
                    try {
                        const parsed = JSON.parse(jsonStr);
                        return typeof parsed === 'object' && !Array.isArray(parsed);
                    } catch (e) {
                        return false;
                    }
                });
        }
    }

    // 合并两种方式找到的匹配结果
    const allMatches = [...codeBlockMatches, ...jsonMatches];
    
    if (allMatches.length > 0) {
        // 返回最长的有效JSON对象
        return allMatches.reduce((a, b) => a.length > b.length ? a : b);
    }

    // 如果没有找到有效的JSON对象，但有大括号，返回从第一个到最后一个大括号的内容
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return content.substring(firstBrace, lastBrace + 1);
    }
    
    return content;
}

export function trimLLMContentToJsonArray(content: string): string {
    // 使用正则表达式查找有效的JSON数组
    const jsonMatches = Array.from(content.matchAll(/(\[[\s\S]*?\])/g))
        .map(match => match[0])
        .filter(jsonStr => {
            try {
                JSON.parse(jsonStr);
                return true;
            } catch (e) {
                return false;
            }
        });

    if (jsonMatches.length > 0) {
        // 返回最长的有效JSON数组
        return jsonMatches.reduce((a, b) => a.length > b.length ? a : b);
    }

    // 查找首个 [ 和最后一个 ] 的位置
    const firstBracket = content.indexOf('[');
    const lastBracket = content.lastIndexOf(']');
    
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        return content.substring(firstBracket, lastBracket + 1);
    }
    
    return content;
}

/**
 * 通用的JSON提取函数，可以提取对象或数组
 * @param content LLM生成的内容
 * @returns 提取的JSON对象或数组文本
 */
export function extractJsonFromLLMContent(content: string): string {
    try {
        // 尝试直接解析整个内容
        JSON.parse(content);
        return content;
    } catch (e) {
        // 先查找代码块中的JSON
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
            const blockContent = codeBlockMatch[1].trim();
            try {
                JSON.parse(blockContent);
                return blockContent;
            } catch (e) {
                // 代码块内容不是有效JSON，继续其他尝试
            }
        }
        
        // 尝试提取JSON对象
        const objectContent = trimLLMContentToJsonObject(content);
        try {
            JSON.parse(objectContent);
            return objectContent;
        } catch (e) {
            // 如果不是有效的JSON对象，尝试提取JSON数组
            const arrayContent = trimLLMContentToJsonArray(content);
            try {
                JSON.parse(arrayContent);
                return arrayContent;
            } catch (e) {
                // 都不是有效JSON，返回原始内容
                return content;
            }
        }
    }
}