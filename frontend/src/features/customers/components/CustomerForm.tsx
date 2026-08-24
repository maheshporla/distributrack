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

interface CustomerFormProps {
  /** When provided, the form edits this customer; otherwise it creates. */
  customer?: UserProfile | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CustomerForm({
  customer,
  onSuccess,
  onCancel,
}: CustomerFormProps) {
  const isEdit = Boolean(customer);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createForm = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      phone: "",
      shopName: "",
      address: "",
      role: "SHOPKEEPER",
    },
  });

  const updateForm = useForm<UpdateUserValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      fullName: customer?.fullName ?? "",
      phone: customer?.phone ?? "",
      shopName: customer?.shopName ?? "",
      address: customer?.address ?? "",
      role: "SHOPKEEPER",
      enabled: customer?.enabled ?? true,
    },
  });

  // Repopulate form default values when changing targets.
  useEffect(() => {
    if (customer) {
      updateForm.reset({
        fullName: customer.fullName,
        phone: customer.phone,
        shopName: customer.shopName ?? "",
        address: customer.address ?? "",
        role: "SHOPKEEPER",
        enabled: customer.enabled,
      });
    } else {
      createForm.reset({
        fullName: "",
        email: "",
        password: "",
        phone: "",
        shopName: "",
        address: "",
        role: "SHOPKEEPER",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);

  const handleCreate = createForm.handleSubmit(async (values) => {
    try {
      setIsSubmitting(true);
      await userService.createUser(values);
      toast.success("Customer account created successfully");
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to create customer");
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleUpdate = updateForm.handleSubmit(async (values) => {
    if (!customer) return;

    try {
      setIsSubmitting(true);
      await userService.updateUser(customer.id, values);
      toast.success("Customer account updated successfully");
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update customer");
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
        {/* Full Name */}
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-medium">
            Full Name *
          </label>
          <Input
            id="fullName"
            placeholder="Shopkeeper's full name / Shop name"
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

        {/* Shop / Business Name (B2B) */}
        <div className="space-y-2">
          <label htmlFor="shopName" className="text-sm font-medium">
            Shop / Business Name
          </label>
          <Input
            id="shopName"
            placeholder="ABC General Store"
            {...(isEdit
              ? updateForm.register("shopName")
              : createForm.register("shopName"))}
          />
          {(isEdit
            ? updateForm.formState.errors.shopName
            : createForm.formState.errors.shopName) && (
            <p className="text-sm text-destructive">
              {(isEdit
                ? updateForm.formState.errors.shopName
                : createForm.formState.errors.shopName)?.message}
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

        {/* Email (creation only) */}
        {!isEdit && (
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email *
            </label>
            <Input
              id="email"
              type="email"
              placeholder="customer@example.com"
              {...createForm.register("email")}
            />
            {createForm.formState.errors.email && (
              <p className="text-sm text-destructive">
                {createForm.formState.errors.email.message}
              </p>
            )}
          </div>
        )}

        {/* Password (creation only) */}
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

        {/* Status (edit only) */}
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
              : "Create Customer"}
        </Button>
      </div>
    </form>
  );
}
