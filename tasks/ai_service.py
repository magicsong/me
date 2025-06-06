#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI服务模块 - 使用OpenAI API处理数据分析和洞察
"""
import os
import json
import logging
import sys
from typing import Dict, Any, Optional
from openai import OpenAI, BadRequestError, APITimeoutError, RateLimitError

logger = logging.getLogger(__name__)


class AIService:
    """OpenAI服务封装类，处理AI分析请求"""

    def __init__(self):
        """初始化OpenAI客户端"""
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.base_url = os.getenv("OPENAI_URL")
        self.model = os.getenv("OPENAI_MODEL")

        if not all([self.api_key, self.base_url, self.model]):
            logger.error("缺少OpenAI配置信息，请检查.env文件")
            sys.exit(1)

        try:
            self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)
            logger.info(f"OpenAI客户端初始化成功，使用模型: {self.model}")
        except Exception as e:
            logger.error(f"初始化OpenAI客户端失败: {str(e)}")
            sys.exit(1)

    def analyze_daily_data(
        self, analysis_data: Dict[str, Any], date_str: str, user_id: str
    ) -> Dict[str, Any]:
        """
        使用OpenAI分析每日数据

        参数:
            analysis_data: 包含分析数据的字典
            date_str: 日期字符串 (YYYY-MM-DD)
            user_id: 用户ID

        返回:
            包含AI分析结果的字典
        """
        try:
            # 准备系统提示和用户提示
            system_prompt = """
            你是一个专业的个人数据分析师，擅长从用户的习惯、待办事项、笔记和番茄钟数据中提取有价值的洞察。
            你的任务是分析用户的数据，并生成一份详细的每日洞察报告。
            请从以下几个方面进行分析：
            1. 数据概览：简要总结当天的关键数据点
            2. 习惯完成情况：分析习惯的完成率和模式
            3. 待办事项分析：待办事项的完成情况和优先级处理
            4. 番茄钟专注时间分析：专注时间分布和效率
            5. 笔记内容分析：笔记的主题和关键点
            6. 改进建议：基于数据提出具体的改进建议
            7. 今日亮点：用户表现出色的地方
            
            请以第二人称（"你"）向用户提供分析，语气友好、专业且富有鼓励性。
            将分析结果以易于阅读的Markdown格式返回。
            """

            user_prompt = f"""
            以下是用户ID为 {user_id} 在 {date_str} 的数据分析结果。
            请分析这些数据并生成一份每日洞察报告。
            
            数据:
            ```json
            {json.dumps(analysis_data, ensure_ascii=False, indent=2)}
            ```
            """

            # 调用OpenAI API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.5,
                max_tokens=1500,
            )

            # 提取AI响应内容
            content = response.choices[0].message.content.strip()

            # 构建结构化的返回格式
            content_json = {
                "summary": "AI生成的每日洞察报告",
                "report": content,
                "date": date_str,
                "userId": user_id,
            }

            return {"success": True, "content": content, "contentJson": content_json}

        except BadRequestError as e:
            logger.error(f"OpenAI API请求错误: {str(e)}")
            return {"success": False, "error": f"OpenAI请求错误: {str(e)}"}
        except APITimeoutError as e:
            logger.error(f"OpenAI API超时: {str(e)}")
            return {"success": False, "error": f"OpenAI请求超时: {str(e)}"}
        except RateLimitError as e:
            logger.error(f"OpenAI API速率限制: {str(e)}")
            return {"success": False, "error": f"OpenAI速率限制: {str(e)}"}
        except Exception as e:
            logger.error(f"调用OpenAI分析服务失败: {str(e)}")
            return {"success": False, "error": f"AI分析失败: {str(e)}"}


# 创建单例实例
ai_service = AIService()
