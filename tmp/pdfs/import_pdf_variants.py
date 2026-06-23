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


TITLE_FIXES = {
    "142": {
        "title": "多项式定理",
        "category": "多项式恒等式",
        "tags": ["多项式定理", "多重二项式系数", "展开公式"],
        "description": "多项式和的 n 次幂展开为所有多重指标项之和。",
    },
    "143": {
        "title": "Bell 数指数生成函数",
        "category": "Bell 数",
        "tags": ["Bell数", "指数生成函数", "集合划分"],
        "description": "Bell 数的指数生成函数，用于刻画集合划分总数。",
    },
    "144": {
        "title": "第一类 Stirling 数递推公式",
        "category": "Stirling 数",
        "tags": ["第一类Stirling数", "递推", "排列轮换"],
        "description": "带符号第一类 Stirling 数的基本递推关系。",
    },
    "145": {
        "title": "整数拆分生成函数",
        "category": "整数拆分",
        "tags": ["整数拆分", "生成函数", "无限乘积"],
        "description": "整数拆分数 p(n) 的普通生成函数。",
    },
    "146": {
        "title": "q-二项式定理",
        "category": "q-组合恒等式",
        "tags": ["q-二项式", "q-组合", "生成函数"],
        "description": "有限 q-二项式定理，连接 q-二项式系数与乘积展开。",
    },
    "147": {
        "title": "Burnside 引理",
        "category": "群作用计数",
        "tags": ["Burnside引理", "群作用", "轨道计数"],
        "description": "群作用下轨道数等于各群元素不动点数的平均值。",
    },
    "148": {
        "title": "Eulerian 多项式指数生成函数",
        "category": "Eulerian 数",
        "tags": ["Eulerian多项式", "指数生成函数", "排列统计"],
        "description": "Eulerian 多项式的指数生成函数，刻画排列下降数分布。",
    },
}


