import { db } from "@/db";
import { getCurrentUser } from "@/db/localTempDb";
import { SendMessageValidator } from "@/lib/validators/SendMessageValidator";
import { NextRequest } from "next/server";

export const POST = async (req: NextRequest) => {
  const body = req.json();
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

  
};
