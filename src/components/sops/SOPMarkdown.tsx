import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface SOPMarkdownProps {
  content: string
}

export default function SOPMarkdown({ content }: SOPMarkdownProps) {
  return (
    <div className="sop-markdown text-sm text-text-primary leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
