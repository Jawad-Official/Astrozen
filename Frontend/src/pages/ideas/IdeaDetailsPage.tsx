import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ideaValidatorClient } from '../../services/idea-validator';
import { MermaidRenderer } from '../../components/ui/MermaidRenderer';
import { KanbanPreview } from '../../components/ai/KanbanPreview';
import { DocumentList } from '../../components/ai/DocumentList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';

export default function IdeaDetailsPage() {
  const { ideaId } = useParams<{ ideaId: string }>();
  const [idea, setIdea] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!ideaId) return;

    const fetchData = async () => {
      try {
        // Fetch idea status
        const ideaData = await ideaValidatorClient.getValidationReport(ideaId);
        setIdea(ideaData);
        
        // Fetch assets
        // const assetsData = await ideaValidatorClient.getAssets(ideaId);
        // setAssets(assetsData);
      } catch (err) {
        console.error('Failed to fetch idea details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [ideaId]);

  if (isLoading) return <div className="p-10 text-center">Loading project assets...</div>;

  return (
    <div className="container mx-auto py-10 px-4 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Project Blueprint</h1>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="diagrams">User Flow</TabsTrigger>
          <TabsTrigger value="documents">Documentation</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6 space-y-6">
          <Card>
            <CardHeader><CardTitle>AI Analysis</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{idea?.refined_description}</p>
            </CardContent>
          </Card>
          {/* <KanbanPreview tickets={idea?.tickets || []} /> */}
        </TabsContent>

        <TabsContent value="diagrams" className="mt-6">
          <Card>
            <CardHeader><CardTitle>App Navigation Flow</CardTitle></CardHeader>
            <CardContent>
              {/* <MermaidRenderer chart={idea?.mermaid_chart || ''} /> */}
              <p className="text-muted-foreground text-center py-10">Diagram rendering requires backend processing completion.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          {/* <DocumentList assets={assets} /> */}
          <p className="text-muted-foreground text-center py-10">Documents are being stored in Cloudflare R2.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
