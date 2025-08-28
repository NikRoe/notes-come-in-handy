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
    <section className="w-full">
      <fieldset>
        <legend className="sr-only">Note Content Editor</legend>
        <div role="tablist" className="flex border-b mb-4" aria-label="Editor modes">
          <Button
            role="tab"
            aria-selected={activeTab === 'write'}
            aria-controls="editor-panel"
            variant={activeTab === 'write' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('write')}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary flex-1 sm:flex-none"
            size="sm"
            tabIndex={activeTab === 'write' ? 0 : -1}
          >
            Write
          </Button>
          <Button
            role="tab"
            aria-selected={activeTab === 'preview'}
            aria-controls="editor-panel"
            variant={activeTab === 'preview' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('preview')}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary flex-1 sm:flex-none"
            size="sm"
            tabIndex={activeTab === 'preview' ? 0 : -1}
          >
            Preview
          </Button>
        </div>

        <div
          id="editor-panel"
          role="tabpanel"
          aria-labelledby={`${activeTab}-tab`}
        >
          {activeTab === 'write' ? (
            <>
              <label htmlFor="content-editor" className="sr-only">
                Note content in Markdown format
              </label>
              <Textarea
                id="content-editor"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className="font-mono"
                aria-describedby="markdown-help"
              />
            </>
          ) : (
            <div 
              className="min-h-96 p-4 border rounded-md bg-muted/20"
              role="document"
              aria-label="Markdown preview"
            >
              {value.trim() ? (
                <article className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {value}
                  </ReactMarkdown>
                </article>
              ) : (
                <p className="text-muted-foreground italic" role="status">
                  Nothing to preview. Start writing in the Write tab.
                </p>
              )}
            </div>
          )}
        </div>

        <footer id="markdown-help" className="mt-2 text-xs text-muted-foreground">
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
        </footer>
      </fieldset>
    </section>
  )
}