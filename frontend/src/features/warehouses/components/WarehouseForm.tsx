import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  warehouseSchema,
  type WarehouseFormValues,
} from "@/schemas/warehouse.schemas";

import { warehouseService } from "@/services/api/warehouseService";
import { useGeolocation } from "@/features/warehouses/hooks/useGeolocation";

import type { Warehouse, WarehousePayload } from "@/types/warehouse.types";

interface WarehouseFormProps {
  warehouse?: Warehouse | null;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Create / edit warehouse form. Mirrors WarehouseRequest.java field for
 * field. The GPS section uses the browser Geolocation API (never
 * hardcoded coordinates) and previews the captured point on a free
 * OpenStreetMap embed — no paid map service involved.
 */
export function WarehouseForm({
  warehouse,
  onSuccess,
  onCancel,
}: WarehouseFormProps) {
  const isEditing = Boolean(warehouse);

  const { isLocating, locationError, getCurrentLocation } = useGeolocation();

  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      warehouseName: warehouse?.warehouseName ?? "",
      address: warehouse?.address ?? "",
      city: warehouse?.city ?? "",
      state: warehouse?.state ?? "",
      pincode: warehouse?.pincode ?? "",
      contactPerson: warehouse?.contactPerson ?? "",
      phone: warehouse?.phone ?? "",
      latitude: warehouse?.latitude ?? undefined,
      longitude: warehouse?.longitude ?? undefined,
      active: warehouse?.active ?? true,
    },
  });

  // ---------------------------------------------------------
  // Reset form when the edited warehouse changes
  // ---------------------------------------------------------
  useEffect(() => {
    if (warehouse) {
      form.reset({
        warehouseName: warehouse.warehouseName,
        address: warehouse.address,
        city: warehouse.city,
        state: warehouse.state,
        pincode: warehouse.pincode,
        contactPerson: warehouse.contactPerson,
        phone: warehouse.phone,
        latitude: warehouse.latitude,
        longitude: warehouse.longitude,
        active: warehouse.active,
      });
    }
  }, [warehouse, form]);

  // Live values for the coordinate readout + map preview
  const watchedLatitude = form.watch("latitude");
  const watchedLongitude = form.watch("longitude");

  const hasCoordinates =
    Number.isFinite(watchedLatitude) && Number.isFinite(watchedLongitude);

  // ---------------------------------------------------------
  // GPS capture
  // ---------------------------------------------------------
  const handleGetLocation = async () => {
    const coords = await getCurrentLocation();

    if (!coords) {
      toast.error("Could not retrieve your location");
      return;
    }

    form.setValue("latitude", coords.latitude, {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue("longitude", coords.longitude, {
      shouldValidate: true,
      shouldDirty: true,
    });

    toast.success("Location captured from your device");
  };

  // Free OpenStreetMap embed (no API key / no paid service).
  // Only rendered once both coordinates are valid.
  const mapEmbedUrl = hasCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${
        watchedLongitude - 0.002
      }%2C${watchedLatitude - 0.002}%2C${watchedLongitude + 0.002}%2C${
        watchedLatitude + 0.002
      }&layer=mapnik&marker=${watchedLatitude}%2C${watchedLongitude}`
    : "";

  // ---------------------------------------------------------
  // Submit
  // ---------------------------------------------------------
  const onSubmit = form.handleSubmit(async (values) => {
    const payload: WarehousePayload = {
      warehouseName: values.warehouseName.trim(),
      address: values.address.trim(),
      city: values.city.trim(),
      state: values.state.trim(),
      pincode: values.pincode,
      contactPerson: values.contactPerson.trim(),
      phone: values.phone,
      latitude: values.latitude,
      longitude: values.longitude,
      active: values.active,
    };

    try {
      if (isEditing && warehouse) {
        await warehouseService.updateWarehouse(warehouse.id, payload);
        toast.success("Warehouse updated successfully");
      } else {
        await warehouseService.createWarehouse(payload);
        toast.success("Warehouse created successfully");
      }

      onSuccess();
    } catch (error) {
      console.error(error);

      toast.error(
        isEditing
          ? "Failed to update warehouse"
          : "Failed to create warehouse",
      );
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* =====================================================
          Basic Information
      ====================================================== */}
      <div className="space-y-2">
        <label htmlFor="warehouseName" className="text-sm font-medium">
          Warehouse Name *
        </label>

        <Input
          id="warehouseName"
          placeholder="e.g. Hyderabad Central Warehouse"
          {...form.register("warehouseName")}
        />

        {form.formState.errors.warehouseName && (
          <p className="text-sm text-destructive">
            {form.formState.errors.warehouseName.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="address" className="text-sm font-medium">
          Address *
        </label>

        <Input
          id="address"
          placeholder="Street, area, landmark"
          {...form.register("address")}
        />

        {form.formState.errors.address && (
          <p className="text-sm text-destructive">
            {form.formState.errors.address.message}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* City */}
        <div className="space-y-2">
          <label htmlFor="city" className="text-sm font-medium">
            City *
          </label>

          <Input
            id="city"
            placeholder="e.g. Hyderabad"
            {...form.register("city")}
          />

          {form.formState.errors.city && (
            <p className="text-sm text-destructive">
              {form.formState.errors.city.message}
            </p>
          )}
        </div>

        {/* State */}
        <div className="space-y-2">
          <label htmlFor="state" className="text-sm font-medium">
            State *
          </label>

          <Input
            id="state"
            placeholder="e.g. Telangana"
            {...form.register("state")}
          />

          {form.formState.errors.state && (
            <p className="text-sm text-destructive">
              {form.formState.errors.state.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Pincode */}
        <div className="space-y-2">
          <label htmlFor="pincode" className="text-sm font-medium">
            Pincode *
          </label>

          <Input
            id="pincode"
            inputMode="numeric"
            placeholder="6-digit pincode"
            maxLength={6}
            {...form.register("pincode")}
          />

          {form.formState.errors.pincode && (
            <p className="text-sm text-destructive">
              {form.formState.errors.pincode.message}
            </p>
          )}
        </div>

        {/* Contact Person */}
        <div className="space-y-2">
          <label htmlFor="contactPerson" className="text-sm font-medium">
            Contact Person *
          </label>

          <Input
            id="contactPerson"
            placeholder="Warehouse manager name"
            {...form.register("contactPerson")}
          />

          {form.formState.errors.contactPerson && (
            <p className="text-sm text-destructive">
              {form.formState.errors.contactPerson.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="phone" className="text-sm font-medium">
          Phone *
        </label>

        <Input
          id="phone"
          inputMode="numeric"
          placeholder="10-digit phone number"
          maxLength={10}
          {...form.register("phone")}
        />

        {form.formState.errors.phone && (
          <p className="text-sm text-destructive">
            {form.formState.errors.phone.message}
          </p>
        )}
      </div>

      {/* =====================================================
          GPS Location
      ====================================================== */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium">GPS Location *</p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGetLocation}
            disabled={isLocating || form.formState.isSubmitting}
          >
            <Navigation className="mr-2 h-4 w-4" />

            {isLocating
              ? "Getting location..."
              : "Get Current Location"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Use your device's location to fill the coordinates. Permission
          is requested by the browser — nothing is hardcoded.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Latitude */}
          <div className="space-y-2">
            <label htmlFor="latitude" className="text-sm font-medium">
              Latitude
            </label>

            <Input
              id="latitude"
              type="number"
              step="any"
              placeholder="-90 to 90"
              {...form.register("latitude", {
                valueAsNumber: true,
              })}
            />

            {form.formState.errors.latitude && (
              <p className="text-sm text-destructive">
                {form.formState.errors.latitude.message}
              </p>
            )}
          </div>

          {/* Longitude */}
          <div className="space-y-2">
            <label htmlFor="longitude" className="text-sm font-medium">
              Longitude
            </label>

            <Input
              id="longitude"
              type="number"
              step="any"
              placeholder="-180 to 180"
              {...form.register("longitude", {
                valueAsNumber: true,
              })}
            />

            {form.formState.errors.longitude && (
              <p className="text-sm text-destructive">
                {form.formState.errors.longitude.message}
              </p>
            )}
          </div>
        </div>

        {/* Geolocation failure reason (permission denied / unavailable / timeout) */}
        {locationError && (
          <p className="flex items-start gap-2 text-sm text-destructive">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            {locationError}
          </p>
        )}

        {/* Coordinate readout + OpenStreetMap preview */}
        {hasCoordinates && (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="font-medium">
                {watchedLatitude.toFixed(6)}, {watchedLongitude.toFixed(6)}
              </span>{" "}
              <span className="text-muted-foreground">(lat, lng)</span>
            </p>

            <iframe
              title="Warehouse location preview"
              src={mapEmbedUrl}
              className="h-52 w-full rounded-md border border-border"
              loading="lazy"
            />
          </div>
        )}
      </div>

      {/* =====================================================
          Active
      ====================================================== */}
      <div className="flex items-center gap-3">
        <input
          id="active"
          type="checkbox"
          {...form.register("active")}
          className="h-4 w-4 rounded border"
        />

        <label htmlFor="active" className="text-sm font-medium">
          Active Warehouse
        </label>
      </div>

      {/* =====================================================
          Buttons
      ====================================================== */}
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={form.formState.isSubmitting}
        >
          Cancel
        </Button>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting
            ? isEditing
              ? "Updating..."
              : "Creating..."
            : isEditing
              ? "Update Warehouse"
              : "Create Warehouse"}
        </Button>
      </div>
    </form>
  );
}
