import helper from "./helper";
import { ChromaClient } from "chromadb";
import dotenv from "dotenv";
dotenv.config();

const client = new ChromaClient({ path: "http://localhost:8000" });
client.heartbeat();

// adding to the database
const insertIntoDb = async ({ embeding, url, body = "", head = "" }: any) => {
  if (
    !Array.isArray(embeding) ||
    embeding.length === 0 ||
    !Array.isArray(embeding[0])
  ) {
    console.error("Error: Invalid embedding format", embeding);
    return;
  }

  const web_collection = await client.getOrCreateCollection({
    name: "body_embeddings",
  });

  await web_collection.add({
    ids: [url],
    embeddings: [embeding],
    metadatas: [{ url, body, head }],
  });
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

  const bodyInChunks = await helper.chunkText(JSON.stringify(body), 500);

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
  for (const link of internalLinks) {
    const _url = `${url}${link}`;
    ingest(_url);
  }

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
