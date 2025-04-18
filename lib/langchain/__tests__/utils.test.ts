import { trimLLMContentToJsonObject } from '../utils';
import {describe, expect, test} from '@jest/globals';


describe('trimLLMContentToJsonObject', () => {
  test('从 Markdown 代码块中提取 JSON 对象', () => {
    const content = '以下是结果：\n```json\n{"name": "测试", "age": 30}\n```\n希望有帮助！';
    const expected = '{"name": "测试", "age": 30}';
    expect(trimLLMContentToJsonObject(content)).toBe(expected);
  });

  test('从文本中提取完整的 JSON 对象（第一个 { 到最后一个 }）', () => {
    const content = '您好，结果是：{"name": "测试", "data": {"id": 1, "value": "sample"}}，希望对您有帮助。';
    const expected = '{"name": "测试", "data": {"id": 1, "value": "sample"}}';
    expect(trimLLMContentToJsonObject(content)).toBe(expected);
  });

  test('当有多个 JSON 对象时，选择最长的一个', () => {
    const content = '有两个结果：{"small": "对象"} 和 {"larger": "对象", "with": "更多属性"}';
    const expected = '{"larger": "对象", "with": "更多属性"}';
    expect(trimLLMContentToJsonObject(content)).toBe(expected);
  });

  test('当 Markdown 代码块和普通文本中都有 JSON 时，选择最长的有效 JSON', () => {
    const content = '\n\n```json\n{\n  \"schedule\": [\n    {\n      \"taskId\": 22,\n      \"title\": \"VKE安全漏洞分析与整改\",\n      \"startTime\": \"09:00\",\n      \"endTime\": \"11:00\",\n      \"duration\": 120,\n      \"notes\": \"优先处理最紧急的安全漏洞分析，需联动多团队协作\"\n    },\n    {\n      \"taskId\": 9,\n      \"title\": \"安装基础依赖\",\n      \"startTime\": \"11:15\",\n      \"endTime\": \"12:00\",\n      \"duration\": 45,\n      \"notes\": \"安装Python、pip等基础软件包，注意版本兼容性\"\n    },\n    {\n      \"taskId\": 10,\n      \"title\": \"配置虚拟环境\",\n      \"startTime\": \"12:30\",\n      \"endTime\": \"13:30\",\n      \"duration\": 60,\n      \"notes\": \"午休后集中精力完成依赖包安装\"\n    },\n    {\n      \"taskId\": 6,\n      \"title\": \"阅读README文档\",\n      \"startTime\": \"13:30\",\n      \"endTime\": \"14:30\",\n      \"duration\": 60,\n      \"notes\": \"理解系统整体设计目标和安装流程\"\n    },\n    {\n      \"taskId\": 7,\n      \"title\": \"阅读架构文档\",\n      \"startTime\": \"14:30\",\n      \"endTime\": \"15:30\",\n      \"duration\": 60,\n      \"notes\": \"结合docs/architecture.md分析组件层级\"\n    },\n    {\n      \"taskId\": 11,\n      \"title\": \"运行推理示例\",\n      \"startTime\": \"15:45\",\n      \"endTime\": \"16:45\",\n      \"duration\": 60,\n      \"notes\": \"验证基础功能时注意观察日志输出\"\n    },\n    {\n      \"taskId\": 13,\n      \"title\": \"研究Rust运行时\",\n      \"startTime\": \"16:45\",\n      \"endTime\": \"17:45\",\n      \"duration\": 60,\n      \"notes\": \"重点分析GPU调度核心逻辑\"\n    }\n  ],\n  \"breaks\": [\n    {\n      \"startTime\": \"12:00\",\n      \"endTime\": \"12:30\",\n      \"type\": \"lunch\"\n    },\n    {\n      \"startTime\": \"11:00\",\n      \"endTime\": \"11:15\",\n      \"type\": \"rest\"\n    },\n    {\n      \"startTime\": \"15:30\",\n      \"endTime\": \"15:45\",\n      \"type\": \"rest\"\n    },\n    {\n      \"startTime\": \"18:00\",\n      \"endTime\": \"19:30\",\n      \"type\": \"exercise\"\n    },\n    {\n      \"startTime\": \"19:30\",\n      \"endTime\": \"19:45\",\n      \"type\": \"meditation\"\n    }\n  ],\n  \"summary\": \"今日共安排7项紧急/高优任务，包含系统安全、环境搭建、文档研读和功能验证。所有urgent任务和high优先级任务均已完成，剩余medium任务因时间不足建议延后。注意午休后立即处理技术性较强的环境配置工作，晚间运动后建议通过冥想缓解疲劳。\",\n  \"unscheduled\": [\n    {\n      \"taskId\": 4,\n      \"title\": \"IRSA BIT，和SRE沟通，线上用例\",\n      \"reason\": \"优先级不足且涉及跨部门协调\"\n    },\n    {\n      \"taskId\": 5,\n      \"title\": \"dasdasdsa\",\n      \"reason\": \"描述不清晰且优先级不足\"\n    },\n    {\n      \"taskId\": 8,\n      \"title\": \"确认系统需求\",\n      \"reason\": \"硬件验证可合并到环境搭建阶段\"\n    },\n    {\n      \"taskId\": 12,\n      \"title\": \"分析核心目录结构\",\n      \"reason\": \"与架构文档研究存在内容重叠\"\n    },\n    {\n      \"taskId\": 14,\n      \"title\": \"理解Python绑定\",\n      \"reason\": \"需先完成虚拟环境配置\"\n    },\n    {\n      \"taskId\": 16,\n      \"title\": \"功能修改实验\",\n      \"reason\": \"依赖前期研究结果\"\n    },\n    {\n      \"taskId\": 17,\n      \"title\": \"分析运行日志\",\n      \"reason\": \"需在完成推理示例后执行\"\n    },\n    {\n      \"taskId\": 18,\n      \"title\": \"研究NIXL算法\",\n      \"reason\": \"属于深度优化内容\"\n    },\n    {\n      \"taskId\": 19,\n      \"title\": \"撰写架构总结\",\n      \"reason\": \"需整合全天研究成果\"\n    }\n  ]\n}\n```';
    // 修正预期结果 - 应该返回代码块中的JSON
    const expected = '{\n  \"schedule\": [\n    {\n      \"taskId\": 22,\n      \"title\": \"VKE安全漏洞分析与整改\",\n      \"startTime\": \"09:00\",\n      \"endTime\": \"11:00\",\n      \"duration\": 120,\n      \"notes\": \"优先处理最紧急的安全漏洞分析，需联动多团队协作\"\n    },\n    {\n      \"taskId\": 9,\n      \"title\": \"安装基础依赖\",\n      \"startTime\": \"11:15\",\n      \"endTime\": \"12:00\",\n      \"duration\": 45,\n      \"notes\": \"安装Python、pip等基础软件包，注意版本兼容性\"\n    },\n    {\n      \"taskId\": 10,\n      \"title\": \"配置虚拟环境\",\n      \"startTime\": \"12:30\",\n      \"endTime\": \"13:30\",\n      \"duration\": 60,\n      \"notes\": \"午休后集中精力完成依赖包安装\"\n    },\n    {\n      \"taskId\": 6,\n      \"title\": \"阅读README文档\",\n      \"startTime\": \"13:30\",\n      \"endTime\": \"14:30\",\n      \"duration\": 60,\n      \"notes\": \"理解系统整体设计目标和安装流程\"\n    },\n    {\n      \"taskId\": 7,\n      \"title\": \"阅读架构文档\",\n      \"startTime\": \"14:30\",\n      \"endTime\": \"15:30\",\n      \"duration\": 60,\n      \"notes\": \"结合docs/architecture.md分析组件层级\"\n    },\n    {\n      \"taskId\": 11,\n      \"title\": \"运行推理示例\",\n      \"startTime\": \"15:45\",\n      \"endTime\": \"16:45\",\n      \"duration\": 60,\n      \"notes\": \"验证基础功能时注意观察日志输出\"\n    },\n    {\n      \"taskId\": 13,\n      \"title\": \"研究Rust运行时\",\n      \"startTime\": \"16:45\",\n      \"endTime\": \"17:45\",\n      \"duration\": 60,\n      \"notes\": \"重点分析GPU调度核心逻辑\"\n    }\n  ],\n  \"breaks\": [\n    {\n      \"startTime\": \"12:00\",\n      \"endTime\": \"12:30\",\n      \"type\": \"lunch\"\n    },\n    {\n      \"startTime\": \"11:00\",\n      \"endTime\": \"11:15\",\n      \"type\": \"rest\"\n    },\n    {\n      \"startTime\": \"15:30\",\n      \"endTime\": \"15:45\",\n      \"type\": \"rest\"\n    },\n    {\n      \"startTime\": \"18:00\",\n      \"endTime\": \"19:30\",\n      \"type\": \"exercise\"\n    },\n    {\n      \"startTime\": \"19:30\",\n      \"endTime\": \"19:45\",\n      \"type\": \"meditation\"\n    }\n  ],\n  \"summary\": \"今日共安排7项紧急/高优任务，包含系统安全、环境搭建、文档研读和功能验证。所有urgent任务和high优先级任务均已完成，剩余medium任务因时间不足建议延后。注意午休后立即处理技术性较强的环境配置工作，晚间运动后建议通过冥想缓解疲劳。\",\n  \"unscheduled\": [\n    {\n      \"taskId\": 4,\n      \"title\": \"IRSA BIT，和SRE沟通，线上用例\",\n      \"reason\": \"优先级不足且涉及跨部门协调\"\n    },\n    {\n      \"taskId\": 5,\n      \"title\": \"dasdasdsa\",\n      \"reason\": \"描述不清晰且优先级不足\"\n    },\n    {\n      \"taskId\": 8,\n      \"title\": \"确认系统需求\",\n      \"reason\": \"硬件验证可合并到环境搭建阶段\"\n    },\n    {\n      \"taskId\": 12,\n      \"title\": \"分析核心目录结构\",\n      \"reason\": \"与架构文档研究存在内容重叠\"\n    },\n    {\n      \"taskId\": 14,\n      \"title\": \"理解Python绑定\",\n      \"reason\": \"需先完成虚拟环境配置\"\n    },\n    {\n      \"taskId\": 16,\n      \"title\": \"功能修改实验\",\n      \"reason\": \"依赖前期研究结果\"\n    },\n    {\n      \"taskId\": 17,\n      \"title\": \"分析运行日志\",\n      \"reason\": \"需在完成推理示例后执行\"\n    },\n    {\n      \"taskId\": 18,\n      \"title\": \"研究NIXL算法\",\n      \"reason\": \"属于深度优化内容\"\n    },\n    {\n      \"taskId\": 19,\n      \"title\": \"撰写架构总结\",\n      \"reason\": \"需整合全天研究成果\"\n    }\n  ]\n}';
    expect(trimLLMContentToJsonObject(content)).toBe(expected);
  });

  test('处理不完整或无效的 JSON', () => {
    const content = '这是不完整的 JSON：{"broken": "json",';
    const expected = '{"broken": "json",';
    expect(trimLLMContentToJsonObject(content)).toBe(expected);
  });

  test('没有 JSON 内容时返回原始文本', () => {
    const content = '这里没有任何 JSON 内容';
    expect(trimLLMContentToJsonObject(content)).toBe(content);
  });

  test('处理嵌套的 JSON 对象', () => {
    const content = '嵌套 JSON：{"outer": {"inner": {"deep": "value"}}}';
    const expected = '{"outer": {"inner": {"deep": "value"}}}';
    expect(trimLLMContentToJsonObject(content)).toBe(expected);
  });

  test('忽略 JSON 数组，只提取对象', () => {
    const content = '数组和对象：[1,2,3] {"object": "only"}';
    const expected = '{"object": "only"}';
    expect(trimLLMContentToJsonObject(content)).toBe(expected);
  });
});
