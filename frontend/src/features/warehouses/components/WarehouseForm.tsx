import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import {
  warehouseSchema,
  type WarehouseFormValues,
} from "@/schemas/warehouse.schemas";

import { warehouseService } from "@/services/api/warehouseService";
import { useGeolocation } from "@/features/warehouses/hooks/useGeolocation";
import { useGeocoding } from "@/features/warehouses/hooks/useGeocoding";
import { LocationSearch } from "@/features/warehouses/components/LocationSearch";
import { InteractiveMap } from "@/features/warehouses/components/InteractiveMap";

import type { Warehouse, WarehousePayload } from "@/types/warehouse.types";
import type { GeocodingResult } from "@/features/warehouses/hooks/useGeocoding";

interface WarehouseFormProps {
  warehouse?: Warehouse | null;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Create / edit warehouse form. Supports two ways to set GPS location:
 *
 *   1. Use Current Location — browser/device GPS
 *   2. Search Location — Nominatim geocoding (type a place name)
 *
 * Plus: click anywhere on the interactive Leaflet map to fine-tune.
 *
 * The backend Warehouse entity already stores latitude/longitude/address
 * — no schema changes are needed.
 */
export function WarehouseForm({
  warehouse,
  onSuccess,
  onCancel,
}: WarehouseFormProps) {
  const isEditing = Boolean(warehouse);

  const { isLocating, locationError, getCurrentLocation } = useGeolocation();
  const { reverseGeocode } = useGeocoding();
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [selectedLocationName, setSelectedLocationName] = useState<string | null>(
    warehouse?.address ?? null,
  );

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

  // Reset form when the edited warehouse changes
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
      setSelectedLocationName(warehouse.address);
    }
  }, [warehouse, form]);

  // Live coordinate values for the map.
  const watchedLatitude = form.watch("latitude");
  const watchedLongitude = form.watch("longitude");

  const hasCoordinates =
    Number.isFinite(watchedLatitude) && Number.isFinite(watchedLongitude);

  // ---------------------------------------------------------
  // Location handlers
  // ---------------------------------------------------------

  /** Called when the user selects a search result. */
  const handleSearchSelect = useCallback(
    (result: GeocodingResult) => {
      form.setValue("latitude", result.lat, {
        shouldValidate: true,
        shouldDirty: true,
      });
      form.setValue("longitude", result.lon, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setSelectedLocationName(result.displayName);

      // Parse city/state from address details if available.
      // Nominatim returns address components we can use.
      const parts = result.displayName.split(", ");
      if (parts.length >= 2) {
        // Auto-fill city from the search result's second-to-last meaningful part.
        const cityCandidates = parts.slice(0, Math.min(parts.length - 2, 3));
        const city = cityCandidates[cityCandidates.length - 1]?.trim();
        if (city && !form.getValues("city")) {
          form.setValue("city", city, { shouldDirty: true });
        }
      }

      toast.success("Location selected from search");
    },
    [form],
  );

  /** Called when the user clicks on the map. */
  const handleMapClick = useCallback(
    async (lat: number, lng: number) => {
      form.setValue("latitude", lat, {
        shouldValidate: true,
        shouldDirty: true,
      });
      form.setValue("longitude", lng, {
        shouldValidate: true,
        shouldDirty: true,
      });

      // Reverse geocode to get a human-readable address.
      setIsReverseGeocoding(true);
      try {
        const address = await reverseGeocode(lat, lng);
        if (address) {
          setSelectedLocationName(address);
        }
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    [form, reverseGeocode],
  );

  /** Called when the user clicks "Use Current Location". */
  const handleGetLocation = useCallback(async () => {
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

    // Reverse geocode to get a name for the GPS location.
    setIsReverseGeocoding(true);
    try {
      const address = await reverseGeocode(coords.latitude, coords.longitude);
      if (address) {
        setSelectedLocationName(address);
      }
    } finally {
      setIsReverseGeocoding(false);
    }

    toast.success("Location captured from your device");
  }, [getCurrentLocation, form, reverseGeocode]);

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
          GPS Location — Search + Map + Current Location
      ====================================================== */}
      <div className="space-y-4 rounded-lg border border-border p-4">
        <p className="text-sm font-medium">GPS Location *</p>

        {/* --- Search Location --- */}
        <LocationSearch
          onSelect={handleSearchSelect}
          placeholder="Search location (e.g. Vignan Institute of Technology and Science, Hyderabad)"
          disabled={form.formState.isSubmitting}
        />

        {/* --- Use Current Location --- */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGetLocation}
            disabled={isLocating || form.formState.isSubmitting}
          >
            <Navigation className="mr-2 h-4 w-4" />
            {isLocating ? "Getting location..." : "Use Current Location"}
          </Button>

          {isReverseGeocoding && (
            <span className="text-xs text-muted-foreground">
              Resolving address…
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Search for a location or use your device GPS. You can also click
          anywhere on the map below to set the exact position.
        </p>

        {/* --- Selected Location Indicator --- */}
        {selectedLocationName && hasCoordinates && (
          <div className="rounded-md bg-primary/5 px-3 py-2">
            <p className="flex items-start gap-2 text-xs">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="font-medium text-foreground">
                {selectedLocationName}
              </span>
            </p>
          </div>
        )}

        {/* --- Geolocation errors --- */}
        {locationError && (
          <p className="flex items-start gap-2 text-sm text-destructive">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            {locationError}
          </p>
        )}

        <Separator />

        {/* --- Interactive Map --- */}
        <InteractiveMap
          latitude={watchedLatitude}
          longitude={watchedLongitude}
          onLocationSelect={handleMapClick}
          height="h-64"
        />

        {/* --- Coordinate Readout --- */}
        {hasCoordinates && (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <p>
              <span className="font-mono font-medium">
                {watchedLatitude!.toFixed(6)}, {watchedLongitude!.toFixed(6)}
              </span>{" "}
              <span className="text-muted-foreground">(lat, lng)</span>
            </p>
          </div>
        )}

        {/* --- Hidden lat/lng fields for validation --- */}
        <input type="hidden" {...form.register("latitude", { valueAsNumber: true })} />
        <input type="hidden" {...form.register("longitude", { valueAsNumber: true })} />

        {form.formState.errors.latitude && (
          <p className="text-sm text-destructive">
            {form.formState.errors.latitude.message}
          </p>
        )}
        {form.formState.errors.longitude && (
          <p className="text-sm text-destructive">
            {form.formState.errors.longitude.message}
          </p>
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
