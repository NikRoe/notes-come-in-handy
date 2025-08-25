import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  const session = await getServerSession(request, response, authOptions)

  if (!session?.user) {
    return response.status(401).json({ error: 'Unauthorized' })
  }

  const userId = session.user.id

  switch (request.method) {
    case 'GET':
      try {
        const notes = await prisma.note.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
        })
        response.status(200).json(notes)
      } catch (error) {
        response.status(500).json({ error: 'Failed to fetch notes' })
      }
      break

    case 'POST':
      try {
        const { title, content } = request.body

        if (!title || !content) {
          return response.status(400).json({ error: 'Title and content are required' })
        }

        const note = await prisma.note.create({
          data: {
            title,
            content,
            userId,
          },
        })

        response.status(201).json(note)
      } catch (error) {
        response.status(500).json({ error: 'Failed to create note' })
      }
      break

    default:
      response.setHeader('Allow', ['GET', 'POST'])
      response.status(405).end(`Method ${request.method} Not Allowed`)
  }
}