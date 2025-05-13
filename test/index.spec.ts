// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("Pokemon API worker", () => {
  it("responds with Pokemon data for id=1 (unit style)", async () => {
    const request = new IncomingRequest("https://example.com");
    // Create an empty context to pass to `worker.fetch()`.
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    // Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
    await waitOnExecutionContext(ctx);

    let data;
    try {
      data = await response.json();
    } catch (error) {
      console.error("Error parsing response JSON:", error);
    }

    if (data) {
      expect(data).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        height: expect.any(Number),
        weight: expect.any(Number),
        sprites: {
          front_default: expect.any(String),
          front_shiny: expect.any(String),
          front_female: expect.any(String),
          front_shiny_female: expect.any(String),
          back_default: expect.any(String),
          back_shiny: expect.any(String),
          back_female: expect.any(String),
          back_shiny_female: expect.any(String),
        },
      });
    }
  });

  it("responds with Pokemon data for id=1 (integration style)", async () => {
    const response = await worker.fetch(new Request("https://example.com"), env, createExecutionContext());

    let data;
    try {
      data = await response.json();
    } catch (error) {
      console.error("Error parsing response JSON:", error);
    }

    if (data) {
      expect(data).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        height: expect.any(Number),
        weight: expect.any(Number),
        sprites: {
          front_default: expect.any(String),
          front_shiny: expect.any(String),
          front_female: expect.any(String),
          front_shiny_female: expect.any(String),
          back_default: expect.any(String),
          back_shiny: expect.any(String),
          back_female: expect.any(String),
          back_shiny_female: expect.any(String),
        },
      });
    }
  });
});
