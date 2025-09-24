'use client';

import { useState, useEffect } from 'react';
import type { FileNode } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Folder, File, FilePlus, Loader2, ServerCrash, MoreHorizontal, Save, Trash2, FolderPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

interface FileManagerProps {
  deploymentId: string;
  listFiles: (subPath: string) => Promise<{ files: FileNode[] }>;
  getFileContent: (filePath: string) => Promise<{ content: string }>;
  saveFileContent: (filePath: string, content: string) => Promise<{ success: boolean }>;
  createNewFile: (newPath: string) => Promise<{ success: boolean }>;
  deleteFile: (filePath: string) => Promise<{ success: boolean }>;
}

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function FileManager({ deploymentId, listFiles, getFileContent, saveFileContent, createNewFile, deleteFile }: FileManagerProps) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isEditorLoading, setIsEditorLoading] = useState(false);
  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isFolder, setIsFolder] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileNode | null>(null);

  const { toast } = useToast();

  const fetchFiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listFiles(currentPath);
      setFiles(result.files);
    } catch (err: any) {
      console.error('FileManager fetchFiles error:', err);
      
      let errorMessage = 'Failed to load files. ';
      if (err.message) {
        if (err.message.includes('Deployment not found')) {
          errorMessage = 'Deployment not found. Please check if the bot is properly deployed.';
        } else if (err.message.includes('not ready yet')) {
          errorMessage = 'Deployment files are still being prepared. Please wait a moment and try again.';
        } else if (err.message.includes('Directory not found')) {
          errorMessage = 'Directory not found. The deployment may have been reset.';
        } else {
          errorMessage += err.message;
        }
      }
      
      setError(errorMessage);
      toast({ 
        variant: 'destructive', 
        title: 'File Manager Error', 
        description: errorMessage 
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (deploymentId) {
        fetchFiles();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deploymentId, currentPath]);

  const handleFileClick = async (file: FileNode) => {
    if (file.type === 'directory') {
      setCurrentPath(file.path);
    } else {
      setSelectedFile(file);
      setIsEditorLoading(true);
      try {
        const { content } = await getFileContent(file.path);
        setFileContent(content);
      } catch (err: any) {
        console.error('Error reading file:', err);
        let errorMessage = `Error reading ${file.name}`;
        if (err.message) {
          if (err.message.includes('not ready yet')) {
            errorMessage = 'Deployment files are not ready yet. Please wait for deployment to complete.';
          } else if (err.message.includes('Deployment not found')) {
            errorMessage = 'Deployment not found. Please check if the bot is properly deployed.';
          } else {
            errorMessage += `: ${err.message}`;
          }
        }
        toast({ variant: 'destructive', title: errorMessage, description: 'Please try again later.' });
        setSelectedFile(null);
      } finally {
        setIsEditorLoading(false);
      }
    }
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    setIsEditorLoading(true);
    try {
      await saveFileContent(selectedFile.path, fileContent);
      toast({ title: "File Saved", description: `${selectedFile.name} has been saved.` });
      setSelectedFile(null);
      setFileContent('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error Saving File', description: err.message });
    } finally {
      setIsEditorLoading(false);
    }
  };
  
  const handleCreateFile = async () => {
      if (!newFileName.trim()) {
          toast({ variant: 'destructive', title: 'Invalid Name', description: 'File or folder name cannot be empty.' });
          return;
      }
      const newPath = `${currentPath ? currentPath + '/' : ''}${newFileName}${isFolder ? '/' : ''}`;
      try {
          await createNewFile(newPath);
          toast({ title: 'Success', description: `${isFolder ? 'Folder' : 'File'} "${newFileName}" created.`});
          setIsNewFileDialogOpen(false);
          setNewFileName('');
          fetchFiles();
      } catch (err: any) {
          toast({ variant: 'destructive', title: 'Creation Failed', description: err.message });
      }
  };
  
  const handleDeleteFile = async () => {
      if (!fileToDelete) return;
      try {
          await deleteFile(fileToDelete.path);
          toast({title: 'Success', description: `"${fileToDelete.name}" was deleted.`});
          setFileToDelete(null);
          fetchFiles();
      } catch (err: any) {
          toast({ variant: 'destructive', title: 'Deletion Failed', description: err.message });
      }
  }

  const handleBreadcrumbClick = (index: number) => {
      const pathSegments = currentPath.split('/').filter(p => p);
      const newPath = pathSegments.slice(0, index + 1).join('/');
      setCurrentPath(newPath);
  }

  const renderBreadcrumbs = () => {
      const pathSegments = currentPath.split('/').filter(p => p);
      return (
          <div className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
              <button onClick={() => setCurrentPath('')} className="hover:text-foreground">home</button>
              <span>/</span>
              <button onClick={() => setCurrentPath('')} className="hover:text-foreground">container</button>
              {pathSegments.map((segment, index) => (
                  <span key={index} className="flex items-center gap-1">
                     / <button onClick={() => handleBreadcrumbClick(index)} className="hover:text-foreground">{segment}</button>
                  </span>
              ))}
          </div>
      )
  }

  if (selectedFile) {
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="font-headline text-2xl flex items-center gap-2">
                            <File className="h-6 w-6" /> Editing {selectedFile.name}
                        </CardTitle>
                        <CardDescription>{selectedFile.path}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                         <Button variant="outline" onClick={() => setSelectedFile(null)}>Cancel</Button>
                         <Button onClick={handleSaveFile} disabled={isEditorLoading}>
                            {isEditorLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save & Close
                         </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isEditorLoading ? (
                    <div className="flex items-center justify-center p-10 h-96">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <Textarea 
                        value={fileContent}
                        onChange={(e) => setFileContent(e.target.value)}
                        className="min-h-[60vh] font-mono text-sm"
                        placeholder="File is empty."
                    />
                )}
            </CardContent>
        </Card>
    );
  }

  return (
    <>
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
                <CardTitle className="font-headline text-2xl">File Manager</CardTitle>
                <CardDescription>Manage your bot's files directly.</CardDescription>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setIsFolder(false); setIsNewFileDialogOpen(true); }}>
                    <FilePlus className="mr-2 h-4 w-4" />
                    New File
                </Button>
                <Button variant="outline" onClick={() => { setIsFolder(true); setIsNewFileDialogOpen(true); }}>
                    <FolderPlus className="mr-2 h-4 w-4" />
                    New Folder
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
         <div className="mb-4 flex items-center gap-2 border-b pb-2">
             {renderBreadcrumbs()}
         </div>

         {isLoading ? (
             <div className="flex items-center justify-center p-10 min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4">Loading files...</p>
            </div>
         ) : error ? (
            <div className="flex flex-col items-center justify-center p-10 text-center text-destructive min-h-[300px]">
                <ServerCrash className="h-10 w-10 mb-4" />
                <h3 className="text-lg font-bold">Failed to Load Files</h3>
                <p className="text-sm">{error}</p>
            </div>
         ) : (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Size</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {currentPath && (
                        <TableRow className="hover:bg-muted/50 cursor-pointer" onDoubleClick={() => {
                            const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
                            setCurrentPath(parentPath);
                        }}>
                            <TableCell className="flex items-center gap-2">
                                <Folder className="h-5 w-5 text-yellow-500" />
                                <span className="font-medium">..</span>
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    )}
                    {files.map((file) => (
                        <TableRow key={file.name} className="group hover:bg-muted/50 cursor-pointer" onDoubleClick={() => handleFileClick(file)}>
                             <TableCell className="flex items-center gap-3" onClick={() => handleFileClick(file)}>
                                {file.type === 'directory' ? <Folder className="h-5 w-5 text-yellow-500" /> : <File className="h-5 w-5 text-muted-foreground" />}
                                <span className="font-medium">{file.name}</span>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">{file.type === 'file' ? formatBytes(file.size) : ''}</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => setFileToDelete(file)}>
                                            <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                                            <span className="text-destructive">Delete</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
         )}

         {!isLoading && files.length === 0 && !error && (
             <div className="text-center p-10 text-muted-foreground min-h-[300px]">
                 <p>This directory is empty.</p>
             </div>
         )}
      </CardContent>
    </Card>

    <Dialog open={isNewFileDialogOpen} onOpenChange={setIsNewFileDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Create New {isFolder ? 'Folder' : 'File'}</DialogTitle>
                <DialogDescription>
                    Enter the name for the new {isFolder ? 'folder' : 'file'} in the current directory.
                </DialogDescription>
            </DialogHeader>
            <Input 
                placeholder={isFolder ? 'folder-name' : 'file-name.txt'}
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
            />
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleCreateFile}>Create</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    
    <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to delete this?</AlertDialogTitle>
                <AlertDialogDescription>
                    You are about to delete "{fileToDelete?.name}". This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setFileToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteFile} className="bg-destructive hover:bg-destructive/80">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}