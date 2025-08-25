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
  const { id } = request.query

  if (typeof id !== 'string') {
    return response.status(400).json({ error: 'Invalid note ID' })
  }

  switch (request.method) {
    case 'GET':
      try {
        const note = await prisma.note.findFirst({
          where: { id, userId },
        })

        if (!note) {
          return response.status(404).json({ error: 'Note not found' })
        }

        response.status(200).json(note)
      } catch (error) {
        response.status(500).json({ error: 'Failed to fetch note' })
      }
      break

    case 'PUT':
      try {
        const { title, content } = request.body

        if (!title || !content) {
          return response.status(400).json({ error: 'Title and content are required' })
        }

        const note = await prisma.note.updateMany({
          where: { id, userId },
          data: { title, content },
        })

        if (note.count === 0) {
          return response.status(404).json({ error: 'Note not found' })
        }

        const updatedNote = await prisma.note.findUnique({
          where: { id },
        })

        response.status(200).json(updatedNote)
      } catch (error) {
        response.status(500).json({ error: 'Failed to update note' })
      }
      break

    case 'DELETE':
      try {
        const note = await prisma.note.deleteMany({
          where: { id, userId },
        })

        if (note.count === 0) {
          return response.status(404).json({ error: 'Note not found' })
        }

        response.status(200).json({ message: 'Note deleted successfully' })
      } catch (error) {
        response.status(500).json({ error: 'Failed to delete note' })
      }
      break

    default:
      response.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
      response.status(405).end(`Method ${request.method} Not Allowed`)
  }
}