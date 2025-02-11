import axios from "axios";
import helper from "./helper";
import { ChromaClient } from "chromadb";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const client = new ChromaClient({ path: "http://localhost:8000" });
client.heartbeat();

// adding to the database
const insertIntoDb = async ({ embeding, url, body = "", head = "" }: any) => {
  if (!Array.isArray(embeding) || embeding.length === 0) {
    console.error("Error: Invalid embedding format (not an array)");
    return;
  }

  if (!Array.isArray(embeding[0])) {
    // Ensure embedding is wrapped in another list (ChromaDB requires 2D arrays)
    embeding = [embeding];
  }

  // console.log("Embedding shape:", embeding.length, embeding[0]?.length);
  const web_collection = await client.getOrCreateCollection({
    name: "body_embeddings",
    metadata: { dimension: 768 },
  });

  await web_collection.add({
    ids: [url],
    embeddings: embeding,
    metadatas: [{ url, body, head }],
  });

  // console.log("Embedding structure:", JSON.stringify(embeding, null, 2));
};

// this will scrape the ebsite and form an vector embedding and store in croma_db
const ingest = async (url: string) => {
  console.log("ingesting url -> ", url);
  const { head, body, internalLinks, externalLinks } =
    await helper.scrappeWebsite(url);

  //   const headEmbedding = await helper.generateVectorEmbedding(
  //     JSON.stringify({ text: head })
  //   );
  //   insertIntoDb({ embeding: headEmbedding, url });

  const bodyInChunks = await helper.chunkText(JSON.stringify(body), 100);

  for (const chunk of bodyInChunks) {
    const bodyEmbedding: any = await helper.generateVectorEmbedding(chunk);
    await insertIntoDb({
      embeding: bodyEmbedding.embedding.values,
      url: url,
      head: head,
      body: body,
    });
  }

  // recursive calling for the internal urls
  // for (const link of internalLinks) {
  //   const _url = `${url}${link}`;
  //   ingest(_url);
  // }

  console.log("ingesting success");
};

const chatWithBot = async (question: string) => {
  try {
    // 1. Generate the embedding for the question.
    const questionEmbedding = await helper.generateVectorEmbedding(
      JSON.stringify({ text: question })
    );

    // Ensure the embedding is in 2D array format.
    const queryEmbeddings = Array.isArray(questionEmbedding.embedding.values[0])
      ? questionEmbedding.embedding.values
      : [questionEmbedding.embedding.values];

    // 2. Retrieve context from your vector store (ChromaDB)
    const collection = await client.getOrCreateCollection({
      name: "body_embeddings",
    });
    const collectionResult = await collection.query({
      nResults: 3,
      queryEmbeddings,
    });

    // Extract the first (most relevant) result.
    console.log(collectionResult);

    const bodyes =
      collectionResult.metadatas &&
      collectionResult.metadatas[0]
        .map((e) => e?.body)
        .filter((e: any) => e.trim() != "" && !!e);

    // 3. Build a conversation history.
    //    Use a system message to clearly provide the scraped context (URL and content)
    //    so that Gemini can use it when answering.
    const conversationHistory = [
      {
        role: "user",
        parts: [
          {
            text: `Please use the following scraped context to inform your responses:
            Content: ${bodyes.join(" ,") || "N/A"}`,
          },
        ],
      },
      {
        role: "model",
        parts: [
          {
            text: `You are an AI support agent that provides answers based on webpage content.`,
          },
        ],
      },
    ];

    // 4. Prepare the payload. Some Gemini implementations expect the conversation history
    //    to be provided as a "history" field when starting a chat.
    const payload = {
      history: conversationHistory,
    };

    // 5. Initialize the Gemini model using your API key.
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 6. Start a chat with the payload (which includes the context).
    const chat = await model.startChat(payload);

    // 7. Send the user's question (if needed, depending on how your conversation history is managed).
    // Some APIs may already include the user message in the conversation history.
    let result = await chat.sendMessage(`Scraped Context:
      Content: ${
        bodyes.join(" ,") ||
        "Please use the following scraped context to inform your responses"
      } User Query: ${question}`);

    // Log and return the response text.
    const responseText = await result.response.text();
    console.log(responseText);
    return responseText;
  } catch (error) {
    console.error("Unexpected error:", error);
    throw error;
  }
};

const main = async () => {
  try {
    // await ingest("https://piyushgarg.dev");
    // await ingest("https://www.piyushgarg.dev/about");
    // await ingest("https://www.piyushgarg.dev/guest-book");
    // await ingest("https://www.piyushgarg.dev/cohort");
    await chatWithBot("what is cohort offered by piyush");
  } catch (error: any) {
    console.log(error);
  }
};

main();
