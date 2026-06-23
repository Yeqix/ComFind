import json
from datetime import datetime
from pathlib import Path

from app.services.search_service import SearchService


FORMULAS_PATH = Path("backend/app/data/formulas.json")
PDF_SOURCE = "4_组合数学(1).pdf"


def item(title, latex, category, tags, description, conditions, difficulty, proof, scenarios):
    return {
        "title": title,
        "latex": latex,
        "category": category,
        "tags": tags,
        "description": description,
        "conditions": conditions,
        "difficulty": difficulty,
        "proof_sketch": proof,
        "application_scenarios": scenarios,
    }


candidates = [
    item("排列数公式", r"A(n,k)=\frac{n!}{(n-k)!}", "排列组合基础", ["排列", "阶乘", "计数基础"], "从 n 个不同元素中取出 k 个并排列的方案数。", r"0 \leq k \leq n", "基础", "依次选择第 1 到第 k 个位置，乘法原理给出 n(n-1)...(n-k+1)。", ["排列计数", "抽样排序"]),
    item("圆排列公式", r"P_{circle}(n)=(n-1)!", "排列组合基础", ["圆排列", "阶乘", "对称计数"], "n 个不同元素围成一圈的排列数，旋转等价视为同一种。", r"n \geq 1", "基础", "固定一个元素打破旋转对称，其余 n-1 个元素线性排列。", ["环形座位安排", "对称对象计数"]),
    item("组合数阶乘公式", r"\binom{n}{k}=\frac{n!}{k!(n-k)!}", "排列组合基础", ["组合数", "阶乘", "二项式系数"], "从 n 个不同元素中选出 k 个元素的方案数。", r"0 \leq k \leq n", "基础", "先排列选出的 k 个元素得到 A(n,k)，再除以内部 k! 个排列。", ["子集计数", "二项式系数计算"]),
    item("可重组合公式", r"\binom{n+k-1}{k}", "排列组合基础", ["可重组合", "隔板法", "组合数"], "从 n 类元素中可重复选取 k 个的方案数。", r"n \geq 1, k \geq 0", "基础", "使用隔板法，将 k 个相同对象分配到 n 个盒子。", ["多重集合计数", "整数解计数"]),
    item("错位排列递推公式", r"D_n=(n-1)(D_{n-1}+D_{n-2})", "错位排列", ["错位排列", "递推", "容斥"], "n 个元素错位排列数量的经典递推式。", r"n \geq 2, D_0=1, D_1=0", "中等", "观察元素 1 被放到某位置后，按被占位置元素是否回到 1 分类。", ["错排问题", "容斥计数"]),
    item("错位排列通项公式", r"D_n=n!\sum_{k=0}^{n}\frac{(-1)^k}{k!}", "错位排列", ["错位排列", "容斥", "阶乘"], "错位排列数量的容斥求和公式。", r"n \geq 0", "中等", "对至少一个元素固定的位置集合使用容斥原理。", ["错排问题", "概率计数"]),
    item("下降幂定义", r"x^{\underline{n}}=x(x-1)\cdots(x-n+1)", "升降幂", ["下降幂", "阶乘幂", "组合数"], "下降幂表示连续递减因子的乘积。", r"n \geq 0", "基础", "按定义展开为 n 个连续递减因子。", ["多项式展开", "组合恒等式化简"]),
    item("上升幂定义", r"x^{\overline{n}}=x(x+1)\cdots(x+n-1)", "升降幂", ["上升幂", "阶乘幂"], "上升幂表示连续递增因子的乘积。", r"n \geq 0", "基础", "按定义展开为 n 个连续递增因子。", ["生成函数", "特殊数列"]),
    item("组合数与下降幂", r"\binom{x}{n}=\frac{x^{\underline{n}}}{n!}", "升降幂", ["组合数", "下降幂", "广义二项式"], "广义组合数可表示为下降幂除以 n!。", r"n \geq 0", "中等", "将组合数阶乘公式推广到符号变量 x。", ["广义二项式", "多项式基变换"]),
    item("上指标反转公式", r"\binom{-x}{n}=(-1)^n\binom{x+n-1}{n}", "升降幂", ["上指标反转", "广义二项式", "组合恒等式"], "负上指标组合数与正上指标组合数之间的转换公式。", r"n \geq 0", "中等", "将负上指标展开为下降幂，再提出 (-1)^n 转为上升幂。", ["广义二项式化简", "生成函数展开"]),
    item("广义牛顿二项式定理", r"(1+x)^\alpha=\sum_{n=0}^{\infty}\binom{\alpha}{n}x^n", "广义二项式", ["广义二项式", "生成函数", "幂级数"], "任意指数的二项式展开形式。", "|x|<1 或作为形式幂级数使用", "中等", "利用广义组合数定义，并将幂函数展开为形式幂级数。", ["生成函数展开", "近似计算"]),
    item("二项式反演公式", r"b_n=\sum_{k=0}^{n}\binom{n}{k}a_k \Longleftrightarrow a_n=\sum_{k=0}^{n}(-1)^{n-k}\binom{n}{k}b_k", "二项式反演", ["二项式反演", "容斥", "变换"], "二项式变换与其逆变换的等价关系。", r"n \geq 0", "较难", "由二项式卷积矩阵的逆矩阵或容斥原理得到。", ["反演求解", "序列变换"]),
    item("斐波那契递推定义", r"F_n=F_{n-1}+F_{n-2}", "Fibonacci 数", ["Fibonacci", "递推"], "斐波那契数列的基本递推定义。", r"n \geq 2, F_0=0, F_1=1", "基础", "按数列定义，每项等于前两项之和。", ["递推数列", "动态规划"]),
    item("斐波那契 Binet 公式", r"F_n=\frac{\varphi^n-\psi^n}{\sqrt{5}}", "Fibonacci 数", ["Fibonacci", "闭式", "Binet公式"], "斐波那契数列的闭式表达，其中 phi 与 psi 为特征方程根。", r"n \geq 0", "中等", "求解线性递推的特征方程 r^2=r+1。", ["递推闭式", "数列估计"]),
    item("Lucas 数递推定义", r"L_n=L_{n-1}+L_{n-2}", "Lucas 数", ["Lucas", "递推"], "Lucas 数列的基本递推定义。", r"n \geq 2, L_0=2, L_1=1", "基础", "按 Lucas 数列定义递推。", ["递推数列", "Fibonacci相关恒等式"]),
    item("Fibonacci 普通生成函数", r"\sum_{n=0}^{\infty}F_n x^n=\frac{x}{1-x-x^2}", "生成函数", ["Fibonacci", "普通生成函数", "递推"], "斐波那契数列的普通生成函数。", "|x| 足够小或作为形式幂级数", "中等", "将递推式乘以 x^n 后对 n 求和并解代数方程。", ["递推求解", "生成函数"]),
    item("Catalan 另一闭式", r"C_n=\frac{1}{2n+1}\binom{2n+1}{n}", "Catalan 数", ["Catalan数", "闭式", "组合数"], "Catalan 数的等价闭式表达。", r"n \geq 0", "中等", "由 C_n=1/(n+1)binom(2n,n) 代数变形得到。", ["路径计数", "括号匹配计数"]),
    item("第二类 Stirling 数递推", r"S(n,k)=S(n-1,k-1)+kS(n-1,k)", "Stirling 数", ["第二类Stirling数", "递推", "集合划分"], "第二类 Stirling 数的基本递推式。", r"n \geq 1, k \geq 1", "中等", "按第 n 个元素单独成块或加入已有 k 个块分类。", ["集合划分", "递推计算"]),
    item("Bell 数递推公式", r"B_{n+1}=\sum_{k=0}^{n}\binom{n}{k}B_k", "Bell 数", ["Bell数", "递推", "集合划分"], "Bell 数的经典递推公式。", r"n \geq 0", "中等", "按与新增元素同块的其他元素集合大小分类。", ["集合划分", "递推计算"]),
    item("部分拆分数递推", r"p(n,k)=p(n-1,k-1)+p(n-k,k)", "整数拆分", ["整数拆分", "部分拆分数", "递推"], "将 n 拆成恰有 k 个正整数部分的拆分数递推。", r"n \geq k \geq 1", "中等", "按是否存在大小为 1 的部分分类。", ["整数拆分", "动态规划"]),
    item("互异拆分生成函数", r"\sum_{n=0}^{\infty}q(n)x^n=\prod_{k=1}^{\infty}(1+x^k)", "整数拆分", ["互异拆分", "生成函数", "无限乘积"], "各部分互不相同的整数拆分数的普通生成函数。", "作为形式幂级数使用", "中等", "每个正整数部分只能选 0 次或 1 次，因此贡献因子 1+x^k。", ["整数拆分", "生成函数"]),
    item("几何级数生成函数", r"\sum_{n=0}^{\infty}x^n=\frac{1}{1-x}", "生成函数", ["普通生成函数", "几何级数"], "常数序列 1 的普通生成函数。", "|x|<1 或作为形式幂级数", "基础", "由有限等比求和取极限或形式幂级数恒等式得到。", ["生成函数基础", "序列求和"]),
    item("自然数序列生成函数", r"\sum_{n=0}^{\infty}n x^n=\frac{x}{(1-x)^2}", "生成函数", ["普通生成函数", "自然数序列"], "自然数序列的普通生成函数。", "|x|<1 或作为形式幂级数", "基础", "对几何级数逐项求导后乘以 x。", ["序列求和", "生成函数基础"]),
    item("平方数序列生成函数", r"\sum_{n=0}^{\infty}n^2x^n=\frac{x(1+x)}{(1-x)^3}", "生成函数", ["普通生成函数", "平方数序列"], "平方数序列的普通生成函数。", "|x|<1 或作为形式幂级数", "中等", "在自然数序列生成函数基础上再次使用 x d/dx 运算。", ["序列求和", "生成函数"]),
    item("指数函数指数生成函数", r"\sum_{n=0}^{\infty}\frac{x^n}{n!}=e^x", "指数生成函数", ["指数生成函数", "指数函数"], "常数序列 1 的指数生成函数。", "x 为形式变量或实/复变量", "基础", "由指数函数泰勒展开得到。", ["指数生成函数基础", "标号结构计数"]),
    item("树拓扑序计数公式", r"T=\frac{n!}{\prod_{v}size(v)}", "图论计数", ["树", "拓扑序", "子树大小"], "外向树拓扑序数量可由所有节点子树大小的乘积给出。", "树含 n 个节点，size(v) 为 v 的子树大小", "较难", "递归合并各子树的线性扩展数，并整理得到 hook-length 型公式。", ["树形偏序计数", "拓扑排序"]),
    item("欧拉示性公式", r"V-E+F=2", "图论计数", ["平面图", "欧拉公式", "图论"], "连通平面图的顶点数、边数和面数满足欧拉示性公式。", "连通平面图", "基础", "从树开始逐步加边，每增加一条非树边同时增加一个面。", ["平面图计数", "图论基础"]),
    item("Cayley 树计数公式", r"n^{n-2}", "图论计数", ["Cayley公式", "标号树", "图论计数"], "n 个标号点上的无根树数量。", r"n \geq 2", "较难", "可由 Prüfer 序列与标号树之间的一一对应证明。", ["标号树计数", "图论计数"]),
]


def main():
    data = json.loads(FORMULAS_PATH.read_text(encoding="utf-8"))
    service = SearchService()
    existing = {service.normalize(item.get("latex", "")) for item in data}
    next_id = max(int(item["id"]) for item in data) + 1
    now = datetime.now().isoformat(sep=" ")
    added = []

    for candidate in candidates:
        normalized = service.normalize(candidate["latex"])
        if normalized in existing:
            continue
        record = {
            **candidate,
            "id": str(next_id),
            "normalized_expression": normalized,
            "references": [PDF_SOURCE],
            "source": PDF_SOURCE,
            "created_at": now,
            "updated_at": now,
        }
        data.append(record)
        existing.add(normalized)
        added.append({"id": record["id"], "title": record["title"], "latex": record["latex"]})
        next_id += 1

    FORMULAS_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    Path("tmp/pdfs/pdf_import_added.json").write_text(json.dumps(added, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"added": len(added), "total": len(data), "items": added}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
