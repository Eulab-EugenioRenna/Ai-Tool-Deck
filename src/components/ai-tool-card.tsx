import {Badge} from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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
}

export function AiToolCard({aiTool, title, subtitle}: AiToolCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || aiTool.name}</CardTitle>
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
      </CardContent>
    </Card>
  );
}
