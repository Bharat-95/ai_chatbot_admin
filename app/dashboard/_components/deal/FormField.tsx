import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FormFieldProps {
  id: string;
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}

export const FormField = ({
  id,
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  className = ""
}: FormFieldProps) => (
  <div className={className}>
    <Label htmlFor={id}   className="mb-2"   >{label}</Label>
    <Input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
      placeholder={placeholder}
    />
  </div>
);