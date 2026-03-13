export default function LabeledInput({ label, children }) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
