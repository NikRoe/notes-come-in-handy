interface TagProps {
  name: string
  color?: string
  onClick?: () => void
  className?: string
}

export function Tag({ name, color = "#3B82F6", onClick, className = "" }: TagProps) {
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-opacity hover:opacity-80 ${className}`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      {name}
    </span>
  )
}