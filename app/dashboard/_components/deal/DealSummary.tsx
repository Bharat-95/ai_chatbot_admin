import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DealSummaryProps {
  totalSold: number;
  totalDeductions: number;
  profit: number;
  commissionRate: number;
  commission: number;
}

export const DealSummary = ({
  totalSold,
  totalDeductions,
  profit,
  commissionRate,
  commission,
}: DealSummaryProps) => (
  <div className="space-y-6">
    {/* Summary Boxes */}
    <div className="">
      {/* Profit Summary */}
      <Card className="bg-blue-50 border border-blue-200 p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Profit Summary</h2>
        <div className="flex justify-between text-sm text-gray-700 mb-2">
          <span>Total Revenue</span>
          <span>${totalSold.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-700 mb-4">
          <span>Total Deductions</span>
          <span>${totalDeductions.toLocaleString()}</span>
        </div>
        <hr className="border-blue-100 mb-3" />
        <div className="flex justify-between text-base font-semibold text-blue-600">
          <span>Profit</span>
          <span>${profit.toLocaleString()}</span>
        </div>
      </Card>
    
    </div>

    {/* Action Buttons */}
    {/* <div className="flex flex-wrap gap-3">
      <Button variant="outline">Reset Calculator</Button>
      <Button className="bg-blue-600 hover:bg-blue-700 text-white">Add to Monthly Invoice</Button>
    </div> */}
  </div>
);
