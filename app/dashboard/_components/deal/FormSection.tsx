import { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";

interface FormSectionProps {
  title: string;
  children: ReactNode;
  titleColor?: string;
}

export const FormSection = ({ 
  title, 
  children, 
  titleColor = "text-gray-800" 
}: FormSectionProps) => (
  <div>
    <h3 className={`text-lg font-semibold mb-4 ${titleColor}`}>{title}</h3>
    <div className="grid md:grid-cols-2 gap-4">{children}</div>
    <Separator className="my-6" />
  </div>
);