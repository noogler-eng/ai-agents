import helper from "./helper";
import { ChromaClient } from "chromadb";
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

  console.log("Embedding shape:", embeding.length, embeding[0]?.length);
  const web_collection = await client.getOrCreateCollection({
    name: "body_embeddings",
    metadata: { dimension: 768 },
  });

  await web_collection.add({
    ids: [url],
    embeddings: embeding,
    metadatas: [{ url }],
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

const main = async () => {
  try {
    await ingest("https://piyushgarg.dev");
  } catch (error: any) {
    console.log(error);
  }
};

main();
