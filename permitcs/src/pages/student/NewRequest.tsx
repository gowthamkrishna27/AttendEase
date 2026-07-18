import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { UploadArea } from '../../components/forms/UploadArea';
import { ArrowLeft } from 'lucide-react';

const schema = z
  .object({
    reason: z.string().min(1, 'Please select a reason'),
    date: z.string().min(1, 'Please select a date'),
    startTime: z.string().min(1, 'Please enter start time'),
    endTime: z.string().min(1, 'Please enter end time'),
    description: z
      .string()
      .min(20, 'Description must be at least 20 characters')
      .max(500, 'Description must be under 500 characters'),
  })
  .refine(data => data.startTime < data.endTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

type FormData = z.infer<typeof schema>;

const reasonOptions = [
  { value: 'internship', label: 'Internship' },
  { value: 'medical', label: 'Medical Leave' },
  { value: 'sports', label: 'Sports Event' },
  { value: 'family_emergency', label: 'Family Emergency' },
  { value: 'competition', label: 'Competition' },
  { value: 'other', label: 'Other' },
];

export default function NewRequest() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { reason: '', date: '', startTime: '', endTime: '', description: '' },
  });

  const onSubmit = async (_data: FormData) => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1200));
    setIsSubmitting(false);
    navigate('/student/success');
  };

  return (
    <PageWrapper role="student">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-[#F3F4F6] text-[#6B7280] transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-[24px] font-semibold text-[#111111]">New Request</h1>
            <p className="text-[14px] text-[#6B7280] mt-0.5">Fill in the details below</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Reason */}
          <Select
            label="Reason"
            placeholder="Select a reason"
            options={reasonOptions}
            error={errors.reason?.message}
            {...register('reason')}
          />

          {/* Date */}
          <Input
            type="date"
            label="Date"
            error={errors.date?.message}
            min={new Date().toISOString().split('T')[0]}
            {...register('date')}
          />

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="time"
              label="Start Time"
              error={errors.startTime?.message}
              {...register('startTime')}
            />
            <Input
              type="time"
              label="End Time"
              error={errors.endTime?.message}
              {...register('endTime')}
            />
          </div>

          {/* Description */}
          <Textarea
            label="Description"
            placeholder="Describe the reason for your absence in detail..."
            rows={5}
            error={errors.description?.message}
            hint="Minimum 20 characters"
            {...register('description')}
          />

          {/* Document Upload */}
          <UploadArea file={file} onFileSelect={setFile} />

          {/* Divider */}
          <div className="border-t border-[#E5E7EB]" />

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => navigate(-1)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              loading={isSubmitting}
              className="flex-[2]"
            >
              Submit Request
            </Button>
          </div>
        </form>
      </div>
    </PageWrapper>
  );
}
