'use client';

import type { MongoDbAnalysisResult } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface MongoDbInfoProps {
  analysis: MongoDbAnalysisResult | null;
  isLoading: boolean;
}

export function MongoDbInfo({ analysis, isLoading }: MongoDbInfoProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center">
          <Database className="mr-2 h-5 w-5 text-primary" />
          MongoDB Analysis
        </CardTitle>
        <CardDescription>AI-powered detection of MongoDB usage in your bot.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-muted-foreground">Analyzing bot configuration...</p>}
        {!isLoading && !analysis && <p className="text-muted-foreground">Upload a bot to see MongoDB analysis.</p>}
        {analysis && (
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold flex items-center">
                {analysis.requiresMongoDB ? (
                  <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500" />
                )}
                Requires MongoDB:
              </h4>
              <p className={`pl-7 ${analysis.requiresMongoDB ? 'text-green-600' : 'text-yellow-600'}`}>
                {analysis.requiresMongoDB ? 'Yes' : 'No (or not detected)'}
              </p>
            </div>
            {analysis.requiresMongoDB && (
              <>
                {analysis.connectionString && (
                  <div>
                    <h4 className="font-semibold">Detected Connection String:</h4>
                    <pre className="mt-1 text-sm bg-muted p-2 rounded-md overflow-x-auto whitespace-pre-wrap break-all">
                      <code>{analysis.connectionString}</code>
                    </pre>
                  </div>
                )}
                {analysis.cloudSetupSuggestion && (
                  <div>
                    <h4 className="font-semibold">Cloud Setup Suggestion:</h4>
                    <p className="text-sm text-muted-foreground">{analysis.cloudSetupSuggestion}</p>
                  </div>
                )}
                {!analysis.connectionString && !analysis.cloudSetupSuggestion && (
                   <p className="text-sm text-muted-foreground">Further details about MongoDB setup were not found or suggested by the analysis.</p>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
