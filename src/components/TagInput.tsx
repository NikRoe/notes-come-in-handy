import { useState, KeyboardEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { Tag } from './Tag'

interface TagInputProps {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  placeholder?: string
}

export function TagInput({ tags, onTagsChange, placeholder = "Add tags..." }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')

  const addTag = (tagName: string) => {
    const trimmed = tagName.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed])
    }
    setInputValue('')
  }

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  const handleInputBlur = () => {
    if (inputValue.trim()) {
      addTag(inputValue)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <div key={tag} className="relative">
            <Tag name={tag} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeTag(tag)}
              className="absolute -top-1 -right-1 h-4 w-4 p-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <X className="h-2 w-2" />
            </Button>
          </div>
        ))}
      </div>
      <Input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleInputBlur}
        className="w-full"
      />
    </div>
  )
}