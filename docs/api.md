这个实现增加了对以下运算符的支持：

比较运算符:

fieldName_gte: 大于等于 (>=)
fieldName_lte: 小于等于 (<=)
fieldName_gt: 大于 (>)
fieldName_lt: 小于 (<)
fieldName_ne: 不等于 (!=)
集合运算符:

fieldName_in: 包含在指定数组中
fieldName_nin: 不包含在指定数组中
正则表达式:

fieldName_regex: 匹配正则表达式
使用示例:

/api/users?age_gte=18&age_lte=30 - 查询年龄在18到30之间的用户
/api/products?category_in=["electronics","books"] - 查询类别为电子产品或图书的产品
/api/users?name_regex=^张 - 查询名字以"张"开头的用户
这种格式转换后的过滤条件是一个结构化对象，例如:

这种格式兼容MongoDB等常用数据库查询语法，也方便在后端实现自定义过滤逻辑。