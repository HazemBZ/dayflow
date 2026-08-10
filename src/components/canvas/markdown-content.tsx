import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

export const mdStyles =
  "text-sm leading-snug " +
  "[&_h1]:mb-1 [&_h1]:text-sm [&_h1]:font-bold " +
  "[&_h2]:mb-0.5 [&_h2]:text-sm [&_h2]:font-semibold " +
  "[&_h3]:mb-0.5 [&_h3]:text-xs [&_h3]:font-semibold " +
  "[&_p]:mb-1 [&_p:last-child]:mb-0 " +
  "[&_ul]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 " +
  "[&_ol]:mb-1 [&_ol]:list-decimal [&_ol]:pl-4 " +
  "[&_li]:mb-0 [&_li:last-child]:mb-0 " +
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[10px] " +
  "[&_pre]:mb-1 [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0 " +
  "[&_blockquote]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-2 [&_blockquote]:italic " +
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-1 " +
  "[&_hr]:my-1.5 [&_hr]:border-border";

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className={mdStyles}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}