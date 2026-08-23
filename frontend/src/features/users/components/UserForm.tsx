import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  createUserSchema,
  updateUserSchema,
  type CreateUserValues,
  type UpdateUserValues,
} from "@/schemas/user.schemas";

import { userService } from "@/services/api/userService";

import type { UserProfile } from "@/types/auth.types";
import type { RoleName } from "@/types/auth.types";

/**
 * Roles an administrator can assign from this module. SUPER_ADMIN is
 * deliberately excluded — a second SUPER_ADMIN can only ever be created
 * by another SUPER_ADMIN through the backend directly, and the UI does
 * not offer it (matches the product requirement: admins create
 * OWNER/MANAGER/SALESMAN/DELIVERY_BOY/SHOPKEEPER).
 */
export const ASSIGNABLE_ROLES: RoleName[] = [
  "OWNER",
  "MANAGER",
  "SALESMAN",
  "DELIVERY_BOY",
  "SHOPKEEPER",
];

/** "DELIVERY_BOY" -> "Delivery Boy" — display only, value sent to the backend is unchanged. */
function formatRoleLabel(role: string): string {
  return role
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface UserFormProps {
  /** When provided, the form edits this user; otherwise it creates a new one. */
  user?: UserProfile | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const isEdit = Boolean(user);
  const isSuperAdminTarget = user?.role === "SUPER_ADMIN";
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createForm = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      phone: "",
      role: "SHOPKEEPER",
    },
  });

  const updateForm = useForm<UpdateUserValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      fullName: user?.fullName ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      role: user?.role ?? "SHOPKEEPER",
      enabled: user?.enabled ?? true,
      password: "",
    },
  });

  // Repopulate form values when switching between create/edit targets.
  useEffect(() => {
    if (user) {
      updateForm.reset({
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        enabled: user.enabled,
        password: "",
      });
    } else {
      createForm.reset({
        fullName: "",
        email: "",
        password: "",
        phone: "",
        role: "SHOPKEEPER",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleCreate = createForm.handleSubmit(async (values) => {
    try {
      setIsSubmitting(true);
      await userService.createUser(values);
      toast.success("User created successfully");
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleUpdate = updateForm.handleSubmit(async (values) => {
    if (!user) return;

    try {
      setIsSubmitting(true);
      // Empty password means "keep current" — only send it when provided.
      const payload = {
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        role: values.role,
        enabled: values.enabled,
        ...(values.password ? { password: values.password } : {}),
      };
      await userService.updateUser(user.id, payload);
      toast.success("User updated successfully");
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  });

  const roleSelect = (
    field: { value: RoleName; onChange: (value: RoleName) => void },
    fieldStateError?: string,
    disabled?: boolean,
  ) => (
    <div className="space-y-2">
      <Label htmlFor="role">Role</Label>
      <Select
        value={field.value}
        onValueChange={(value) => field.onChange(value as RoleName)}
        disabled={disabled || isSubmitting}
      >
        <SelectTrigger id="role" invalid={!!fieldStateError}>
          <SelectValue placeholder="Select a role" />
        </SelectTrigger>
        <SelectContent>
          {ASSIGNABLE_ROLES.map((role) => (
            <SelectItem key={role} value={role}>
              {formatRoleLabel(role)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {fieldStateError && (
        <p className="text-sm text-destructive">{fieldStateError}</p>
      )}
      {disabled && (
        <p className="text-xs text-muted-foreground">
          SUPER_ADMIN accounts cannot be reassigned from this screen.
        </p>
      )}
    </div>
  );

  return (
    <form
      onSubmit={isEdit ? handleUpdate : handleCreate}
      className="space-y-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            placeholder="User's full name"
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
          <Label htmlFor="phone">Phone Number *</Label>
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

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            placeholder="user@example.com"
            {...(isEdit
              ? updateForm.register("email")
              : createForm.register("email"))}
          />
          {(isEdit
            ? updateForm.formState.errors.email
            : createForm.formState.errors.email) && (
            <p className="text-sm text-destructive">
              {(isEdit
                ? updateForm.formState.errors.email
                : createForm.formState.errors.email)?.message}
            </p>
          )}
        </div>

        {/* Password (create only) */}
        {!isEdit && (
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              {...createForm.register("password")}
            />
            {createForm.formState.errors.password && (
              <p className="text-sm text-destructive">
                {createForm.formState.errors.password.message}
              </p>
            )}
          </div>
        )}

        {/* Role */}
        {isEdit ? (
          <Controller
            control={updateForm.control}
            name="role"
            render={({ field, fieldState }) =>
              roleSelect(field, fieldState.error?.message, isSuperAdminTarget)
            }
          />
        ) : (
          <Controller
            control={createForm.control}
            name="role"
            render={({ field, fieldState }) =>
              roleSelect(field, fieldState.error?.message)
            }
          />
        )}

        {/* Status (edit only) */}
        {isEdit && (
          <div className="space-y-2">
            <Label htmlFor="enabled">Status</Label>
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

      {/* Optional password reset (edit only) */}
      {isEdit && (
        <div className="space-y-2">
          <Label htmlFor="password">Reset Password (optional)</Label>
          <Input
            id="password"
            type="password"
            placeholder="Leave blank to keep the current password"
            autoComplete="new-password"
            {...updateForm.register("password")}
          />
          {updateForm.formState.errors.password && (
            <p className="text-sm text-destructive">
              {updateForm.formState.errors.password.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            If set, the new password is BCrypt-hashed server-side before storage.
          </p>
        </div>
      )}

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
          {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create User"}
        </Button>
      </div>
    </form>
  );
}
