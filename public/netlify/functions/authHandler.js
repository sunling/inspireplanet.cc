import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// JWT密钥，建议在环境变量中设置
const JWT_SECRET = process.env.JWT_SECRET

export async function handler(event, context) {
  // 设置CORS头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  try {
    const { action } = JSON.parse(event.body || '{}')

    switch (action) {
      case 'register':
        return await handleRegister(event, headers)
      case 'login':
        return await handleLogin(event, headers)
      case 'verify':
        return await handleVerifyToken(event, headers)
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '无效的操作类型' })
        }
    }
  } catch (error) {
    console.error('Auth handler error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '服务器内部错误' })
    }
  }
}

// 处理用户注册
async function handleRegister(event, headers) {
  try {
    const { username, email, password, name, wechat } = JSON.parse(event.body)

    // 验证输入
    if (!username || !email || !password || !name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '姓名、用户名、邮箱和密码都是必填项' })
      }
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '邮箱格式不正确' })
      }
    }

    // 验证密码长度
    if (password.length < 6) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '密码至少需要6个字符' })
      }
    }

    // 验证用户名长度
    if (username.length < 2) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '用户名至少需要2个字符' })
      }
    }

    // 检查邮箱是否已存在
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single()

    if (existingUser) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: '该邮箱已被注册' })
      }
    }

    // 检查用户名是否已存在
    const { data: existingUsername, error: usernameCheckError } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single()

    if (existingUsername) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: '该用户名已被使用' })
      }
    }

    // 加密密码
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // 创建用户
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        username,
        email,
        password: hashedPassword,
        name,
        wechat,
      })
      .select('id, username, email')
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: '注册失败，请稍后重试' })
      }
    }

    // 生成JWT token
    const token = jwt.sign(
      {
        userId: newUser.id,
        username: newUser.username,
        email: newUser.email,
        name: name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: '注册成功',
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          name: name
        },
        token
      })
    }
  } catch (error) {
    console.error('Register error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '注册过程中发生错误' })
    }
  }
}

// 处理用户登录
async function handleLogin(event, headers) {
  try {
    const { email, password } = JSON.parse(event.body)

    // 验证输入
    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '邮箱和密码都是必填项' })
      }
    }

    // 查找用户
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, username, email, password,name')
      .eq('email', email)
      .single()

    if (fetchError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: '邮箱或密码错误' })
      }
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: '邮箱或密码错误' })
      }
    }

    // 生成JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        email: user.email,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: '登录成功',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name
        },
        token
      })
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '登录过程中发生错误' })
    }
  }
}

// 验证JWT token
async function handleVerifyToken(event, headers) {
  try {
    const authHeader = event.headers.authorization || event.headers.Authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: '未提供有效的认证令牌' })
      }
    }

    const token = authHeader.substring(7) // 移除 'Bearer ' 前缀

    try {
      const decoded = jwt.verify(token, JWT_SECRET)

      // 可选：从数据库验证用户是否仍然存在
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('id, username, email,name')
        .eq('id', decoded.userId)
        .single()

      if (fetchError || !user) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: '用户不存在' })
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          valid: true,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name
          }
        })
      }
    } catch (jwtError) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: '无效的认证令牌' })
      }
    }
  } catch (error) {
    console.error('Token verification error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '令牌验证过程中发生错误' })
    }
  }
}