
import {Badge} from '@/components/ui/badge';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';

interface AiToolCardProps {
  aiTool: {
    summary: string;
    category: string;
    tags: string[];
    apiAvailable: boolean;
  };
}

export function AiToolCard({aiTool}: AiToolCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{aiTool.category}</CardTitle>
        <CardDescription>{aiTool.summary}</CardDescription>
      </CardHeader>
      <CardContent>
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
