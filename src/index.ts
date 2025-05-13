/**
 * 修复后的完整 DeepSeek GraphQL Worker
 * 主要修复：正确传递环境变量给 GraphQL 上下文
 */

import { createSchema, createYoga } from "graphql-yoga";

interface Env {
  DEEPSEEK_API_KEY: string;
}

const yoga = createYoga({
    schema: createSchema({
        typeDefs: /* GraphQL */ `
      # DeepSeek 聊天消息类型
      type ChatMessage {
        role: String!
        content: String!
      }
      # DeepSeek API 响应类型
      type ChatCompletion {
        id: String
        object: String
        created: Int
        model: String
        choices: [Choice]
        usage: Usage
      }
      # DeepSeek API 响应的选择部分
      type Choice {
        index: Int
        message: ChatMessage
        finish_reason: String
      }

      # DeepSeek API 的使用统计
      type Usage {
        prompt_tokens: Int
        completion_tokens: Int
        total_tokens: Int
      }

      # 输入类型：聊天消息
      input ChatMessageInput {
        role: String!
        content: String!
      }

      # 输入类型：聊天完成请求
      input ChatCompletionInput {
        model: String!
        messages: [ChatMessageInput!]!
        temperature: Float
        top_p: Float
        max_tokens: Int
        stream: Boolean
      }

      # 调试信息类型
      type DebugInfo {
        hasApiKey: Boolean!
        apiKeyLength: Int
        timestamp: String!
        environment: String!
      }

      # 查询类型
      type Query {
        # 简单的健康检查查询
        health: String!
        
        # 调试信息查询
        debug: DebugInfo!
      }

      # 变更类型
      type Mutation {
        # 创建聊天完成
        createChatCompletion(input: ChatCompletionInput!): ChatCompletion
        
        # 测试 API 连接
        testApiConnection: String!
      }
        `,
        resolvers: {
            Query: {
                health: () => "DeepSeek GraphQL API 正常运行",
                
                debug: (_, __, context) => {
                    try {
                        console.log('=== Debug resolver 开始执行 ===');
                        
                        if (!context || !context.env) {
                            throw new Error('环境变量上下文未找到');
                        }
                        
                        const apiKey = context.env.DEEPSEEK_API_KEY;
                        console.log('API Key 存在:', !!apiKey);
                        
                        const result = {
                            hasApiKey: !!apiKey,
                            apiKeyLength: apiKey ? apiKey.length : 0,
                            timestamp: new Date().toISOString(),
                            environment: 'production'
                        };
                        
                        console.log('Debug result:', result);
                        return result;
                    } catch (error) {
                        console.error('Debug resolver 错误:', error);
                        throw new Error(`调试查询失败: ${error.message}`);
                    }
                }
            },
            Mutation: {
                testApiConnection: async (_, __, context) => {
                    const apiKey = context.env.DEEPSEEK_API_KEY;

                    if (!apiKey) {
                        throw new Error('DEEPSEEK_API_KEY 环境变量未设置');
                    }

                    try {
                        console.log('开始测试 API 连接...');
                        
                        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${apiKey}`
                            },
                            body: JSON.stringify({
                                model: "deepseek-chat",
                                messages: [
                                    { role: "user", content: "测试连接" }
                                ],
                                max_tokens: 10
                            })
                        });

                        console.log('API 响应状态:', response.status);

                        if (!response.ok) {
                            const errorText = await response.text();
                            console.error('API 错误响应:', errorText);
                            throw new Error(`API 测试失败: ${response.status} - ${errorText}`);
                        }

                        return `API 连接测试成功! 状态码: ${response.status}`;
                    } catch (error) {
                        console.error("API 连接测试失败:", error);
                        throw new Error(`API 连接测试失败: ${error.message}`);
                    }
                },

                createChatCompletion: async (_, { input }, context) => {
                    const apiUrl = 'https://api.deepseek.com/v1/chat/completions';
                    const apiKey = context.env.DEEPSEEK_API_KEY;

                    console.log('=== DeepSeek API 调用开始 ===');
                    console.log('API Key 存在:', !!apiKey);
                    console.log('输入参数:', JSON.stringify(input, null, 2));

                    if (!apiKey) {
                        console.error('错误: DEEPSEEK_API_KEY 环境变量未设置');
                        throw new Error('DEEPSEEK_API_KEY 环境变量未设置');
                    }

                    try {
                        const response = await fetch(apiUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${apiKey}`
                            },
                            body: JSON.stringify(input)
                        });

                        console.log('API 响应状态码:', response.status);

                        if (!response.ok) {
                            const errorText = await response.text();
                            console.error('API 错误响应:', errorText);
                            throw new Error(`DeepSeek API 错误: ${response.status} - ${errorText}`);
                        }

                        const result = await response.json();
                        console.log('API 调用成功');

                        return result;
                    } catch (error) {
                        console.error("调用 DeepSeek API 时出错:", error);
                        throw error;
                    }
                }
            }
        },
    }),
    graphiql: {
        defaultQuery: /* GraphQL */ `
# 1. 首先测试调试信息
query GetDebugInfo {
  debug {
    hasApiKey
    apiKeyLength
    timestamp
    environment
  }
}

# 2. 测试 API 连接（取消注释下面的代码）
# mutation TestConnection {
#   testApiConnection
# }

# 3. 测试完整的聊天功能（取消注释下面的代码）
# mutation SampleChatQuery {
#   createChatCompletion(
#     input: {
#       model: "deepseek-chat"
#       messages: [
#         { role: "user", content: "你好，请简单介绍一下你自己" }
#       ]
#       temperature: 0.7
#       max_tokens: 500
#     }
#   ) {
#     id
#     choices {
#       message {
#         role
#         content
#       }
#       finish_reason
#     }
#     usage {
#       prompt_tokens
#       completion_tokens
#       total_tokens
#     }
#   }
# }
      `,
    },
    cors: {
        origin: '*',
        methods: ['POST', 'GET', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }
});

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        try {
            console.log('=== Worker 开始处理请求 ===');
            console.log('URL:', request.url);
            console.log('Method:', request.method);
            
            if (!env) {
                console.error('环境变量 env 为空');
                return new Response('环境变量未找到', { status: 500 });
            }
            
            console.log('DEEPSEEK_API_KEY 存在:', !!env.DEEPSEEK_API_KEY);
            
            // 关键修复：正确传递环境变量作为上下文
            const response = await yoga.fetch(request, {
                env,
                executionContext: ctx
            });
            
            console.log('=== Worker 请求处理完成 ===');
            return response;
            
        } catch (error) {
            console.error('Worker 错误:', error);
            return new Response(JSON.stringify({
                error: 'Worker 执行失败',
                message: error.message
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
    },
};