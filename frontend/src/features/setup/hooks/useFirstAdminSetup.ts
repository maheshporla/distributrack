import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { setupService } from "@/services/api/setupService";
import { firstAdminSchema, type FirstAdminFormValues } from "@/schemas/setup.schemas";
import { ROUTES } from "@/constants/routes.constants";
import type { ApiError } from "@/types/common.types";

/**
 * Encapsulates the First Admin setup form.
 *
 * On mount it checks GET /api/setup/status:
 *  - setup required (fresh system) -> show the form
 *  - already initialized -> redirect to /login (the form must not be
 *    usable to create a second SUPER_ADMIN — the backend also rejects it)
 *
 * On success the user is sent to /login to sign in with the new
 * administrator credentials (same UX as public registration).
 */
export function useFirstAdminSetup() {
  const navigate = useNavigate();

  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  const form = useForm<FirstAdminFormValues>({
    resolver: zodResolver(firstAdminSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      try {
        const { setupRequired } = await setupService.getStatus();
        if (!setupRequired && !cancelled) {
          toast.info("The first administrator has already been created");
          navigate(ROUTES.LOGIN, { replace: true });
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          toast.error("Could not check setup status");
        }
      } finally {
        if (!cancelled) setIsCheckingStatus(false);
      }
    };

    checkStatus();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const onSubmit = form.handleSubmit(async (values) => {
    // confirmPassword is client-only — strip it before the API call.
    const { confirmPassword: _confirmPassword, ...payload } = values;

    try {
      const admin = await setupService.createFirstAdmin(payload);
      toast.success(`Administrator ${admin.fullName} created — sign in to continue`);
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (error) {
      // axiosInstance's response interceptor normalizes rejections to ApiError.
      const apiError = error as ApiError;
      toast.error(apiError.message);
    }
  });

  return { form, onSubmit, isSubmitting: form.formState.isSubmitting, isCheckingStatus };
}
