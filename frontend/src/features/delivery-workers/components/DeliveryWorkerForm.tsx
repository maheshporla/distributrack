import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  createUserSchema,
  updateUserSchema,
  type CreateUserValues,
  type UpdateUserValues,
} from "@/schemas/user.schemas";

import { userService } from "@/services/api/userService";

import type { UserProfile } from "@/types/auth.types";

interface DeliveryWorkerFormProps {
  /** When provided, the form edits this worker; otherwise it creates. */
  worker?: UserProfile | null;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Delivery Worker create/edit form. The role is fixed to DELIVERY_BOY —
 * this page manages delivery staff only; the backend role matrix still
 * validates that the caller may create/manage DELIVERY_BOY accounts.
 */
export function DeliveryWorkerForm({
  worker,
  onSuccess,
  onCancel,
}: DeliveryWorkerFormProps) {
  const isEdit = Boolean(worker);

  const createForm = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { fullName: "", email: "", password: "", phone: "", role: "DELIVERY_BOY" },
  });

  const updateForm = useForm<UpdateUserValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      fullName: worker?.fullName ?? "",
      phone: worker?.phone ?? "",
      role: "DELIVERY_BOY",
      enabled: worker?.enabled ?? true,
    },
  });

  // Repopulate when switching between create/edit targets.
  useEffect(() => {
    if (worker) {
      updateForm.reset({
        fullName: worker.fullName,
        phone: worker.phone,
        role: "DELIVERY_BOY",
        enabled: worker.enabled,
      });
    } else {
      createForm.reset({ fullName: "", email: "", password: "", phone: "", role: "DELIVERY_BOY" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worker?.id]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = createForm.handleSubmit(async (values) => {
    try {
      setIsSubmitting(true);
      await userService.createUser(values);
      toast.success("Delivery worker created successfully");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create delivery worker");
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleUpdate = updateForm.handleSubmit(async (values) => {
    if (!worker) return;

    try {
      setIsSubmitting(true);
      await userService.updateUser(worker.id, values);
      toast.success("Delivery worker updated successfully");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update delivery worker");
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <form
      onSubmit={isEdit ? handleUpdate : handleCreate}
      className="space-y-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Full name */}
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-medium">
            Full Name *
          </label>

          <Input
            id="fullName"
            placeholder="Delivery worker's full name"
            {...(isEdit
              ? updateForm.register("fullName")
              : createForm.register("fullName"))}
          />

          {(isEdit
            ? updateForm.formState.errors.fullName
            : createForm.formState.errors.fullName) && (
            <p className="text-sm text-destructive">
              {(isEdit
                ? updateForm.formState.errors.fullName
                : createForm.formState.errors.fullName)?.message}
            </p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium">
            Phone Number *
          </label>

          <Input
            id="phone"
            placeholder="10-digit mobile number"
            {...(isEdit
              ? updateForm.register("phone")
              : createForm.register("phone"))}
          />

          {(isEdit
            ? updateForm.formState.errors.phone
            : createForm.formState.errors.phone) && (
            <p className="text-sm text-destructive">
              {(isEdit
                ? updateForm.formState.errors.phone
                : createForm.formState.errors.phone)?.message}
            </p>
          )}
        </div>

        {/* Email (create only) */}
        {!isEdit && (
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email *
            </label>

            <Input
              id="email"
              type="email"
              placeholder="worker@example.com"
              {...createForm.register("email")}
            />

            {createForm.formState.errors.email && (
              <p className="text-sm text-destructive">
                {createForm.formState.errors.email.message}
              </p>
            )}
          </div>
        )}

        {/* Password (create only) */}
        {!isEdit && (
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password *
            </label>

            <Input
              id="password"
              type="password"
              placeholder="6+ chars, A-Z, a-z, 0-9, @#$%"
              {...createForm.register("password")}
            />

            {createForm.formState.errors.password && (
              <p className="text-sm text-destructive">
                {createForm.formState.errors.password.message}
              </p>
            )}
          </div>
        )}

        {/* Enabled (edit only) */}
        {isEdit && (
          <div className="space-y-2">
            <label htmlFor="enabled" className="text-sm font-medium">
              Status
            </label>

            <select
              id="enabled"
              {...updateForm.register("enabled", {
                setValueAs: (value) => value === "true",
              })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Saving..."
            : isEdit
              ? "Save Changes"
              : "Create Worker"}
        </Button>
      </div>
    </form>
  );
}
