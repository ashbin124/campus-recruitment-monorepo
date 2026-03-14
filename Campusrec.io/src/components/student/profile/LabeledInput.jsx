export default function LabeledInput({ label, children }) {
  return (
    <label className="space-y-1">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
