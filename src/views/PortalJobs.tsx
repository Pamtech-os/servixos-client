'use client';

import { useState } from 'react';
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
import {
  usePortalJobsQuery,
  usePortalJobReviewQuery,
  useSubmitPortalJobReviewMutation,
} from '@/lib/server-state/hooks';
import { ApiError } from '@/lib/api/client-api';
import { toast } from 'sonner';
import { Briefcase, Star, CheckCircle2 } from 'lucide-react';

interface StarRatingInputProps {
  value: 0 | 1 | 2 | 3 | 4 | 5;
  onChange: (rating: 1 | 2 | 3 | 4 | 5) => void;
}

const StarRatingInput = ({ value, onChange }: StarRatingInputProps) => {
  const [hovered, setHovered] = useState(0);
  const displayed = hovered || value;
  return (
    <div className='flex gap-1' onMouseLeave={() => setHovered(0)}>
      {([1, 2, 3, 4, 5] as const).map((star) => (
        <button
          key={star}
          type='button'
          onMouseEnter={() => setHovered(star)}
          onClick={() => onChange(star)}
          className='rounded p-0.5 transition-transform hover:scale-110 focus:outline-none'
          aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
        >
          <Star
            size={28}
            className={
              star <= displayed
                ? 'fill-amber-400 text-amber-400'
                : 'fill-transparent text-muted-foreground/40'
            }
          />
        </button>
      ))}
    </div>
  );
};

interface StarDisplayProps {
  rating: 1 | 2 | 3 | 4 | 5;
}

const StarDisplay = ({ rating }: StarDisplayProps) => (
  <div className='flex gap-0.5'>
    {([1, 2, 3, 4, 5] as const).map((star) => (
      <Star
        key={star}
        size={16}
        className={star <= rating ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-muted-foreground/30'}
      />
    ))}
  </div>
);

const statusStyles: Record<string, string> = {
  completed: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600',
  in_progress: 'border-blue-500/20 bg-blue-500/10 text-blue-600',
  cancelled: 'border-muted-foreground/30 bg-muted text-muted-foreground',
};

const statusLabels: Record<string, string> = {
  completed: 'Completed',
  in_progress: 'In Progress',
  cancelled: 'Cancelled',
};

const ReviewDialogContent = ({
  jobId,
  jobTitle,
  onClose,
}: {
  jobId: string;
  jobTitle: string;
  onClose: () => void;
}) => {
  const { data: existingReview, isPending: isCheckingReview } = usePortalJobReviewQuery(jobId);
  const { mutateAsync: submitReview, isPending: isSubmitting } = useSubmitPortalJobReviewMutation();

  const [rating, setRating] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [comment, setComment] = useState('');
  const [ratingError, setRatingError] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      setRatingError(true);
      return;
    }
    setRatingError(false);
    try {
      await submitReview({ jobId, rating, comment: comment.trim() || undefined });
      setSubmitted(true);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 409) {
        setSubmitted(true);
        return;
      }
      toast.error(error instanceof Error ? error.message : 'Unable to submit review');
    }
  };

  if (isCheckingReview) {
    return (
      <div className='flex items-center justify-center py-10'>
        <ModernSpinner size='sm' color='primary' />
      </div>
    );
  }

  const review = existingReview;
  const isReviewed = !!review || submitted;

  return (
    <div className='space-y-5'>
      {isReviewed ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='space-y-4'>
          <div className='flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3'>
            <CheckCircle2 size={18} className='shrink-0 text-emerald-600' />
            <p className='text-sm font-medium text-emerald-700 dark:text-emerald-400'>
              Review submitted for this job
            </p>
          </div>
          {review && (
            <div className='space-y-3 rounded-lg border border-border bg-muted/30 p-4'>
              <StarDisplay rating={review.rating} />
              {review.comment && (
                <p className='text-sm leading-relaxed text-foreground'>{review.comment}</p>
              )}
            </div>
          )}
          <Button variant='outline' className='w-full' onClick={onClose}>
            Close
          </Button>
        </motion.div>
      ) : (
        <div className='space-y-5'>
          <div className='space-y-2'>
            <p className='text-sm font-medium'>Your rating</p>
            <StarRatingInput value={rating} onChange={(r) => { setRating(r); setRatingError(false); }} />
            <AnimatePresence>
              {ratingError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className='text-xs text-destructive'
                >
                  Please select a star rating before submitting.
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className='space-y-2'>
            <label htmlFor='review-comment' className='text-sm font-medium'>
              Comment <span className='text-muted-foreground'>(optional)</span>
            </label>
            <textarea
              id='review-comment'
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder={`How was "${jobTitle}"?`}
              className='w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
            />
            <p className='text-right text-xs text-muted-foreground'>{comment.length}/1000</p>
          </div>

          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              onClick={() => void handleSubmit()}
              disabled={isSubmitting}
              className='gradient-bg w-full gap-2 text-primary-foreground'
              size='lg'
            >
              {isSubmitting ? <ModernSpinner size='sm' color='primary-foreground' /> : <Star size={16} />}
              Submit Review
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const PortalJobs = () => {
  const { data: jobs, isPending } = usePortalJobsQuery();
  const jobRows = jobs ?? [];
  const isInitialLoading = isPending && !jobs;

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const selectedJob = jobRows.find((j) => j.id === selectedJobId) ?? null;

  return (
    <div className='space-y-6'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className='text-2xl font-bold'>Jobs</h1>
        <p className='text-muted-foreground'>View your jobs and leave reviews for completed work</p>
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
                  <TableHead>Job</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isInitialLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className='py-10'>
                      <div className='flex items-center justify-center gap-2 text-muted-foreground'>
                        <ModernSpinner size='sm' color='primary' />
                        <span className='text-sm'>Loading jobs...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : jobRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className='py-10 text-center text-muted-foreground'>
                      No jobs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  jobRows.map((job, i) => (
                    <motion.tr
                      key={job.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.04, duration: 0.3 }}
                      className='border-b border-border transition-colors hover:bg-muted/50'
                    >
                      <TableCell>
                        <div className='flex items-center gap-2'>
                          <Briefcase className='h-4 w-4 text-primary' />
                          <span className='font-medium'>{job.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className='text-muted-foreground'>{job.createdAt}</TableCell>
                      <TableCell>
                        <Badge
                          variant='outline'
                          className={statusStyles[job.status] ?? 'border-border bg-muted text-foreground'}
                        >
                          {statusLabels[job.status] ?? job.status}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-right'>
                        {job.status === 'completed' && (
                          <Button
                            size='sm'
                            variant='outline'
                            className='gap-1.5 border-primary/30 text-primary hover:bg-primary/10'
                            onClick={() => setSelectedJobId(job.id)}
                          >
                            <Star size={12} /> Review
                          </Button>
                        )}
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={!!selectedJobId} onOpenChange={(open) => !open && setSelectedJobId(null)}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Star className='h-5 w-5 text-primary' />
              {selectedJob?.title ?? 'Leave a Review'}
            </DialogTitle>
            <DialogDescription>
              Share your experience with this job to help improve service quality.
            </DialogDescription>
          </DialogHeader>

          {selectedJobId && (
            <ReviewDialogContent
              jobId={selectedJobId}
              jobTitle={selectedJob?.title ?? ''}
              onClose={() => setSelectedJobId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortalJobs;
