from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class AIConfigBase(BaseModel):
    """AI配置基础模型"""
    name: str = Field(..., description="AI名称/别名", min_length=1, max_length=100)
    provider: Literal["openai", "anthropic", "azure", "gemini", "custom"] = Field(..., description="服务商类型")
    api_key: str = Field(..., description="API Key", min_length=1)
    api_url: Optional[str] = Field(None, description="API地址（可选，用于自定义或代理）")
    model: str = Field(..., description="模型名称", min_length=1, max_length=100)
    remark: Optional[str] = Field(None, description="备注", max_length=500)
    enabled: bool = Field(True, description="启用状态")


class AIConfigCreate(AIConfigBase):
    """创建AI配置请求"""
    pass


class AIConfigUpdate(BaseModel):
    """更新AI配置请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    provider: Optional[Literal["openai", "anthropic", "azure", "gemini", "custom"]] = None
    api_key: Optional[str] = Field(None, min_length=1)
    api_url: Optional[str] = None
    model: Optional[str] = Field(None, min_length=1, max_length=100)
    remark: Optional[str] = Field(None, max_length=500)
    enabled: Optional[bool] = None


class AIConfigResponse(BaseModel):
    """AI配置响应模型 - 响应时隐藏真实API Key"""
    id: str = Field(..., description="配置ID")
    name: str = Field(..., description="AI名称/别名")
    provider: Literal["openai", "anthropic", "azure", "gemini", "custom"] = Field(..., description="服务商类型")
    api_key_masked: str = Field(..., description="脱敏后的API Key")
    api_url: Optional[str] = Field(None, description="API地址")
    model: str = Field(..., description="模型名称")
    remark: Optional[str] = Field(None, description="备注")
    enabled: bool = Field(..., description="启用状态")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        from_attributes = True


class AIConfigListResponse(BaseModel):
    """AI配置列表响应"""
    configs: list[AIConfigResponse]
    total: int


class AIConfigTestRequest(BaseModel):
    """测试AI配置请求"""
    config_id: str
    test_prompt: str = Field(default="Hello, this is a test.", description="测试用的提示词")


class AIConfigTestResponse(BaseModel):
    """测试AI配置响应"""
    success: bool
    message: str
    response_time_ms: Optional[float] = None
    error_detail: Optional[str] = None
