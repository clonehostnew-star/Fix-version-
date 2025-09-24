
'use client';

import type React from 'react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BotUploadCardProps {
  onDeployStart: (formData: FormData) => Promise<void>;
  isDeploying: boolean;
}

function SubmitButton({ isDeploying, hasFile }: { isDeploying: boolean, hasFile: boolean }) {
  return (
    <Button type="submit" className="w-full text-lg py-6" disabled={isDeploying || !hasFile}>
      {isDeploying ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Deploying...
        </>
      ) : (
        <>
          <UploadCloud className="mr-2 h-4 w-4" />
          Deploy Bot
        </>
      )}
    </Button>
  );
}

export function BotUploadCard({ onDeployStart, isDeploying }: BotUploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/zip' && selectedFile.type !== 'application/x-zip-compressed') {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload a .zip file.",
        });
        setFile(null);
        setFileName('');
        event.target.value = ''; 
        return;
      }
      if (selectedFile.size > 100 * 1024 * 1024) { // 100MB
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "File size cannot exceed 100MB.",
        });
        setFile(null);
        setFileName('');
        event.target.value = '';
        return;
      }
      setFile(selectedFile);
      setFileName(selectedFile.name);
    } else {
      setFile(null);
      setFileName('');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast({
        variant: "destructive",
        title: "No File Selected",
        description: "Please select a ZIP file to upload.",
      });
      return;
    }
    const formData = new FormData();
    formData.append('zipfile', file);
    await onDeployStart(formData);
  };

  return (
    <Card className="shadow-lg w-full max-w-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Upload Your Bot</CardTitle>
        <CardDescription>
          Get started by uploading your bot's source code in a .zip file. 
          The server will install dependencies and run the 'npm start' command.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="zipfile" className="text-base">Bot Archive (.zip)</Label>
            <Input
              id="zipfile"
              name="zipfile"
              type="file"
              accept=".zip,.zip-compressed"
              onChange={handleFileChange}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              required
              disabled={isDeploying}
            />
            {fileName && <p className="text-sm text-muted-foreground mt-2">Selected file: {fileName}</p>}
          </div>
          <SubmitButton isDeploying={isDeploying} hasFile={!!file} />
        </form>
      </CardContent>
    </Card>
  );
}
