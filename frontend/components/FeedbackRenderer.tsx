'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FeedbackRendererProps {
  feedback: string;
}

export default function FeedbackRenderer({ feedback }: FeedbackRendererProps) {
  if (!feedback) return null;

  // Parse feedback sections
  const sections: {
    type: 'overall' | 'strengths' | 'improvements' | 'transcript' | 'suggestions';
    title: string;
    content: string;
    color: string;
    bgColor: string;
    borderColor: string;
  }[] = [];

  // Split by section headers
  const overallMatch = feedback.match(/## 📊 Tổng thể([\s\S]*?)(?=##|$)/);
  const strengthsMatch = feedback.match(/## ✅ Điểm mạnh([\s\S]*?)(?=##|$)/);
  const improvementsMatch = feedback.match(/## 🎯 Những điểm cần cải thiện([\s\S]*?)(?=##|$)/);
  const transcriptMatch = feedback.match(/## 📝 Bản ghi sửa lỗi([\s\S]*?)(?=##|$)/);
  const suggestionsMatch = feedback.match(/## 💡 Gợi ý cải thiện([\s\S]*?)(?=##|$)/);

  if (overallMatch) {
    sections.push({
      type: 'overall',
      title: '📊 Tổng thể',
      content: overallMatch[1].trim(),
      color: 'text-blue-900',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
    });
  }

  if (strengthsMatch) {
    sections.push({
      type: 'strengths',
      title: '✅ Điểm mạnh',
      content: strengthsMatch[1].trim(),
      color: 'text-green-900',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
    });
  }

  if (improvementsMatch) {
    sections.push({
      type: 'improvements',
      title: '🎯 Những điểm cần cải thiện',
      content: improvementsMatch[1].trim(),
      color: 'text-orange-900',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
    });
  }

  if (transcriptMatch) {
    sections.push({
      type: 'transcript',
      title: '📝 Bản ghi sửa lỗi',
      content: transcriptMatch[1].trim(),
      color: 'text-purple-900',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-300',
    });
  }

  if (suggestionsMatch) {
    sections.push({
      type: 'suggestions',
      title: '💡 Gợi ý cải thiện',
      content: suggestionsMatch[1].trim(),
      color: 'text-indigo-900',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-300',
    });
  }

  // If no sections found, render as plain markdown
  if (sections.length === 0) {
    return (
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {feedback}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section, index) => (
        <div
          key={index}
          className={`${section.bgColor} ${section.borderColor} border-2 rounded-lg p-4 shadow-sm`}
        >
          <h3 className={`${section.color} text-lg font-bold mb-3 flex items-center gap-2`}>
            {section.title}
          </h3>
          <div className={`${section.color}`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Custom styling for headings
                h3: ({ children }) => (
                  <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-sm font-semibold mb-1.5 mt-2">{children}</h4>
                ),
                // Custom styling for list items
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1.5 my-2 ml-2">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1.5 my-2 ml-2">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="ml-2 leading-relaxed">{children}</li>
                ),
                // Custom styling for code blocks
                code: ({ inline, children, ...props }: { inline?: boolean; children?: React.ReactNode; [key: string]: any }) => {
                  if (inline) {
                    return (
                      <code
                        className="px-1.5 py-0.5 bg-gray-200 rounded text-sm font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code
                      className="block p-3 bg-gray-100 rounded text-sm font-mono overflow-x-auto my-2"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                // Custom styling for paragraphs
                p: ({ children }) => (
                  <p className="mb-2 leading-relaxed">{children}</p>
                ),
                // Custom styling for strong/bold
                strong: ({ children }) => (
                  <strong className="font-bold">{children}</strong>
                ),
                // Custom styling for blockquotes
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-gray-300 pl-4 my-2 italic">
                    {children}
                  </blockquote>
                ),
                // Custom styling for horizontal rules
                hr: () => (
                  <hr className="my-3 border-gray-300" />
                ),
              }}
            >
              {section.content}
            </ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
}

