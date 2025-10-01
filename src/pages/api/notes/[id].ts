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
  const { id } = request.query;

  if (typeof id !== "string") {
    return response.status(400).json({ error: "Invalid note ID" });
  }

  switch (request.method) {
    case "GET":
      try {
        const note = await prisma.note.findFirst({
          where: { id, userId },
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
          },
        });

        if (!note) {
          return response.status(404).json({ error: "Note not found" });
        }

        response.status(200).json(note);
      } catch (error) {
        response.status(500).json({ error });
      }
      break;

    case "PUT":
      try {
        const { title, content, tagNames = [] } = request.body;

        if (!title || !content) {
          return response
            .status(400)
            .json({ error: "Title and content are required" });
        }

        // First, remove all existing tag associations
        await prisma.noteTag.deleteMany({
          where: { noteId: id },
        });

        // Create or find tags and get their IDs
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

        // Update the note
        const updatedNote = await prisma.note.update({
          where: { id },
          data: {
            title,
            content,
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

        response.status(200).json(updatedNote);
      } catch (error) {
        response.status(500).json({ error });
      }
      break;

    case "DELETE":
      try {
        const note = await prisma.note.deleteMany({
          where: { id, userId },
        });

        if (note.count === 0) {
          return response.status(404).json({ error: "Note not found" });
        }

        response.status(200).json({ message: "Note deleted successfully" });
      } catch (error) {
        response.status(500).json({ error });
      }
      break;

    default:
      response.setHeader("Allow", ["GET", "PUT", "DELETE"]);
      response.status(405).end(`Method ${request.method} Not Allowed`);
  }
}
