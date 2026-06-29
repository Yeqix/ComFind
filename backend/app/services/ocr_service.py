import base64
import json
import os
import re
import urllib.error
import urllib.request
from typing import Dict, Optional


class FormulaOCRService:
    """公式 OCR 入口，支持文本回退和可选 Mathpix 接入。"""

    TEXT_EXTENSIONS = {".txt", ".tex", ".md", ".latex"}

    def extract(self, filename: str, content_type: Optional[str], data: bytes) -> Dict:
        extension = os.path.splitext(filename or "")[1].lower()
        if extension in self.TEXT_EXTENSIONS or (content_type or "").startswith("text/"):
            text = data.decode("utf-8", errors="ignore")
            return {
                "success": True,
                "provider": "text-fallback",
                "latex": self._pick_formula_text(text),
                "raw_text": text,
                "message": "已从文本内容中提取公式",
            }

        mathpix_result = self._call_mathpix(data)
        if mathpix_result:
            return mathpix_result

        return {
            "success": False,
            "provider": "not-configured",
            "latex": None,
            "raw_text": "",
            "message": "图片 OCR 未配置。请设置 MATHPIX_APP_ID 和 MATHPIX_APP_KEY，或上传 .tex/.txt 文本文件。",
        }

    def status(self) -> Dict:
        return {
            "text_fallback": True,
            "mathpix_configured": bool(os.environ.get("MATHPIX_APP_ID") and os.environ.get("MATHPIX_APP_KEY")),
            "supported_text_extensions": sorted(self.TEXT_EXTENSIONS),
        }

    def _call_mathpix(self, data: bytes) -> Optional[Dict]:
        app_id = os.environ.get("MATHPIX_APP_ID")
        app_key = os.environ.get("MATHPIX_APP_KEY")
        if not app_id or not app_key:
            return None

        payload = {
            "src": "data:image/png;base64," + base64.b64encode(data).decode("ascii"),
            "formats": ["latex_styled", "text"],
            "ocr": ["math", "text"],
        }
        request = urllib.request.Request(
            "https://api.mathpix.com/v3/text",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "app_id": app_id,
                "app_key": app_key,
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                result = json.loads(response.read().decode("utf-8"))
            latex = result.get("latex_styled") or self._pick_formula_text(result.get("text", ""))
            return {
                "success": bool(latex),
                "provider": "mathpix",
                "latex": latex,
                "raw_text": result.get("text", ""),
                "message": "OCR 识别完成" if latex else "OCR 已返回结果，但未识别到公式",
            }
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as exc:
            return {
                "success": False,
                "provider": "mathpix",
                "latex": None,
                "raw_text": "",
                "message": f"OCR 调用失败: {exc}",
            }

    def _pick_formula_text(self, text: str) -> str:
        patterns = [
            r"\$\$([^$]+)\$\$",
            r"\$([^$\n]+)\$",
            r"\\\[([\s\S]+?)\\\]",
            r"\\\(([\s\S]+?)\\\)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1).strip()
        return text.strip()
