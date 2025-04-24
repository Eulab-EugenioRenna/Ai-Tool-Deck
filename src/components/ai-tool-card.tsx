import {Badge} from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import React from 'react';

interface AiToolCardProps {
  aiTool: {
    summary: string;
    category: string;
    tags: string[];
    apiAvailable: boolean;
    name: string;
  };
  title?: string;
  subtitle?: string;
  link?: string;
  children?: React.ReactNode;
}

export function AiToolCard({aiTool, title, subtitle, link, children}: AiToolCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {link ? (
            <a href={link} target="_blank" rel="noopener noreferrer">
              {title || aiTool.name}
            </a>
          ) : (
            title || aiTool.name
          )}
        </CardTitle>
        <CardDescription>{subtitle || aiTool.category}</CardDescription>
      </CardHeader>
      <CardContent>
        <CardDescription>{aiTool.summary}</CardDescription>
        <div className="mb-4">
          {aiTool.tags.map((tag) => (
            <Badge key={tag} className="mr-2">
              {tag}
            </Badge>
          ))}
        </div>
        <div>
          <span className="font-semibold">API Available:</span>{' '}
          {aiTool.apiAvailable ? 'Yes' : 'No'}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
