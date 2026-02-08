import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

interface Ticket {
  title: string;
  description: string;
  type: string;
  priority: string;
}

interface KanbanPreviewProps {
  tickets: Ticket[];
}

export const KanbanPreview: React.FC<KanbanPreviewProps> = ({ tickets }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Generated Kanban Tickets</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tickets.map((t, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.title}</CardTitle>
              <Badge variant={t.priority === 'critical' ? 'destructive' : 'outline'}>
                {t.priority}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
              <div className="mt-2">
                <Badge variant="secondary">{t.type}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
