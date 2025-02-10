import axios from "axios";
import * as cheerio from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const generateVectorEmbedding = async ({ text }: any) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(
    JSON.stringify({
      text: text,
    })
  );
  return result;
};

const scrappeWebsite = async (url: string) => {
  const result = await axios.get(url || "");
  const $ = cheerio.load(result.data);

  const head = $("head").html();
  const body = $("body").html();

  const internalLinks: string[] = [];
  const externalLinks: string[] = [];

  $("a").each((_, el) => {
    const link: string = $(el).attr("href") || "";
    // only taking the internal link of the website
    // removing the reduandancy in gettting the internal link
    // removing the / as it is already scrapped
    link?.startsWith("/")
      ? internalLinks.indexOf(link) == -1
        ? link == "/"
          ? null
          : internalLinks.push(link)
        : null
      : externalLinks.indexOf(link) == -1
      ? externalLinks.push(link)
      : null;
  });

  return {
    head: head,
    body: body,
    internalLinks: internalLinks,
    externalLinks: externalLinks,
  };
};

function chunkText(text: string, size: any) {
  if (!text || typeof text !== "string") {
    throw new Error("Invalid input: text must be a string");
  }
  if (!size || typeof size !== "number" || size <= 0) {
    throw new Error("Invalid chunk size: must be a positive number");
  }

  let chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

export default { generateVectorEmbedding, scrappeWebsite, chunkText };
