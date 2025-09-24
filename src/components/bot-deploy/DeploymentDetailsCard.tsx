'use client';

import type { DeploymentDetails } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Archive, FileText, ListTree, Puzzle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DeploymentDetailsCardProps {
  details: DeploymentDetails | null;
  isLoading: boolean;
}

export function DeploymentDetailsCard({ details, isLoading }: DeploymentDetailsCardProps) {
  if (isLoading && !details?.fileName) { // Show loading only if no initial details are available
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center">
                <ListTree className="mr-2 h-5 w-5 text-primary" />
                Deployment Details
                </CardTitle>
                <CardDescription>Information about the uploaded bot.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Processing uploaded bot...</p>
            </CardContent>
        </Card>
    );
  }

  if (!details || !details.fileName) {
    return (
        <Card className="shadow-lg">
             <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center">
                <ListTree className="mr-2 h-5 w-5 text-primary" />
                Deployment Details
                </CardTitle>
                <CardDescription>Information about the uploaded bot.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Upload a bot to see its details.</p>
            </CardContent>
        </Card>
    );
  }


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center">
          <ListTree className="mr-2 h-5 w-5 text-primary" />
          Deployment Details
        </CardTitle>
        <CardDescription>Information about the uploaded bot.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold flex items-center mb-1">
            <Archive className="mr-2 h-4 w-4 text-muted-foreground" />
            Uploaded File:
          </h4>
          <p className="text-sm pl-6">{details.fileName}</p>
        </div>

        {details.fileList && details.fileList.length > 0 && (
          <div>
            <h4 className="font-semibold flex items-center mb-1">
              <ListTree className="mr-2 h-4 w-4 text-muted-foreground" />
              Unarchived Files ({details.fileList.length}):
            </h4>
            <ScrollArea className="h-32 w-full rounded-md border p-2 text-sm pl-6">
              <ul className="list-disc list-inside">
                {details.fileList.map((file, index) => (
                  <li key={index} className="truncate">{file}</li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}

        {details.packageJsonContent && (
          <div>
            <h4 className="font-semibold flex items-center mb-1">
              <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
              package.json:
            </h4>
            <ScrollArea className="h-32 w-full rounded-md border p-2 text-sm pl-6">
              <pre className="whitespace-pre-wrap break-all">
                <code>{JSON.stringify(details.packageJsonContent, null, 2)}</code>
              </pre>
            </ScrollArea>
          </div>
        )}

        {details.dependencies && Object.keys(details.dependencies).length > 0 && (
          <div>
            <h4 className="font-semibold flex items-center mb-1">
              <Puzzle className="mr-2 h-4 w-4 text-muted-foreground" />
              Dependencies:
            </h4>
            <ScrollArea className="h-24 w-full rounded-md border p-2 text-sm pl-6">
              <ul className="list-disc list-inside">
                {Object.entries(details.dependencies).map(([name, version]) => (
                  <li key={name}>{name}: {version}</li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
