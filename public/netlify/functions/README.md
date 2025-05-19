# 文本优化功能

这个Netlify函数使用Replicate API和Qwen1.5-7B-Chat模型来优化中文文本，包括日签文案、引用语句等。

## 配置步骤

1. 注册[Replicate](https://replicate.com)账号并获取API密钥

2. 在Netlify环境变量中添加Replicate API密钥：
   - 登录Netlify管理面板
   - 转到你的网站 > Site settings > Environment variables
   - 添加新的变量名为`REPLICATE_API_TOKEN`，值为你的Replicate API密钥

## 函数说明

`optimizeText.js`是一个Netlify Serverless函数，它可以：

- 接收中文文本内容
- 根据指定类型构建适合的提示语
- 调用Replicate API处理文本
- 返回优化后的内容

## 使用方法

### API调用

```javascript
// 示例：优化日签文案
fetch('/.netlify/functions/optimizeText', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: "在自然面前，人类是渺小而脆弱的",
    type: "daily" // 可选: 'general', 'quote', 'daily'
  }),
})
.then(response => response.json())
.then(data => {
  console.log(data.optimized); // 优化后的文本
});
```

### 参数说明

- `text`: 需要优化的文本内容（必填）
- `type`: 文本类型（可选），取值:
  - `general`: 一般文本（默认）
  - `quote`: 引用语句
  - `daily`: 日签文案

### 响应格式

成功:
```json
{
  "original": "原始文本",
  "optimized": "优化后的文本",
  "type": "文本类型"
}
```

失败:
```json
{
  "error": "错误信息"
}
```

## 示例页面

项目中包含一个示例页面`public/text-optimizer.html`，提供了使用该功能的前端界面。

## 注意事项

- 此函数使用的是Qwen1.5-7B-Chat模型，可能需要一些时间（通常5-15秒）来处理文本
- Replicate API需要按使用量付费，请确保你的账户有足够的额度
- 优化后的文本质量取决于模型的能力和原始文本的内容 