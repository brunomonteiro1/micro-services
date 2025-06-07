import "@opentelemetry/auto-instrumentations-node/register";
import { fastify } from "fastify";
import { randomUUID } from "node:crypto";
import { fastifyCors } from "@fastify/cors";
import { trace } from "@opentelemetry/api";
import { setTimeout } from "node:timers/promises";
import { z } from "zod";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { channels } from "../broker/channels/index.ts";
import { db } from "../db/client.ts";
import { schema } from "../db/schema/index.ts";
import { dispatchOrderCreated } from "../broker/messages/order-created.ts";
import { tracer } from "../tracer/tracer.ts";

const app = fastify().withTypeProvider<ZodTypeProvider>();

app.setSerializerCompiler(serializerCompiler);
app.setValidatorCompiler(validatorCompiler);
app.register(fastifyCors, { origin: "*" });

app.get("/health", () => {
  return "OK";
});

app.post(
  "/orders",
  {
    schema: {
      body: z.object({
        amount: z.coerce.number(),
      }),
    },
  },
  async (request, response) => {
    const { amount } = request.body;

    console.log("Creating an order with amount", amount);

    const orderId = randomUUID();

    await db.insert(schema.orders).values({
      amount,
      id: orderId,
      customerId: "f07d3453-71c8-4834-84b5-b7a3733740e0",
    });

    const span = tracer.startSpan("Acho que ta dando ruim");

    await setTimeout(2000);

    span.end();

    trace.getActiveSpan()?.setAttribute("order_id", orderId);

    dispatchOrderCreated({
      orderId,
      amount,
      customer: {
        id: "f07d3453-71c8-4834-84b5-b7a3733740e0",
      },
    });

    return response.status(201).send();
  }
);

app.listen({ host: "0.0.0.0", port: 3334 }).then(() => {
  console.log("[Orders] HTTP Server running!");
});
