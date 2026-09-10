import { Textarea } from "@/components/ui/textarea";

export function LegalInformationForm({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <Textarea
      id="legalInformation"
      name="legalInformation"
      label="Informations légales"
      placeholder={"NINEA :\nRC :"}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
}
