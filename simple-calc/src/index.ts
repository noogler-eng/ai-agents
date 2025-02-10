import { ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import {} from "@langchain/google-genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();

const multiply = tool(
  // @ts-ignore
  ({ a, b }: any) => {
    return a * b;
  },
  {
    name: "multiply",
    description: "multiply two numbers",
    schema: z.object({
      a: z.number().describe("first number"),
      b: z.number().describe("second number"),
    }),
  }
);

const add = tool(
  // @ts-ignore
  ({ a, b }: any) => {
    return a + b;
  },
  {
    name: "add",
    description: "add two numbers",
    schema: z.object({
      a: z.number().describe("first number"),
      b: z.number().describe("second number"),
    }),
  }
);

const divide = tool(
  // @ts-ignore
  ({ a, b }: any) => {
    return a / b;
  },
  {
    name: "divide",
    description: "divide two numbers",
    schema: z.object({
      a: z.number().describe("first number"),
      b: z.number().describe("second number"),
    }),
  }
);

const tools = [multiply, add, divide];
const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

const model = new ChatGoogleGenerativeAI({
  modelName: "gemini-1.5-flash",
  maxOutputTokens: 2048,
  apiKey: process.env.API_KEY || "",
});

const llmWithTools = model.bindTools(tools);

// first node
const llmCall = async (state: any) => {
  const result = await llmWithTools.invoke([
    {
      role: "system",
      content:
        "you are helpful assistant tasked with performing arthematic on a set of inputs",
    },
    ...state.messages,
  ]);
  return {
    messages: [result],
  };
};

// second node
const toolNode = async (state: any) => {
  const results = [];
  const lastMsg = state.messages.at(-1);
  if (lastMsg?.tool_calls?.length) {
    for (const toolCall of lastMsg.tool_calls) {
      const tool = toolsByName[toolCall.name];
      // here tool is undefined
      const observation = await tool.invoke(toolCall.args);
      results.push(
        new ToolMessage({
          content: observation,
          tool_call_id: toolCall.id,
        })
      );
    }
  }
};

// third node - condition edge node
const shouldContinue = (state: any) => {
  const lastMsg = state.messages.at(-1);
  if (lastMsg?.tool_calls?.length) {
    return "Action";
  } else {
    return "__end__";
  }
};

const agentBuilder = new StateGraph(MessagesAnnotation)
  .addNode("llmCall", llmCall)
  .addNode("tools", toolNode)
  .addEdge("__start__", "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, {
    Action: "tools",
    __end__: "__end__",
  })
  .addEdge("tools", "llmCall")
  .compile();

const main = async () => {
  const messages = [
    {
      role: "user",
      content: "hi",
    },
  ];
  const result = await agentBuilder.invoke({ messages });
  console.log(result.messages);
};

main()
  .then(() => {
    console.log("successfully execute");
  })
  .catch((error) => {
    console.log("error", error);
  });
