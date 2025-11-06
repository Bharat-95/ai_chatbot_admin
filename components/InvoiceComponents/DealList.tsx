
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DealListProps {
  deals: Array<any>;
}

export const DealList = ({ deals }: DealListProps) => {
  return (
    <div className="border rounded-lg">
      <h3 className="p-4 font-medium">Related Deals ({deals.length})</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead className="text-right">Profit</TableHead>
            <TableHead className="text-right">Commission</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deals.map((deal) => (
            <TableRow key={deal._id}>
              <TableCell>{deal.clientName}</TableCell>
              <TableCell>{deal.vehicle}</TableCell>
              <TableCell className="text-right">
                ${deal.profit.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                ${deal.commission.toLocaleString()}
              </TableCell>
              <TableCell>
                <span className="capitalize">{deal.status}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};