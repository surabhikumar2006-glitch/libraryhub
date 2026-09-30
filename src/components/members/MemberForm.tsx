'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Member, MEMBERSHIP_TYPES, MEMBER_STATUSES } from '@/types';
import Input from '@/components/ui/Input';
import { Select } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  phone: z
    .string()
    .min(7, 'Phone number is too short')
    .max(20)
    .regex(/^[0-9+\-() ]+$/, 'Invalid phone number'),
  membershipType: z.enum(MEMBERSHIP_TYPES as [string, ...string[]]),
  joinDate: z.string().min(1, 'Join date is required'),
  status: z.enum(MEMBER_STATUSES as [string, ...string[]]),
});

type FormValues = z.infer<typeof schema>;

interface MemberFormProps {
  member?: Member;
  existingEmails: string[];
  onSubmit: (values: Omit<Member, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function MemberForm({
  member,
  existingEmails,
  onSubmit,
  onCancel,
  loading = false,
}: MemberFormProps) {
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: member?.name ?? '',
      email: member?.email ?? '',
      phone: member?.phone ?? '',
      membershipType: member?.membershipType ?? 'Student',
      joinDate: member?.joinDate ?? format(new Date(), 'yyyy-MM-dd'),
      status: member?.status ?? 'Active',
    },
  });

  const handleFormSubmit = (values: FormValues) => {
    setServerError('');
    const isDuplicate = existingEmails.some(
      (email) => email.toLowerCase() === values.email.toLowerCase() && email.toLowerCase() !== member?.email.toLowerCase()
    );
    if (isDuplicate) {
      setServerError('A member with this email address already exists.');
      return;
    }
    onSubmit(values as Omit<Member, 'id' | 'createdAt'>);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {serverError && <Alert variant="error" message={serverError} />}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input
            label="Full Name"
            required
            {...register('name')}
            error={errors.name?.message}
            placeholder="e.g. Alice Johnson"
          />
        </div>
        <Input
          label="Email"
          type="email"
          required
          {...register('email')}
          error={errors.email?.message}
          placeholder="alice@example.com"
        />
        <Input
          label="Phone"
          required
          {...register('phone')}
          error={errors.phone?.message}
          placeholder="555-0101"
        />
        <Select
          label="Membership Type"
          required
          {...register('membershipType')}
          options={MEMBERSHIP_TYPES.map((t) => ({ value: t, label: t }))}
          error={errors.membershipType?.message}
        />
        <Input
          label="Join Date"
          type="date"
          required
          {...register('joinDate')}
          error={errors.joinDate?.message}
        />
        <Select
          label="Status"
          required
          {...register('status')}
          options={MEMBER_STATUSES.map((s) => ({ value: s, label: s }))}
          error={errors.status?.message}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          {member ? 'Update Member' : 'Add Member'}
        </Button>
      </div>
    </form>
  );
}
