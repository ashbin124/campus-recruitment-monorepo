import InlineAlert from '@/components/ui/InlineAlert.jsx';

export default function CompanyTab({
  companyForm,
  createLoading,
  createError,
  createSuccess,
  onFormChange,
  onSubmit,
}) {
  return (
    <section className="section-shell">
      <p className="section-kicker">Onboarding</p>
      <h3 className="section-title mt-2 text-xl">Add Company</h3>
      <p className="section-description mt-1">
        Create a company login directly from the admin dashboard.
      </p>

      <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Company Name</label>
          <input
            type="text"
            className="input-field"
            value={companyForm.companyName}
            onChange={(event) => onFormChange('companyName', event.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Contact Name</label>
          <input
            type="text"
            className="input-field"
            value={companyForm.contactName}
            onChange={(event) => onFormChange('contactName', event.target.value)}
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Company Email</label>
          <input
            type="email"
            className="input-field"
            value={companyForm.email}
            onChange={(event) => onFormChange('email', event.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Temporary Password</label>
          <input
            type="password"
            className="input-field"
            value={companyForm.password}
            onChange={(event) => onFormChange('password', event.target.value)}
            minLength={6}
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Website</label>
          <input
            type="text"
            className="input-field"
            value={companyForm.website}
            onChange={(event) => onFormChange('website', event.target.value)}
            placeholder="Optional"
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <InlineAlert message={createError} tone="error" />
          <InlineAlert message={createSuccess} tone="success" />
        </div>

        <div className="md:col-span-2">
          <button type="submit" disabled={createLoading} className="btn-brand disabled:opacity-60">
            {createLoading ? 'Creating...' : 'Create Company'}
          </button>
        </div>
      </form>
    </section>
  );
}
