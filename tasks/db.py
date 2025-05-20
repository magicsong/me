import psycopg2
import pandas as pd
from contextlib import contextmanager
from typing import Dict, List, Any, Generator, Optional, Tuple
import logging
from sqlalchemy import create_engine

from config import config

logger = logging.getLogger(__name__)

class Database:
    """数据库管理类"""
    
    def __init__(self):
        self.conn_string = config.db.get_connection_string()
        self.engine = create_engine(self.conn_string)
    
    @contextmanager
    def get_connection(self) -> Generator[psycopg2.extensions.connection, None, None]:
        """获取数据库连接"""
        conn = psycopg2.connect(self.conn_string)
        try:
            yield conn
        finally:
            conn.close()
    
    def query_to_dataframe(self, query: str, params: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
        """执行SQL查询并返回DataFrame"""
        try:
            if params:
                return pd.read_sql_query(query, self.engine, params=params)
            return pd.read_sql_query(query, self.engine)
        except Exception as e:
            logger.error(f"执行查询出错: {str(e)}")
            logger.error(f"查询: {query}")
            logger.error(f"参数: {params}")
            raise
    
    def execute_query(self, query: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """执行SQL查询并返回字典列表"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                try:
                    if params:
                        cursor.execute(query, params)
                    else:
                        cursor.execute(query)
                    
                    if cursor.description:
                        columns = [col[0] for col in cursor.description]
                        return [dict(zip(columns, row)) for row in cursor.fetchall()]
                    return []
                except Exception as e:
                    conn.rollback()
                    logger.error(f"执行查询出错: {str(e)}")
                    logger.error(f"查询: {query}")
                    logger.error(f"参数: {params}")
                    raise
                finally:
                    conn.commit()
    
    def execute_batch(self, query: str, params_list: List[Dict[str, Any]]) -> None:
        """批量执行SQL"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                try:
                    for params in params_list:
                        cursor.execute(query, params)
                    conn.commit()
                except Exception as e:
                    conn.rollback()
                    logger.error(f"批量执行出错: {str(e)}")
                    logger.error(f"查询: {query}")
                    raise

# 创建全局数据库实例
db = Database()