variants = [
    item("多重二项式系数阶乘公式", r"\binom{n}{k_1,k_2,\ldots,k_m}=\frac{n!}{k_1!k_2!\cdots k_m!}", "多项式恒等式", ["多重二项式系数", "阶乘", "多项式定理"], "多项式定理中多重二项式系数的阶乘表达。", r"k_1+\cdots+k_m=n", "基础", "先排列 n 个位置，再除去每类元素内部排列。", ["多项式展开", "多重分类计数"]),
    item("非负整数解计数公式", r"\#\{(x_1,\ldots,x_n):x_1+\cdots+x_n=k,x_i\ge 0\}=\binom{n+k-1}{n-1}", "排列组合基础", ["隔板法", "可重组合", "整数解"], "n 个非负整数变量和为 k 的解数。", r"n\geq1,k\geq0", "基础", "将 k 个相同对象放入 n 个盒子，用 n-1 块隔板分隔。", ["整数解计数", "可重组合"]),
    item("错位排列相邻递推", r"D_n=nD_{n-1}+(-1)^n", "错位排列", ["错位排列", "递推", "容斥"], "错位排列数的另一种常用递推形式。", r"n\geq1", "中等", "由容斥通项式比较 D_n 与 nD_{n-1} 得到。", ["错排问题", "递推计算"]),
    item("错位排列近似取整公式", r"D_n=\left\lfloor\frac{n!}{e}+\frac{1}{2}\right\rfloor", "错位排列", ["错位排列", "近似", "阶乘"], "错位排列数与 n!/e 的取整关系。", r"n\geq1", "中等", "由错位排列容斥级数与 e^{-1} 的截断误差估计得到。", ["错排估计", "概率计数"]),
    item("二项式反演逆向写法", r"a_n=\sum_{k=0}^{n}(-1)^k\binom{n}{k}b_{n-k}\Longleftrightarrow b_n=\sum_{k=0}^{n}\binom{n}{k}a_{n-k}", "二项式反演", ["二项式反演", "变换", "容斥"], "二项式反演按 n-k 下标重写的等价形式。", r"n\geq0", "较难", "将标准二项式反演中的求和指标替换为 n-k。", ["反演求解", "序列变换"]),
    item("Fibonacci Cassini 恒等式", r"F_{n+1}F_{n-1}-F_n^2=(-1)^n", "Fibonacci 数", ["Fibonacci", "Cassini恒等式", "递推"], "Fibonacci 数列的经典二次恒等式。", r"n\geq1", "中等", "可由 Binet 公式或 Fibonacci 矩阵行列式证明。", ["递推恒等式", "数列性质"]),
    item("Fibonacci 加法公式", r"F_{m+n}=F_{m-1}F_n+F_mF_{n+1}", "Fibonacci 数", ["Fibonacci", "加法公式", "递推"], "Fibonacci 数列下标相加的展开公式。", r"m,n\geq1", "中等", "由 Fibonacci 矩阵乘法或递推归纳得到。", ["递推化简", "数列恒等式"]),
    item("Lucas 数闭式公式", r"L_n=\varphi^n+\psi^n", "Lucas 数", ["Lucas", "闭式", "Fibonacci相关"], "Lucas 数列的 Binet 型闭式表达。", r"n\geq0", "中等", "由递推特征方程根的线性组合和初值确定系数。", ["递推闭式", "Lucas数列"]),
    item("Lucas 与 Fibonacci 关系", r"L_n=F_{n-1}+F_{n+1}", "Lucas 数", ["Lucas", "Fibonacci", "恒等式"], "Lucas 数与 Fibonacci 数的常用关系式。", r"n\geq1", "基础", "由两个数列的递推和初值验证，或由闭式公式相加得到。", ["数列转换", "递推恒等式"]),
    item("Catalan 差分闭式", r"C_n=\binom{2n}{n}-\binom{2n}{n+1}", "Catalan 数", ["Catalan数", "闭式", "差分"], "Catalan 数的二项式差分闭式。", r"n\geq0", "中等", "由反射原理或闭式公式代数变形得到。", ["路径计数", "括号匹配计数"]),
    item("Catalan 一阶递推", r"C_{n+1}=\frac{2(2n+1)}{n+2}C_n", "Catalan 数", ["Catalan数", "递推", "闭式"], "Catalan 数由相邻项比值得到的一阶递推。", r"n\geq0", "中等", "将 Catalan 闭式中 C_{n+1}/C_n 化简得到。", ["递推计算", "序列生成"]),
    item("第二类 Stirling 数幂展开", r"x^n=\sum_{k=0}^{n}S(n,k)x^{\underline{k}}", "Stirling 数", ["第二类Stirling数", "下降幂", "基变换"], "普通幂用下降幂基展开时的系数是第二类 Stirling 数。", r"n\geq0", "较难", "按函数到集合划分的计数解释或多项式基变换得到。", ["多项式基变换", "集合划分"]),
    item("第一类 Stirling 数幂展开", r"x^{\underline{n}}=\sum_{k=0}^{n}s(n,k)x^k", "Stirling 数", ["第一类Stirling数", "下降幂", "基变换"], "下降幂用普通幂展开时的系数是带符号第一类 Stirling 数。", r"n\geq0", "较难", "由下降幂多项式展开和轮换数解释得到。", ["多项式展开", "排列轮换"]),
    item("无符号第一类 Stirling 数上升幂展开", r"x^{\overline{n}}=\sum_{k=0}^{n}{n\brack k}x^k", "Stirling 数", ["第一类Stirling数", "上升幂", "排列轮换"], "上升幂展开时的系数是无符号第一类 Stirling 数。", r"n\geq0", "较难", "将上升幂作为连续线性因子乘积展开，系数对应轮换计数。", ["排列轮换", "多项式展开"]),
    item("Bell 数 Dobinski 公式", r"B_n=\frac{1}{e}\sum_{k=0}^{\infty}\frac{k^n}{k!}", "Bell 数", ["Bell数", "Dobinski公式", "通项"], "Bell 数的 Dobinski 级数表达。", r"n\geq0", "较难", "可由 Bell 数指数生成函数与指数函数展开比较系数得到。", ["集合划分", "概率计数"]),
    item("Bell 数与 Stirling 数求和", r"B_n=\sum_{k=0}^{n}S(n,k)", "Bell 数", ["Bell数", "Stirling数", "集合划分"], "Bell 数等于同一行第二类 Stirling 数之和的写法。", r"n\geq0", "基础", "按集合划分的块数 k 分类求和。", ["集合划分", "分类计数"]),
    item("欧拉拆分定理生成函数", r"\prod_{k=1}^{\infty}(1+x^k)=\prod_{k=1}^{\infty}\frac{1}{1-x^{2k-1}}", "整数拆分", ["互异拆分", "奇数拆分", "生成函数"], "互异拆分与奇数部分拆分等数的生成函数恒等式。", "作为形式幂级数使用", "较难", "利用 1+x^k=(1-x^{2k})/(1-x^k) 后在无限乘积中约去偶数因子。", ["整数拆分", "生成函数"]),
    item("限制最大部分拆分与部分数对偶", r"p_{\leq k}(n)=\sum_{j=0}^{k}p(n,j)", "整数拆分", ["整数拆分", "Ferrers图", "共轭"], "最大部分不超过 k 的拆分数可按部分个数不超过 k 求和。", r"n\geq0,k\geq0", "中等", "由 Ferrers 图共轭将最大部分限制转为部分个数限制。", ["整数拆分", "Ferrers图"]),
    item("等比序列普通生成函数", r"\sum_{n=0}^{\infty}a^n x^n=\frac{1}{1-ax}", "生成函数", ["普通生成函数", "等比序列"], "等比序列 a^n 的普通生成函数。", "|ax|<1 或作为形式幂级数", "基础", "直接套用几何级数求和公式。", ["序列求和", "生成函数基础"]),
    item("组合数列普通生成函数", r"\sum_{n=0}^{\infty}\binom{n+r}{r}x^n=\frac{1}{(1-x)^{r+1}}", "生成函数", ["普通生成函数", "组合数", "广义二项式"], "固定 r 时组合数列 binom(n+r,r) 的普通生成函数。", r"r\geq0", "中等", "由广义二项式定理展开 (1-x)^{-(r+1)} 得到。", ["组合数求和", "生成函数"]),
    item("指数生成函数平移公式", r"\sum_{n=0}^{\infty}a^n\frac{x^n}{n!}=e^{ax}", "指数生成函数", ["指数生成函数", "指数函数", "等比序列"], "等比序列 a^n 的指数生成函数。", "x 为形式变量或实/复变量", "基础", "由 e^{ax} 的泰勒展开直接得到。", ["指数生成函数", "标号结构计数"]),
    item("有根标号树计数公式", r"n^{n-1}", "图论计数", ["Cayley公式", "有根树", "标号树"], "n 个标号点上的有根树数量。", r"n\geq1", "较难", "无根标号树有 n^{n-2} 棵，每棵可选择 n 个根。", ["标号树计数", "图论计数"]),
    item("树边数公式", r"E=V-1", "图论计数", ["树", "边数", "图论"], "含 V 个顶点的树有 V-1 条边。", r"V\geq1", "基础", "可由连通无环图定义归纳证明。", ["树结构", "图论基础"]),
    item("平面图三角剖分边界", r"E\leq 3V-6", "图论计数", ["平面图", "欧拉公式", "边数上界"], "简单连通平面图在 V>=3 时的边数上界。", r"V\geq3", "中等", "由每个面至少三条边以及欧拉公式推出。", ["平面图计数", "图论估计"]),
]


def main():
    data = json.loads(FORMULAS_PATH.read_text(encoding="utf-8"))
    for record in data:
        fix = TITLE_FIXES.get(str(record.get("id")))
        if fix:
            record.update(fix)

    service = SearchService()
    # Only skip truly identical normalized expressions; equivalent variants remain separate rows.
    existing = {service.normalize(record.get("latex", "")) for record in data}
    next_id = max(int(record["id"]) for record in data) + 1
    now = datetime.now().isoformat(sep=" ")
    added = []

    for candidate in variants:
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
    Path("tmp/pdfs/pdf_variant_added.json").write_text(json.dumps(added, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"added": len(added), "total": len(data), "items": added}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
