import os
from dotenv import load_dotenv
from pydantic import BaseModel

# 加载环境变量
load_dotenv()

class DatabaseConfig(BaseModel):
    """数据库配置"""
    host: str = os.getenv("POSTGRES_HOST", "localhost")
    port: int = int(os.getenv("POSTGRES_PORT", "5432"))
    user: str = os.getenv("POSTGRES_USER", "postgres")
    password: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    database: str = os.getenv("POSTGRES_DATABASE", "me")
    connection_string: str = os.getenv("POSTGRES_URL", "")
    
    def get_connection_string(self) -> str:
        """获取数据库连接字符串"""
        if self.connection_string:
            return self.connection_string
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"

class Config(BaseModel):
    """应用配置"""
    db: DatabaseConfig = DatabaseConfig()
    debug: bool = os.getenv("DEBUG", "False").lower() == "true"
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    timezone: str = os.getenv("TZ", "Asia/Shanghai")

# 创建全局配置实例
config = Config()
