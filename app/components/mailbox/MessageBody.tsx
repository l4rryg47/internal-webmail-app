"use client";

interface MessageBodyProps {
  body: string;
}

export function MessageBody({ body }: MessageBodyProps) {
  // Convert plain text to paragraphs
  const paragraphs = body.split("\n\n").filter((p) => p.trim());

  return (
    <div className="message-body">
      {paragraphs.map((paragraph, index) => {
        // Simple markdown-like parsing for bold text
        const formattedText = paragraph.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        return (
          <p
            key={index}
            dangerouslySetInnerHTML={{ __html: formattedText }}
            style={{ marginBottom: "16px" }}
          />
        );
      })}
    </div>
  );
}
