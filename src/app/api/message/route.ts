import { db } from "@/db";
import { getCurrentUser } from "@/db/localTempDb";
import { openai } from "@/lib/openai";
import { SendMessageValidator } from "@/lib/validators/SendMessageValidator";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { NextRequest } from "next/server";

import { OpenAIStream, StreamingTextResponse } from "ai";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

export const POST = async (req: NextRequest) => {
  const body = await req.json();
  const user = await getCurrentUser();
  const { id: userId } = user ?? { id: null };

  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { fileId, message } = SendMessageValidator.parse(body);

  const file = await db.file.findFirst({
    where: {
      id: fileId,
      userId,
    },
  });

  if (!file) return new Response("Not found", { status: 404 });

  await db.message.create({
    data: {
      text: message,
      isUserMessage: true,
      userId,
      fileId,
    },
  });

  // 1: vectorize message
  const pdfFileResp = await fetch(
    `https://uploadthing-prod.s3.us-west-2.amazonaws.com/${file.key}`
  );

  const blob = await pdfFileResp.blob();
  const loader = new PDFLoader(blob);
  const pageLevelDocs = await loader.load();

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const vectorStore = await MemoryVectorStore.fromDocuments(
    pageLevelDocs,
    embeddings
  );

  if (!vectorStore)
    return new Response("vector store is missing", { status: 404 });

  const results = await vectorStore.similaritySearch(message, 4);

  const prevMessages = await db.message.findMany({
    where: {
      fileId,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 6,
  });

  const formattedPrevMessages = prevMessages.map((msg) => ({
    role: msg.isUserMessage ? ("user" as const) : ("assistant" as const),
    content: msg.text,
  }));

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    temperature: 0,
    stream: true,
    messages: [
      {
        role: "system",
        content:
          "Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format.",
      },
      {
        role: "user",
        content: `Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format. \nIf you don't know the answer, just say that you don't know, don't try to make up an answer.
          
    \n----------------\n
    
    PREVIOUS CONVERSATION:
    ${formattedPrevMessages.map((message) => {
      if (message.role === "user") return `User: ${message.content}\n`;
      return `Assistant: ${message.content}\n`;
    })}
    
    \n----------------\n
    
    CONTEXT:
    ${results.map((r) => r.pageContent).join("\n\n")}
    
    USER INPUT: ${message}`,
      },
    ],
  });
  //@ts-ignore
  const stream = OpenAIStream(response, {
    async onCompletion(completion) {
      await db.message.create({
        data: {
          text: completion,
          isUserMessage: false,
          fileId,
          userId,
        },
      });
    },
  });

  return new StreamingTextResponse(stream);
};
