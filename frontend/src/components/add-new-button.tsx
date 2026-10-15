import { faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

type AddNewButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  isOpen?: boolean;
};

export function AddNewButton({ label, onClick, disabled = false, isOpen = false }: AddNewButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-[#b24a20] bg-[#d05a2c] text-white transition hover:-translate-y-px hover:bg-[#b24a20] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <FontAwesomeIcon icon={isOpen ? faXmark : faPlus} className="text-sm" aria-hidden="true" />
    </button>
  );
}
