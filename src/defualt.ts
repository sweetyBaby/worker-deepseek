/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// 导入 Yoga GraphQL 服务器所需的核心函数
// createSchema: 用于创建 GraphQL schema
// createYoga: 用于创建 Yoga GraphQL 服务器实例
import { createSchema, createYoga } from "graphql-yoga";

/**
 * Env 接口定义了 Cloudflare Workers 环境中可用的绑定资源
 * 实际使用时可以取消注释并配置
 */
export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// KV 存储命名空间示例 - 键值对永久存储
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// Durable Object 命名空间示例 - 有状态的对象存储
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// R2 存储桶示例 - 类似 S3 的对象存储
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// 服务绑定示例 - 连接到其他 Workers 服务
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// 队列绑定示例 - 用于异步任务处理
	// MY_QUEUE: Queue;
}

/**
 * 创建 Yoga GraphQL 服务器实例
 * 这里使用泛型 <Env> 确保 Yoga 可以访问 Cloudflare Workers 的环境变量
 */
const yoga = createYoga<Env>({
	// 创建 GraphQL schema，包含类型定义和解析器
	schema: createSchema({
		typeDefs: /* GraphQL */ `
	  type PokemonSprites {
		front_default: String!
		front_shiny: String!
		front_female: String!
		front_shiny_female: String!
		back_default: String!
		back_shiny: String!
		back_female: String!
		back_shiny_female: String!
	  }
	  type Pokemon {
		id: ID!
		name: String!
		height: Int!
		weight: Int!
		sprites: PokemonSprites!
	  }
	  type Query {
		pokemon(id: ID!): Pokemon
	  }
		  `,
		// 定义解析器，实现上面定义的查询逻辑
		resolvers: {
			Query: {
				pokemon: async (_parent, { id }) => {
					const result = await fetch(
						new Request(`https://pokeapi.co/api/v2/pokemon/${id}`),
						{
							cf: {
								// Always cache this fetch regardless of content type
								// for a max of 1 min before revalidating the resource
								cacheTtl: 50,
								cacheEverything: true,
							},
						}
					);
					return await result.json();
				},
			},
		},
	}),
	graphiql: {
		defaultQuery: /* GraphQL */ `
		query samplePokeAPIquery {
		  pokemon: pokemon(id: 1) {
			id
			name
			height
			weight
			sprites {
			  front_shiny
			  back_shiny
			}
		  }
		}
	  `,
	},
});

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return yoga.fetch(request, env);
	},
};
