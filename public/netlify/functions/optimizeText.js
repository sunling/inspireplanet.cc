const fetch = require('node-fetch');

exports.handler = async function (event) {
    // 只允许POST请求
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: '仅支持POST请求' }),
        };
    }

    // 解析请求体
    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: '无效的请求体格式' }),
        };
    }

    // 检查是否提供了text参数
    const { text, type = 'general' } = requestBody;
    if (!text) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: '缺少text参数' }),
        };
    }

    // 获取Replicate API密钥
    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
    if (!REPLICATE_API_TOKEN) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: '服务器缺少Replicate API密钥' }),
        };
    }

    // 根据类型构建不同的提示语
    let prompt = '';
    switch (type) {
        case 'quote':
            prompt = `请优化以下引用语句，使其更具文学性和哲理性，但保持原意，长度相近：\n\n"${text}"\n\n优化后的语句：`;
            break;
        case 'daily':
            prompt = `请优化以下日签文案，使其更简洁有力、富有意境，保持原意，长度相近：\n\n"${text}"\n\n优化后的文案：`;
            break;
        default:
            prompt = `请优化以下中文文本，提升其表达效果，使其更流畅自然，保持原意：\n\n"${text}"\n\n优化后的文本：`;
    }

    try {
        // 调用Replicate API
        const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${REPLICATE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: "deepseek-ai/deepseek-r1",
                input: {
                    prompt: prompt
                },
            }),
        });

        const prediction = await response.json();
        console.log("API Response:", prediction);

        // 检查Replicate响应
        if (prediction.error) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: prediction.error }),
            };
        }

        // Replicate API是异步的，返回一个URL供客户端轮询结果
        // 对于Netlify函数，我们需要手动获取结果
        let result;
        if (prediction.status === 'succeeded') {
            result = prediction.output;
        } else {
            // 轮询获取结果
            const getResult = async (url) => {
                const pollResponse = await fetch(url, {
                    headers: {
                        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
                    },
                });
                return await pollResponse.json();
            };

            // 轮询直到得到结果或超时
            let pollUrl = prediction.urls.get;
            let attempts = 0;
            let pollResult;

            while (attempts < 30) { // 最多尝试30次，每次等待2秒
                pollResult = await getResult(pollUrl);

                if (pollResult.status === 'succeeded') {
                    result = pollResult.output;
                    break;
                } else if (pollResult.status === 'failed') {
                    return {
                        statusCode: 500,
                        body: JSON.stringify({ error: '模型处理失败', details: pollResult }),
                    };
                }

                await new Promise(r => setTimeout(r, 2000)); // 等待2秒
                attempts++;
            }

            if (!result) {
                return {
                    statusCode: 504,
                    body: JSON.stringify({ error: '获取结果超时' }),
                };
            }
        }

        // 处理结果，移除多余的引号和空格
        let optimizedText = '';
        if (Array.isArray(result)) {
            optimizedText = result.join('').trim();
        } else {
            optimizedText = result.trim();
        }

        // 移除可能的引号包裹
        optimizedText = optimizedText.replace(/^["'""]|["'""]$/g, '');

        return {
            statusCode: 200,
            body: JSON.stringify({
                original: text,
                optimized: optimizedText,
                type: type
            }),
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: '处理请求时出错', details: error.message }),
        };
    }
}; 