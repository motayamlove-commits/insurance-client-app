import { z } from "zod";

export const vehicleInquirySchema = z.object({
  nin: z
    .string()
    .min(10)
    .max(10)
    .regex(/^\d{10}$/),
});

export type VehicleInquiry = z.infer<typeof vehicleInquirySchema>;

export interface VehicleInfo {
  sequenceNumber: string;
  plateNumber: string;
  plateText1: string;
  plateText2: string;
  plateText3: string;
  majorColor: string;
  modelYear: number;
  vehicleMaker: string;
  vehicleModel: string;
  ownerName: string;
  [key: string]: unknown;
}

export interface VehicleDropdownOption {
  value: string;
  label: string;
  vehicle: VehicleInfo;
}
