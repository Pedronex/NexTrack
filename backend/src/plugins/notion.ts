import { Client } from '@notionhq/client'
import { Elysia } from 'elysia'
import { env } from '../config/env'

const notion = new Client({ auth: env.NOTION_TOKEN })

export const notionPlugin = new Elysia({ name: 'notion' })
  .decorate('notion', notion)
  .decorate('notionIds', {
    books: env.NOTION_BOOKS_DATA_SOURCE_ID,
    sessions: env.NOTION_SESSIONS_DATA_SOURCE_ID,
  })