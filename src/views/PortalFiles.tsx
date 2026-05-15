'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, FileSpreadsheet, FileImage, File } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ModernSpinner from '@/components/ModernSpinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePortalFilesQuery } from '@/lib/server-state/hooks';
import { getPortalFileDownloadUrl } from '@/lib/api/portal-api';
import { toast } from 'sonner';

const formatIcons: Record<string, typeof FileText> = {
  pdf: FileText,
  doc: File,
  xlsx: FileSpreadsheet,
  png: FileImage,
};

const PortalFiles = () => {
  const { data: files, isPending } = usePortalFilesQuery();
  const fileRows = files ?? [];
  const isInitialLoading = isPending && !files;
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  const handleDownload = async (fileId: string) => {
    setDownloadingFileId(fileId);

    try {
      const downloadUrl = await getPortalFileDownloadUrl(fileId);
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to download file');
    } finally {
      setDownloadingFileId(null);
    }
  };

  return (
    <div className='space-y-6'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className='text-2xl font-bold'>Files</h1>
        <p className='text-muted-foreground'>Access your shared files</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <Card>
          <CardContent className='p-0'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className='text-right'>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isInitialLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className='py-10'>
                      <div className='flex items-center justify-center gap-2 text-muted-foreground'>
                        <ModernSpinner size='sm' color='primary' />
                        <span className='text-sm'>Loading files...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : fileRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className='py-10 text-center text-muted-foreground'>
                      No files shared yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  fileRows.map((file, i) => {
                    const Icon = formatIcons[file.format] || File;
                    return (
                      <motion.tr
                        key={file.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + i * 0.04, duration: 0.3 }}
                        className='border-b border-border transition-colors hover:bg-muted/50'
                      >
                        <TableCell>
                          <div className='flex items-center gap-2'>
                            <Icon className='h-4 w-4 text-primary' />
                            <span className='font-medium'>{file.filename}</span>
                          </div>
                        </TableCell>
                        <TableCell className='text-xs font-medium uppercase text-muted-foreground'>
                          {file.format}
                        </TableCell>
                        <TableCell>{file.filesize}</TableCell>
                        <TableCell>{file.generatedDate}</TableCell>
                        <TableCell className='text-right'>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='gap-1.5 text-primary hover:text-primary'
                            onClick={() => void handleDownload(file.id)}
                            disabled={downloadingFileId === file.id}
                          >
                            <Download size={14} /> Download
                          </Button>
                        </TableCell>
                      </motion.tr>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PortalFiles;
