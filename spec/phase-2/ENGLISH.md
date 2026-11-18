# 第二阶段英文白名单

项目采用的保守初学词句集，由项目制定，不绑定教材；不声称全国一年级内容统一，也不保证孩子认识每一项。显示原文和中文意思，不做翻译、听写或背诵测验。首次出现提供理解和按键帮助。运行时不得扩展名单，既有第一阶段词库不得直接并入。

## 单词

各行英文目标与中文释义一一对应，目标大小写按表执行。

|主题|目标|意思|
|---|---|---|
|问候|hello, hi, goodbye, yes, no|你好，你好，再见，是，不是|
|家人|mum, dad, baby|妈妈，爸爸，宝宝|
|动物|cat, dog, bird, fish, duck, rabbit|猫，狗，鸟，鱼，鸭子，兔子|
|颜色|red, blue, yellow, green, black, white|红色，蓝色，黄色，绿色，黑色，白色|
|数量|one, two, three, four, five, six, seven, eight, nine, ten|一，二，三，四，五，六，七，八，九，十|
|文具|book, pen, pencil, bag, ruler|书，钢笔，铅笔，书包，尺子|
|身体|head, hand, eye, ear, nose, mouth|头，手，眼睛，耳朵，鼻子，嘴|
|食品|apple, banana, milk, water, egg, cake, rice|苹果，香蕉，牛奶，水，鸡蛋，蛋糕，米饭|
|生活|ball, toy, sun, moon, star|球，玩具，太阳，月亮，星星|
|状态|big, small, happy, sad|大的，小的，开心的，难过的|

## 短句

仅允许以下完整目标，不任意替换或生成。句号和问号为英文半角。

|目标|意思|
|---|---|
|Hello.|你好。|
|Hi.|你好。|
|Goodbye.|再见。|
|Good morning.|早上好。|
|Good night.|晚安。|
|Thank you.|谢谢你。|
|How are you?|你好吗？|
|I am fine.|我很好。|
|I am happy.|我很开心。|
|I am sad.|我很难过。|
|This is my mum.|这是我的妈妈。|
|This is my dad.|这是我的爸爸。|
|This is my bag.|这是我的书包。|
|This is my book.|这是我的书。|
|It is a cat.|这是一只猫。|
|It is a dog.|这是一只狗。|
|It is red.|它是红色的。|
|It is blue.|它是蓝色的。|
|I like milk.|我喜欢牛奶。|
|I like rice.|我喜欢米饭。|
|I can run.|我会跑。|
|I can jump.|我会跳。|
|What is this?|这是什么？|
|Is it a cat?|它是一只猫吗？|

功能词随整句解释，不额外测验，也不自动扩充单词目标池。第 13 个英文故事开放前三句，之后每项任务最多新增按表顺序的三句，全部出现后持续复习。第三步强化已有句子的输入，不引入更难英语。

[content.json](content.json) 已提供目标、释义、稳定 ID、首次出现任务和练习类型，开发须按该数据导入并校验。重复熟悉内容达到练习目的，不用陌生词句凑关卡数量。
