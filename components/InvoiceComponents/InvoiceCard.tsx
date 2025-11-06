// components/invoices/InvoiceCard.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { useAppDispatch } from '@/store/hooks/hook';
import { updateInvoiceStatus } from '@/store/features/invoices/invoiceSlice';
import { DealList } from './DealList';

interface InvoiceCardProps {
  invoice: {
    _id: string;
    salesperson: {
      firstName: string;
      lastName: string;
      email: string;
    };
    month: string;
    submittedDate: string;
    deals: Array<any>;
    totalCommission: number;
    totalProfit: number;
    status: 'pending' | 'approved' | 'rejected';
  };
}

export const InvoiceCard = ({ invoice }: InvoiceCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const dispatch = useAppDispatch();

  const handleStatusUpdate = (status: 'approved' | 'rejected') => {
    dispatch(updateInvoiceStatus({ id: invoice._id, status }));
  };

  const statusVariant = {
    pending: 'warning',
    approved: 'success',
    rejected: 'destructive',
  }[invoice.status];

  const statusColors = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <Card className="overflow-hidden transition-all shadow-sm hover:shadow-md">
      <CardHeader 
        className={`cursor-pointer transition-colors ${expanded ? 'bg-muted/50' : 'hover:bg-muted/30'}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center space-x-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {invoice.salesperson.firstName} {invoice.salesperson.lastName}
              </CardTitle>
              <span className="text-sm text-muted-foreground hidden sm:inline">|</span>
              <span className="text-sm text-muted-foreground">
                {invoice.salesperson.email}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[invoice.status]}`}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {format(new Date(invoice.submittedDate), 'MMM dd, yyyy')}
              </span>
              {expanded ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="border-t pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-muted/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Month</h3>
              <p className="font-medium text-gray-900 dark:text-gray-100">{invoice.month}</p>
            </div>
            <div className="bg-muted/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Profit</h3>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                ${invoice.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-muted/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Commission</h3>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                ${invoice.totalCommission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Deals</h3>
            <DealList deals={invoice.deals} />
          </div>
          
          {invoice.status === 'pending' && (
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-4 border-t">
              <Button 
                variant="outline" 
                className="bg-white hover:bg-gray-50"
                onClick={() => handleStatusUpdate('rejected')}
              >
                Reject
              </Button>
              <Button 
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleStatusUpdate('approved')}
              >
                Approve
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};