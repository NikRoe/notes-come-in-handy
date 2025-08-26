import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

export function MarkdownEditor({ value, onChange, placeholder = "Write your note in Markdown...", rows = 20 }: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write')

  return (
    <div className="w-full">
      <div className="flex border-b mb-4">
        <Button
          variant={activeTab === 'write' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('write')}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary flex-1 sm:flex-none"
          size="sm"
        >
          Write
        </Button>
        <Button
          variant={activeTab === 'preview' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('preview')}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary flex-1 sm:flex-none"
          size="sm"
        >
          Preview
        </Button>
      </div>

      {activeTab === 'write' ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="font-mono"
        />
      ) : (
        <div className="min-h-96 p-4 border rounded-md bg-muted/20">
          {value.trim() ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {value}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-muted-foreground italic">
              Nothing to preview. Start writing in the Write tab.
            </div>
          )}
        </div>
      )}

      <div className="mt-2 text-xs text-muted-foreground">
        <p>
          Supports{' '}
          <a 
            href="https://github.github.com/gfm/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            GitHub Flavored Markdown
          </a>
          : **bold**, *italic*, `code`, lists, links, and more.
        </p>
      </div>
    </div>
  )
}