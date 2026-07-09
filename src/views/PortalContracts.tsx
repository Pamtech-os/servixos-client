'use client';

import { useRef, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ModernSpinner from '@/components/ModernSpinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { usePortalContractsQuery } from '@/lib/server-state/hooks';
import { queryKeys } from '@/lib/server-state/query-keys';
import { signPortalContract, type PortalContract } from '@/lib/api/portal-api';
import { toast } from 'sonner';
import { ScrollText, Pen, Check, AlertTriangle } from 'lucide-react';

const PortalContracts = () => {
  const queryClient = useQueryClient();
  const { data: contracts, isPending } = usePortalContractsQuery();
  const contractRows = contracts ?? [];
  const isInitialLoading = isPending && !contracts;

  const [selectedContract, setSelectedContract] = useState<PortalContract | null>(null);
  const [signatureError, setSignatureError] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (selectedContract && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'hsl(220, 25%, 10%)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
      }
    }
  }, [selectedContract]);

  const closeContractDialog = () => {
    setSelectedContract(null);
    setHasSignature(false);
    setSignatureError(false);
  };

  const openContractDialog = (contractId: string) => {
    const contractToSign = contractRows.find((contract) => contract.id === contractId);
    if (!contractToSign) return;
    setSelectedContract(contractToSign);
    setHasSignature(false);
    setSignatureError(false);
  };

  const startDraw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
    setSignatureError(false);
  };

  const stopDraw = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSign = async () => {
    if (!hasSignature) {
      setSignatureError(true);
      return;
    }

    if (selectedContract) {
      setIsSigning(true);

      try {
        const signatureData = canvasRef.current?.toDataURL('image/png');
        if (!signatureData) {
          setSignatureError(true);
          return;
        }

        await signPortalContract(selectedContract.id, signatureData);

        queryClient.setQueryData<PortalContract[]>(queryKeys.contracts, (prev = []) =>
          prev.map((contract) =>
            contract.id === selectedContract.id ? { ...contract, status: 'signed' as const } : contract
          )
        );
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }).catch(() => undefined);
        toast.success(`Contract "${selectedContract.name}" signed successfully!`);
        closeContractDialog();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to sign contract');
      } finally {
        setIsSigning(false);
      }
    }
  };

  return (
    <div className='space-y-6'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className='text-2xl font-bold'>Contracts</h1>
        <p className='text-muted-foreground'>Review and sign your contracts</p>
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
                  <TableHead>Contract Name</TableHead>
                  <TableHead>Date Sent</TableHead>
                  <TableHead className='text-right'>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isInitialLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className='py-10'>
                      <div className='flex items-center justify-center gap-2 text-muted-foreground'>
                        <ModernSpinner size='sm' color='primary' />
                        <span className='text-sm'>Loading contracts...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : contractRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className='py-10 text-center text-muted-foreground'>
                      No contracts available yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  contractRows.map((contract, i) => (
                    <motion.tr
                      key={contract.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.04, duration: 0.3 }}
                      className='border-b border-border transition-colors hover:bg-muted/50'
                    >
                      <TableCell>
                        <div className='flex items-center gap-2'>
                          <ScrollText className='h-4 w-4 text-primary' />
                          <span className='font-medium'>{contract.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{contract.dateSent}</TableCell>
                      <TableCell className='text-right font-semibold'>
                        ${contract.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center gap-2'>
                          {contract.status === 'signed' ? (
                            <Badge
                              variant='outline'
                              className='border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
                            >
                              <Check className='mr-1 h-3 w-3' /> Signed
                            </Badge>
                          ) : contract.status === 'expired' ? (
                            <Badge
                              variant='outline'
                              className='border-destructive/30 bg-destructive/10 text-destructive'
                            >
                              Expired
                            </Badge>
                          ) : contract.status === 'cancelled' ? (
                            <Badge
                              variant='outline'
                              className='border-muted-foreground/30 bg-muted text-muted-foreground'
                            >
                              Cancelled
                            </Badge>
                          ) : (
                            <div className='flex items-center gap-2'>
                              <Badge
                                variant='outline'
                                className='border-amber-500/20 bg-amber-500/10 text-amber-600'
                              >
                                Awaiting Signature
                              </Badge>
                              <Button
                                size='sm'
                                variant='outline'
                                className='gap-1.5 border-primary/30 text-primary hover:bg-primary/10'
                                onClick={() => openContractDialog(contract.id)}
                              >
                                <Pen size={12} /> Sign Now
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={!!selectedContract} onOpenChange={(open) => !open && closeContractDialog()}>
        <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <ScrollText className='h-5 w-5 text-primary' />
              {selectedContract?.name}
            </DialogTitle>
            <DialogDescription>
              Review the contract below and append your signature to sign.
            </DialogDescription>
          </DialogHeader>

          {selectedContract && (
            <div className='space-y-6'>
              <div className='rounded-lg border border-border bg-muted/30 p-6'>
                <pre className='whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground'>
                  {selectedContract.content}
                </pre>
              </div>

              <div className='flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-sm'>
                <span className='text-muted-foreground'>Contract Value</span>
                <span className='text-lg font-bold'>${selectedContract.amount.toLocaleString()}</span>
              </div>

              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <label className='text-sm font-medium'>Your Signature</label>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={clearSignature}
                    className='text-xs text-muted-foreground'
                  >
                    Clear
                  </Button>
                </div>
                <div
                  className={`rounded-lg border-2 border-dashed p-1 ${
                    signatureError ? 'border-destructive' : 'border-border'
                  } bg-background`}
                >
                  <canvas
                    ref={canvasRef}
                    width={560}
                    height={150}
                    className='w-full touch-none rounded cursor-crosshair'
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                  />
                </div>
                <AnimatePresence>
                  {signatureError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className='flex items-center gap-1.5 text-xs text-destructive'
                    >
                      <AlertTriangle size={12} /> A signature is required to sign this contract.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                  onClick={handleSign}
                  className='gradient-bg w-full gap-2 text-primary-foreground'
                  size='lg'
                  disabled={isSigning}
                >
                  <Pen size={16} /> Sign & Save
                </Button>
              </motion.div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortalContracts;
