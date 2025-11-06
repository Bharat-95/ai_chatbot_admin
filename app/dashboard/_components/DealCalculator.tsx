"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calculator, Plus, Download } from "lucide-react";
import { useDealCalculator } from "@/hooks/useDealCalculator";
import { FormSection } from "./deal/FormSection";
import { FormField } from "./deal/FormField";
import { DealSummary } from "./deal/DealSummary";

const DealCalculator = () => {
  const {
    dealData,
    totalSold,
    totalDeductions,
    profit,
    commission,
    commissionRate,
    handleInputChange,
    resetCalculator,
    addToInvoice,
  } = useDealCalculator();

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-6">
          {/* Client and Vehicle Information */}
          <FormSection title="Client & Vehicle Information">
            <FormField
              id="clientName"
              label="Client Name"
              value={dealData.clientName}
              onChange={(value) => handleInputChange("clientName", value)}
              placeholder="Enter client name"
            />
            <FormField
              id="vehicleYear"
              label="Year"
              value={dealData.vehicleYear}
              onChange={(value) => handleInputChange("vehicleYear", value)}
              placeholder="2025"
            />
            <FormField
              id="vehicleMake"
              label="Make"
              value={dealData.vehicleMake}
              onChange={(value) => handleInputChange("vehicleMake", value)}
              placeholder="Toyota"
            />

            <FormField
              id="vehicleModel"
              label="Model"
              value={dealData.vehicleModel}
              onChange={(value) => handleInputChange("vehicleModel", value)}
              placeholder="Camry"
              className="md:col-span-2"
            />
            <FormField
              id="vehicleVin"
              label="VIN"
              value={dealData.vehicleVin}
              onChange={(value) => handleInputChange("vehicleVin", value)}
              placeholder="Vehicle VIN"
            />
          </FormSection>

          {/* SOLD Section */}
          <div className="text-lg font-bold">Deal Information</div>
          <div className="lg:flex w-[100] gap-10">
            <div className="space-y-6 w-[100%]">
              <FormField
                id="salesPrice"
                label="Sale Price"
                value={dealData.salesPrice}
                onChange={(value) => handleInputChange("salesPrice", value)}
                placeholder="0"
                type="number"
              />
              <FormField
                id="warrantySold"
                label="Warranty"
                value={dealData.warrantySold}
                onChange={(value) => handleInputChange("warrantySold", value)}
                placeholder="0"
                type="number"
              />
              <FormField
                id="gapSold"
                label="Gap insurance"
                value={dealData.gapSold}
                onChange={(value) => handleInputChange("gapSold", value)}
                placeholder="0"
                type="number"
              />

              <FormField
                id="additionalFee"
                label="Additional Fee"
                value={dealData.additionalFee}
                onChange={(value) => handleInputChange("additionalFee", value)}
                placeholder="0"
                type="number"
              />
              <FormField
                id="adminFee"
                label="Admin Fee"
                value={dealData.adminFee}
                onChange={(value) => handleInputChange("adminFee", value)}
                placeholder="0"
                type="number"
              />

              <FormField
                id="reserve"
                label="Reserve"
                value={dealData.reserve}
                onChange={(value) => handleInputChange("reserve", value)}
                placeholder="0"
                type="number"
              />
            </div>

            <div className="space-y-6 w-[100%]">
              <FormField
                id="vehicleCost"
                label="Vehicle Cost"
                value={dealData.vehicleCost}
                onChange={(value) => handleInputChange("vehicleCost", value)}
                placeholder="0"
                type="number"
              />

               <FormField
                id="safetyCost"
                label="Safety"
                value={dealData.safetyCost}
                onChange={(value) => handleInputChange("safetyCost", value)}
                placeholder="0"
                type="number"
              />

              <FormField
                id="lotPack"
                label="Lot Pack"
                value={dealData.lotPack}
                onChange={(value) => handleInputChange("lotPack", value)}
                placeholder="0"
                type="number"
              />
              <FormField
                id="warrantyCost"
                label="Warranty Cost"
                value={dealData.warrantyCost}
                onChange={(value) => handleInputChange("warrantyCost", value)}
                placeholder="0"
                type="number"
              />
              <FormField
                id="gapCost"
                label="Gap Cost"
                value={dealData.gapCost}
                onChange={(value) => handleInputChange("gapCost", value)}
                placeholder="0"
                type="number"
              />
              <FormField
                id="feeCost"
                label="Fee Cost"
                value={dealData.feeCost}
                onChange={(value) => handleInputChange("feeCost", value)}
                placeholder="0"
                type="number"
              />
              <FormField
                id="adminCost"
                label="Admin"
                value={dealData.adminCost}
                onChange={(value) => handleInputChange("adminCost", value)}
                placeholder="0"
                type="number"
              />
              <FormField
                id="lienOwed"
                label="Lein Owed"
                value={dealData.lienOwed}
                onChange={(value) => handleInputChange("lienOwed", value)}
                placeholder="0"
                type="number"
              />
             
              <FormField
                id="referral"
                label="Referral"
                value={dealData.referral}
                onChange={(value) => handleInputChange("referral", value)}
                placeholder="0"
                type="number"
              />
              <FormField
                id="miscellaneous"
                label="Miscellaneous "
                value={dealData.miscellaneous}
                onChange={(value) => handleInputChange("miscellaneous", value)}
                placeholder="0"
                type="number"
              />
            </div>
          </div>

          {/* Results */}
          <DealSummary
            totalSold={totalSold}
            totalDeductions={totalDeductions}
            profit={profit}
            commissionRate={commissionRate}
            commission={commission}
          />

          {/* Action Buttons */}
          <div className="flex flex-wrap space-x-4">
            <Button
              onClick={addToInvoice}
              className="flex items-center space-x-2 cursor-pointer mb-4 md:mb-0 w-full lg:w-40"
              disabled={!dealData.clientName || profit <= 0}
            >
              <span>Save</span>
            </Button>
         
            {/*<Button
              onClick={addToInvoice}
              className="flex items-center space-x-2 cursor-pointer mb-4 md:mb-0 w-full lg:w-40 bg-blue-800"
              
            >
              <span className="flex gap-2"> <Download /> Export  PDF</span>
            </Button> */}
             
               <Button variant="outline" onClick={resetCalculator}  className="flex items-center space-x-2 cursor-pointer mb-4 md:mb-0 lg:w-40 w-full">
              Reset Calculator
            </Button>
            
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DealCalculator;
