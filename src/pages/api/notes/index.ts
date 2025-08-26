import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  const session = await getServerSession(request, response, authOptions);

  if (!session?.user) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  const userId = session.user.id;

  switch (request.method) {
    case "GET":
      try {
        const notes = await prisma.note.findMany({
          where: { userId },
          include: {
            tags: {
              include: {
                tag: true
              }
            }
          },
          orderBy: { updatedAt: "desc" },
        });
        response.status(200).json(notes);
      } catch (error) {
        console.error("Failed to fetch notes:", error);
        response.status(500).json({ error: "Failed to fetch notes" });
      }
      break;

    case "POST":
      try {
        const { title, content, tagNames = [] } = request.body;

        if (!title || !content) {
          return response
            .status(400)
            .json({ error: "Title and content are required" });
        }

        console.log("tagnames: ", tagNames);

        // Create or find existing tags
        const tagIds = [];
        if (tagNames.length > 0) {
          for (const tagName of tagNames) {
            const tag = await prisma.tag.upsert({
              where: {
                name_userId: {
                  name: tagName.trim(),
                  userId,
                },
              },
              create: {
                name: tagName.trim(),
                userId,
              },
              update: {},
            });
            tagIds.push(tag.id);
          }
        }

        const note = await prisma.note.create({
          data: {
            title,
            content,
            userId,
            ...(tagIds.length > 0 && {
              tags: {
                create: tagIds.map((tagId) => ({ tagId })),
              },
            }),
          },
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
          },
        });

        response.status(201).json(note);
      } catch (error) {
        console.error("Failed to create note:", error);
        response.status(500).json({ error: "Failed to create note" });
      }
      break;

    default:
      response.setHeader("Allow", ["GET", "POST"]);
      response.status(405).end(`Method ${request.method} Not Allowed`);
  }
}
